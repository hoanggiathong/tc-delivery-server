import { ReturnDeliveriesController } from '@/controllers/return-deliveries.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import {
  uploadMultipleImages,
  uploadReturnDeliveryImagesFields,
} from '@/middlewares/upload.middleware';
import { validate } from '@/middlewares/validation.middleware';
import {
  getInformationReceiverSchema,
  getListReturnDeliveriesSchema,
  getListDebtOfReturnDeliveriesTodaySchema,
  getListCollectForCustomerNotCollectedSchema,
  getListAllReturnDeliveriesSchema,
  getListReturnDeliveriesIsReturnSchema,
  getDetailImagesReturnDeliverySchema,
  updateNoteReturnDeliverySchema,
  uploadReturnDeliveryImagesSchema,
  updateStatusWithImagesSchema,
  updateStatusWithoutImagesSchema,
  getListCollectCostOfReturnDeliveriesNotCollectedSchema,
  getListCollectCostOfReturnDeliveriesSchema,
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

// New API 1: Update status with images (case data = 1)
router.put(
  '/update-status-with-images',
  uploadReturnDeliveryImagesFields,
  validate(updateStatusWithImagesSchema),
  returnDeliveriesController.updateStatusWithImages
);

// New API 2: Update status without images (case update data only)
router.put(
  '/update-status-without-images',
  validate(updateStatusWithoutImagesSchema),
  returnDeliveriesController.updateStatusWithoutImages
);

router.get(
  '/get-list-debt-of-return-deliveries-today',
  validate(getListDebtOfReturnDeliveriesTodaySchema),
  returnDeliveriesController.getListDebtOfReturnDeliveriesToday
);

router.get(
  '/get-list-collect-cost-of-return-deliveries-not-collected',
  validate(getListCollectCostOfReturnDeliveriesNotCollectedSchema),
  returnDeliveriesController.getListCollectCostOfReturnDeliveriesNotCollected
);

router.get(
  '/get-list-collect-for-customer-not-collected',
  validate(getListCollectForCustomerNotCollectedSchema),
  returnDeliveriesController.getListCollectForCustomerOfReturnDeliveriesNotCollected
);

router.get(
  '/get-list-collect-cost-of-return-deliveries',
  validate(getListCollectCostOfReturnDeliveriesSchema),
  returnDeliveriesController.getListCollectCostOfReturnDeliveries
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

router.get(
  '/get-detail-images-return-delivery/:deliveryId',
  validate(getDetailImagesReturnDeliverySchema),
  returnDeliveriesController.getDetailImagesReturnDelivery
);

router.put(
  '/update-note-return-delivery/:deliveryId',
  validate(updateNoteReturnDeliverySchema),
  returnDeliveriesController.updateNoteReturnDelivery
);

router.put(
  '/upload-images',
  uploadMultipleImages,
  validate(uploadReturnDeliveryImagesSchema),
  returnDeliveriesController.uploadImagesReturnDelivery
);

export default router;
