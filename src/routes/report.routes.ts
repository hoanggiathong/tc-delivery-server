import { Router } from 'express';
import { ReportController } from '@/controllers/report.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validation.middleware';
import { getReportReturnMoneyDeliveryAndReturnDeliverySchema } from '@/schemas/report.schema';
import { requireRole } from '@/middlewares/role.middleware';
import { UserRole } from '@/types/user.type';

const router = Router();
const reportController = new ReportController();

router.use(authenticateToken);
router.use(requireRole([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]));

router.get(
  '/return-money-delivery-and-return-delivery',
  validate(getReportReturnMoneyDeliveryAndReturnDeliverySchema),
  reportController.getReportReturnMoneyDeliveryAndReturnDelivery
);

export default router;
