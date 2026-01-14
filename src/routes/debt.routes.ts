import { DebtController } from '@/controllers/debt.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validation.middleware';
import { getListDebtSchema } from '@/schemas/debt.schema';
import { Router } from 'express';

const router = Router();
const debtController = new DebtController();

// All debt routes require authentication (any role)
router.use(authenticateToken);
// router.use(requireRole([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.USER]));

router.get('/get-list-debt', validate(getListDebtSchema), debtController.getListDebt);

export default router;
