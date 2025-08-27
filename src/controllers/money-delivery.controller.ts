import { Response } from 'express';
import { MoneyDeliveryService } from '@/services/money-delivery.service';
import {
  CreateMoneyDeliveryRequest,
  UpdateMoneyDeliveryRequest,
} from '@/schemas/money-delivery.schema';
import { AuthRequest, ApiResponse } from '@/types';
import logger from '@/utils/logger';

export class MoneyDeliveryController {
  private moneyDeliveryService: MoneyDeliveryService;

  constructor() {
    this.moneyDeliveryService = new MoneyDeliveryService();
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
   *               - fromRouteId
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
   *                 description: ObjectId of the from route
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
   *                 enum: [regular, express, free]
   *                 description: Transfer type (default is regular)
   *                 example: "regular"
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
   *                 fromRouteId: "507f1f77bcf86cd799439011"
   *                 toRouteId: "507f1f77bcf86cd799439012"
   *                 sendMoneyAmount: 1000000
   *                 sendCost: 50000
   *                 transferType: "regular"
   *                 notes: "Gửi tiền sinh nhật"
   *             express:
   *               summary: Express money transfer
   *               value:
   *                 senderName: "Le Van C"
   *                 senderPhone: "+84333444555"
   *                 receiverName: "Pham Thi D"
   *                 receiverPhone: "+84666777888"
   *                 fromRouteId: "507f1f77bcf86cd799439011"
   *                 toRouteId: "507f1f77bcf86cd799439012"
   *                 sendMoneyAmount: 5000000
   *                 sendCost: 100000
   *                 transferType: "express"
   *                 notes: "Gửi tiền khẩn cấp"
   *             free:
   *               summary: Free money transfer
   *               value:
   *                 senderName: "Hoang Van E"
   *                 senderPhone: "+84111222333"
   *                 receiverName: "Vu Thi F"
   *                 receiverPhone: "+84444555666"
   *                 fromRouteId: "507f1f77bcf86cd799439011"
   *                 toRouteId: "507f1f77bcf86cd799439012"
   *                 sendMoneyAmount: 500000
   *                 sendCost: 0
   *                 transferType: "free"
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
   *                       enum: [regular, express, free]
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
   *                     transferType: "free"
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
   *                 description: ObjectId of the from route
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
   *                 enum: [regular, express, free]
   *                 description: Transfer type
   *                 example: "express"
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
        updateData
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
   * Delete money delivery by ID
   * DELETE /api/money-deliveries/:id
   * @swagger
   * /api/money-deliveries/{id}:
   *   delete:
   *     summary: Delete money delivery by ID
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
   *         description: Money delivery deleted successfully
   *       404:
   *         description: Money delivery not found
   *       401:
   *         description: Unauthorized
   */
  deleteMoneyDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
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

      await this.moneyDeliveryService.deleteMoneyDelivery(id);

      logger.info(`Money delivery deleted: ${id}`);

      const response: ApiResponse = {
        success: true,
        message: 'Money delivery deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error deleting money delivery:', error);

      const message = error instanceof Error ? error.message : 'Failed to delete money delivery';
      const statusCode = message.includes('not found') ? 404 : 500;

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
   *           example: "2401250001T1T2"
   *         description: Money delivery identifier in format codeFromRouteToRoute (e.g., 2401250001T1T2)
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
   *     summary: Get frequent customers for a sender with pagination
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
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of records per page
   *     responses:
   *       200:
   *         description: Frequent customers retrieved successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const frequentCustomers = await this.moneyDeliveryService.getFrequentCustomers(
        senderIdentifier,
        req.user.userId,
        page,
        limit
      );

      logger.info(
        `Frequent money customers retrieved for sender: ${senderIdentifier}, count: ${frequentCustomers.frequentCustomers.length}`
      );

      const response: ApiResponse = {
        success: true,
        message: 'Frequent money customers retrieved successfully',
        data: frequentCustomers,
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
   *     summary: Get money delivery cost report with date range filtering and pagination
   *     tags: [Money Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date-time
   *           example: "2024-01-01T00:00:00.000Z"
   *         description: Start date for the report (ISO format)
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date-time
   *           example: "2024-01-31T23:59:59.999Z"
   *         description: End date for the report (ISO format)
   *       - in: query
   *         name: page
   *         required: false
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *           example: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         required: false
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 100
   *           example: 50
   *         description: Number of items per page
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
   *                             example: "2412170001"
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
   *                             enum: [regular, express, free]
   *                             example: "regular"
   *                           notes:
   *                             type: string
   *                             example: "Ghi chú chuyển tiền"
   *                     pagination:
   *                       type: object
   *                       properties:
   *                         currentPage:
   *                           type: integer
   *                           example: 1
   *                         totalPages:
   *                           type: integer
   *                           example: 3
   *                         totalRecords:
   *                           type: integer
   *                           example: 150
   *                         limit:
   *                           type: integer
   *                           example: 50
   *                         hasNextPage:
   *                           type: boolean
   *                           example: true
   *                         hasPrevPage:
   *                           type: boolean
   *                           example: false
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

      const { startDate, endDate, page, limit } = req.query as any;

      // Call service to get cost report
      const report = await this.moneyDeliveryService.getCostReport(
        req.user.userId,
        startDate,
        endDate,
        page,
        limit
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
}
