import { Router } from 'express';
import { DeliveryController } from '@/controllers/delivery.controller';
import { validate } from '@/middlewares/validation.middleware';
import { authenticateToken } from '@/middlewares/auth.middleware';
import {
  createDeliverySchema,
  updateDeliverySchema,
  deliveryParamsSchema,
  getNextCodeSchema,
  deliveryCodeSchema,
  frequentCustomersSchema,
  deliveryCostReportSchema,
} from '@/schemas/delivery.schema';

const router = Router();
const deliveryController = new DeliveryController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Delivery:
 *       type: object
 *       required:
 *         - code
 *         - sender
 *         - receiver
 *         - fromRoute
 *         - toRoute
 *         - name
 *         - cost
 *         - createdByUser
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the delivery
 *         code:
 *           type: string
 *           description: The unique code of the delivery
 *         sender:
 *           $ref: '#/components/schemas/Customer'
 *         receiver:
 *           $ref: '#/components/schemas/Customer'
 *         fromRoute:
 *           $ref: '#/components/schemas/Route'
 *         toRoute:
 *           $ref: '#/components/schemas/Route'
 *         name:
 *           type: string
 *           description: Name of the delivery item
 *         cost:
 *           type: number
 *           description: The cost for delivery
 *         homeDelivery:
 *           type: string
 *           description: Home delivery option
 *         homeDeliveryCost:
 *           type: number
 *           description: Cost for home delivery
 *         itemValue:
 *           type: number
 *           description: Value of the item
 *         itemCost:
 *           type: number
 *           description: Cost for item handling
 *         collectCost:
 *           type: number
 *           description: Cost for collection
 *         collectForCustomer:
 *           type: boolean
 *           description: Whether to collect for customer
 *         collectForCustomerCost:
 *           type: number
 *           description: Cost for collecting for customer
 *         collectForCustomerNote:
 *           type: string
 *           description: Note for customer collection
 *         createdByUser:
 *           type: string
 *           description: The username of the user who created the delivery
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateDeliveryRequest:
 *       type: object
 *       required:
 *         - senderName
 *         - senderPhone
 *         - receiverName
 *         - receiverPhone
 *         - fromRouteId
 *         - toRouteId
 *         - name
 *         - cost
 *         - homeDelivery
 *         - homeDeliveryCost
 *         - itemValue
 *         - itemCost
 *         - collectCost
 *         - collectForCustomer
 *         - collectForCustomerCost
 *         - collectForCustomerNote
 *       properties:
 *         senderName:
 *           type: string
 *           description: Name of the sender
 *         senderPhone:
 *           type: string
 *           description: Phone number of the sender
 *         receiverName:
 *           type: string
 *           description: Name of the receiver
 *         receiverPhone:
 *           type: string
 *           description: Phone number of the receiver
 *         fromRouteId:
 *           type: string
 *           description: ID of the source route
 *         toRouteId:
 *           type: string
 *           description: ID of the destination route
 *         name:
 *           type: string
 *           description: Name of the delivery item
 *         cost:
 *           type: number
 *           description: The cost for delivery
 *         homeDelivery:
 *           type: string
 *           description: Home delivery option
 *         homeDeliveryCost:
 *           type: number
 *           description: Cost for home delivery
 *         itemValue:
 *           type: number
 *           description: Value of the item
 *         itemCost:
 *           type: number
 *           description: Cost for item handling
 *         collectCost:
 *           type: number
 *           description: Cost for collection
 *         collectForCustomer:
 *           type: boolean
 *           description: Whether to collect for customer
 *         collectForCustomerCost:
 *           type: number
 *           description: Cost for collecting for customer
 *         collectForCustomerNote:
 *           type: string
 *           description: Note for customer collection
 *     UpdateDeliveryRequest:
 *       type: object
 *       properties:
 *         senderName:
 *           type: string
 *           description: Name of the sender
 *         senderPhone:
 *           type: string
 *           description: Phone number of the sender
 *         receiverName:
 *           type: string
 *           description: Name of the receiver
 *         receiverPhone:
 *           type: string
 *           description: Phone number of the receiver
 *         fromRouteId:
 *           type: string
 *           description: ID of the source route
 *         toRouteId:
 *           type: string
 *           description: ID of the destination route
 *         name:
 *           type: string
 *           description: Name of the delivery item
 *         cost:
 *           type: number
 *           description: The cost for delivery
 *         homeDelivery:
 *           type: string
 *           description: Home delivery option
 *         homeDeliveryCost:
 *           type: number
 *           description: Cost for home delivery
 *         itemValue:
 *           type: number
 *           description: Value of the item
 *         itemCost:
 *           type: number
 *           description: Cost for item handling
 *         collectCost:
 *           type: number
 *           description: Cost for collection
 *         collectForCustomer:
 *           type: boolean
 *           description: Whether to collect for customer
 *         collectForCustomerCost:
 *           type: number
 *           description: Cost for collecting for customer
 *         collectForCustomerNote:
 *           type: string
 *           description: Note for customer collection
 */

// All delivery routes require authentication (any role)
router.use(authenticateToken);

// Delivery routes
router.post('/', validate(createDeliverySchema), deliveryController.createDelivery);
router.get('/', deliveryController.getAllDeliveries);

// Next code route (must be before /:id to avoid conflicts)
router.get('/next-code', validate(getNextCodeSchema), deliveryController.getNextCode);

// Cost report route (must be before /:id to avoid conflicts)
router.get('/cost-report', validate(deliveryCostReportSchema), deliveryController.getCostReport);

// Get delivery by code route (must be before /:id to avoid conflicts)
router.get(
  '/code/:deliveryIdentifier',
  validate(deliveryCodeSchema),
  deliveryController.getDeliveryByCode
);

// Related deliveries route (must be before /:id to avoid conflicts)
router.get('/related/:senderName', deliveryController.getRelatedDeliveriesBySender);

// Frequent customers route (must be before /:id to avoid conflicts)
router.get(
  '/frequent-customers/:senderIdentifier',
  validate(frequentCustomersSchema),
  deliveryController.getFrequentCustomers
);

router.get('/:id', validate(deliveryParamsSchema), deliveryController.getDeliveryById);
router.put(
  '/:id',
  validate(deliveryParamsSchema),
  validate(updateDeliverySchema),
  deliveryController.updateDelivery
);
router.delete('/:id', validate(deliveryParamsSchema), deliveryController.deleteDelivery);

export default router;
