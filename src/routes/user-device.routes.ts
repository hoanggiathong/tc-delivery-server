import { Router } from 'express';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { UserRole } from '@/types/user.type';
import { UserDeviceController } from '@/controllers/user-device.controller';

const router = Router();
const userDeviceController = new UserDeviceController();

router.use(authenticateToken);

router.get('/', requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), userDeviceController.getList);

router.patch(
  '/:id/force-logout',
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  userDeviceController.forceLogout
);

router.patch(
  '/:id/unlock',
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  userDeviceController.unlockDevice
);

export default router;
