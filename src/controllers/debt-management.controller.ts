import { DEBT_MANAGEMENT_TYPE_REPORT } from '@/const/debt-management.const';
import { DebtManagementService } from '@/services/deb-management.service';
import { ApiResponse, AuthRequest } from '@/types';
import {
  ICreateDebtManagementResponse,
  IGetListPaymentDebtManagementResponse,
  IGetListReceiptDebtManagementResponse,
} from '@/types/debt-management.type';
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
   *     description: Returns payment debt management records filtered by user's selected route (fromRoute). The fromRouteId is automatically taken from the authenticated user's selected route. Optionally filter by toRouteId query parameter.
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
   *         description: End date for filtering (ISO format). Must be after or equal to startDate.
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
   *       - in: query
   *         name: key
   *         required: false
   *         schema:
   *           type: string
   *           maxLength: 120
   *         description: Search key for filtering (optional)
   *         example: "search term"
   *       - in: query
   *         name: toRouteId
   *         required: false
   *         schema:
   *           type: string
   *           pattern: ^[0-9a-fA-F]{24}$
   *         description: Filter by to route ID (MongoDB ObjectId format). Optional. If not provided, returns all records for user's selected fromRoute.
   *         example: "507f1f77bcf86cd799439011"
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
   *                   type: object
   *                   properties:
   *                     data:
   *                       type: array
   *                       description: List of payment debt management records
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                             example: "507f1f77bcf86cd799439011"
   *                           fromRoute:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: string
   *                                 example: "507f1f77bcf86cd799439011"
   *                               name:
   *                                 type: string
   *                                 example: "Route A"
   *                           toRoute:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: string
   *                                 example: "507f1f77bcf86cd799439012"
   *                               name:
   *                                 type: string
   *                                 example: "Route B"
   *                           content:
   *                             type: string
   *                             example: "TPHCM CK"
   *                           type:
   *                             type: string
   *                             enum: [PAYMENT, RECEIPT]
   *                             example: "PAYMENT"
   *                           cash:
   *                             type: number
   *                             example: 50000
   *                           cashDate:
   *                             type: string
   *                             format: date-time
   *                             example: "2024-01-15T08:30:00.000Z"
   *                           deleted:
   *                             type: boolean
   *                             example: false
   *                           reason:
   *                             type: string
   *                             nullable: true
   *                             description: Reason for deletion (if deleted)
   *                             example: null
   *                           createdAt:
   *                             type: string
   *                             format: date-time
   *                             example: "2024-01-15T08:30:00.000Z"
   *                           updatedAt:
   *                             type: string
   *                             format: date-time
   *                             example: "2024-01-15T08:30:00.000Z"
   *             examples:
   *               success:
   *                 summary: Successful response
   *                 value:
   *                   success: true
   *                   message: "get list payment debt management successful"
   *                   data:
   *                     data:
   *                       - id: "507f1f77bcf86cd799439011"
   *                         fromRoute:
   *                           id: "507f1f77bcf86cd799439011"
   *                           name: "Route A"
   *                         toRoute:
   *                           id: "507f1f77bcf86cd799439012"
   *                           name: "Route B"
   *                         content: "TPHCM CK"
   *                         type: "PAYMENT"
   *                         cash: 50000
   *                         cashDate: "2024-01-15T08:30:00.000Z"
   *                         deleted: false
   *                         reason: null
   *                         createdAt: "2024-01-15T08:30:00.000Z"
   *                         updatedAt: "2024-01-15T08:30:00.000Z"
   *       400:
   *         description: Bad request (validation error)
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
   *             examples:
   *               validationError:
   *                 summary: Validation error
   *                 value:
   *                   success: false
   *                   message: "Start date must be before or equal to end date"
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
   *             examples:
   *               unauthorized:
   *                 summary: Unauthorized access
   *                 value:
   *                   success: false
   *                   message: "Unauthorized"
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
   *             examples:
   *               serverError:
   *                 summary: Server error
   *                 value:
   *                   success: false
   *                   message: "get list payment debt management failed"
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
      const result: IGetListPaymentDebtManagementResponse =
        await this.debtManagementService.getListPaymentDebtMangement(request, userId);

      const response: ApiResponse<IGetListPaymentDebtManagementResponse> = {
        success: true,
        message: 'get list payment debt management successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('get list payment debt management error:', error);

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
   *     summary: Get list of receipt debt management records
   *     description: Returns receipt debt management records filtered by user's selected route (toRoute). The toRouteId is automatically taken from the authenticated user's selected route. Optionally filter by fromRouteId query parameter.
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
   *         description: End date for filtering (ISO format). Must be after or equal to startDate.
   *         example: "2024-01-31"
   *       - in: query
   *         name: keySort
   *         required: false
   *         schema:
   *           type: string
   *           enum: ["toRoute", "cash", "cashDate"]
   *         description: Field to sort by
   *         example: "toRoute"
   *       - in: query
   *         name: typeSort
   *         required: false
   *         schema:
   *           type: string
   *           enum: ["asc", "desc", "1", "-1"]
   *         description: Sort order (asc/desc or 1/-1)
   *         example: "asc"
   *       - in: query
   *         name: key
   *         required: false
   *         schema:
   *           type: string
   *           maxLength: 120
   *         description: Search key for filtering (optional)
   *         example: "search term"
   *       - in: query
   *         name: fromRouteId
   *         required: false
   *         schema:
   *           type: string
   *           pattern: ^[0-9a-fA-F]{24}$
   *         description: Filter by from route ID (MongoDB ObjectId format). Optional.
   *         example: "507f1f77bcf86cd799439011"
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
   *                   type: object
   *                   properties:
   *                     data:
   *                       type: array
   *                       description: List of receipt debt management records
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                             example: "507f1f77bcf86cd799439011"
   *                           fromRoute:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: string
   *                                 example: "507f1f77bcf86cd799439011"
   *                               name:
   *                                 type: string
   *                                 example: "Route A"
   *                           toRoute:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: string
   *                                 example: "507f1f77bcf86cd799439012"
   *                               name:
   *                                 type: string
   *                                 example: "Route B"
   *                           content:
   *                             type: string
   *                             example: "TPHCM CK"
   *                           type:
   *                             type: string
   *                             enum: [PAYMENT, RECEIPT]
   *                             example: "RECEIPT"
   *                           cash:
   *                             type: number
   *                             example: 50000
   *                           cashDate:
   *                             type: string
   *                             format: date-time
   *                             example: "2024-01-15T08:30:00.000Z"
   *                           deleted:
   *                             type: boolean
   *                             example: false
   *                           reason:
   *                             type: string
   *                             nullable: true
   *                             description: Reason for deletion (if deleted)
   *                             example: null
   *                           createdAt:
   *                             type: string
   *                             format: date-time
   *                             example: "2024-01-15T08:30:00.000Z"
   *                           updatedAt:
   *                             type: string
   *                             format: date-time
   *                             example: "2024-01-15T08:30:00.000Z"
   *             examples:
   *               success:
   *                 summary: Successful response
   *                 value:
   *                   success: true
   *                   message: "get list receipt debt management successful"
   *                   data:
   *                     data:
   *                       - id: "507f1f77bcf86cd799439011"
   *                         fromRoute:
   *                           id: "507f1f77bcf86cd799439011"
   *                           name: "Route A"
   *                         toRoute:
   *                           id: "507f1f77bcf86cd799439012"
   *                           name: "Route B"
   *                         content: "TPHCM CK"
   *                         type: "RECEIPT"
   *                         cash: 50000
   *                         cashDate: "2024-01-15T08:30:00.000Z"
   *                         deleted: false
   *                         reason: null
   *                         createdAt: "2024-01-15T08:30:00.000Z"
   *                         updatedAt: "2024-01-15T08:30:00.000Z"
   *       400:
   *         description: Bad request (validation error)
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
   *             examples:
   *               validationError:
   *                 summary: Validation error
   *                 value:
   *                   success: false
   *                   message: "Start date must be before or equal to end date"
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
   *             examples:
   *               unauthorized:
   *                 summary: Unauthorized access
   *                 value:
   *                   success: false
   *                   message: "Unauthorized"
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
   *             examples:
   *               serverError:
   *                 summary: Server error
   *                 value:
   *                   success: false
   *                   message: "get list receipt debt management failed"
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
      const result: IGetListReceiptDebtManagementResponse =
        await this.debtManagementService.getListReceiptDebtMangement(request, userId);

      const response: ApiResponse<IGetListReceiptDebtManagementResponse> = {
        success: true,
        message: 'get list receipt debt management successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('get list receipt debt management error:', error);

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
   *     summary: Create debt management
   *     description: |
   *       Creates two debt management records (RECEIPT and PAYMENT) in a single transaction.
   *       The toRoute is automatically taken from the authenticated user's selected route.
   *       Only fromRoute, cash, cashDate, and content need to be provided in the request body.
   *       This API will update the debt records and debt reports for the current day.
   *       Note: Debt records must exist for the current day (cronjob must have run).
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
   *               - fromRoute
   *               - cash
   *               - cashDate
   *               - content
   *             properties:
   *               fromRoute:
   *                 type: string
   *                 description: ObjectId of the source route
   *                 example: "507f1f77bcf86cd799439011"
   *               cash:
   *                 type: number
   *                 minimum: 0
   *                 description: Amount of money (must be positive)
   *                 example: 1000000
   *               cashDate:
   *                 type: string
   *                 format: date-time
   *                 example: "2024-12-17T08:30:00.000Z"
   *               content:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 100
   *                 description: Content/description for the debt management transaction (1-100 characters)
   *                 example: "TPHCM CK"
   *           examples:
   *             example1:
   *               summary: Create debt management
   *               value:
   *                 fromRoute: "507f1f77bcf86cd799439011"
   *                 cash: 50000
   *                 cashDate: "2024-12-17T08:30:00.000Z"
   *                 content: "TPHCM CK"
   *     responses:
   *       201:
   *         description: Created debt management successfully
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
   *                   example: "create debt management successful"
   *                 data:
   *                   type: object
   *                   properties:
   *                     data:
   *                       type: array
   *                       description: Array of created debt management records (RECEIPT and PAYMENT)
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                             example: "507f1f77bcf86cd799439013"
   *                           fromRoute:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: string
   *                                 example: "507f1f77bcf86cd799439011"
   *                               name:
   *                                 type: string
   *                                 example: "Route A"
   *                           toRoute:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: string
   *                                 example: "507f1f77bcf86cd799439012"
   *                               name:
   *                                 type: string
   *                                 example: "Route B"
   *                           type:
   *                             type: string
   *                             enum: [PAYMENT, RECEIPT]
   *                             example: "RECEIPT"
   *                           cash:
   *                             type: number
   *                             description: Amount of money
   *                             example: 50000
   *                           cashDate:
   *                             type: string
   *                             format: date-time
   *                             example: "2024-12-17T10:00:00.000Z"
   *                           content:
   *                             type: string
   *                             example: "TPHCM CK"
   *                           deleted:
   *                             type: boolean
   *                             example: false
   *                           createdAt:
   *                             type: string
   *                             format: date-time
   *                             example: "2024-12-17T10:00:00.000Z"
   *                           updatedAt:
   *                             type: string
   *                             format: date-time
   *                             example: "2024-12-17T10:00:00.000Z"
   *             examples:
   *               example1:
   *                 summary: Create debt management (returns 2 records)
   *                 value:
   *                   success: true
   *                   message: "create debt management successful"
   *                   data:
   *                     data:
   *                       - id: "507f1f77bcf86cd799439013"
   *                         fromRoute:
   *                           id: "507f1f77bcf86cd799439011"
   *                           name: "Route A"
   *                         toRoute:
   *                           id: "507f1f77bcf86cd799439012"
   *                           name: "Route B"
   *                         type: "RECEIPT"
   *                         cash: 50000
   *                         cashDate: "2024-12-17T10:00:00.000Z"
   *                         content: "TPHCM CK"
   *                         deleted: false
   *                         createdAt: "2024-12-17T10:00:00.000Z"
   *                         updatedAt: "2024-12-17T10:00:00.000Z"
   *                       - id: "507f1f77bcf86cd799439014"
   *                         fromRoute:
   *                           id: "507f1f77bcf86cd799439011"
   *                           name: "Route A"
   *                         toRoute:
   *                           id: "507f1f77bcf86cd799439012"
   *                           name: "Route B"
   *                         type: "PAYMENT"
   *                         cash: 50000
   *                         cashDate: "2024-12-17T10:00:00.000Z"
   *                         content: "TPHCM CK"
   *                         deleted: false
   *                         createdAt: "2024-12-17T10:00:00.000Z"
   *                         updatedAt: "2024-12-17T10:00:00.000Z"
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
   *         description: Route not found or debt record not found
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
   *               debtRecordNotFound:
   *                 summary: Debt record not found for the day
   *                 value:
   *                   success: false
   *                   message: "Debt record not found for the day. Please ensure cronjob has run."
   *       400:
   *         description: Bad request (validation error)
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
   *             examples:
   *               validationError:
   *                 summary: Validation error
   *                 value:
   *                   success: false
   *                   message: "content is required"
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
   *                   example: "create debt management failed"
   *             examples:
   *               serverError:
   *                 summary: Server error
   *                 value:
   *                   success: false
   *                   message: "create debt management failed"
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

      const debtManagement = await this.debtManagementService.createDebtManagement(
        request.body,
        request.user.userId
      );

      const result: ICreateDebtManagementResponse = {
        data: debtManagement,
      };

      const response: ApiResponse<ICreateDebtManagementResponse> = {
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
   * /api/debt-management/create-clearing:
   *   post:
   *     summary: Create debt clearing slip (phiếu gặt)
   *     description: |
   *       Tạo phiếu gặt công nợ qua trạm hiện tại đang chọn.
   *       Ví dụ:
   *       - TM nợ TA 20k
   *       - TA nợ TP 20k
   *       => Gặt TM qua TP
   *       => TM sẽ nợ TP 20k, TA hết nợ TP, TM hết nợ TA
   *
   *       Trong request:
   *       - fromRoute = TM
   *       - toRoute = TP
   *       - route đang chọn của user = TA (trạm trung gian/pivot)
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
   *               - fromRoute
   *               - toRoute
   *               - cash
   *               - cashDate
   *               - content
   *             properties:
   *               fromRoute:
   *                 type: string
   *                 example: "507f1f77bcf86cd799439011"
   *               toRoute:
   *                 type: string
   *                 example: "507f1f77bcf86cd799439012"
   *               cash:
   *                 type: number
   *                 minimum: 1
   *                 example: 20000
   *               cashDate:
   *                 type: string
   *                 format: date-time
   *                 example: "2026-03-09T08:30:00.000Z"
   *               content:
   *                 type: string
   *                 example: "Gặt TM qua TP"
   *     responses:
   *       201:
   *         description: create debt clearing successful
   *       400:
   *         description: validation error
   *       401:
   *         description: unauthorized
   *       404:
   *         description: route/debt not found
   *       500:
   *         description: internal server error
   */
  createDebtClearing = async (request: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!request.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const debtClearing = await this.debtManagementService.createDebtClearing(
        request.body,
        request.user.userId
      );

      const response: ApiResponse = {
        success: true,
        message: 'create debt clearing successful',
        data: {
          data: debtClearing,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('create debt clearing error:', error);

      const message = error instanceof Error ? error.message : 'create debt clearing failed';

      let statusCode = 500;
      if (message.includes('not found')) {
        statusCode = 404;
      } else if (
        message.includes('validation') ||
        message.includes('invalid') ||
        message.includes('different')
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

  getListClearingDebtManagement = async (
    request: AuthRequest,
    response: Response
  ): Promise<void> => {
    try {
      if (!request.user) {
        response.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const result = await this.debtManagementService.getListClearingDebtManagement(
        request,
        request.user.userId
      );

      response.status(200).json({
        success: true,
        message: 'Get list clearing debt management successful',
        data: result,
      });
    } catch (error) {
      logger.error('get list clearing debt management error:', error);

      response.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : 'get list clearing debt management failed',
      });
    }
  };

  /**
   * @swagger
   * /api/debt-management/{id}:
   *   put:
   *     summary: Delete debt management by ID
   *     description: |
   *       Soft delete debt management record(s) by setting deleted flag to true.
   *       This API will delete all matching debt management records with the same cash, fromRoute, toRoute, and cashDate.
   *       Only records created today can be deleted. Records from previous days cannot be deleted.
   *       Requires reason in request body.
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
   *         description: Debt management ID (MongoDB ObjectId)
   *         example: "507f1f77bcf86cd799439011"
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reason
   *             properties:
   *               reason:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 500
   *                 description: Reason for deletion (required, 1-500 characters)
   *                 example: "Nhập sai thông tin"
   *           examples:
   *             example1:
   *               summary: Delete with reason
   *               value:
   *                 reason: "Nhập sai thông tin"
   *             example2:
   *               summary: Delete with detailed reason
   *               value:
   *                 reason: "Nhập sai số tiền, cần xóa và tạo lại với số tiền chính xác"
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
   *             examples:
   *               success:
   *                 summary: Successful deletion
   *                 value:
   *                   success: true
   *                   message: "debt management deleted successfully"
   *       400:
   *         description: Bad request (validation error)
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
   *                   example: "Validation failed"
   *                 errors:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       path:
   *                         type: string
   *                         example: "body.reason"
   *                       message:
   *                         type: string
   *                         example: "Reason is required"
   *             examples:
   *               validationError:
   *                 summary: Validation error
   *                 value:
   *                   success: false
   *                   message: "Validation failed"
   *                   errors:
   *                     - path: "body.reason"
   *                       message: "Reason is required"
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
   *             examples:
   *               unauthorized:
   *                 summary: Unauthorized access
   *                 value:
   *                   success: false
   *                   message: "User not authenticated"
   *       404:
   *         description: Debt management not found or already deleted
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
   *                 summary: Record not found
   *                 value:
   *                   success: false
   *                   message: "Debt Management not found"
   *               alreadyDeleted:
   *                 summary: Already deleted
   *                 value:
   *                   success: false
   *                   message: "Debt Management already deleted"
   *               cannotDeleteOldRecords:
   *                 summary: Cannot delete old records
   *                 value:
   *                   success: false
   *                   message: "Cannot delete debt management records from previous days. Only today's records can be deleted."
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
   *             examples:
   *               serverError:
   *                 summary: Server error
   *                 value:
   *                   success: false
   *                   message: "delete debt management failed"
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
      const { reason } = req.body;

      await this.debtManagementService.deleteDebtManagement(id, reason);

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

  /**
   * @swagger
   * /api/debt-management/export-report-debt-and-debt-management:
   *   get:
   *     summary: Export report debt and debt management
   *     description: |
   *       Exports report data based on type parameter:
   *       - **PAYMENT**: Returns payment debt management records (Chi). Uses user's selected route as fromRoute.
   *       - **RECEIPT**: Returns receipt debt management records (Thu). Uses user's selected route as toRoute.
   *       - **DEBT**: Returns debt records with totals. Uses user's selected route as toRoute.
   *       - **TOTAL**: Returns aggregated total debt rows per route, overall totals, and receipt debt management records.
   *       The routeId is optional and will be used as filter parameter (toRouteId for PAYMENT, fromRouteId for RECEIPT and DEBT).
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
   *         description: Start date for filtering (ISO format). Must be before or equal to endDate.
   *         example: "2024-01-01"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for filtering (ISO format). Must be after or equal to startDate.
   *         example: "2024-01-31"
   *       - in: query
   *         name: routeId
   *         required: false
   *         schema:
   *           type: string
   *           pattern: ^[0-9a-fA-F]{24}$
   *         description: Route ID for filtering (MongoDB ObjectId format). Optional. Used as toRouteId for PAYMENT, fromRouteId for RECEIPT and DEBT.
   *         example: "507f1f77bcf86cd799439011"
   *       - in: query
   *         name: type
   *         required: true
   *         schema:
   *           type: string
   *           enum: [PAYMENT, RECEIPT, DEBT, TOTAL]
   *         description: Type of report to export
   *         example: "PAYMENT"
   *     responses:
   *       200:
   *         description: Export report successful. Response shape depends on the `type` parameter.
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
   *                   example: "export report debt and debt management successful"
   *                 data:
   *                   oneOf:
   *                     - type: object
   *                       title: PaymentResponse
   *                       description: "Response when type=PAYMENT. Returns payment debt management records."
   *                       properties:
   *                         data:
   *                           type: array
   *                           items:
   *                             $ref: '#/components/schemas/DebtManagementItem'
   *                     - type: object
   *                       title: ReceiptResponse
   *                       description: "Response when type=RECEIPT. Returns receipt debt management records."
   *                       properties:
   *                         data:
   *                           type: array
   *                           items:
   *                             $ref: '#/components/schemas/DebtManagementItem'
   *                     - type: object
   *                       title: DebtResponse
   *                       description: "Response when type=DEBT. Returns debt records with totals."
   *                       properties:
   *                         data:
   *                           type: array
   *                           items:
   *                             $ref: '#/components/schemas/DebtRow'
   *                         total:
   *                           $ref: '#/components/schemas/DebtTotal'
   *                     - type: object
   *                       title: TotalResponse
   *                       description: "Response when type=TOTAL. Returns aggregated total debt rows, totals, and receipt debt management records."
   *                       properties:
   *                         data:
   *                           type: array
   *                           items:
   *                             $ref: '#/components/schemas/ExportTotalDebtRow'
   *                         total:
   *                           $ref: '#/components/schemas/DebtTotal'
   *                         dataListReceiptDebtManagement:
   *                           type: array
   *                           description: Receipt debt management records for the same date range
   *                           items:
   *                             $ref: '#/components/schemas/DebtManagementItem'
   *                         dataListPaymentDebtManagement:
   *                           type: array
   *                           description: Payment debt management records for the same date range
   *                           items:
   *                             $ref: '#/components/schemas/DebtManagementItem'
   *             examples:
   *               payment:
   *                 summary: Payment type response
   *                 value:
   *                   success: true
   *                   message: "export report debt and debt management successful"
   *                   data:
   *                     data:
   *                       - id: "507f1f77bcf86cd799439011"
   *                         fromRoute:
   *                           id: "507f1f77bcf86cd799439011"
   *                           name: "Route A"
   *                         toRoute:
   *                           id: "507f1f77bcf86cd799439012"
   *                           name: "Route B"
   *                         content: "TPHCM CK"
   *                         type: "PAYMENT"
   *                         cash: 50000
   *                         cashDate: "2024-01-15T10:00:00.000Z"
   *                         deleted: false
   *                         createdAt: "2024-01-15T10:00:00.000Z"
   *                         updatedAt: "2024-01-15T10:00:00.000Z"
   *                         createdBy:
   *                           id: "507f1f77bcf86cd799439099"
   *                           username: "user1"
   *                           name: "Nguyen Van A"
   *               receipt:
   *                 summary: Receipt type response
   *                 value:
   *                   success: true
   *                   message: "export report debt and debt management successful"
   *                   data:
   *                     data:
   *                       - id: "507f1f77bcf86cd799439013"
   *                         fromRoute:
   *                           id: "507f1f77bcf86cd799439011"
   *                           name: "Route A"
   *                         toRoute:
   *                           id: "507f1f77bcf86cd799439012"
   *                           name: "Route B"
   *                         content: "TPHCM CK"
   *                         type: "RECEIPT"
   *                         cash: 50000
   *                         cashDate: "2024-01-15T10:00:00.000Z"
   *                         deleted: false
   *                         createdAt: "2024-01-15T10:00:00.000Z"
   *                         updatedAt: "2024-01-15T10:00:00.000Z"
   *                         createdBy:
   *                           id: "507f1f77bcf86cd799439099"
   *                           username: "user1"
   *                           name: "Nguyen Van A"
   *               debt:
   *                 summary: Debt type response
   *                 value:
   *                   success: true
   *                   message: "export report debt and debt management successful"
   *                   data:
   *                     data:
   *                       - id: "507f1f77bcf86cd799439015"
   *                         fromRoute:
   *                           id: "507f1f77bcf86cd799439011"
   *                           name: "Route A"
   *                         toRoute:
   *                           id: "507f1f77bcf86cd799439012"
   *                           name: "Route B"
   *                         openingBalance: 100000
   *                         costFromRoute: 50000
   *                         feeCODToRoute: 20000
   *                         costToRoute: 30000
   *                         feeCODFromRoute: 10000
   *                         accountPayable: 5000
   *                         receivable: 15000
   *                         homeDeliveryFromRoute: 8000
   *                         homeDeliveryToRoute: 6000
   *                         surchargeToRoute: 3000
   *                         surchargeFromRoute: 2000
   *                         totalDebt: 250000
   *                     total:
   *                       openingBalance: 100000
   *                       costFromRoute: 50000
   *                       feeCODToRoute: 20000
   *                       costToRoute: 30000
   *                       feeCODFromRoute: 10000
   *                       accountPayable: 5000
   *                       receivable: 15000
   *                       homeDeliveryFromRoute: 8000
   *                       homeDeliveryToRoute: 6000
   *                       surchargeToRoute: 3000
   *                       surchargeFromRoute: 2000
   *                       totalDebt: 250000
   *               total:
   *                 summary: Total type response
   *                 value:
   *                   success: true
   *                   message: "export report debt and debt management successful"
   *                   data:
   *                     data:
   *                       - fromRoute:
   *                           id: "507f1f77bcf86cd799439011"
   *                           name: "Route A"
   *                         openingBalance: 100000
   *                         costFromRoute: 50000
   *                         feeCODToRoute: 20000
   *                         costToRoute: 30000
   *                         feeCODFromRoute: 10000
   *                         accountPayable: 5000
   *                         receivable: 15000
   *                         homeDeliveryFromRoute: 8000
   *                         homeDeliveryToRoute: 6000
   *                         surchargeToRoute: 3000
   *                         surchargeFromRoute: 2000
   *                         totalDebt: 250000
   *                     total:
   *                       openingBalance: 100000
   *                       costFromRoute: 50000
   *                       feeCODToRoute: 20000
   *                       costToRoute: 30000
   *                       feeCODFromRoute: 10000
   *                       accountPayable: 5000
   *                       receivable: 15000
   *                       homeDeliveryFromRoute: 8000
   *                       homeDeliveryToRoute: 6000
   *                       surchargeToRoute: 3000
   *                       surchargeFromRoute: 2000
   *                       totalDebt: 250000
   *                     dataListReceiptDebtManagement:
   *                       - id: "507f1f77bcf86cd799439013"
   *                         fromRoute:
   *                           id: "507f1f77bcf86cd799439011"
   *                           name: "Route A"
   *                         toRoute:
   *                           id: "507f1f77bcf86cd799439012"
   *                           name: "Route B"
   *                         content: "TPHCM CK"
   *                         type: "RECEIPT"
   *                         cash: 50000
   *                         cashDate: "2024-01-15T10:00:00.000Z"
   *                         deleted: false
   *                         createdAt: "2024-01-15T10:00:00.000Z"
   *                         updatedAt: "2024-01-15T10:00:00.000Z"
   *                         createdBy:
   *                           id: "507f1f77bcf86cd799439099"
   *                           username: "user1"
   *                           name: "Nguyen Van A"
   *                     dataListPaymentDebtManagement:
   *                       - id: "507f1f77bcf86cd799439014"
   *                         fromRoute:
   *                           id: "507f1f77bcf86cd799439011"
   *                           name: "Route A"
   *                         toRoute:
   *                           id: "507f1f77bcf86cd799439012"
   *                           name: "Route B"
   *                         content: "TPHCM CK"
   *                         type: "PAYMENT"
   *                         cash: 50000
   *                         cashDate: "2024-01-15T10:00:00.000Z"
   *                         deleted: false
   *                         createdAt: "2024-01-15T10:00:00.000Z"
   *                         updatedAt: "2024-01-15T10:00:00.000Z"
   *                         createdBy:
   *                           id: "507f1f77bcf86cd799439099"
   *                           username: "user1"
   *                           name: "Nguyen Van A"
   *       400:
   *         description: Bad request (validation error)
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
   *             examples:
   *               invalidType:
   *                 summary: Invalid type
   *                 value:
   *                   success: false
   *                   message: "Invalid type. Must be one of: PAYMENT, RECEIPT, DEBT, TOTAL"
   *               missingParams:
   *                 summary: Missing required params
   *                 value:
   *                   success: false
   *                   message: "startDate, endDate, and type are required"
   *               invalidRouteId:
   *                 summary: Invalid routeId
   *                 value:
   *                   success: false
   *                   message: "Invalid routeId format"
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
   *                   example: "export report debt and debt management failed"
   *
   * components:
   *   schemas:
   *     DebtManagementItem:
   *       type: object
   *       properties:
   *         id:
   *           type: string
   *           example: "507f1f77bcf86cd799439011"
   *         fromRoute:
   *           type: object
   *           properties:
   *             id:
   *               type: string
   *               example: "507f1f77bcf86cd799439011"
   *             name:
   *               type: string
   *               example: "Route A"
   *         toRoute:
   *           type: object
   *           properties:
   *             id:
   *               type: string
   *               example: "507f1f77bcf86cd799439012"
   *             name:
   *               type: string
   *               example: "Route B"
   *         content:
   *           type: string
   *           example: "TPHCM CK"
   *         type:
   *           type: string
   *           enum: [PAYMENT, RECEIPT]
   *           example: "PAYMENT"
   *         cash:
   *           type: number
   *           description: Amount of money
   *           example: 50000
   *         cashDate:
   *           type: string
   *           format: date-time
   *           example: "2024-01-15T10:00:00.000Z"
   *         deleted:
   *           type: boolean
   *           example: false
   *         reason:
   *           type: string
   *           description: Reason for deletion (only present if deleted)
   *           example: "Nhập sai thông tin"
   *         createdAt:
   *           type: string
   *           format: date-time
   *           example: "2024-01-15T10:00:00.000Z"
   *         updatedAt:
   *           type: string
   *           format: date-time
   *           example: "2024-01-15T10:00:00.000Z"
   *         createdBy:
   *           type: object
   *           properties:
   *             id:
   *               type: string
   *               example: "507f1f77bcf86cd799439099"
   *             username:
   *               type: string
   *               example: "user1"
   *             name:
   *               type: string
   *               example: "Nguyen Van A"
   *     DebtRow:
   *       type: object
   *       properties:
   *         id:
   *           type: string
   *           example: "507f1f77bcf86cd799439015"
   *         fromRoute:
   *           type: object
   *           properties:
   *             id:
   *               type: string
   *               example: "507f1f77bcf86cd799439011"
   *             name:
   *               type: string
   *               example: "Route A"
   *         toRoute:
   *           type: object
   *           properties:
   *             id:
   *               type: string
   *               example: "507f1f77bcf86cd799439012"
   *             name:
   *               type: string
   *               example: "Route B"
   *         openingBalance:
   *           type: number
   *           description: Tồn đầu
   *           example: 100000
   *         costFromRoute:
   *           type: number
   *           description: Tiền đi
   *           example: 50000
   *         feeCODToRoute:
   *           type: number
   *           description: Nợ cước về
   *           example: 20000
   *         costToRoute:
   *           type: number
   *           description: Tiền về
   *           example: 30000
   *         feeCODFromRoute:
   *           type: number
   *           description: Nợ cước đi
   *           example: 10000
   *         accountPayable:
   *           type: number
   *           description: Chi
   *           example: 5000
   *         receivable:
   *           type: number
   *           description: Thu
   *           example: 15000
   *         homeDeliveryFromRoute:
   *           type: number
   *           description: Giao tận nơi đi
   *           example: 8000
   *         homeDeliveryToRoute:
   *           type: number
   *           description: Giao tận nơi về
   *           example: 6000
   *         surchargeToRoute:
   *           type: number
   *           description: Phụ phí về
   *           example: 3000
   *         surchargeFromRoute:
   *           type: number
   *           description: Phụ phí đi
   *           example: 2000
   *         totalDebt:
   *           type: number
   *           description: Tổng nợ
   *           example: 250000
   *         paymentDebt:
   *           type: number
   *           description: Thanh toán nợ
   *           example: 0
   *         dateDebt:
   *           type: string
   *           format: date-time
   *           description: Ngày nợ
   *           example: "2024-01-15T17:00:00.000Z"
   *         createdAt:
   *           type: string
   *           format: date-time
   *           example: "2024-01-15T10:00:00.000Z"
   *         updatedAt:
   *           type: string
   *           format: date-time
   *           example: "2024-01-15T10:00:00.000Z"
   *     DebtTotal:
   *       type: object
   *       properties:
   *         openingBalance:
   *           type: number
   *           example: 100000
   *         costFromRoute:
   *           type: number
   *           example: 50000
   *         feeCODToRoute:
   *           type: number
   *           example: 20000
   *         costToRoute:
   *           type: number
   *           example: 30000
   *         feeCODFromRoute:
   *           type: number
   *           example: 10000
   *         accountPayable:
   *           type: number
   *           example: 5000
   *         receivable:
   *           type: number
   *           example: 15000
   *         homeDeliveryFromRoute:
   *           type: number
   *           example: 8000
   *         homeDeliveryToRoute:
   *           type: number
   *           example: 6000
   *         surchargeToRoute:
   *           type: number
   *           example: 3000
   *         surchargeFromRoute:
   *           type: number
   *           example: 2000
   *         totalDebt:
   *           type: number
   *           example: 250000
   *     ExportTotalDebtRow:
   *       type: object
   *       description: Aggregated total debt row per route
   *       properties:
   *         fromRoute:
   *           type: object
   *           properties:
   *             id:
   *               type: string
   *               example: "507f1f77bcf86cd799439011"
   *             name:
   *               type: string
   *               example: "Route A"
   *         openingBalance:
   *           type: number
   *           example: 100000
   *         costFromRoute:
   *           type: number
   *           example: 50000
   *         feeCODToRoute:
   *           type: number
   *           example: 20000
   *         costToRoute:
   *           type: number
   *           example: 30000
   *         feeCODFromRoute:
   *           type: number
   *           example: 10000
   *         accountPayable:
   *           type: number
   *           example: 5000
   *         receivable:
   *           type: number
   *           example: 15000
   *         homeDeliveryFromRoute:
   *           type: number
   *           example: 8000
   *         homeDeliveryToRoute:
   *           type: number
   *           example: 6000
   *         surchargeToRoute:
   *           type: number
   *           example: 3000
   *         surchargeFromRoute:
   *           type: number
   *           example: 2000
   *         totalDebt:
   *           type: number
   *           example: 250000
   */
  exportReportDebtAndDebtManagement = async (
    request: AuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!request.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { startDate, endDate, routeId, type } = request.query;

      if (!startDate || !endDate || !type) {
        const response: ApiResponse = {
          success: false,
          message: 'startDate, endDate, and type are required',
        };
        res.status(400).json(response);
        return;
      }

      // Validate type
      if (
        type !== DEBT_MANAGEMENT_TYPE_REPORT.PAYMENT &&
        type !== DEBT_MANAGEMENT_TYPE_REPORT.RECEIPT &&
        type !== DEBT_MANAGEMENT_TYPE_REPORT.DEBT &&
        type !== DEBT_MANAGEMENT_TYPE_REPORT.TOTAL
      ) {
        const response: ApiResponse = {
          success: false,
          message: `Invalid type. Must be one of: ${DEBT_MANAGEMENT_TYPE_REPORT.PAYMENT}, ${DEBT_MANAGEMENT_TYPE_REPORT.RECEIPT}, ${DEBT_MANAGEMENT_TYPE_REPORT.DEBT}, ${DEBT_MANAGEMENT_TYPE_REPORT.TOTAL}`,
        };
        res.status(400).json(response);
        return;
      }

      const userId = request.user.userId;
      const start = new Date(String(startDate));
      const end = new Date(String(endDate));

      const result = await this.debtManagementService.exportReportDebtAndDebtManagement(
        start,
        end,
        String(type),
        userId,
        routeId ? String(routeId) : undefined
      );

      const response: ApiResponse = {
        success: true,
        message: 'export report debt and debt management successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('export report debt and debt management error:', error);

      const message =
        error instanceof Error ? error.message : 'export report debt and debt management failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };
}
