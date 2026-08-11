import firebaseAdminApp from '@/config/firebase-admin';
import serviceAccount from '@/config/firebase-service-account.json';

interface ServiceAccountJson {
  type?: string;
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

const run = async (): Promise<void> => {
  const account = serviceAccount as ServiceAccountJson;

  console.log('[FIREBASE TEST] Configuration:', {
    appName: firebaseAdminApp.name,
    projectId: account.project_id,
    clientEmail: account.client_email,
    type: account.type,
    hasPrivateKey: Boolean(account.private_key?.includes('-----BEGIN PRIVATE KEY-----')),
  });

  const credential = firebaseAdminApp.options.credential;

  if (!credential) {
    throw new Error('Firebase credential chưa được khởi tạo');
  }

  const accessToken = await credential.getAccessToken();

  console.log('[FIREBASE TEST] Success:', {
    accessTokenReceived: Boolean(accessToken.access_token),
    expiresIn: accessToken.expires_in,
  });
};

run().catch(error => {
  console.error('[FIREBASE TEST] Failed:', {
    code: typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined,

    message: error instanceof Error ? error.message : String(error),

    stack: error instanceof Error ? error.stack : undefined,
  });

  process.exit(1);
});
