import { Router } from 'express';

import { authenticateCustomerToken } from '@/middlewares/authenticate-customer-token.middleware';
import { MobileCustomerAccountDeletionController } from '@/controllers/mobile-customer-account-deletion.controller';

const router = Router();
const controller = new MobileCustomerAccountDeletionController();

router.post('/send-otp', authenticateCustomerToken, controller.sendRequestOtp);
router.post('/request', authenticateCustomerToken, controller.requestDeletion);
router.post('/status', controller.getStatus);
router.post('/cancel/send-otp', controller.sendCancelOtp);
router.post('/cancel', controller.cancelDeletion);
router.post('/recovery/send-otp', controller.sendRecoveryOtp);
router.post('/recovery/cancel', controller.cancelByRecoveryOtp);

export default router;
