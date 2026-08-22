import { Router } from 'express';

import { MobileAppVersionController } from '@/controllers/mobile-app-version.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { UserRole } from '@/types/user.type';

const router = Router();
const controller = new MobileAppVersionController();

const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPERADMIN];

router.use(authenticateToken);
router.use(requireRole(allowedRoles));

/**
 * Web Admin API
 * GET /api/mobile-app-version
 * PUT /api/mobile-app-version/:platform
 */
router.get('/', controller.getAdminConfigs);
router.put('/:platform', controller.updateAdminConfig);

export default router;
