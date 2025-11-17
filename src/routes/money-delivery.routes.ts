import { Router } from 'express';
import { MoneyDeliveryController } from '@/controllers/money-delivery.controller';
import { validate } from '@/middlewares/validation.middleware';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { uploadMultipleImages } from '@/middlewares/upload.middleware';
import {
  createMoneyDeliverySchema,
  updateMoneyDeliverySchema,
  moneyDeliveryParamsSchema,
  getNextMoneyDeliveryCodeSchema,
  moneyDeliveryCodeSchema,
  frequentMoneyCustomersSchema,
  moneyDeliveryCostReportSchema,
  updateMoneyDeliveryByFullCodeSchema,
  uploadMoneyDeliveryImagesSchema,
  getDetailImagesMoneyDeliverySchema,
  updateDataImagesMoneyDeliverySchema,
} from '@/schemas/money-delivery.schema';

const router = Router();
const moneyDeliveryController = new MoneyDeliveryController();

/**
 * @swagger
 * components:
 *   schemas:
 *     MoneyDelivery:
 *       type: object
 *       required:
 *         - code
 *         - sender
 *         - receiver
 *         - fromRoute
 *         - toRoute
 *         - sendMoneyAmount
 *         - sendCost
 *         - createdByUser
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the money delivery
 *         code:
 *           type: string
 *           description: The unique code of the money delivery
 *         sender:
 *           $ref: '#/components/schemas/Customer'
 *         receiver:
 *           $ref: '#/components/schemas/Customer'
 *         fromRoute:
 *           $ref: '#/components/schemas/Route'
 *         toRoute:
 *           $ref: '#/components/schemas/Route'
 *         sendMoneyAmount:
 *           type: number
 *           description: The amount of money being sent
 *         sendCost:
 *           type: number
 *           description: The cost for sending money
 *         transferType:
 *           type: string
 *           enum: [regular, express]
 *           description: Transfer type (regular or express)
 *         isFree:
 *           type: boolean
 *           description: Whether the transfer is free
 *         totalCost:
 *           type: number
 *           description: Total cost (sendCost only, excludes sendMoneyAmount)
 *         status:
 *           type: string
 *           enum: [waiting, done]
 *           description: Money delivery status (waiting or done)
 *         type:
 *           type: string
 *           enum: [normal, collect, collectForCustomer]
 *           description: Money delivery type (normal, collect from receiver, or collect for customer)
 *         deliveryId:
 *           type: string
 *           description: Reference to delivery ID (required when type is collect or collectForCustomer)
 *         notes:
 *           type: string
 *           description: Additional notes
 *         createdByUser:
 *           type: string
 *           description: The username of the user who created the money delivery
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateMoneyDeliveryRequest:
 *       type: object
 *       required:
 *         - senderName
 *         - senderPhone
 *         - receiverName
 *         - receiverPhone
 *         - fromRouteId
 *         - toRouteId
 *         - sendMoneyAmount
 *         - sendCost
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
 *         sendMoneyAmount:
 *           type: number
 *           description: Amount of money being sent
 *         sendCost:
 *           type: number
 *           description: Cost for sending money
 *         transferType:
 *           type: string
 *           enum: [regular, express]
 *           description: Transfer type (optional, defaults to regular)
 *         isFree:
 *           type: boolean
 *           description: Whether the transfer is free (optional)
 *         notes:
 *           type: string
 *           description: Additional notes (optional)
 *         status:
 *           type: string
 *           enum: [waiting, done]
 *           description: Money delivery status (optional, defaults to waiting)
 *         type:
 *           type: string
 *           enum: [normal, collect, collectForCustomer]
 *           description: Money delivery type (optional, defaults to normal)
 *         deliveryId:
 *           type: string
 *           description: Delivery reference ID (required when type is collect or collectForCustomer)
 *     UpdateMoneyDeliveryRequest:
 *       type: object
 *       properties:
 *         senderName:
 *           type: string
 *         senderPhone:
 *           type: string
 *         receiverName:
 *           type: string
 *         receiverPhone:
 *           type: string
 *         fromRouteId:
 *           type: string
 *         toRouteId:
 *           type: string
 *         sendMoneyAmount:
 *           type: number
 *         sendCost:
 *           type: number
 *         transferType:
 *           type: string
 *           enum: [regular, express]
 *           description: Transfer type
 *         isFree:
 *           type: boolean
 *           description: Whether the transfer is free
 *         notes:
 *           type: string
 *           description: Additional notes
 *         status:
 *           type: string
 *           enum: [waiting, done]
 *           description: Money delivery status (can only change from waiting to done)
 *         deliveryId:
 *           type: string
 *           description: Delivery reference ID
 *       description: Note - type field cannot be updated after creation
 */

// All money delivery routes require authentication (any role)
router.use(authenticateToken);

// Frequent customers route (must be before /:id to avoid conflicts)
router.get(
  '/frequent-customers/:senderIdentifier',
  validate(frequentMoneyCustomersSchema),
  moneyDeliveryController.getFrequentCustomers
);

// Money delivery routes
router.post('/', validate(createMoneyDeliverySchema), moneyDeliveryController.createMoneyDelivery);
router.get('/', moneyDeliveryController.getAllMoneyDeliveries);

// Next code route (must be before /:id to avoid conflicts)
router.get(
  '/next-code',
  validate(getNextMoneyDeliveryCodeSchema),
  moneyDeliveryController.getNextCode
);

// Cost report route (must be before /:id to avoid conflicts)
router.get(
  '/cost-report',
  validate(moneyDeliveryCostReportSchema),
  moneyDeliveryController.getCostReport
);

// Today report route (must be before /:id to avoid conflicts)
router.get('/today-report', moneyDeliveryController.getTodayReport);

// Get money delivery by code route (must be before /:id to avoid conflicts)
router.get(
  '/code/:deliveryIdentifier',
  validate(moneyDeliveryCodeSchema),
  moneyDeliveryController.getMoneyDeliveryByCode
);

// Update money delivery by fullCode route (must be before /:id to avoid conflicts)
router.put(
  '/code/:fullCode',
  validate(updateMoneyDeliveryByFullCodeSchema),
  moneyDeliveryController.updateMoneyDeliveryByFullCode
);

// Upload images route (must be before /:id to avoid conflicts)
router.put(
  '/upload-images',
  uploadMultipleImages,
  validate(uploadMoneyDeliveryImagesSchema),
  moneyDeliveryController.uploadImagesMoneyDelivery
);

// Get detail images route (must be before /:id to avoid conflicts)
router.get(
  '/get-detail-images-money-delivery/:moneyDeliveryId',
  validate(getDetailImagesMoneyDeliverySchema),
  moneyDeliveryController.getDetailImagesMoneyDelivery
);

// Update data images route (must be before /:id to avoid conflicts)
router.put(
  '/update-data-images-money-delivery/:moneyDeliveryId',
  validate(updateDataImagesMoneyDeliverySchema),
  moneyDeliveryController.updateDataImagesMoneyDelivery
);

router.get(
  '/:id',
  validate(moneyDeliveryParamsSchema),
  moneyDeliveryController.getMoneyDeliveryById
);
router.put(
  '/:id',
  validate(moneyDeliveryParamsSchema),
  validate(updateMoneyDeliverySchema),
  moneyDeliveryController.updateMoneyDelivery
);
router.delete(
  '/:id',
  validate(moneyDeliveryParamsSchema),
  moneyDeliveryController.deleteMoneyDelivery
);

export default router;
