import { ReturnDeliveriesController } from '@/controllers/return-deliveries.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import {
  uploadMultipleImages,
  uploadReturnDeliveryImagesFields,
} from '@/middlewares/upload.middleware';
import { validate } from '@/middlewares/validation.middleware';
import {
  getDetailImagesReturnDeliverySchema,
  getInformationReceiverSchema,
  getListAllReturnDeliveriesSchema,
  getListCollectCostOfReturnDeliveriesNotCollectedSchema,
  getListCollectCostOfReturnDeliveriesSchema,
  getListCollectForCustomerNotCollectedSchema,
  getListDebtOfReturnDeliveriesTodaySchema,
  getListReportReturnDeliveryWithStatusDoneSchema,
  getListReturnDeliveriesIsReturnSchema,
  getListReturnDeliveriesSchema,
  updateNoteReturnDeliverySchema,
  updateStatusWithImagesSchema,
  updateStatusWithoutImagesSchema,
  uploadReturnDeliveryImagesSchema,
} from '@/schemas/return-deliveries.schema';
import { Router } from 'express';

const router = Router();
const returnDeliveriesController = new ReturnDeliveriesController();

// All debt routes require authentication (any role)
router.use(authenticateToken);
// router.use(requireRole([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.USER]));

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

router.get(
  '/get-list-report-return-delivery-with-status-done',
  validate(getListReportReturnDeliveryWithStatusDoneSchema),
  returnDeliveriesController.getListReportReturnDeliveryWithStatusDone
);

export default router;
