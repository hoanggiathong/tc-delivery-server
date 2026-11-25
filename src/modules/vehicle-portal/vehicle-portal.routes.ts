import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';
import QRCode from 'qrcode';
import { verifyDevice } from './device-proof';
import { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { AuthRequest } from '@/types';
import { UserRole } from '@/types/user.type';
import { MobileCustomerSmsService } from '../mobile-customer/mobile-customer-sms.service';
import { getActiveVehicle, normalizeDriverPhone } from './active-vehicle';

const driver = Router();
const admin = Router();
const portalOrigin = process.env.VEHICLE_PORTAL_ORIGIN || 'https://hangtrenxe.giaphuocexpress.vn';
const portalHost = new URL(portalOrigin).hostname;
const duration = 2 * 60 * 60 * 1000;
const cookie = '__Host-gpe_vehicle';
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
};
const phoneInput = z
  .string()
  .trim()
  .max(16)
  .transform(normalizeDriverPhone)
  .pipe(z.string().regex(/^0[35789]\d{8}$/));
const dayVN = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

interface DailyAccess {
  _id: string;
  used: number;
  attempts?: number;
  sends?: number;
  otpIssuedAt?: Date;
  authorizedAt?: Date;
  nextSms?: Date;
  otp?: string;
  otpUntil?: Date;
  otpAssignment?: string;
  device?: string;
  plate?: string;
  token?: string;
  expiresAt?: Date;
  assignment?: string;
}
interface DriverAccess {
  _id: string;
  blocked: boolean;
  revokedAt?: Date;
  seenAt?: Date;
}
interface Audit {
  event: string;
  phone?: string;
  ip?: string;
  actor?: string;
  tripId?: string;
  licensePlate?: string;
  status: number;
  at: Date;
}
const counters = () => mongoose.connection.collection<DailyAccess>('vehicle_portal_daily');
const accounts = () => mongoose.connection.collection<DriverAccess>('vehicle_portal_drivers');
const audit = () => mongoose.connection.collection<Audit>('vehicle_portal_audit');

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function otpHash(id: string, code: string) {
  const secret = process.env.VEHICLE_OTP_SECRET;
  if (!secret || secret.length < 32) throw new Error('Vehicle OTP secret unavailable');
  return createHmac('sha256', secret).update(`${id}:${code}`).digest('hex');
}
const plateInput = z.string().regex(/^[0-9]{2}[A-Z][A-Z0-9]{4,9}$/);
const gpsInput = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive(),
  timestamp: z.number().int().positive(),
});
interface VehicleAccess {
  _id: string;
  day?: string;
  used?: number;
  device?: string;
  phone?: string;
  token?: string;
  expiresAt?: Date;
  assignment?: string;
  authorizedAt?: Date;
  displayUntil?: Date;
  visibleAfter?: Date;
}
const vehicles = () =>
  mongoose.connection.collection<VehicleAccess>('vehicle_portal_vehicle_access');
function vehicleLimit(plate: string) {
  const overrides = z
    .record(z.number().int().positive())
    .parse(JSON.parse(process.env.VEHICLE_DAILY_VIEW_LIMIT_OVERRIDES || '{}'));
  return (
    overrides[plate] ??
    z.coerce
      .number()
      .int()
      .positive()
      .parse(process.env.VEHICLE_DAILY_VIEW_LIMIT || '3')
  );
}
function readCookie(req: Request) {
  const match = req.headers.cookie?.match(
    /(?:^|;\s*)__Host-gpe_vehicle=([0-9]{2}[A-Z][A-Z0-9]{4,9})\.([a-f0-9]{64})(?:;|$)/
  );
  return match ? { id: match[1], token: hash(match[2]) } : null;
}
function qrFor(plate: string) {
  return plate + '.' + otpHash('cabin-qr-v1', plate);
}
const assignmentKey = (vehicle: { assignmentId: string; tripId: string; licensePlate: string }) =>
  JSON.stringify([vehicle.assignmentId, vehicle.tripId, vehicle.licensePlate]);

type Result = { status: number; body: object };
type Context = Pick<Audit, 'phone' | 'tripId' | 'licensePlate'>;
const result = (status: number, message: string): Result => ({
  status,
  body: { message },
});
const refused = () => result(401, 'Phiên đã hết hạn hoặc quyền truy cập đã thay đổi.');
const unavailable = () => result(503, 'Chưa thể xác nhận dữ liệu xe. Vui lòng thử lại.');
function tracked(
  event: string,
  action: (req: Request, res: Response, context: Context) => Promise<Result>
) {
  return async (req: Request, res: Response) => {
    const context: Context = {};
    let output: Result;
    try {
      output = await action(req, res, context);
    } catch (error) {
      output =
        error instanceof z.ZodError ? result(400, 'Thông tin nhập chưa hợp lệ.') : unavailable();
    }
    try {
      if (!res.locals.alreadyAudited)
        await audit().insertOne({
          event,
          ...context,
          ip: req.ip,
          actor: (req as AuthRequest).user?.userId,
          status: output.status,
          at: new Date(),
        });
    } catch {
      output = unavailable();
    }
    if (output.status >= 400) res.removeHeader('Set-Cookie');
    res.status(output.status).json(output.body);
  };
}

driver.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.hostname !== portalHost) {
    res.sendStatus(404);
    return;
  }
  if (req.method !== 'GET' && req.get('origin') !== portalOrigin) {
    res.sendStatus(403);
    return;
  }
  next();
});

driver.use(async (req, res, next) => {
  if (req.method !== 'POST') {
    res.sendStatus(405);
    return;
  }
  try {
    const proof = await verifyDevice(req.path, req.body);
    if (!proof) {
      res.status(401).json({ message: 'Thiết bị chưa được xác thực.' });
      return;
    }
    res.locals.vehicleDevice = proof.device;
    req.body = proof.payload;
    next();
  } catch {
    res.status(503).json({ message: 'Tạm thời chưa xác thực được thiết bị.' });
  }
});

driver.post(
  '/otp',
  tracked('OTP_REQUEST', async (req, res, context) => {
    const phone = phoneInput.parse(req.body?.phone);
    context.phone = phone;
    const plate = plateInput.parse(req.body.plate);
    context.licensePlate = plate;
    if (req.body.qr !== qrFor(plate)) return result(403, 'Vui lòng quét mã QR trong cabin.');
    const location = gpsInput.parse(req.body.location);
    const device = res.locals.vehicleDevice as string;
    const vehicleState = await vehicles().findOne({ _id: plate });
    if (vehicleState?.day === dayVN() && (vehicleState.used || 0) >= vehicleLimit(plate))
      return result(429, 'Xe đã hết lượt mở phiên hôm nay.');
    const day = dayVN();
    const id = `${phone}_${day}`;
    const deferred = result(
      429,
      'Chưa thể cấp mã. Vui lòng kiểm tra quyền truy cập hoặc thử lại sau.'
    );
    const now = new Date();
    const code = String(randomInt(100000, 1000000));
    const digest = otpHash(id, code);
    const template = process.env.VEHICLE_OTP_SMS_TEMPLATE;
    if (!template?.includes('{code}')) return unavailable();

    // Reserve the send window before querying the trip system, including for unknown numbers.
    const ipId = `ip_${day}_${hash(req.ip || 'unknown')}`;
    await counters().updateOne({ _id: ipId }, { $setOnInsert: { used: 0 } }, { upsert: true });
    const ip = await counters().updateOne({ _id: ipId, used: { $lt: 30 } }, { $inc: { used: 1 } });
    if (!ip.modifiedCount) return result(429, 'Đã vượt giới hạn yêu cầu mã trong ngày.');

    await counters().updateOne({ _id: id }, { $setOnInsert: { used: 0 } }, { upsert: true });
    const reserved = await counters().updateOne(
      {
        _id: id,
        $and: [
          { $or: [{ sends: { $exists: false } }, { sends: { $lt: 5 } }] },
          {
            $or: [{ nextSms: { $exists: false } }, { nextSms: { $lte: now } }],
          },
        ],
      },
      {
        $set: { nextSms: new Date(+now + 90000) },
        $inc: { sends: 1 },
        $unset: {
          otp: '',
          otpUntil: '',
          otpAssignment: '',
          otpIssuedAt: '',
          attempts: '',
        },
      }
    );
    if (!reserved.modifiedCount || (await accounts().findOne({ _id: phone }))?.blocked) {
      return deferred;
    }
    const vehicle = await getActiveVehicle(phone, plate, location);
    if (!vehicle) return result(403, 'Chưa xác minh được số điện thoại hoặc vị trí gần xe.');
    await accounts().updateOne(
      { _id: phone },
      {
        $setOnInsert: { blocked: false },
        $set: { seenAt: now },
      },
      { upsert: true }
    );

    const sms = await new MobileCustomerSmsService().send({
      phone: vehicle.driverPhone,
      message: template.replace('{code}', code),
    });
    if (!sms.success) return unavailable();
    await counters().updateOne(
      { _id: id, nextSms: new Date(+now + 90000) },
      {
        $set: {
          device,
          plate,
          otp: digest,
          attempts: 0,
          otpIssuedAt: now,
          otpUntil: new Date(+now + 90000),
          otpAssignment: assignmentKey(vehicle),
        },
      }
    );
    return { status: 202, body: { otpIssued: true, message: 'Yêu cầu gửi SMS đã được tiếp nhận. Vui lòng kiểm tra điện thoại.' } };
  })
);

driver.post(
  '/login',
  tracked('LOGIN', async (req, res, context) => {
    const phone = phoneInput.parse(req.body?.phone);
    const code = z
      .string()
      .regex(/^\d{6}$/)
      .parse(req.body?.code);
    context.phone = phone;
    const id = `${phone}_${dayVN()}`;
    const now = new Date();
    const device = res.locals.vehicleDevice as string;
    const plate = plateInput.parse(req.body.plate);
    context.licensePlate = plate;
    const daily = await counters().findOneAndUpdate(
      {
        _id: id,
        device,
        plate,
        attempts: { $lt: 5 },
        otpUntil: { $gt: now },
      },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' }
    );
    if (!daily?.otpIssuedAt || daily.otp !== otpHash(id, code)) return refused();
    const vehicle = await getActiveVehicle(phone, plate);
    if (!vehicle || assignmentKey(vehicle) !== daily.otpAssignment) return refused();
    context.tripId = vehicle.tripId;
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + duration);
    const maximum = vehicleLimit(plate);
    await vehicles().updateOne({ _id: plate }, { $setOnInsert: { used: 0 } }, { upsert: true });
    const session = await mongoose.startSession();
    let remaining = 0;
    try {
      await session.withTransaction(async () => {
        const day = dayVN();
        const prior = await vehicles().findOne({ _id: plate }, { session });
        const used = prior?.day === day ? prior.used || 0 : 0;
        if (used >= maximum) throw new Error('VEHICLE_QUOTA');
        const account = await accounts().updateOne(
          {
            _id: phone,
            blocked: false,
            $or: [{ revokedAt: { $exists: false } }, { revokedAt: { $lt: daily.otpIssuedAt } }],
          },
          { $set: { seenAt: new Date() } },
          { session }
        );
        if (!account.matchedCount) throw new Error('DENIED');
        const consume = await counters().updateOne(
          { _id: id, device, plate, otp: daily.otp, otpUntil: { $gt: new Date() } },
          { $unset: { otp: '', otpUntil: '', otpAssignment: '', attempts: '' } },
          { session }
        );
        if (!consume.modifiedCount) throw new Error('DENIED');
        // Another browser can still have the last authorized response on its screen.
        const visibleAfter = new Date(
          Math.max(
            prior?.visibleAfter?.getTime() || 0,
            prior?.device !== device && prior?.displayUntil
              ? prior.displayUntil.getTime() + 1500
              : 0
          )
        );
        await vehicles().updateOne(
          { _id: plate },
          {
            $set: {
              day,
              visibleAfter,
              used: used + 1,
              device,
              phone,
              token: hash(token),
              expiresAt,
              assignment: assignmentKey(vehicle),
              authorizedAt: daily.otpIssuedAt,
            },
          },
          { session }
        );
        await audit().insertOne(
          { event: 'LOGIN', ...context, ip: req.ip, status: 200, at: new Date() },
          { session }
        );
        remaining = maximum - used - 1;
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'VEHICLE_QUOTA')
        return result(429, 'Xe đã hết lượt mở phiên hôm nay.');
      if (error instanceof Error && error.message === 'DENIED') return refused();
      throw error;
    } finally {
      await session.endSession();
    }
    res.locals.alreadyAudited = true;
    res.cookie(cookie, plate + '.' + token, { ...cookieOptions, maxAge: duration });
    return { status: 200, body: { expiresAt, remaining } };
  })
);

driver.post(
  '/manifest',
  tracked('VIEW', async (req, res, context) => {
    const cookieValue = readCookie(req);
    if (!cookieValue) return refused();
    const { id: plate, token } = cookieValue;
    const current = () => ({
      _id: plate,
      token,
      device: res.locals.vehicleDevice as string,
      expiresAt: { $gt: new Date() },
    });
    const access = await vehicles().findOne(current());
    if (!access?.phone || !access.authorizedAt) return refused();
    context.phone = access.phone;
    context.licensePlate = plate;
    const permitted = {
      _id: access.phone,
      blocked: false,
      $or: [{ revokedAt: { $exists: false } }, { revokedAt: { $lt: access.authorizedAt } }],
    };
    if (!(await accounts().findOne(permitted))) return refused();
    if (access.visibleAfter && access.visibleAfter > new Date())
      return result(425, 'Đang chuyển phiên sang thiết bị này.');
    const vehicle = await getActiveVehicle(access.phone, plate);
    if (!vehicle || assignmentKey(vehicle) !== access.assignment) {
      await vehicles().updateOne(current(), { $unset: { token: '' } });
      return refused();
    }
    const displayMs = Math.min(15000, (access.expiresAt?.getTime() || 0) - Date.now());
    if (displayMs <= 0 || !(await accounts().findOne(permitted))) return refused();
    const lease = await vehicles().updateOne(current(), {
      $max: { displayUntil: new Date(Date.now() + displayMs) },
    });
    if (!lease.matchedCount) return refused();
    context.tripId = vehicle.tripId;
    return {
      status: 200,
      body: {
        displayMs,
        expiresAt: access.expiresAt,
        remaining: Math.max(
          0,
          vehicleLimit(plate) - (access.day === dayVN() ? access.used || 0 : 0)
        ),
        licensePlate: vehicle.licensePlate,
        capturedAt: vehicle.capturedAt,
        items: vehicle.items,
      },
    };
  })
);

driver.post(
  '/logout',
  tracked('LOGOUT', async (req, res, context) => {
    const value = readCookie(req);
    if (value) {
      const old = await vehicles().findOneAndUpdate(
        { _id: value.id, token: value.token, device: res.locals.vehicleDevice },
        { $unset: { token: '' } },
        { returnDocument: 'before' }
      );
      if (old) {
        context.phone = old.phone;
        context.licensePlate = value.id;
      }
    }
    res.clearCookie(cookie, cookieOptions);
    return result(200, 'Đã đăng xuất.');
  })
);

admin.use(authenticateToken, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]));
admin.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
admin.post(
  '/cabin-qr',
  tracked('CABIN_QR', async (req, _res, context) => {
    const plate = plateInput.parse(
      String(req.body?.plate || '')
        .toUpperCase()
        .replace(/[\s.-]/g, '')
    );
    context.licensePlate = plate;
    const url = new URL('/xe', portalOrigin);
    url.hash = 'xe=' + qrFor(plate);
    return {
      status: 200,
      body: { plate, image: await QRCode.toDataURL(url.href, { width: 640, margin: 4 }) },
    };
  })
);
const pageNumber = (req: Request) =>
  z.coerce.number().int().min(1).max(10000).catch(1).parse(req.query.page);
admin.get(
  '/drivers',
  tracked('ADMIN_LIST', async (req) => {
    const rows = await accounts()
      .find({})
      .sort({ _id: 1 })
      .skip((pageNumber(req) - 1) * 50)
      .limit(51)
      .toArray();
    return {
      status: 200,
      body: { items: rows.slice(0, 50), more: rows.length > 50 },
    };
  })
);
admin.get(
  '/history',
  tracked('ADMIN_HISTORY', async (req) => {
    const phone = req.query.phone ? phoneInput.parse(req.query.phone) : undefined;
    const rows = await audit()
      .find({
        event: {
          $in: [
            'OTP_REQUEST',
            'LOGIN',
            'VIEW',
            'LOGOUT',
            'ACCESS_CHANGE',
            'ASSIGNMENT_OPEN',
            'ASSIGNMENT_CLOSE',
          ],
        },
        ...(phone ? { phone } : {}),
      })
      .sort({ at: -1, _id: -1 })
      .skip((pageNumber(req) - 1) * 50)
      .limit(51)
      .toArray();
    return {
      status: 200,
      body: { items: rows.slice(0, 50), more: rows.length > 50 },
    };
  })
);
admin.patch(
  '/drivers/:phone',
  tracked('ACCESS_CHANGE', async (req, _res, context) => {
    const phone = phoneInput.parse(req.params.phone);
    const blocked = z.boolean().parse(req.body?.blocked);
    context.phone = phone;
    const account = await accounts().updateOne(
      { _id: phone },
      { $set: { blocked, revokedAt: new Date() } }
    );
    if (!account.matchedCount) return result(404, 'Không tìm thấy tài xế.');
    await vehicles().updateMany({ phone }, { $unset: { token: '' } });
    const prefix = `^${phone}_`;
    await counters().updateMany(
      { _id: { $regex: prefix } },
      {
        $unset: {
          otp: '',
          otpUntil: '',
          otpAssignment: '',
          attempts: '',
          token: '',
        },
      }
    );
    return result(200, blocked ? 'Đã khóa truy cập.' : 'Đã mở truy cập.');
  })
);

export { driver as vehiclePortalRoutes, admin as vehiclePortalAdminRoutes };
