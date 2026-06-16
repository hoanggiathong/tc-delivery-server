import { Router } from 'express';
import { VietQrController } from '@/controllers/vietqr.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { UserRole } from '@/types/user.type';

const router = Router();
const vietQrController = new VietQrController();

router.use(authenticateToken);

router.post(
  '/generate',
  requireRole([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]),
  vietQrController.generateQr
);

export default router;
