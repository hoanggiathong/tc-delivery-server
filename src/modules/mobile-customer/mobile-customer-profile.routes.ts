import { Router } from 'express';

import { authenticateCustomerToken } from '@/middlewares/authenticate-customer-token.middleware';

import { MobileCustomerProfileController } from '@/controllers/mobile-customer-profile.controller';

const router = Router();

const controller = new MobileCustomerProfileController();

router.get('/me', authenticateCustomerToken, controller.getMe);

router.put('/me', authenticateCustomerToken, controller.updateMe);

router.put('/change-password', authenticateCustomerToken, controller.changePassword);

export default router;
