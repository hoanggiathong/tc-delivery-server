import { Response } from 'express';
import { DraftDeliveryService } from '@/services/draft-delivery.service';
import { AuthRequest, ApiResponse } from '@/types';
import Logger from '@/utils/logger';

export class DraftDeliveryController {
  private draftDeliveryService: DraftDeliveryService;

  constructor() {
    this.draftDeliveryService = new DraftDeliveryService();
  }

  /**
   * @swagger
   * /api/draft-deliveries:
   *   post:
   *     summary: Create a new draft delivery
   *     tags: [Draft Deliveries]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               senderName:
   *                 type: string
   *                 example: "Nguyễn Văn An"
   *               senderPhone:
   *                 type: string
   *                 example: "+84901234567"
   *               receiverName:
   *                 type: string
   *                 example: "Trần Thị Bình"
   *               receiverPhone:
   *                 type: string
   *                 example: "+84907654321"
   *               fromRouteId:
   *                 type: string
   *                 example: "507f1f77bcf86cd799439011"
   *               toRouteId:
   *                 type: string
   *                 example: "507f1f77bcf86cd799439012"
   *               name:
   *                 type: string
   *                 example: "Quần áo"
   *               cost:
   *                 type: number
   *                 example: 30000
   *               itemValue:
   *                 type: number
   *                 example: 500000
   *               notes:
   *                 type: string
   *                 example: "Hàng dễ vỡ"
   *           examples:
   *             simpleDraft:
   *               summary: Simple draft
   *               value:
   *                 senderName: "Nguyễn Văn An"
   *                 senderPhone: "+84901234567"
   *                 receiverName: "Trần Thị Bình"
   *                 receiverPhone: "+84907654321"
   *                 fromRouteId: "507f1f77bcf86cd799439011"
   *                 toRouteId: "507f1f77bcf86cd799439012"
   *                 name: "Quần áo"
   *                 cost: 30000
   *             detailedDraft:
   *               summary: Detailed draft
   *               value:
   *                 senderName: "Shop ABC"
   *                 senderPhone: "+84908888888"
   *                 receiverName: "Lê Văn Cường"
   *                 receiverPhone: "+84909999999"
   *                 fromRouteId: "507f1f77bcf86cd799439011"
   *                 toRouteId: "507f1f77bcf86cd799439012"
   *                 name: "Điện thoại"
   *                 cost: 50000
   *                 itemValue: 15000000
   *                 itemCost: 150000
   *                 collectForCustomer: 15000000
   *                 collectForCustomerCost: 150000
   *                 notes: "Hàng giá trị cao, cẩn thận"
   *     responses:
   *       201:
   *         description: Draft created successfully
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
   *                   example: "Draft created successfully"
   *                 data:
   *                   type: object
   *             examples:
   *               created:
   *                 summary: Draft created
   *                 value:
   *                   success: true
   *                   message: "Draft created successfully"
   *                   data:
   *                     id: "507f1f77bcf86cd799439030"
   *                     senderName: "Nguyễn Văn An"
   *                     senderPhone: "+84901234567"
   *                     receiverName: "Trần Thị Bình"
   *                     receiverPhone: "+84907654321"
   *                     fromRoute: "507f1f77bcf86cd799439011"
   *                     toRoute: "507f1f77bcf86cd799439012"
   *                     name: "Quần áo"
   *                     cost: 30000
   *                     homeDelivery: null
   *                     homeDeliveryCost: 0
   *                     itemValue: 500000
   *                     itemCost: 5000
   *                     collectCost: 0
   *                     collectForCustomer: 0
   *                     collectForCustomerCost: 0
   *                     collectForCustomerNote: null
   *                     notes: null
   *                     totalCost: 35000
   *                     paymentType: null
   *                     createdByUser: "507f1f77bcf86cd799439040"
   *                     createdAt: "2024-12-17T10:00:00.000Z"
   *                     updatedAt: "2024-12-17T10:00:00.000Z"
   *       400:
   *         description: Validation error
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
   *             examples:
   *               invalidPhone:
   *                 summary: Invalid phone format
   *                 value:
   *                   success: false
   *                   message: "Validation error: Invalid phone number format"
   *       401:
   *         description: Unauthorized
   */
  createDraft = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const draft = await this.draftDeliveryService.createDraft(req.body, req.user.userId);

      Logger.info('Draft delivery created successfully', {
        draftId: draft.id,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Draft created successfully',
        data: draft,
      };

      res.status(201).json(response);
    } catch (error) {
      Logger.error('Failed to create draft delivery', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to create draft';
      const statusCode = message.includes('not found') ? 404 : 400;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/draft-deliveries/{id}:
   *   put:
   *     summary: Update a draft delivery
   *     tags: [Draft Deliveries]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         example: "507f1f77bcf86cd799439030"
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               senderName:
   *                 type: string
   *               senderPhone:
   *                 type: string
   *               receiverName:
   *                 type: string
   *               receiverPhone:
   *                 type: string
   *               name:
   *                 type: string
   *               cost:
   *                 type: number
   *               notes:
   *                 type: string
   *           examples:
   *             updateReceiver:
   *               summary: Update receiver info
   *               value:
   *                 receiverName: "Phạm Văn Đức"
   *                 receiverPhone: "+84906666666"
   *             updateCost:
   *               summary: Update cost
   *               value:
   *                 cost: 45000
   *                 notes: "Đã cập nhật phí giao hàng"
   *     responses:
   *       200:
   *         description: Draft updated successfully
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
   *                   example: "Draft updated successfully"
   *                 data:
   *                   type: object
   *             examples:
   *               updated:
   *                 summary: Draft updated
   *                 value:
   *                   success: true
   *                   message: "Draft updated successfully"
   *                   data:
   *                     id: "507f1f77bcf86cd799439030"
   *                     senderName: "Nguyễn Văn An"
   *                     senderPhone: "+84901234567"
   *                     receiverName: "Phạm Văn Đức"
   *                     receiverPhone: "+84906666666"
   *                     fromRoute: "507f1f77bcf86cd799439011"
   *                     toRoute: "507f1f77bcf86cd799439012"
   *                     name: "Quần áo"
   *                     cost: 45000
   *                     homeDelivery: null
   *                     homeDeliveryCost: 0
   *                     itemValue: 500000
   *                     itemCost: 5000
   *                     collectCost: 0
   *                     collectForCustomer: 0
   *                     collectForCustomerCost: 0
   *                     collectForCustomerNote: null
   *                     notes: "Đã cập nhật phí giao hàng"
   *                     totalCost: 50000
   *                     paymentType: null
   *                     createdByUser: "507f1f77bcf86cd799439040"
   *                     createdAt: "2024-12-17T10:00:00.000Z"
   *                     updatedAt: "2024-12-17T11:00:00.000Z"
   *       400:
   *         description: Validation error
   *       404:
   *         description: Draft not found
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
   *                   example: "Draft not found"
   *       401:
   *         description: Unauthorized
   */
  updateDraft = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      const draft = await this.draftDeliveryService.updateDraft(id, req.body, req.user.userId);

      Logger.info('Draft delivery updated successfully', {
        draftId: id,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Draft updated successfully',
        data: draft,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to update draft delivery', {
        error: error instanceof Error ? error.message : error,
        draftId: req.params.id,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to update draft';
      const statusCode = message.includes('not found') ? 404 : 400;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/draft-deliveries:
   *   get:
   *     summary: Get all draft deliveries for current user's selected route
   *     tags: [Draft Deliveries]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Drafts retrieved successfully
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
   *                   example: "Drafts retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     drafts:
   *                       type: array
   *                       items:
   *                         type: object
   *                     total:
   *                       type: integer
   *             examples:
   *               withDrafts:
   *                 summary: User has drafts
   *                 value:
   *                   success: true
   *                   message: "Drafts retrieved successfully"
   *                   data:
   *                     drafts:
   *                       - id: "507f1f77bcf86cd799439030"
   *                         senderName: "Nguyễn Văn An"
   *                         senderPhone: "+84901234567"
   *                         receiverName: "Trần Thị Bình"
   *                         receiverPhone: "+84907654321"
   *                         fromRoute: "507f1f77bcf86cd799439011"
   *                         toRoute: "507f1f77bcf86cd799439012"
   *                         name: "Quần áo"
   *                         cost: 30000
   *                         homeDelivery: null
   *                         homeDeliveryCost: 0
   *                         itemValue: 500000
   *                         itemCost: 5000
   *                         collectCost: 0
   *                         collectForCustomer: 0
   *                         collectForCustomerCost: 0
   *                         collectForCustomerNote: null
   *                         notes: null
   *                         totalCost: 35000
   *                         paymentType: null
   *                         createdByUser: "507f1f77bcf86cd799439040"
   *                         createdAt: "2024-12-17T10:00:00.000Z"
   *                         updatedAt: "2024-12-17T10:00:00.000Z"
   *                       - id: "507f1f77bcf86cd799439031"
   *                         senderName: "Shop ABC"
   *                         senderPhone: "+84908888888"
   *                         receiverName: "Lê Văn Cường"
   *                         receiverPhone: "+84909999999"
   *                         fromRoute: "507f1f77bcf86cd799439011"
   *                         toRoute: "507f1f77bcf86cd799439012"
   *                         name: "Điện thoại"
   *                         cost: 50000
   *                         homeDelivery: "123 Nguyễn Văn Linh, Q7"
   *                         homeDeliveryCost: 15000
   *                         itemValue: 15000000
   *                         itemCost: 150000
   *                         collectCost: 0
   *                         collectForCustomer: 15000000
   *                         collectForCustomerCost: 150000
   *                         collectForCustomerNote: "Thu hộ tiền bán hàng"
   *                         notes: "Hàng giá trị cao, cẩn thận"
   *                         totalCost: 350000
   *                         paymentType: null
   *                         createdByUser: "507f1f77bcf86cd799439041"
   *                         createdAt: "2024-12-17T09:00:00.000Z"
   *                         updatedAt: "2024-12-17T09:00:00.000Z"
   *                     total: 2
   *               noDrafts:
   *                 summary: No drafts found
   *                 value:
   *                   success: true
   *                   message: "Drafts retrieved successfully"
   *                   data:
   *                     drafts: []
   *                     total: 0
   *       401:
   *         description: Unauthorized
   */
  getUserDrafts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const drafts = await this.draftDeliveryService.getUserDrafts(req.user.userId);

      Logger.info('User drafts retrieved successfully', {
        count: drafts.length,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Drafts retrieved successfully',
        data: { drafts, total: drafts.length },
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get user drafts', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to get drafts';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(400).json(response);
    }
  };

  /**
   * @swagger
   * /api/draft-deliveries/{id}:
   *   get:
   *     summary: Get a draft delivery by ID
   *     tags: [Draft Deliveries]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         example: "507f1f77bcf86cd799439030"
   *     responses:
   *       200:
   *         description: Draft retrieved successfully
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
   *                   example: "Draft retrieved successfully"
   *                 data:
   *                   type: object
   *             examples:
   *               found:
   *                 summary: Draft found
   *                 value:
   *                   success: true
   *                   message: "Draft retrieved successfully"
   *                   data:
   *                     id: "507f1f77bcf86cd799439030"
   *                     senderName: "Nguyễn Văn An"
   *                     senderPhone: "+84901234567"
   *                     receiverName: "Trần Thị Bình"
   *                     receiverPhone: "+84907654321"
   *                     fromRoute: "507f1f77bcf86cd799439011"
   *                     toRoute: "507f1f77bcf86cd799439012"
   *                     name: "Quần áo"
   *                     cost: 30000
   *                     homeDelivery: null
   *                     homeDeliveryCost: 0
   *                     itemValue: 500000
   *                     itemCost: 5000
   *                     collectCost: 0
   *                     collectForCustomer: 0
   *                     collectForCustomerCost: 0
   *                     collectForCustomerNote: null
   *                     notes: null
   *                     totalCost: 35000
   *                     paymentType: null
   *                     createdByUser: "507f1f77bcf86cd799439040"
   *                     createdAt: "2024-12-17T10:00:00.000Z"
   *                     updatedAt: "2024-12-17T10:00:00.000Z"
   *       404:
   *         description: Draft not found
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
   *                   example: "Draft not found"
   *       401:
   *         description: Unauthorized
   */
  getDraftById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      const draft = await this.draftDeliveryService.getDraftById(id, req.user.userId);

      Logger.info('Draft retrieved successfully', {
        draftId: id,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Draft retrieved successfully',
        data: draft,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get draft', {
        error: error instanceof Error ? error.message : error,
        draftId: req.params.id,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to get draft';
      const statusCode = message.includes('not found') ? 404 : 400;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/draft-deliveries/{id}:
   *   delete:
   *     summary: Delete a draft delivery
   *     tags: [Draft Deliveries]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         example: "507f1f77bcf86cd799439030"
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
   *             examples:
   *               deleted:
   *                 summary: Draft deleted
   *                 value:
   *                   success: true
   *                   message: "Draft deleted successfully"
   *       404:
   *         description: Draft not found
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
   *                   example: "Draft not found"
   *       401:
   *         description: Unauthorized
   */
  deleteDraft = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      await this.draftDeliveryService.deleteDraft(id, req.user.userId);

      Logger.info('Draft deleted successfully', {
        draftId: id,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Draft deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to delete draft', {
        error: error instanceof Error ? error.message : error,
        draftId: req.params.id,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to delete draft';
      const statusCode = message.includes('not found') ? 404 : 400;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/draft-deliveries/{id}/convert:
   *   post:
   *     summary: Convert a draft to actual delivery
   *     tags: [Draft Deliveries]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         example: "507f1f77bcf86cd799439030"
   *     responses:
   *       201:
   *         description: Draft converted to delivery successfully
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
   *                   example: "Draft converted to delivery successfully"
   *                 data:
   *                   type: object
   *             examples:
   *               converted:
   *                 summary: Draft converted
   *                 value:
   *                   success: true
   *                   message: "Draft converted to delivery successfully"
   *                   data:
   *                     id: "507f1f77bcf86cd799439050"
   *                     code: "2412170001"
   *                     sender:
   *                       id: "507f1f77bcf86cd799439051"
   *                       name: "Nguyễn Văn An"
   *                       phone: "+84901234567"
   *                     receiver:
   *                       id: "507f1f77bcf86cd799439052"
   *                       name: "Trần Thị Bình"
   *                       phone: "+84907654321"
   *                     fromRoute:
   *                       id: "507f1f77bcf86cd799439011"
   *                       code: "T1"
   *                       name: "TP.HCM"
   *                     toRoute:
   *                       id: "507f1f77bcf86cd799439012"
   *                       code: "T2"
   *                       name: "Hà Nội"
   *                     name: "Quần áo"
   *                     cost: 30000
   *                     totalCost: 30000
   *                     createdAt: "2024-12-17T10:30:00.000Z"
   *       404:
   *         description: Draft not found
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
   *                   example: "Draft not found"
   *       401:
   *         description: Unauthorized
   */
  convertToDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      const delivery = await this.draftDeliveryService.convertToDelivery(id, req.user.userId);

      Logger.info('Draft converted to delivery successfully', {
        draftId: id,
        deliveryId: delivery.id,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Draft converted to delivery successfully',
        data: delivery,
      };

      res.status(201).json(response);
    } catch (error) {
      Logger.error('Failed to convert draft to delivery', {
        error: error instanceof Error ? error.message : error,
        draftId: req.params.id,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to convert draft';
      const statusCode = message.includes('not found') ? 404 : 400;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/draft-deliveries/all:
   *   delete:
   *     summary: Delete all drafts for current user
   *     tags: [Draft Deliveries]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: All drafts deleted successfully
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
   *                   example: "3 drafts deleted successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     deletedCount:
   *                       type: integer
   *             examples:
   *               deleted:
   *                 summary: Multiple drafts deleted
   *                 value:
   *                   success: true
   *                   message: "3 drafts deleted successfully"
   *                   data:
   *                     deletedCount: 3
   *               noDrafts:
   *                 summary: No drafts to delete
   *                 value:
   *                   success: true
   *                   message: "0 drafts deleted successfully"
   *                   data:
   *                     deletedCount: 0
   *       401:
   *         description: Unauthorized
   */
  deleteAllUserDrafts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const result = await this.draftDeliveryService.deleteAllUserDrafts(req.user.userId);

      Logger.info('All user drafts deleted successfully', {
        deletedCount: result.deletedCount,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: `${result.deletedCount} drafts deleted successfully`,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to delete all user drafts', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to delete drafts';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(400).json(response);
    }
  };
}
