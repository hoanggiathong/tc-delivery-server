import { EditHistoryController } from '@/controllers/edit-history.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validation.middleware';
import { editHistoryDateRangeSchema } from '@/schemas/edit-history.schema';
import { Router } from 'express';

const router = Router();
const editHistoryController = new EditHistoryController();

router.use(authenticateToken);

router.get(
  '/delivery-logs',
  validate(editHistoryDateRangeSchema),
  editHistoryController.getDeliveryEditLogs
);

router.get(
  '/money-logs',
  validate(editHistoryDateRangeSchema),
  editHistoryController.getMoneyEditLogs
);

router.get(
  '/removed-deliveries',
  validate(editHistoryDateRangeSchema),
  editHistoryController.getRemovedDeliveries
);

router.get(
  '/removed-money-deliveries',
  validate(editHistoryDateRangeSchema),
  editHistoryController.getRemovedMoneyDeliveries
);

export default router;
