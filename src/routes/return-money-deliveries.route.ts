import { ReturnMoneyDeliveriesController } from '@/controllers/return-money-deliveries.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { validate } from '@/middlewares/validation.middleware';
import { uploadMoneyDeliveryImagesFields } from '@/middlewares/upload.middleware';
import {
  getListReturnMoneyDeliveriesTypeCollectStatusDoneSchema,
  getListOldMoneyDeliveryNotTypeCollectCostSchema,
  getListMoneyDeliveryNotTypeCollectCostWithStatusDoneSchema,
  getListMoneyDeliveryTypeNormalWithStatusWaitingSchema,
  getListMoneyDeliveryTypeCollectCostWithStatusDoneSchema,
  getListReturnMoneyTypeCollectCostWithStatusWaitingSchema,
  getListReportReturnMoneyDeliveryTypeCollectWithStatusDoneSchema,
  getListReportReturnMoneyDeliveryNotTypeCollectWithStatusDoneSchema,
  updateStatusReturnMoneyDeliveryWithImagesSchema,
} from '@/schemas/return-money-deliveries.schema';
import { UserRole } from '@/types/user.type';
import { Router } from 'express';

const router = Router();
const returnMoneyDeliveriesController = new ReturnMoneyDeliveriesController();

// All routes require authentication and specific roles
router.use(authenticateToken);
router.use(requireRole([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]));

router.get(
  '/get-list-return-money-deliveries-type-collect-status-done',
  validate(getListReturnMoneyDeliveriesTypeCollectStatusDoneSchema),
  returnMoneyDeliveriesController.getListReturnMoneyDeliveriesTypeCollectStatusDone
);

router.get(
  '/get-list-old-money-delivery-not-type-collect-cost',
  validate(getListOldMoneyDeliveryNotTypeCollectCostSchema),
  returnMoneyDeliveriesController.getListOldMoneyDeliveryNotTypeCollectCost
);

router.get(
  '/get-list-money-delivery-not-type-collect-cost-with-status-done',
  validate(getListMoneyDeliveryNotTypeCollectCostWithStatusDoneSchema),
  returnMoneyDeliveriesController.getListMoneyDeliveryNotTypeCollectCostWithStatusDone
);

router.get(
  '/get-list-money-delivery-type-collect-cost-with-status-done',
  validate(getListMoneyDeliveryTypeCollectCostWithStatusDoneSchema),
  returnMoneyDeliveriesController.getListMoneyDeliveryTypeCollectCostWithStatusDone
);

router.get(
  '/get-list-money-delivery-type-normal-with-status-waiting',
  validate(getListMoneyDeliveryTypeNormalWithStatusWaitingSchema),
  returnMoneyDeliveriesController.getListMoneyDeliveryTypeNormalWithStatusWaiting
);

router.get(
  '/get-list-return-money-type-collect-cost-with-status-waiting',
  validate(getListReturnMoneyTypeCollectCostWithStatusWaitingSchema),
  returnMoneyDeliveriesController.getListReturnMoneyTypeCollectCostWithStatusWaiting
);

router.get(
  '/get-list-report-return-money-delivery-type-collect-with-status-done',
  validate(getListReportReturnMoneyDeliveryTypeCollectWithStatusDoneSchema),
  returnMoneyDeliveriesController.getListReportReturnMoneyDeliveryTypeCollectWithStatusDone
);

router.get(
  '/get-list-report-return-money-delivery-not-type-collect-with-status-done',
  validate(getListReportReturnMoneyDeliveryNotTypeCollectWithStatusDoneSchema),
  returnMoneyDeliveriesController.getListReportReturnMoneyDeliveryNotTypeCollectWithStatusDone
);

router.put(
  '/update-status-with-images',
  uploadMoneyDeliveryImagesFields,
  validate(updateStatusReturnMoneyDeliveryWithImagesSchema),
  returnMoneyDeliveriesController.updateStatusReturnMoneyDeliveryWithImages
);

export default router;
