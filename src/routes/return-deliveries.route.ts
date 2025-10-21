import { ReturnDeliveriesController } from '@/controllers/return-deliveries.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { uploadMultipleImages } from '@/middlewares/upload.middleware';
import { validate } from '@/middlewares/validation.middleware';
import {
  getInformationReceiverSchema,
  getListReturnDeliveriesSchema,
  updateStatusReturnDeliverySchema,
  getListDebtOfReturnDeliveriesTodaySchema,
  getListCollectForCustomerNotCollectedSchema,
  getListAllReturnDeliveriesSchema,
  getListReturnDeliveriesIsReturnSchema,
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

router.put(
  '/update-status',
  uploadMultipleImages,
  validate(updateStatusReturnDeliverySchema),
  returnDeliveriesController.updateStatusReturnDelivery
);

router.get(
  '/get-list-debt-of-return-deliveries-today',
  validate(getListDebtOfReturnDeliveriesTodaySchema),
  returnDeliveriesController.getListDebtOfReturnDeliveriesToday
);

router.get(
  '/get-list-collect-for-customer-not-collected',
  validate(getListCollectForCustomerNotCollectedSchema),
  returnDeliveriesController.getListCollectForCustomerOfReturnDeliveriesNotCollected
);

router.get(
  '/get-list-all-return-deliveries',
  validate(getListAllReturnDeliveriesSchema),
  returnDeliveriesController.getListAllReturnDeliveries
);

router.get(
  '/get-list-return-deliveries-is-return',
  validate(getListReturnDeliveriesIsReturnSchema),
  returnDeliveriesController.getListReturnDeliveriesIsReturn
);

export default router;
