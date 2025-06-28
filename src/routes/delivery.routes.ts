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
router.get('/', deliveryController.getAllDeliveries);

// Related deliveries route (must be before /:id to avoid conflicts)
router.get('/related/:senderName', deliveryController.getRelatedDeliveriesBySender);

router.get('/:id', validate(deliveryParamsSchema), deliveryController.getDeliveryById);
router.put('/:id', validate(deliveryParamsSchema), validate(updateDeliverySchema), deliveryController.updateDelivery);
router.delete('/:id', validate(deliveryParamsSchema), deliveryController.deleteDelivery);

export default router;