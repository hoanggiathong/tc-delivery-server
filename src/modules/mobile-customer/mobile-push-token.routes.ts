import { Router } from 'express';

import { MobilePushTokenController } from '@/controllers/mobile-push-token.controller';
import { authenticateCustomerToken } from '@/middlewares/authenticate-customer-token.middleware';

const router = Router();

const controller = new MobilePushTokenController();

/**
 * GET /api/mobile/customer/push-tokens/me
 * Lấy danh sách thiết bị/token của tài khoản hiện tại.
 */
router.get('/me', authenticateCustomerToken, controller.getMyTokens);

/**
 * POST /api/mobile/customer/push-tokens
 * Đăng ký hoặc kích hoạt lại FCM token.
 */
router.post('/', authenticateCustomerToken, controller.registerToken);

/**
 * PUT /api/mobile/customer/push-tokens/refresh
 * Thay token cũ bằng token mới khi Firebase rotate token.
 */
router.put('/refresh', authenticateCustomerToken, controller.refreshToken);

/**
 * POST /api/mobile/customer/push-tokens/unregister
 * Vô hiệu hóa token hiện tại khi logout.
 */
router.post('/unregister', authenticateCustomerToken, controller.unregisterToken);

/**
 * POST /api/mobile/customer/push-tokens/unregister-all
 * Vô hiệu hóa toàn bộ token của tài khoản.
 */
router.post('/unregister-all', authenticateCustomerToken, controller.unregisterAllTokens);

export default router;
