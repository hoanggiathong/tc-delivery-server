import { cert, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';

import { getMessaging } from 'firebase-admin/messaging';

import serviceAccount from '@/config/firebase-service-account.json';

let firebaseAdminApp: App;

if (getApps().length === 0) {
  firebaseAdminApp = initializeApp({
    credential: cert(serviceAccount as ServiceAccount),
  });
} else {
  firebaseAdminApp = getApps()[0];
}

export const firebaseMessaging = getMessaging(firebaseAdminApp);

export default firebaseAdminApp;
