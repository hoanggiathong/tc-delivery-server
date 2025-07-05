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

/**
 * @swagger
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       required:
 *         - name
 *         - phone
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the customer
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Name of the customer
 *         phone:
 *           type: string
 *           pattern: ^\+?[1-9]\d{1,14}$
 *           description: Phone number of the customer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateCustomerRequest:
 *       type: object
 *       required:
 *         - name
 *         - phone
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Name of the customer
 *         phone:
 *           type: string
 *           pattern: ^\+?[1-9]\d{1,14}$
 *           description: Phone number of the customer
 *     UpdateCustomerRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Name of the customer
 *         phone:
 *           type: string
 *           pattern: ^\+?[1-9]\d{1,14}$
 *           description: Phone number of the customer
 */

// All customer routes require authentication and manager/admin/superadmin roles
router.use(authenticateToken);
router.use(requireRole([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]));

// Customer routes
router.post('/', validate(createCustomerSchema), customerController.createCustomer);
router.put('/:id', validate(customerParamsSchema), validate(updateCustomerSchema), customerController.updateCustomer);
router.get('/:id', validate(customerParamsSchema), customerController.getCustomerById);
router.get('/', customerController.getAllCustomers);

export default router;