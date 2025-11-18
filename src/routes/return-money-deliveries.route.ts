import { ReturnMoneyDeliveriesController } from '@/controllers/return-money-deliveries.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { validate } from '@/middlewares/validation.middleware';
import { uploadMoneyDeliveryImagesFields } from '@/middlewares/upload.middleware';
import {
  getListReturnMoneyDeliveriesTypeCollectStatusDoneSchema,
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

router.put(
  '/update-status-with-images',
  uploadMoneyDeliveryImagesFields,
  validate(updateStatusReturnMoneyDeliveryWithImagesSchema),
  returnMoneyDeliveriesController.updateStatusReturnMoneyDeliveryWithImages
);

export default router;
