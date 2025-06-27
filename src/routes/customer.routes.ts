import { Router } from 'express';
import { CustomerController } from '@/controllers/customer.controller';
import { validate } from '@/middlewares/validation.middleware';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { UserRole } from '@/types/user.type';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerParamsSchema
} from '@/schemas/customer.schema';

const router = Router();
const customerController = new CustomerController();

// All customer routes require authentication and manager/admin/superadmin roles
router.use(authenticateToken);
router.use(requireRole([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]));

// Customer routes
router.post('/', validate(createCustomerSchema), customerController.createCustomer);
router.put('/:id', validate(customerParamsSchema), validate(updateCustomerSchema), customerController.updateCustomer);
router.get('/:id', validate(customerParamsSchema), customerController.getCustomerById);
router.get('/', customerController.getAllCustomers);

export default router;