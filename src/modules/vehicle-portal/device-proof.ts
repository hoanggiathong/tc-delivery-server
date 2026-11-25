import { createHash, createPublicKey, verify } from 'node:crypto';
import mongoose from 'mongoose';
import { z } from 'zod';

const envelope = z.object({
  publicKey: z.string().regex(/^[A-Za-z0-9_-]{120,130}$/),
  signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
  nonce: z.string().uuid(),
  time: z.number().int(),
  payload: z.string().max(2048),
});
const proofs = () =>
  mongoose.connection.collection<{ _id: string; expiresAt: Date }>('vehicle_portal_proofs');
let ready: Promise<string> | undefined;

export async function verifyDevice(path: string, input: unknown) {
  const parsed = envelope.safeParse(input);
  if (!parsed.success) return null;
  const body = parsed.data;
  if (Math.abs(Date.now() - body.time) > 90000) return null;
  const spki = Buffer.from(body.publicKey, 'base64url');
  const signed = JSON.stringify(['gpe-vehicle-v1', path, body.nonce, body.time, body.payload]);
  let payload: unknown;
  try {
    const key = createPublicKey({ key: spki, type: 'spki', format: 'der' });
    if (
      key.asymmetricKeyDetails?.namedCurve !== 'prime256v1' ||
      !verify(
        'sha256',
        Buffer.from(signed),
        { key, dsaEncoding: 'ieee-p1363' },
        Buffer.from(body.signature, 'base64url')
      )
    )
      return null;
    payload = JSON.parse(body.payload);
  } catch {
    return null;
  }
  const device = createHash('sha256').update(spki).digest('hex');
  ready ??= proofs()
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    .catch((err) => {
      ready = undefined;
      throw err;
    });
  await ready;
  try {
    await proofs().insertOne({
      _id: device + ':' + body.nonce,
      expiresAt: new Date(Date.now() + 200000),
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return null;
    throw error;
  }
  return { device, payload };
}
