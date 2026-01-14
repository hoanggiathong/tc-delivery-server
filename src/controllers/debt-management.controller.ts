import { DebtManagementService } from '@/services/deb-management.service';
import { ApiResponse, AuthRequest } from '@/types';
import { IDebtManagement } from '@/types/debt-management.type';
import logger from '@/utils/logger';
import { Response } from 'express';

export class DebtManagementController {
  private debtManagementService: DebtManagementService;

  constructor() {
    this.debtManagementService = new DebtManagementService();
  }

  /**
   * @swagger
   * /api/debt-management/get-list-payment:
   *   get:
   *     summary: Get list of payment debt management records
   *     tags: [Debt Management]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date for filtering (ISO format). Cannot be more than 1 month in the past.
   *         example: "2024-01-01"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for filtering (ISO format).
   *         example: "2024-01-31"
   *       - in: query
   *         name: keySort
   *         required: false
   *         schema:
   *           type: string
   *           enum: ["toRoute", "cash", "cashDate"]
   *         description: Field to sort by
   *         example: "cashDate"
   *       - in: query
   *         name: typeSort
   *         required: false
   *         schema:
   *           type: string
   *           enum: ["asc", "desc", "1", "-1"]
   *         description: Sort order (asc/desc or 1/-1)
   *         example: "desc"
   *     responses:
   *       200:
   *         description: Get list payment debt management successful
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
   *                   example: "get list payment debt management successful"
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       _id:
   *                         type: string
   *                         example: "507f1f77bcf86cd799439011"
   *                       fromRoute:
   *                         type: object
   *                         properties:
   *                           _id:
   *                             type: string
   *                           name:
   *                             type: string
   *                       toRoute:
   *                         type: object
   *                         properties:
   *                           _id:
   *                             type: string
   *                           name:
   *                             type: string
   *                       content:
   *                         type: string
   *                         example: "TPHCM CK"
   *                       type:
   *                         type: string
   *                         enum: [PAYMENT, RECEIPT, COLLECTION]
   *                         example: "PAYMENT"
   *                       cash:
   *                         type: number
   *                         example: 50000
   *                       cashDate:
   *                         type: string
   *                         format: date-time
   *                         example: "2024-01-15T08:30:00.000Z"
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                       updatedAt:
   *                         type: string
   *                         format: date-time
   *       400:
   *         description: Bad request (validation error)
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
   *                   example: "Unauthorized"
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
   *                   example: "get list payment debt management failed"
   */
  getListPayment = async (request: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!request.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const userId = request.user.userId;
      const result: IDebtManagement[] =
        await this.debtManagementService.getListPaymentDebtMangement(request, userId);

      const response: ApiResponse = {
        success: true,
        message: 'get list payment debt management successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('get list payment debt management error:', error);

      const message =
        error instanceof Error ? error.message : 'get list payment debt management failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/debt-management/get-list-receipt:
   *   get:
   *     summary: api get list receipt debt management
   *     tags: [Debt Management]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date for filtering (ISO format). Cannot be more than 1 month in the past.
   *         example: "2024-01-01"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for filtering (ISO format). Cannot be in the future.
   *         example: "2024-01-31"
   *       - in: query
   *         name: fromRouteId
   *         required: true
   *         schema:
   *           type: string
   *           pattern: '^[0-9a-fA-F]{24}$'
   *         description: ObjectId of the destination route
   *         example: "68d136cea293c306f0d629f1"
   *       - in: query
   *         name: keySort
   *         required: false
   *         schema:
   *           type: string
   *           enum: ["toRoute","cash", "cashDate"]
   *         description: field to want to sort
   *         example: "toRoute"
   *       - in: query
   *         name: typeSort
   *         required: false
   *         schema:
   *           type: string
   *           enum: ["ASC","DESC", "asc", "desc"]
   *         description: field to want to sort by asc or desc
   *         example: "ASC"
   *     responses:
   *       200:
   *         description: Get list receipt debt management successful
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
   *                   example: "get list receipt debt management successful"
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       _id:
   *                         type: string
   *                         example: "507f1f77bcf86cd799439011"
   *                       fromRoute:
   *                         type: object
   *                         properties:
   *                           _id:
   *                             type: string
   *                           name:
   *                             type: string
   *                       toRoute:
   *                         type: object
   *                         properties:
   *                           _id:
   *                             type: string
   *                           name:
   *                             type: string
   *                       content:
   *                         type: string
   *                         example: "TPHCM CK"
   *                       type:
   *                         type: string
   *                         enum: [PAYMENT, RECEIPT, COLLECTION]
   *                         example: "RECEIPT"
   *                       cash:
   *                         type: number
   *                         example: 50000
   *                       cashDate:
   *                         type: string
   *                         format: date-time
   *                         example: "2024-01-15T08:30:00.000Z"
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                       updatedAt:
   *                         type: string
   *                         format: date-time
   *       400:
   *         description: Bad request (validation error)
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
   *                   example: "Unauthorized"
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
   *                   example: "get list receipt debt management failed"
   */
  getListReceipt = async (request: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!request.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const userId = request.user.userId;
      const result: IDebtManagement[] =
        await this.debtManagementService.getListReceiptDebtMangement(request, userId);

      const response: ApiResponse = {
        success: true,
        message: 'get list receipt debt management successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('get list receipt debt management error:', error);

      const message =
        error instanceof Error ? error.message : 'get list receipt debt management failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/debt-management/create:
   *   post:
   *     summary: create debt management
   *     tags:
   *       - Debt Management
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - toRoute
   *               - fromRoute
   *               - cash
   *               - cashDate
   *               - type
   *               - content
   *             properties:
   *               fromRoute:
   *                 type: string
   *                 description: ObjectId of the from route (auto from user's selectedRouteId - optional)
   *                 example: "507f1f77bcf86cd799439011"
   *               toRoute:
   *                 type: string
   *                 description: ObjectId of the to route
   *                 example: "507f1f77bcf86cd799439012"
   *               cash:
   *                 type: number
   *                 description: Amount of money to send
   *                 example: 1000000
   *               cashDate:
   *                 type: string
   *                 format: date-time
   *                 example: "2025-09-23T08:30:00.000Z"
   *               type:
   *                 type: string
   *                 enum: [PAYMENT, COLLECTION, RECEIPT]
   *                 description: Transfer type (default is PAYMENT)
   *                 example: "PAYMENT"
   *               content:
   *                 type: string
   *                 description: content for transfer money
   *                 example: "TPHCM CK"
   *           examples:
   *             PAYMENT:
   *               summary: PAYMENT debt management
   *               value:
   *                 fromRoute: "507f1f77bcf86cd799439011"
   *                 toRoute: "507f1f77bcf86cd799439012"
   *                 cash: 50000
   *                 type: "PAYMENT"
   *                 cashDate: "2025-09-23T08:30:00.000Z"
   *                 content: "TPHCM CK"
   *             RECEIPT:
   *               summary: RECEIPT debt management
   *               value:
   *                 fromRoute: "507f1f77bcf86cd799439011"
   *                 toRoute: "507f1f77bcf86cd799439012"
   *                 cash: 50000
   *                 type: "RECEIPT"
   *                 cashDate: "2024-12-17T08:30:00.000Z"
   *                 content: "TPHCM CK"
   *     responses:
   *       201:
   *         description: created debt management successfully
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
   *                     fromRoute:
   *                       type: string
   *                       example: "507f1f77bcf86cd799439011"
   *                     toRoute:
   *                       type: string
   *                       example: "507f1f77bcf86cd799439012"
   *                     transferType:
   *                       type: string
   *                       enum: [PAYMENT, COLLECTION, RECEIPT]
   *                     cashDate:
   *                       type: string
   *                       format: date-time
   *                       example: "2024-12-17T10:00:00.000Z"
   *                     cash:
   *                       type: number
   *                       description: cash to transfers
   *                     content:
   *                       type: string
   *                       example: "TPHCM ck"
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *                     updatedAt:
   *                       type: string
   *                       format: date-time
   *             examples:
   *               PAYMENT:
   *                 summary: create debt management
   *                 value:
   *                   success: true
   *                   message: "create debt management successful"
   *                   data:
   *                     id: "507f1f77bcf86cd799439013"
   *                     fromRoute: "507f1f77bcf86cd799439011"
   *                     toRoute: "507f1f77bcf86cd799439012"
   *                     transferType: "PAYMENT"
   *                     cash: 50000
   *                     content: "TPHCM ck"
   *                     cashDate: "2024-12-17T10:00:00.000Z"
   *                     createdAt: "2024-12-17T10:00:00.000Z"
   *                     updatedAt: "2024-12-17T10:00:00.000Z"
   *               RECEIPT:
   *                 summary: create debt management
   *                 value:
   *                   success: true
   *                   message: "create debt management successful"
   *                   data:
   *                     id: "507f1f77bcf86cd799439013"
   *                     fromRoute: "507f1f77bcf86cd799439011"
   *                     toRoute: "507f1f77bcf86cd799439012"
   *                     transferType: "RECEIPT"
   *                     cash: 50000
   *                     content: "TPHCM ck"
   *                     cashDate: "2024-12-17T10:00:00.000Z"
   *                     createdAt: "2024-12-17T10:00:00.000Z"
   *                     updatedAt: "2024-12-17T10:00:00.000Z"
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
   *                   example: "Unauthorized"
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
   *       500:
   *         description: Internal server error
   */

  createDebtManagement = async (request: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!request.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const result: IDebtManagement = await this.debtManagementService.createDebtManagement(
        request.body,
        request.user.userId
      );

      const response: ApiResponse = {
        success: true,
        message: 'create debt management successful',
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('create debt management error:', error);

      const message = error instanceof Error ? error.message : 'create debt management failed';

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
   * /api/debt-management/{id}:
   *   delete:
   *     summary: Delete debt management by ID
   *     tags: [Debt Management]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           pattern: '^[0-9a-fA-F]{24}$'
   *         description: Debt management ID
   *         example: "507f1f77bcf86cd799439011"
   *     responses:
   *       200:
   *         description: Debt management deleted successfully
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
   *                   example: "debt management deleted successfully"
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
   *         description: Debt management not found
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
   *                   example: "Debt Management not found"
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
   *                   example: "delete debt management failed"
   */
  deleteDebtManagement = async (req: AuthRequest, res: Response): Promise<void> => {
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

      await this.debtManagementService.deleteDebtManagement(id);

      logger.info(`debt management deleted: ${id}`);

      const response: ApiResponse = {
        success: true,
        message: 'debt management deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('create debt management error:', error);

      const message = error instanceof Error ? error.message : 'delete debt management failed';

      const statusCode = message.includes('not found') ? 404 : 500;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };
}
