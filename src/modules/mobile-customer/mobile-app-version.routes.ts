import { Router } from 'express';

import { MobileAppVersionController } from '@/controllers/mobile-app-version.controller';

const router = Router();
const controller = new MobileAppVersionController();

/**
 * Public API cho GP Customer.
 * Không yêu cầu đăng nhập vì app phải kiểm tra version ngay cả ở Login.
 *
 * GET /api/mobile/customer/app-version?platform=android|ios
 */
router.get('/', controller.getPublicConfig);

export default router;
