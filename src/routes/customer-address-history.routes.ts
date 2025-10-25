import { Router } from 'express';
import { CustomerAddressHistoryController } from '@/controllers/customer-address-history.controller';
import { validate } from '@/middlewares/validation.middleware';
import { authenticateToken } from '@/middlewares/auth.middleware';
import {
  getAddressHistoryParamsSchema,
  createAddressHistorySchema,
  deleteAddressHistorySchema,
} from '@/schemas/customer-address-history.schema';

const router = Router();
const controller = new CustomerAddressHistoryController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Customer Address History
 *   description: Customer home delivery address history management
 */

// GET /api/customer-address-history/:phone - Get all address history by phone
router.get('/:phone', validate(getAddressHistoryParamsSchema), controller.getAddressHistory);

// POST /api/customer-address-history/:phone - Create new address history by phone
router.post('/:phone', validate(createAddressHistorySchema), controller.createAddressHistory);

// DELETE /api/customer-address-history/:phone/:addressHistoryId - Delete address history by phone
router.delete(
  '/:phone/:addressHistoryId',
  validate(deleteAddressHistorySchema),
  controller.deleteAddressHistory
);

export default router;
