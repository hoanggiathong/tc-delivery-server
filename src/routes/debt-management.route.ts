import { DebtManagementController } from '@/controllers/debt-management.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validation.middleware';
import {
  createDebtManagementSchema,
  deleteDebtManagementSchema,
  exportReportDebtAndDebtManagementSchema,
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

router.get(
  '/export-report-debt-and-debt-management',
  validate(exportReportDebtAndDebtManagementSchema),
  debtManagementController.exportReportDebtAndDebtManagement
);

router.post(
  '/create',
  validate(createDebtManagementSchema),
  debtManagementController.createDebtManagement
);

router.put(
  '/:id',
  validate(deleteDebtManagementSchema),
  debtManagementController.deleteDebtManagement
);

export default router;
