import { Router } from 'express';
import { DeliveryController } from '@/controllers/delivery.controller';
import { validate } from '@/middlewares/validation.middleware';
import { authenticateToken } from '@/middlewares/auth.middleware';
import {
  createDeliverySchema,
  updateDeliverySchema,
  deliveryParamsSchema
} from '@/schemas/delivery.schema';

const router = Router();
const deliveryController = new DeliveryController();

// All delivery routes require authentication (any role)
router.use(authenticateToken);

// Delivery routes
router.post('/', validate(createDeliverySchema), deliveryController.createDelivery);
router.put('/:id', validate(deliveryParamsSchema), validate(updateDeliverySchema), deliveryController.updateDelivery);
router.get('/:id', validate(deliveryParamsSchema), deliveryController.getDeliveryById);
router.get('/', deliveryController.getAllDeliveries);

export default router;