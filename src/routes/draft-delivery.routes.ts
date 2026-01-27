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

// Get all drafts for current user's selected route
router.get('/', draftDeliveryController.getUserDrafts);

// Create a new draft
router.post('/', validate(createDraftDeliverySchema), draftDeliveryController.createDraft);

// Delete all drafts for current user
router.delete('/all', draftDeliveryController.deleteAllUserDrafts);

// Get a specific draft by ID
router.get('/:id', validate(getDraftDeliveryByIdSchema), draftDeliveryController.getDraftById);

// Update a draft
router.put('/:id', validate(updateDraftDeliverySchema), draftDeliveryController.updateDraft);

/**
 * @swagger
 * /api/draft-deliveries/{id}:
 *   delete:
 *     summary: Delete a draft delivery
 *     description: Delete a draft delivery by ID. Only the owner can delete their own drafts.
 *     tags: [Draft Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Draft delivery ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Draft deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Draft deleted successfully"
 *       400:
 *         description: Bad request - Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid ObjectId format"
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       404:
 *         description: Draft not found or no permission
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Draft not found or you do not have permission to delete it"
 */
// Delete a draft
router.delete('/:id', validate(deleteDraftDeliverySchema), draftDeliveryController.deleteDraft);

// Convert draft to actual delivery
router.post(
  '/:id/convert',
  validate(convertDraftToDeliverySchema),
  draftDeliveryController.convertToDelivery
);
export default router;
