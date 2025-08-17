import { Router } from 'express';
import { DraftDeliveryController } from '@/controllers/draft-delivery.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validation.middleware';
import {
  createDraftDeliverySchema,
  updateDraftDeliverySchema,
  getDraftDeliveryByIdSchema,
  deleteDraftDeliverySchema,
  convertDraftToDeliverySchema,
} from '@/schemas/draft-delivery.schema';

const router = Router();
const draftDeliveryController = new DraftDeliveryController();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Draft Deliveries
 *   description: Draft delivery management (temporary delivery data)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateDraftDelivery:
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
 *         name:
 *           type: string
 *         cost:
 *           type: number
 *         homeDelivery:
 *           type: string
 *         homeDeliveryCost:
 *           type: number
 *         itemValue:
 *           type: number
 *         itemCost:
 *           type: number
 *         collectCost:
 *           type: number
 *         collectForCustomer:
 *           type: number
 *         collectForCustomerCost:
 *           type: number
 *         collectForCustomerNote:
 *           type: string
 *         notes:
 *           type: string
 *         paymentType:
 *           type: string
 *           enum: [debt, free, null]
 */

// Create a new draft
router.post('/', validate(createDraftDeliverySchema), draftDeliveryController.createDraft);

// Get all drafts for current user's selected route
router.get('/', draftDeliveryController.getUserDrafts);

// Delete all drafts for current user
router.delete('/all', draftDeliveryController.deleteAllUserDrafts);

// Get a specific draft by ID
router.get('/:id', validate(getDraftDeliveryByIdSchema), draftDeliveryController.getDraftById);

// Update a draft
router.put('/:id', validate(updateDraftDeliverySchema), draftDeliveryController.updateDraft);

// Delete a draft
router.delete('/:id', validate(deleteDraftDeliverySchema), draftDeliveryController.deleteDraft);

// Convert draft to actual delivery
router.post(
  '/:id/convert',
  validate(convertDraftToDeliverySchema),
  draftDeliveryController.convertToDelivery
);

export default router;