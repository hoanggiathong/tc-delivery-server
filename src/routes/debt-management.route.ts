import { DebtManagementController } from '@/controllers/debt-management.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validation.middleware';
import {
  createDebtManagementSchema,
  debtManagementParamsSchema,
  getListPaymentDebtManagementSchema,
  getListReceiptDebtManagementSchema,
} from '@/schemas/debt-management.schema';
import { Router } from 'express';

const router = Router();
const debtManagementController = new DebtManagementController();

// All debt routes require authentication (any role)
router.use(authenticateToken);
// router.use(requireRole([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.USER]));

router.get(
  '/get-list-payment',
  validate(getListPaymentDebtManagementSchema),
  debtManagementController.getListPayment
);

router.get(
  '/get-list-receipt',
  validate(getListReceiptDebtManagementSchema),
  debtManagementController.getListReceipt
);

router.post(
  '/create',
  validate(createDebtManagementSchema),
  debtManagementController.createDebtManagement
);

router.delete(
  '/:id',
  validate(debtManagementParamsSchema),
  debtManagementController.deleteDebtManagement
);

export default router;
