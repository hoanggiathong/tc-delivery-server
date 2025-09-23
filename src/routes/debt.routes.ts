import { DebtController } from '@/controllers/debt.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { validate } from '@/middlewares/validation.middleware';
import { getListDebtSchema } from '@/schemas/debt.schema';
import { UserRole } from '@/types/user.type';
import { Router } from 'express';

const router = Router();
const debtController = new DebtController();

// All debt routes require authentication (any role)
router.use(authenticateToken);
router.use(requireRole([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]));

router.get('/get-list-debt', validate(getListDebtSchema), debtController.getListDebt);

export default router;
