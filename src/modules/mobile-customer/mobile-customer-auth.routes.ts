import { Router } from 'express';
import { MobileCustomerAuthController } from '@/controllers/mobile-customer-auth.controller';
import { authenticateCustomerToken } from '@/middlewares/authenticate-customer-token.middleware';
import { MobileCustomerSecurityEventController } from '@/controllers/mobile-customer-security-event.controller';

const router = Router();
const controller = new MobileCustomerAuthController();

const securityEventController = new MobileCustomerSecurityEventController();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);

router.get('/security-events', authenticateCustomerToken, securityEventController.list);

router.get('/sessions', authenticateCustomerToken, controller.getSessions);
router.delete('/sessions/:deviceId', authenticateCustomerToken, controller.revokeSession);
router.post('/logout-all', authenticateCustomerToken, controller.logoutAll);

router.post('/send-otp', controller.sendOtp);
router.post('/login-otp', controller.loginOtp);
router.post('/forgot-password/reset', controller.resetForgotPassword);

export default router;
