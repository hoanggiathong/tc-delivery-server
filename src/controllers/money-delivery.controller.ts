import { Response } from 'express';
import { MoneyDeliveryService } from '@/services/money-delivery.service';
import { RemovedMoneyDeliveryService } from '@/services/money-delivery-removed.service';
import {
  CreateMoneyDeliveryRequest,
  UpdateMoneyDeliveryRequest,
  UpdateMoneyDeliveryByFullCodeRequest,
} from '@/schemas/money-delivery.schema';
import { AuthRequest, ApiResponse, AuthRequestWithFileUploads, DateRangeQuery } from '@/types';
import logger from '@/utils/logger';

export class MoneyDeliveryController {
  private moneyDeliveryService: MoneyDeliveryService;
  private removedMoneyDeliveryService: RemovedMoneyDeliveryService;

  constructor() {
    this.moneyDeliveryService = new MoneyDeliveryService();
    this.removedMoneyDeliveryService = new RemovedMoneyDeliveryService();
  }

  /**
   * Create a new money delivery
   * POST /api/money-deliveries
   * @swagger
   * /api/money-deliveries:
   *   post:
   *     summary: Create a new money delivery
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - senderName
   *               - senderPhone
   *               - receiverName
   *               - receiverPhone
   *               - toRouteId
   *               - sendMoneyAmount
   *               - sendCost
   *             properties:
   *               senderName:
   *                 type: string
   *                 description: Name of the sender
   *                 example: "Nguyen Van A"
   *               senderPhone:
   *                 type: string
   *                 description: Phone number of the sender
   *                 example: "+84123456789"
   *               receiverName:
   *                 type: string
   *                 description: Name of the receiver
   *                 example: "Tran Thi B"
   *               receiverPhone:
   *                 type: string
   *                 description: Phone number of the receiver
   *                 example: "+84987654321"
   *               fromRouteId:
   *                 type: string
   *                 description: ObjectId of the from route (automatically set from user's selectedRouteId - optional)
   *                 example: "507f1f77bcf86cd799439011"
   *               toRouteId:
   *                 type: string
   *                 description: ObjectId of the to route
   *                 example: "507f1f77bcf86cd799439012"
   *               sendMoneyAmount:
   *                 type: number
   *                 description: Amount of money to send
   *                 example: 1000000
   *               sendCost:
   *                 type: number
   *                 description: Service cost for money transfer
   *                 example: 50000
   *               transferType:
   *                 type: string
   *                 enum: [regular, express]
   *                 description: Transfer type (default is regular)
   *                 example: "regular"
   *               isFree:
   *                 type: boolean
   *                 description: Whether the transfer is free (default is false)
   *                 example: false
   *               notes:
   *                 type: string
   *                 description: Optional notes for the money delivery
   *                 example: "Gửi tiền sinh nhật"
   *           examples:
   *             regular:
   *               summary: Regular money transfer
   *               value:
   *                 senderName: "Nguyen Van A"
   *                 senderPhone: "+84123456789"
   *                 receiverName: "Tran Thi B"
   *                 receiverPhone: "+84987654321"
   *                 toRouteId: "507f1f77bcf86cd799439012"
   *                 sendMoneyAmount: 1000000
   *                 sendCost: 50000
   *                 transferType: "regular"
   *                 isFree: false
   *                 notes: "Gửi tiền sinh nhật"
   *             express:
   *               summary: Express money transfer
   *               value:
   *                 senderName: "Le Van C"
   *                 senderPhone: "+84333444555"
   *                 receiverName: "Pham Thi D"
   *                 receiverPhone: "+84666777888"
   *                 toRouteId: "507f1f77bcf86cd799439012"
   *                 sendMoneyAmount: 5000000
   *                 sendCost: 100000
   *                 transferType: "express"
   *                 isFree: false
   *                 notes: "Gửi tiền khẩn cấp"
   *             free:
   *               summary: Free money transfer
   *               value:
   *                 senderName: "Hoang Van E"
   *                 senderPhone: "+84111222333"
   *                 receiverName: "Vu Thi F"
   *                 receiverPhone: "+84444555666"
   *                 toRouteId: "507f1f77bcf86cd799439012"
   *                 sendMoneyAmount: 500000
   *                 sendCost: 0
   *                 transferType: "regular"
   *                 isFree: true
   *                 notes: "Chuyển tiền miễn phí"
   *     responses:
   *       201:
   *         description: Money delivery created successfully
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
   *                   example: "Money delivery created successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       example: "507f1f77bcf86cd799439013"
   *                     code:
   *                       type: string
   *                       example: "2412170001"
   *                     sender:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         name:
   *                           type: string
   *                         phone:
   *                           type: string
   *                     receiver:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         name:
   *                           type: string
   *                         phone:
   *                           type: string
   *                     sendMoneyAmount:
   *                       type: number
   *                     sendCost:
   *                       type: number
   *                       description: Calculated fee based on shipping rates
   *                     transferType:
   *                       type: string
   *                       enum: [regular, express]
   *                     isFree:
   *                       type: boolean
   *                       description: Whether the transfer is free
   *                     totalCost:
   *                       type: number
   *                       description: Total cost (0 for free transfers)
   *             examples:
   *               regularTransfer:
   *                 summary: Regular transfer created
   *                 value:
   *                   success: true
   *                   message: "Money delivery created successfully"
   *                   data:
   *                     id: "507f1f77bcf86cd799439013"
   *                     code: "2412170001"
   *                     sender:
   *                       id: "507f1f77bcf86cd799439014"
   *                       name: "Nguyen Van A"
   *                       phone: "+84123456789"
   *                       createdAt: "2024-12-17T10:00:00.000Z"
   *                       updatedAt: "2024-12-17T10:00:00.000Z"
   *                     receiver:
   *                       id: "507f1f77bcf86cd799439015"
   *                       name: "Tran Thi B"
   *                       phone: "+84987654321"
   *                       createdAt: "2024-12-17T10:00:00.000Z"
   *                       updatedAt: "2024-12-17T10:00:00.000Z"
   *                     fromRoute:
   *                       id: "507f1f77bcf86cd799439011"
   *                       code: "T1"
   *                       name: "Tuyến 1"
   *                       createdAt: "2024-01-01T00:00:00.000Z"
   *                       updatedAt: "2024-01-01T00:00:00.000Z"
   *                     toRoute:
   *                       id: "507f1f77bcf86cd799439012"
   *                       code: "T2"
   *                       name: "Tuyến 2"
   *                       createdAt: "2024-01-01T00:00:00.000Z"
   *                       updatedAt: "2024-01-01T00:00:00.000Z"
   *                     sendMoneyAmount: 1000000
   *                     sendCost: 50000
   *                     transferType: "regular"
   *                     isFree: false
   *                     totalCost: 50000
   *                     notes: "Gửi tiền sinh nhật"
   *                     createdByUser: "testuser"
   *                     createdAt: "2024-12-17T10:00:00.000Z"
   *                     updatedAt: "2024-12-17T10:00:00.000Z"
   *               freeTransfer:
   *                 summary: Free transfer created
   *                 value:
   *                   success: true
   *                   message: "Money delivery created successfully"
   *                   data:
   *                     id: "507f1f77bcf86cd799439016"
   *                     code: "2412170002"
   *                     sendMoneyAmount: 500000
   *                     sendCost: 0
   *                     transferType: "regular"
   *                     isFree: true
   *                     totalCost: 0
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
   *                 summary: Invalid phone number
   *                 value:
   *                   success: false
   *                   message: "Validation error: Please enter a valid sender phone number"
   *               missingRequired:
   *                 summary: Missing required field
   *                 value:
   *                   success: false
   *                   message: "Validation error: Sender name is required"
   *       401:
   *         description: Unauthorized
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
   *                   example: "User not authenticated"
   *       404:
   *         description: Route not found
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
   *               fromRouteNotFound:
   *                 summary: From route not found
   *                 value:
   *                   success: false
   *                   message: "From route not found"
   *               toRouteNotFound:
   *                 summary: To route not found
   *                 value:
   *                   success: false
   *                   message: "To route not found"
   */
  createMoneyDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const moneyDeliveryData: CreateMoneyDeliveryRequest = req.body;
      const userId = req.user.userId;

      const moneyDelivery = await this.moneyDeliveryService.createMoneyDelivery(
        moneyDeliveryData,
        userId
      );

      logger.info(`Money delivery created: ${moneyDelivery.code} by user: ${userId}`);

      const response: ApiResponse = {
        success: true,
        message: 'Money delivery created successfully',
        data: moneyDelivery,
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Error creating money delivery:', error);
      const message = error instanceof Error ? error.message : 'Failed to create money delivery';

      // Determine appropriate status code based on error message
      let statusCode = 500;
      if (message.includes('not found')) {
        statusCode = 404;
      } else if (message.includes('validation') || message.includes('invalid')) {
        statusCode = 400;
      }

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * Get all money deliveries
   * GET /api/money-deliveries
   * @swagger
   * /api/money-deliveries:
   *   get:
   *     summary: Get all money deliveries
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Money deliveries retrieved successfully
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
   *                   example: "Money deliveries retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     moneyDeliveries:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                           code:
   *                             type: string
   *                           sender:
   *                             type: object
   *                           receiver:
   *                             type: object
   *                           sendMoneyAmount:
   *                             type: number
   *                           sendCost:
   *                             type: number
   *                           transferType:
   *                             type: string
   *                           totalCost:
   *                             type: number
   *                     count:
   *                       type: number
   *                       example: 2
   *             examples:
   *               multipleDeliveries:
   *                 summary: Multiple money deliveries
   *                 value:
   *                   success: true
   *                   message: "Money deliveries retrieved successfully"
   *                   data:
   *                     moneyDeliveries:
   *                       - id: "507f1f77bcf86cd799439013"
   *                         code: "2412170001"
   *                         sender:
   *                           id: "507f1f77bcf86cd799439014"
   *                           name: "Nguyen Van A"
   *                           phone: "+84123456789"
   *                         receiver:
   *                           id: "507f1f77bcf86cd799439015"
   *                           name: "Tran Thi B"
   *                           phone: "+84987654321"
   *                         sendMoneyAmount: 1000000
   *                         sendCost: 50000
   *                         transferType: "regular"
   *                         isFree: false
   *                         totalCost: 50000
   *                         createdAt: "2024-12-17T10:00:00.000Z"
   *                       - id: "507f1f77bcf86cd799439016"
   *                         code: "2412170002"
   *                         sender:
   *                           id: "507f1f77bcf86cd799439017"
   *                           name: "Le Van C"
   *                           phone: "+84333444555"
   *                         receiver:
   *                           id: "507f1f77bcf86cd799439018"
   *                           name: "Pham Thi D"
   *                           phone: "+84666777888"
   *                         sendMoneyAmount: 5000000
   *                         sendCost: 100000
   *                         transferType: "express"
   *                         isFree: false
   *                         totalCost: 100000
   *                         createdAt: "2024-12-17T11:00:00.000Z"
   *                     count: 2
   *               emptyList:
   *                 summary: No money deliveries found
   *                 value:
   *                   success: true
   *                   message: "Money deliveries retrieved successfully"
   *                   data:
   *                     moneyDeliveries: []
   *                     count: 0
   *       401:
   *         description: Unauthorized
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
   *                   example: "User not authenticated"
   */
  getAllMoneyDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const moneyDeliveries = await this.moneyDeliveryService.getAllMoneyDeliveries();

      logger.info(`Retrieved ${moneyDeliveries.length} money deliveries`);

      const response: ApiResponse = {
        success: true,
        message: 'Money deliveries retrieved successfully',
        data: { moneyDeliveries, count: moneyDeliveries.length },
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error retrieving money deliveries:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to retrieve money deliveries';

      // Determine appropriate status code based on error message
      let statusCode = 500;
      if (message.includes('not found')) {
        statusCode = 404;
      } else if (message.includes('validation') || message.includes('invalid')) {
        statusCode = 400;
      }

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * Get money delivery by ID
   * GET /api/money-deliveries/:id
   * @swagger
   * /api/money-deliveries/{id}:
   *   get:
   *     summary: Get money delivery by ID
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Money delivery ID
   *     responses:
   *       200:
   *         description: Money delivery retrieved successfully
   *       404:
   *         description: Money delivery not found
   *       401:
   *         description: Unauthorized
   */
  getMoneyDeliveryById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;

      const moneyDelivery = await this.moneyDeliveryService.getMoneyDeliveryById(id);

      if (!moneyDelivery) {
        const response: ApiResponse = {
          success: false,
          message: 'Money delivery not found',
        };
        res.status(404).json(response);
        return;
      }

      logger.info(`Retrieved money delivery: ${moneyDelivery.code}`);

      const response: ApiResponse = {
        success: true,
        message: 'Money delivery retrieved successfully',
        data: moneyDelivery,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error retrieving money delivery:', error);
      const message = error instanceof Error ? error.message : 'Failed to retrieve money delivery';

      // Determine appropriate status code based on error message
      let statusCode = 500;
      if (message.includes('not found')) {
        statusCode = 404;
      } else if (message.includes('validation') || message.includes('invalid')) {
        statusCode = 400;
      }

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * Update money delivery by ID
   * PUT /api/money-deliveries/:id
   * @swagger
   * /api/money-deliveries/{id}:
   *   put:
   *     summary: Update money delivery by ID
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Money delivery ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               senderName:
   *                 type: string
   *                 description: Name of the sender
   *                 example: "Nguyen Van A"
   *               senderPhone:
   *                 type: string
   *                 description: Phone number of the sender
   *                 example: "+84123456789"
   *               receiverName:
   *                 type: string
   *                 description: Name of the receiver
   *                 example: "Tran Thi B"
   *               receiverPhone:
   *                 type: string
   *                 description: Phone number of the receiver
   *                 example: "+84987654321"
   *               fromRouteId:
   *                 type: string
   *                 description: ObjectId of the from route (automatically set from user's selectedRouteId - optional)
   *                 example: "507f1f77bcf86cd799439011"
   *               toRouteId:
   *                 type: string
   *                 description: ObjectId of the to route
   *                 example: "507f1f77bcf86cd799439012"
   *               sendMoneyAmount:
   *                 type: number
   *                 description: Amount of money to send
   *                 example: 2000000
   *               sendCost:
   *                 type: number
   *                 description: Service cost for money transfer
   *                 example: 75000
   *               transferType:
   *                 type: string
   *                 enum: [regular, express]
   *                 description: Transfer type
   *                 example: "express"
   *               isFree:
   *                 type: boolean
   *                 description: Whether the transfer is free
   *                 example: false
   *               notes:
   *                 type: string
   *                 description: Optional notes for the money delivery
   *                 example: "Cập nhật thông tin"
   *           examples:
   *             updateTransferType:
   *               summary: Update transfer type to express
   *               value:
   *                 transferType: "express"
   *                 notes: "Chuyển sang gửi nhanh"
   *             updateAmount:
   *               summary: Update money amount
   *               value:
   *                 sendMoneyAmount: 3000000
   *                 sendCost: 80000
   *             setFree:
   *               summary: Set transfer as free
   *               value:
   *                 isFree: true
   *                 notes: "Miễn phí phí chuyển tiền"
   *     responses:
   *       200:
   *         description: Money delivery updated successfully
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
   *                   example: "Money delivery updated successfully"
   *                 data:
   *                   type: object
   *             examples:
   *               updatedToExpress:
   *                 summary: Updated to express transfer
   *                 value:
   *                   success: true
   *                   message: "Money delivery updated successfully"
   *                   data:
   *                     id: "507f1f77bcf86cd799439013"
   *                     code: "2412170001"
   *                     sendMoneyAmount: 1000000
   *                     sendCost: 50000
   *                     transferType: "express"
   *                     isFree: false
   *                     totalCost: 50000
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
   *                   example: "Validation error: Invalid phone number"
   *       404:
   *         description: Money delivery not found
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
   *                   example: "Money delivery not found"
   *       401:
   *         description: Unauthorized
   */
  updateMoneyDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      const updateData: UpdateMoneyDeliveryRequest = req.body;

      const updatedMoneyDelivery = await this.moneyDeliveryService.updateMoneyDelivery(
        id,
        updateData,
        req.user.userId
      );

      logger.info(`Money delivery updated: ${updatedMoneyDelivery.code}`);

      const response: ApiResponse = {
        success: true,
        message: 'Money delivery updated successfully',
        data: updatedMoneyDelivery,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error updating money delivery:', error);

      const message = error instanceof Error ? error.message : 'Failed to update money delivery';
      const statusCode = message.includes('not found') ? 404 : 500;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * Delete money delivery by fullCode (soft delete with password verification)
   * DELETE /api/money-deliveries/:fullCode
   * @swagger
   * /api/money-deliveries/{fullCode}:
   *   delete:
   *     summary: Delete money delivery by fullCode (soft delete)
   *     description: Moves the money delivery to removed collection with password verification. The removed record will be automatically deleted after 90 days.
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: fullCode
   *         required: true
   *         schema:
   *           type: string
   *         description: Money delivery full code (e.g., 2712250001T4T1-T)
   *         example: "2712250001T4T1-T"
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - password
   *               - reason
   *             properties:
   *               password:
   *                 type: string
   *                 description: User's password for verification
   *                 example: "password123"
   *               reason:
   *                 type: string
   *                 description: Reason for deletion (max 500 characters)
   *                 example: "Duplicate entry - created by mistake"
   *     responses:
   *       200:
   *         description: Money delivery deleted successfully
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
   *                   example: "Money delivery deleted successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     deletedMoneyDelivery:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         fullCode:
   *                           type: string
   *                         deletedAt:
   *                           type: string
   *                           format: date-time
   *                         reason:
   *                           type: string
   *       400:
   *         description: Invalid password
   *       404:
   *         description: Money delivery not found
   *       401:
   *         description: Unauthorized
   */
  deleteMoneyDeliveryByFullCode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const { fullCode } = req.params;
      const { password, reason } = req.body;

      const result = await this.removedMoneyDeliveryService.moveMoneyDeliveryToRemoved(
        fullCode,
        req.user.userId,
        password,
        reason
      );

      logger.info(`Money delivery soft deleted: ${fullCode}`, {
        deletedBy: req.user.userId,
        reason,
      });

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error deleting money delivery:', error);

      const message = error instanceof Error ? error.message : 'Failed to delete money delivery';
      let statusCode = 500;
      if (message.includes('not found')) {
        statusCode = 404;
      } else if (message.includes('Invalid password')) {
        statusCode = 400;
      }

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * Get next money delivery code for a specific route
   * GET /api/money-deliveries/next-code
   * @swagger
   * /api/money-deliveries/next-code:
   *   get:
   *     summary: Get next available money delivery code
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: toRouteId
   *         required: true
   *         schema:
   *           type: string
   *           pattern: '^[0-9a-fA-F]{24}$'
   *         description: ObjectId of the destination route
   *         example: "507f1f77bcf86cd799439011"
   *     responses:
   *       200:
   *         description: Next code retrieved successfully
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
   *                   example: "Next money delivery code retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     nextCode:
   *                       type: string
   *                       example: "2407240001"
   *                     toRoute:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         code:
   *                           type: string
   *                         name:
   *                           type: string
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Route not found
   */
  getNextCode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const { toRouteId } = req.query;
      const result = await this.moneyDeliveryService.getNextCode(
        toRouteId as string,
        req.user.userId
      );

      logger.info(
        `Generated next money delivery code: ${result.nextCode} for route: ${result.toRoute.code}`
      );

      const response: ApiResponse = {
        success: true,
        message: 'Next money delivery code generated successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error generating next money delivery code:', error);

      const message =
        error instanceof Error ? error.message : 'Failed to generate next money delivery code';
      const statusCode = message.includes('not found') ? 404 : 500;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * Get money delivery by code
   * GET /api/money-deliveries/code/:deliveryIdentifier
   * @swagger
   * /api/money-deliveries/code/{deliveryIdentifier}:
   *   get:
   *     summary: Get money delivery by code and route combination
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: deliveryIdentifier
   *         required: true
   *         schema:
   *           type: string
   *           example: "0907250001T4T1-T"
   *         description: Money delivery identifier in format codeFromRouteToRoute-T (e.g., 0907250001T4T1-T)
   *     responses:
   *       200:
   *         description: Money delivery retrieved successfully
   *       400:
   *         description: Invalid delivery identifier format
   *       404:
   *         description: Money delivery not found
   *       401:
   *         description: Unauthorized
   */
  getMoneyDeliveryByCode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const { deliveryIdentifier } = req.params;

      const moneyDelivery =
        await this.moneyDeliveryService.getMoneyDeliveryByCode(deliveryIdentifier);

      if (!moneyDelivery) {
        const response: ApiResponse = {
          success: false,
          message: 'Money delivery not found',
        };
        res.status(404).json(response);
        return;
      }

      logger.info(`Retrieved money delivery by code: ${moneyDelivery.code}`);

      const response: ApiResponse = {
        success: true,
        message: 'Money delivery retrieved successfully',
        data: moneyDelivery,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error retrieving money delivery by code:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to retrieve money delivery by code';

      // Determine appropriate status code based on error message
      let statusCode = 500;
      if (message.includes('not found')) {
        statusCode = 404;
      } else if (message.includes('validation') || message.includes('invalid')) {
        statusCode = 400;
      }

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/money-deliveries/frequent-customers/{senderIdentifier}:
   *   get:
   *     summary: Get all frequent customers for a sender
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: senderIdentifier
   *         required: true
   *         schema:
   *           type: string
   *         description: Sender name or phone number to search for
   *     responses:
   *       200:
   *         description: Frequent customers retrieved successfully
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
   *                   example: "Frequent money customers retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     frequentCustomers:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           receiverName:
   *                             type: string
   *                             example: "Nguyễn Thị Mai"
   *                           receiverPhone:
   *                             type: string
   *                             example: "+84901234567"
   *                           toRoute:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: string
   *                                 example: "507f1f77bcf86cd799439011"
   *                               code:
   *                                 type: string
   *                                 example: "T1"
   *                               name:
   *                                 type: string
   *                                 example: "Tuyến Hà Nội"
   *                           deliveryCount:
   *                             type: number
   *                             example: 8
   *                             description: Number of money deliveries to this customer
   *                           totalSendMoneyAmount:
   *                             type: number
   *                             example: 5000000
   *                             description: Total money sent to this customer
   *                           totalSendCost:
   *                             type: number
   *                             example: 75000
   *                             description: Total cost for money transfers
   *                           firstDeliveryDate:
   *                             type: string
   *                             format: date-time
   *                             example: "2024-01-01T00:00:00.000Z"
   *                           lastDeliveryDate:
   *                             type: string
   *                             format: date-time
   *                             example: "2024-12-15T00:00:00.000Z"
   *                     total:
   *                       type: number
   *                       example: 15
   *                       description: Total number of frequent customers
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
   *                   example: "Validation error"
   *       401:
   *         description: Unauthorized
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
   *                   example: "User not authenticated"
   */
  getFrequentCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const { senderIdentifier } = req.params;

      const frequentCustomers = await this.moneyDeliveryService.getFrequentCustomers(
        senderIdentifier,
        req.user.userId
      );

      logger.info(
        `Frequent money customers retrieved for sender: ${senderIdentifier}, count: ${frequentCustomers.length}`
      );

      const response: ApiResponse = {
        success: true,
        message: 'Frequent money customers retrieved successfully',
        data: { frequentCustomers, total: frequentCustomers.length },
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error retrieving frequent money customers:', error);
      const message = error instanceof Error ? error.message : 'Failed to get frequent customers';

      // Determine appropriate status code based on error message
      let statusCode = 500;
      if (message.includes('not found')) {
        statusCode = 404;
      } else if (message.includes('validation') || message.includes('invalid')) {
        statusCode = 400;
      }

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/money-deliveries/today-report:
   *   get:
   *     summary: Get money delivery report for current day (no pagination)
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Today's money delivery report retrieved successfully
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
   *                   example: "Today's money delivery report retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     summary:
   *                       type: object
   *                       properties:
   *                         totalDeliveries:
   *                           type: number
   *                           example: 15
   *                         totalSendMoneyAmount:
   *                           type: number
   *                           example: 25000000
   *                         totalSendCost:
   *                           type: number
   *                           example: 375000
   *                         totalSendFee:
   *                           type: number
   *                           example: 225000
   *                         regularTransferCount:
   *                           type: number
   *                           example: 10
   *                         expressTransferCount:
   *                           type: number
   *                           example: 3
   *                         freeTransferCount:
   *                           type: number
   *                           example: 2
   *                         date:
   *                           type: string
   *                           format: date
   *                           example: "2024-12-17"
   *                     deliveries:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                           code:
   *                             type: string
   *                           sender:
   *                             type: object
   *                           receiver:
   *                             type: object
   *                           sendMoneyAmount:
   *                             type: number
   *                           sendCost:
   *                             type: number
   *                           transferType:
   *                             type: string
   *                           totalCost:
   *                             type: number
   *                           createdAt:
   *                             type: string
   *                             format: date-time
   *                     routeInfo:
   *                       type: object
   *                       properties:
   *                         route:
   *                           type: object
   *                         routeCode:
   *                           type: string
   *                         routeName:
   *                           type: string
   *             examples:
   *               todayReport:
   *                 summary: Today's money delivery report
   *                 value:
   *                   success: true
   *                   message: "Today's money delivery report retrieved successfully"
   *                   data:
   *                     summary:
   *                       totalDeliveries: 15
   *                       totalSendMoneyAmount: 25000000
   *                       totalSendCost: 375000
   *                       totalSendFee: 225000
   *                       regularTransferCount: 10
   *                       expressTransferCount: 3
   *                       freeTransferCount: 2
   *                       date: "2024-12-17"
   *                     deliveries: []
   *                     routeInfo:
   *                       route:
   *                         id: "507f1f77bcf86cd799439011"
   *                         code: "T1"
   *                         name: "Tuyến 1"
   *                       routeCode: "T1"
   *                       routeName: "Tuyến 1"
   *       400:
   *         description: User has no selected route
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
   *                   example: "User has no selected route"
   *       401:
   *         description: Unauthorized
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
   *                   example: "User not authenticated"
   */
  getTodayReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      // Call service to get today's money delivery report
      const report = await this.moneyDeliveryService.getTodayReport(req.user.userId);

      const response: ApiResponse = {
        success: true,
        message: "Today's money delivery report retrieved successfully",
        data: report,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error("Failed to generate today's money delivery report", error);

      const message = error instanceof Error ? error.message : "Failed to generate today's report";

      // Determine appropriate status code
      let statusCode = 500;
      if (message.includes('selected route')) {
        statusCode = 400;
      }

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * Get money delivery cost report
   * GET /api/money-deliveries/cost-report
   * @swagger
   * /api/money-deliveries/cost-report:
   *   get:
   *     summary: Get money delivery cost report within date range (max 30 days, Vietnam timezone)
   *     description: Returns all money deliveries from user's selected route within the specified date range (Vietnam time UTC+7). No pagination - all matching records are returned. Date range cannot exceed 30 days. Dates are interpreted as Vietnam timezone and automatically converted to UTC for database queries.
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date in YYYY-MM-DD format (Vietnam timezone). Will query from 00:00:00 Vietnam time. Date range cannot exceed 30 days.
   *         example: "2024-01-01"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date in YYYY-MM-DD format (Vietnam timezone). Will query until 23:59:59 Vietnam time. Cannot be in the future. Date range cannot exceed 30 days.
   *         example: "2024-01-31"
   *     responses:
   *       200:
   *         description: Money delivery cost report retrieved successfully
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
   *                   example: "Money delivery cost report retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     summary:
   *                       type: object
   *                       properties:
   *                         totalMoneyDeliveries:
   *                           type: integer
   *                           example: 150
   *                         totalSendMoneyAmount:
   *                           type: number
   *                           example: 15000000
   *                         totalSendCost:
   *                           type: number
   *                           example: 75000
   *                         totalSendFee:
   *                           type: number
   *                           example: 25000
   *                         totalCost:
   *                           type: number
   *                           example: 100000
   *                         regularTransferCount:
   *                           type: integer
   *                           example: 100
   *                         regularTransferAmount:
   *                           type: number
   *                           example: 10000000
   *                         regularTransferFee:
   *                           type: number
   *                           example: 15000
   *                         expressTransferCount:
   *                           type: integer
   *                           example: 40
   *                         expressTransferAmount:
   *                           type: number
   *                           example: 4000000
   *                         expressTransferFee:
   *                           type: number
   *                           example: 8000
   *                         freeTransferCount:
   *                           type: integer
   *                           example: 10
   *                         freeTransferAmount:
   *                           type: number
   *                           example: 1000000
   *                         averageSendAmountPerDelivery:
   *                           type: number
   *                           example: 100000
   *                         averageFeePerDelivery:
   *                           type: number
   *                           example: 167
   *                     moneyDeliveries:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                             example: "507f1f77bcf86cd799439011"
   *                           code:
   *                             type: string
   *                             example: "0907250001"
   *                           fullCode:
   *                             type: string
   *                             example: "0907250001T4T1-T"
   *                           date:
   *                             type: string
   *                             format: date-time
   *                             example: "2024-12-17T08:30:00.000Z"
   *                           sender:
   *                             type: object
   *                             properties:
   *                               name:
   *                                 type: string
   *                                 example: "Nguyễn Văn A"
   *                               phone:
   *                                 type: string
   *                                 example: "+84123456789"
   *                           receiver:
   *                             type: object
   *                             properties:
   *                               name:
   *                                 type: string
   *                                 example: "Trần Thị B"
   *                               phone:
   *                                 type: string
   *                                 example: "+84987654321"
   *                           toRoute:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: string
   *                                 example: "507f1f77bcf86cd799439012"
   *                               code:
   *                                 type: string
   *                                 example: "T2"
   *                               name:
   *                                 type: string
   *                                 example: "Route 2"
   *                           sendMoneyAmount:
   *                             type: number
   *                             example: 1000000
   *                           sendCost:
   *                             type: number
   *                             example: 5000
   *                           totalCost:
   *                             type: number
   *                             example: 7000
   *                           transferType:
   *                             type: string
   *                             enum: [regular, express]
   *                             example: "regular"
   *                           isFree:
   *                             type: boolean
   *                             example: false
   *                           notes:
   *                             type: string
   *                             example: "Ghi chú chuyển tiền"
   *                     filter:
   *                       type: object
   *                       properties:
   *                         dateRange:
   *                           type: object
   *                           properties:
   *                             from:
   *                               type: string
   *                               format: date-time
   *                               example: "2024-01-01T00:00:00.000Z"
   *                             to:
   *                               type: string
   *                               format: date-time
   *                               example: "2024-01-31T23:59:59.999Z"
   *                         fromRoute:
   *                           type: object
   *                           properties:
   *                             id:
   *                               type: string
   *                               example: "507f1f77bcf86cd799439013"
   *                             code:
   *                               type: string
   *                               example: "T1"
   *                             name:
   *                               type: string
   *                               example: "Route 1"
   *       400:
   *         description: Invalid request parameters
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
   *                   example: "Validation failed: startDate is required"
   *       401:
   *         description: Unauthorized - User not authenticated
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
   *                   example: "User not authenticated"
   *       500:
   *         description: Internal server error
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
   *                   example: "Failed to generate cost report"
   */
  getCostReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const { startDate, endDate } = req.query as unknown as DateRangeQuery;

      const report = await this.moneyDeliveryService.getCostReport(
        req.user.userId,
        startDate,
        endDate
      );

      const response: ApiResponse = {
        success: true,
        message: 'Money delivery cost report retrieved successfully',
        data: report,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to generate money delivery cost report', error);

      const message = error instanceof Error ? error.message : 'Failed to generate cost report';

      // Determine appropriate status code
      let statusCode = 500;
      if (
        message.includes('User route not found') ||
        message.includes('Selected route not found')
      ) {
        statusCode = 400;
      }

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * Update money delivery by fullCode
   * PUT /api/money-deliveries/code/:fullCode
   * @swagger
   * /api/money-deliveries/code/{fullCode}:
   *   put:
   *     summary: Update money delivery by fullCode - only sender, receiver, and toRoute fields
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: fullCode
   *         required: true
   *         schema:
   *           type: string
   *           example: "0907250001T4T1-T"
   *         description: Money delivery fullCode in format codeFromRouteToRoute-T (e.g., 0907250001T4T1-T)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               senderName:
   *                 type: string
   *                 description: Name of the sender
   *                 example: "Nguyen Van A"
   *               senderPhone:
   *                 type: string
   *                 description: Phone number of the sender
   *                 example: "+84123456789"
   *               receiverName:
   *                 type: string
   *                 description: Name of the receiver
   *                 example: "Tran Thi B"
   *               receiverPhone:
   *                 type: string
   *                 description: Phone number of the receiver
   *                 example: "+84987654321"
   *               toRouteId:
   *                 type: string
   *                 description: ObjectId of the to route
   *                 example: "507f1f77bcf86cd799439012"
   *           examples:
   *             updateSender:
   *               summary: Update sender information
   *               value:
   *                 senderName: "Nguyen Van C"
   *                 senderPhone: "+84111222333"
   *             updateReceiver:
   *               summary: Update receiver information
   *               value:
   *                 receiverName: "Le Thi D"
   *                 receiverPhone: "+84444555666"
   *             updateRoute:
   *               summary: Update to route
   *               value:
   *                 toRouteId: "507f1f77bcf86cd799439013"
   *             updateAll:
   *               summary: Update all allowed fields
   *               value:
   *                 senderName: "Pham Van E"
   *                 senderPhone: "+84777888999"
   *                 receiverName: "Vu Thi F"
   *                 receiverPhone: "+84000111222"
   *                 toRouteId: "507f1f77bcf86cd799439014"
   *     responses:
   *       200:
   *         description: Money delivery updated successfully
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
   *                   example: "Money delivery updated successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     code:
   *                       type: string
   *                     fullCode:
   *                       type: string
   *                     sender:
   *                       type: object
   *                     receiver:
   *                       type: object
   *                     sendMoneyAmount:
   *                       type: number
   *                     sendCost:
   *                       type: number
   *                     transferType:
   *                       type: string
   *                     totalCost:
   *                       type: number
   *             examples:
   *               successfulUpdate:
   *                 summary: Successfully updated money delivery
   *                 value:
   *                   success: true
   *                   message: "Money delivery updated successfully"
   *                   data:
   *                     id: "507f1f77bcf86cd799439013"
   *                     code: "0907250001"
   *                     fullCode: "0907250001T4T1-T"
   *                     sender:
   *                       id: "507f1f77bcf86cd799439014"
   *                       name: "Pham Van E"
   *                       phone: "+84777888999"
   *                     receiver:
   *                       id: "507f1f77bcf86cd799439015"
   *                       name: "Vu Thi F"
   *                       phone: "+84000111222"
   *                     sendMoneyAmount: 1000000
   *                     sendCost: 50000
   *                     transferType: "regular"
   *                     totalCost: 50000
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
   *               invalidFullCode:
   *                 summary: Invalid fullCode format
   *                 value:
   *                   success: false
   *                   message: "Validation error: Invalid money delivery fullCode format"
   *               invalidPhone:
   *                 summary: Invalid phone number
   *                 value:
   *                   success: false
   *                   message: "Validation error: Please enter a valid sender phone number"
   *               noFieldsProvided:
   *                 summary: No fields provided for update
   *                 value:
   *                   success: false
   *                   message: "Validation error: At least one field must be provided"
   *       404:
   *         description: Money delivery not found
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
   *               deliveryNotFound:
   *                 summary: Money delivery not found
   *                 value:
   *                   success: false
   *                   message: "Money delivery not found"
   *               routeNotFound:
   *                 summary: Route not found
   *                 value:
   *                   success: false
   *                   message: "To route not found"
   *       401:
   *         description: Unauthorized
   */
  updateMoneyDeliveryByFullCode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const { fullCode } = req.params;
      const updateData: UpdateMoneyDeliveryByFullCodeRequest['body'] = req.body;

      const updatedMoneyDelivery = await this.moneyDeliveryService.updateMoneyDeliveryByFullCode(
        fullCode,
        updateData,
        req.user.userId
      );

      logger.info(`Money delivery updated by fullCode: ${updatedMoneyDelivery.code}`);

      const response: ApiResponse = {
        success: true,
        message: 'Money delivery updated successfully',
        data: updatedMoneyDelivery,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error updating money delivery by fullCode:', error);

      const message = error instanceof Error ? error.message : 'Failed to update money delivery';

      // Determine appropriate status code based on error message
      let statusCode = 500;
      if (message.includes('not found')) {
        statusCode = 404;
      } else if (message.includes('validation') || message.includes('invalid')) {
        statusCode = 400;
      }

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/money-deliveries/upload-images:
   *   put:
   *     summary: Upload images to money delivery
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - moneyDeliveryId
   *             properties:
   *               moneyDeliveryId:
   *                 type: string
   *                 pattern: '^[0-9a-fA-F]{24}$'
   *                 example: '507f1f77bcf86cd799439011'
   *                 description: Money delivery ID
   *               # Multiple images support (up to 5 images)
   *               images:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *                 maxItems: 5
   *                 description: Array of image files to upload (optional, max 5)
   *               images[0][index]:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *                 example: 1
   *                 description: Index for first image (1-5)
   *               images[0][rotate]:
   *                 type: integer
   *                 enum: [0, 90, 180, 270]
   *                 default: 0
   *                 description: Rotation angle for first image
   *               images[1][index]:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *                 example: 2
   *                 description: Index for second image (1-5)
   *               images[1][rotate]:
   *                 type: integer
   *                 enum: [0, 90, 180, 270]
   *                 default: 0
   *                 description: Rotation angle for second image
   *     responses:
   *       200:
   *         description: Images uploaded successfully
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
   *                   example: 'Images uploaded successfully'
   *                 data:
   *                   type: object
   *                   properties:
   *                     moneyDelivery:
   *                       type: object
   *       400:
   *         description: Validation error or business logic error
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
   *                   examples:
   *                     validation:
   *                       value: 'Validation failed: Money delivery ID is required'
   *                     not_found:
   *                       value: 'Money delivery not found'
   *       401:
   *         description: Unauthorized - Invalid or missing token
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
   *                   example: 'Unauthorized'
   *       500:
   *         description: Internal server error
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
   *                   example: 'Internal server error'
   */
  uploadImagesMoneyDelivery = async (
    req: AuthRequestWithFileUploads,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { moneyDeliveryId, images } = req.body;
      const filesObject = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      // Validate moneyDeliveryId
      if (!moneyDeliveryId) {
        const response: ApiResponse = {
          success: false,
          message: 'Money delivery ID is required',
        };
        res.status(400).json(response);
        return;
      }

      // Prepare image data for multiple images
      let imagesData: Array<{
        index: number;
        buffer: Buffer;
        originalName: string;
        rotate: number;
      }> = [];

      // Handle multiple images upload
      if (
        filesObject &&
        !Array.isArray(filesObject) &&
        filesObject.images &&
        filesObject.images.length > 0
      ) {
        // Parse images metadata from body if provided, otherwise use defaults
        const imagesMetadata = Array.isArray(images) ? images : [];

        imagesData = filesObject.images.map((file, idx) => ({
          index: imagesMetadata[idx]?.index || idx + 1,
          buffer: file.buffer,
          originalName: file.originalname,
          rotate: imagesMetadata[idx]?.rotate || 0,
        }));
      }

      const result = await this.moneyDeliveryService.uploadImagesMoneyDelivery(
        moneyDeliveryId,
        imagesData.length > 0 ? imagesData : undefined
      );

      const response: ApiResponse = {
        success: true,
        message: 'Images uploaded successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Upload images error:', error);

      let statusCode = 400;
      const message = error instanceof Error ? error.message : 'Failed to upload images';

      // Handle specific error cases
      if (message.includes('not found')) {
        statusCode = 404;
      } else if (message.includes('validation') || message.includes('Invalid')) {
        statusCode = 400;
      } else {
        statusCode = 500;
      }

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/money-deliveries/get-detail-images-money-delivery/{moneyDeliveryId}:
   *   get:
   *     summary: Get detail images money delivery
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: moneyDeliveryId
   *         required: true
   *         schema:
   *           type: string
   *         description: Money delivery ID
   *     responses:
   *       200:
   *         description: Get detail images money delivery successful
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
   *                   example: "get detail images money delivery successful"
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       url:
   *                         type: string
   *                         example: "/uploads/money-deliveries/507f1f77bcf86cd799439011/image_1_1734567890123.jpg?v=1734567890123"
   *                       rotate:
   *                         type: number
   *                         enum: [0, 90, 180, 270]
   *                         example: 0
   *       500:
   *         description: Internal server error
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
   *                   example: "get detail images money delivery failed"
   */
  getDetailImagesMoneyDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { moneyDeliveryId } = req.params;
      const result = await this.moneyDeliveryService.getDetailImagesMoneyDelivery(moneyDeliveryId);

      const response: ApiResponse = {
        success: true,
        message: 'get detail images money delivery successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('get detail images money delivery error:', error);

      const message =
        error instanceof Error ? error.message : 'get detail images money delivery failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/money-deliveries/get-detail-images-by-delivery/{deliveryId}:
   *   get:
   *     summary: Get detail images money delivery by delivery ID
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: deliveryId
   *         required: true
   *         schema:
   *           type: string
   *         description: Delivery ID
   *     responses:
   *       200:
   *         description: Get detail images by delivery ID successful
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
   *                   example: "get detail images by delivery id successful"
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       url:
   *                         type: string
   *                       rotate:
   *                         type: number
   *                         enum: [0, 90, 180, 270]
   *       500:
   *         description: Internal server error
   */
  getDetailImagesByDeliveryId = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { deliveryId } = req.params;
      const result = await this.moneyDeliveryService.getDetailImagesByDeliveryId(deliveryId);

      const response: ApiResponse = {
        success: true,
        message: 'get detail images by delivery id successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('get detail images by delivery id error:', error);

      const message =
        error instanceof Error ? error.message : 'get detail images by delivery id failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/money-deliveries/update-data-images-money-delivery/{moneyDeliveryId}:
   *   put:
   *     summary: Update data images money delivery (update data only, no file upload)
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: moneyDeliveryId
   *         required: true
   *         schema:
   *           type: string
   *         description: Money delivery ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               images:
   *                 type: array
   *                 maxItems: 5
   *                 items:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: Image ID (optional)
   *                       example: "507f1f77bcf86cd799439011"
   *                     url:
   *                       type: string
   *                       description: Image URL
   *                       example: "/uploads/money-deliveries/507f1f77bcf86cd799439011/image_1_1734567890123.jpg?v=1734567890123"
   *                     rotate:
   *                       type: number
   *                       enum: [0, 90, 180, 270]
   *                       default: 0
   *                       description: Rotation angle
   *                       example: 0
   *                 description: Array of image objects (max 5)
   *           examples:
   *             updateImages:
   *               summary: Update images data
   *               value:
   *                 images:
   *                   - id: "507f1f77bcf86cd799439011"
   *                     url: "/uploads/money-deliveries/507f1f77bcf86cd799439011/image_1_1734567890123.jpg?v=1734567890123"
   *                     rotate: 90
   *                   - id: "507f1f77bcf86cd799439012"
   *                     url: "/uploads/money-deliveries/507f1f77bcf86cd799439011/image_2_1734567890124.jpg?v=1734567890124"
   *                     rotate: 0
   *     responses:
   *       200:
   *         description: Update data images money delivery successful
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
   *                   example: "update data images money delivery successful"
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       url:
   *                         type: string
   *                       rotate:
   *                         type: number
   *       400:
   *         description: Validation error or business logic error
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
   *                   examples:
   *                     validation:
   *                       value: 'Validation failed: Money delivery ID is required'
   *                     not_found:
   *                       value: 'Money delivery not found'
   *       401:
   *         description: Unauthorized - Invalid or missing token
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
   *                   example: 'Unauthorized'
   *       500:
   *         description: Internal server error
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
   *                   example: 'update data images money delivery failed'
   */
  updateDataImagesMoneyDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { moneyDeliveryId } = req.params;
      const { images } = req.body;

      // Convert images array to IMoneyDeliveryImage[] format (remove id field if present)
      const imagesData: Array<{ url: string; rotate: number }> =
        images?.map((img: { id?: string; url: string; rotate: number }) => ({
          url: img.url,
          rotate: img.rotate || 0,
        })) || [];

      const result = await this.moneyDeliveryService.updateDataImagesMoneyDelivery(
        moneyDeliveryId,
        imagesData
      );

      const response: ApiResponse = {
        success: true,
        message: 'update data images money delivery successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('update data images money delivery error:', error);

      let statusCode = 400;
      const message =
        error instanceof Error ? error.message : 'update data images money delivery failed';

      // Handle specific error cases
      if (message === 'Money delivery not found') {
        statusCode = 404;
      }

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * Recovery money delivery with type COLLECT by fullCode and staff name
   * PUT /api/money-deliveries/recovery/collect
   * @swagger
   * /api/money-deliveries/recovery/collect:
   *   put:
   *     summary: Recovery money delivery with type COLLECT
   *     description: Khôi phục tiền thu hộ (COLLECT) từ trạng thái DONE về WAITING. Chỉ áp dụng cho money delivery có type COLLECT và status DONE.
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - fullCode
   *               - staffNameRecoveryMoney
   *             properties:
   *               fullCode:
   *                 type: string
   *                 pattern: '^\d{10}[A-Z]([A-Z]|\d+)[A-Z]([A-Z]|\d+)-T$'
   *                 description: Full code of the money delivery (e.g., 0907250001T4T1-T)
   *                 example: "0907250001T4T1-T"
   *               staffNameRecoveryMoney:
   *                 type: string
   *                 description: Tên nhân viên thực hiện khôi phục
   *                 minLength: 1
   *                 maxLength: 100
   *                 example: "Nguyen Van A"
   *           examples:
   *             recovery:
   *               summary: Recovery money delivery
   *               value:
   *                 fullCode: "0907250001T4T1-T"
   *                 staffNameRecoveryMoney: "Nguyen Van A"
   *     responses:
   *       200:
   *         description: Money delivery recovered successfully
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
   *                   example: "Money delivery recovered successfully"
   *             examples:
   *               success:
   *                 summary: Recovery successful
   *                 value:
   *                   success: true
   *                   message: "Money delivery recovered successfully"
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
   *               invalidFullCode:
   *                 summary: Invalid fullCode format
   *                 value:
   *                   success: false
   *                   message: "Validation error: Money delivery fullCode must match pattern"
   *               missingStaffName:
   *                 summary: Missing staff name
   *                 value:
   *                   success: false
   *                   message: "Validation error: Staff name recovery money is required"
   *       401:
   *         description: Unauthorized
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
   *                   example: "User not authenticated"
   *       404:
   *         description: Money delivery not found
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
   *               notFound:
   *                 summary: Money delivery not found
   *                 value:
   *                   success: false
   *                   message: "Money delivery not found with fullCode: 0907250001T4T1-T and type: COLLECT"
   *       500:
   *         description: Internal server error
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
   *                   example: "Failed to recover money delivery with type COLLECT"
   */
  recoveryMoneyDeliveryWithTypeCollect = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const { fullCode, staffNameRecoveryMoney } = req.body;

      await this.moneyDeliveryService.recoveryMoneyDeliveryWithTypeCollectByFullCodeAndStaffNameRecoveryMoney(
        fullCode,
        staffNameRecoveryMoney,
        req.user.userId
      );

      logger.info(`Money delivery recovered (COLLECT): ${fullCode} by ${staffNameRecoveryMoney}`, {
        userId: req.user.userId,
        fullCode,
        staffNameRecoveryMoney,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Money delivery recovered successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error recovering money delivery with type COLLECT:', error);

      let statusCode = 500;
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to recover money delivery with type COLLECT';

      if (message.includes('not found')) {
        statusCode = 404;
      } else if (message.includes('Validation error') || message.includes('required')) {
        statusCode = 400;
      }

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * Recovery money delivery with type NORMAL by fullCode and staff name
   * PUT /api/money-deliveries/recovery/normal
   * @swagger
   * /api/money-deliveries/recovery/normal:
   *   put:
   *     summary: Recovery money delivery with type NORMAL
   *     description: Khôi phục tiền chuyển thường (NORMAL) từ trạng thái DONE về WAITING. Chỉ áp dụng cho money delivery có type NORMAL và status DONE.
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - fullCode
   *               - staffNameRecoveryMoney
   *             properties:
   *               fullCode:
   *                 type: string
   *                 pattern: '^\d{10}[A-Z]([A-Z]|\d+)[A-Z]([A-Z]|\d+)-T$'
   *                 description: Full code of the money delivery (e.g., 0907250001T4T1-T)
   *                 example: "0907250001T4T1-T"
   *               staffNameRecoveryMoney:
   *                 type: string
   *                 description: Tên nhân viên thực hiện khôi phục
   *                 minLength: 1
   *                 maxLength: 100
   *                 example: "Nguyen Van A"
   *           examples:
   *             recovery:
   *               summary: Recovery money delivery
   *               value:
   *                 fullCode: "0907250001T4T1-T"
   *                 staffNameRecoveryMoney: "Nguyen Van A"
   *     responses:
   *       200:
   *         description: Money delivery recovered successfully
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
   *                   example: "Money delivery recovered successfully"
   *             examples:
   *               success:
   *                 summary: Recovery successful
   *                 value:
   *                   success: true
   *                   message: "Money delivery recovered successfully"
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
   *               invalidFullCode:
   *                 summary: Invalid fullCode format
   *                 value:
   *                   success: false
   *                   message: "Validation error: Money delivery fullCode must match pattern"
   *               missingStaffName:
   *                 summary: Missing staff name
   *                 value:
   *                   success: false
   *                   message: "Validation error: Staff name recovery money is required"
   *       401:
   *         description: Unauthorized
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
   *                   example: "User not authenticated"
   *       404:
   *         description: Money delivery not found
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
   *               notFound:
   *                 summary: Money delivery not found
   *                 value:
   *                   success: false
   *                   message: "Money delivery not found with fullCode: 0907250001T4T1-T and type: NORMAL"
   *       500:
   *         description: Internal server error
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
   *                   example: "Failed to recover money delivery with type NORMAL"
   */
  recoveryMoneyDeliveryWithTypeNormal = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const { fullCode, staffNameRecoveryMoney } = req.body;

      await this.moneyDeliveryService.recoveryMoneyDeliveryWithTypeNormalByFullCodeAndStaffNameRecoveryMoney(
        fullCode,
        staffNameRecoveryMoney,
        req.user.userId
      );

      logger.info(`Money delivery recovered (NORMAL): ${fullCode} by ${staffNameRecoveryMoney}`, {
        userId: req.user.userId,
        fullCode,
        staffNameRecoveryMoney,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Money delivery recovered successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error recovering money delivery with type NORMAL:', error);

      let statusCode = 500;
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to recover money delivery with type NORMAL';

      if (message.includes('not found')) {
        statusCode = 404;
      } else if (message.includes('Validation error') || message.includes('required')) {
        statusCode = 400;
      }

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };
}
