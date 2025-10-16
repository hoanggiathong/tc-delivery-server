import { ReturnDeliveriesController } from '@/controllers/return-deliveries.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { validate } from '@/middlewares/validation.middleware';
import {
  getInformationReceiverSchema,
  getListReturnDeliveriesSchema,
} from '@/schemas/return-deliveries.schema';
import { UserRole } from '@/types/user.type';
import { Router } from 'express';

const router = Router();
const returnDeliveriesController = new ReturnDeliveriesController();

// All debt routes require authentication (any role)
router.use(authenticateToken);
router.use(requireRole([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]));

router.get(
  '/information-receiver/:phoneReceiver',
  validate(getInformationReceiverSchema),
  returnDeliveriesController.getInformationReceiver
);

router.get(
  '/get-list-return-deliveries',
  validate(getListReturnDeliveriesSchema),
  returnDeliveriesController.getListReturnDeliveries
);

export default router;
