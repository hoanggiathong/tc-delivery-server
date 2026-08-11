import { Router } from 'express';

import { MobileNotificationController } from '@/controllers/mobile-notification.controller';
import { MobileNotificationAdminController } from '@/controllers/mobile-notification-admin.controller';

import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';

import { UserRole } from '@/types/user.type';

const router = Router();

const controller = new MobileNotificationController();
const adminController = new MobileNotificationAdminController();

const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPERADMIN];

router.use(authenticateToken);
router.use(requireRole(allowedRoles));

router.get('/', adminController.getNotifications);

router.post('/', controller.createNotification);

router.patch('/:notificationId/status', adminController.updateStatus);

export default router;
