import { DebtService } from '@/services/debt.service';
import { ApiResponse, AuthRequest } from '@/types';
import { IDebtReportDetailWithListValues, IGetListDebtResponse } from '@/types/debt.type';
import { Response } from 'express';

export class DebtController {
  private debtService: DebtService;

  constructor() {
    this.debtService = new DebtService();
  }

  /**
   * @swagger
   * /api/debt/get-list-debt:
   *   get:
   *     summary: Get list of debt records
   *     description: Returns debt records filtered by user's selected route (toRoute). The toRouteId is automatically taken from the authenticated user's selected route. Optionally filter by fromRouteId.
   *     tags: [Debt]
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
   *           enum: ["toRoute", "totalCost"]
   *         description: Field to sort by
   *         example: "totalCost"
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
   *         description: Get list debt successful
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
   *                   example: "get list debt successful"
   *                 data:
   *                   type: object
   *                   properties:
   *                     data:
   *                       type: array
   *                       description: List of debt records
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
   *                               name:
   *                                 type: string
   *                           toRoute:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: string
   *                               name:
   *                                 type: string
   *                           openingBalance:
   *                             type: number
   *                             description: Opening balance (can be negative)
   *                             example: 0
   *                           costFromRoute:
   *                             type: number
   *                             example: 100000
   *                           feeCODToRoute:
   *                             type: number
   *                             example: 50000
   *                           costToRoute:
   *                             type: number
   *                             example: 80000
   *                           feeCODFromRoute:
   *                             type: number
   *                             example: 30000
   *                           accountPayable:
   *                             type: number
   *                             example: 0
   *                           receivable:
   *                             type: number
   *                             example: 0
   *                           homeDeliveryFromRoute:
   *                             type: number
   *                             example: 20000
   *                           homeDeliveryToRoute:
   *                             type: number
   *                             example: 15000
   *                           surchargeToRoute:
   *                             type: number
   *                             example: 10000
   *                           surchargeFromRoute:
   *                             type: number
   *                             example: 5000
   *                           totalDebt:
   *                             type: number
   *                             description: Total debt (can be negative)
   *                             example: 50000
   *                           createdAt:
   *                             type: string
   *                             format: date-time
   *                           updatedAt:
   *                             type: string
   *                             format: date-time
   *                     total:
   *                       type: object
   *                       description: Total summary of all debt report fields
   *                       properties:
   *                         openingBalance:
   *                           type: number
   *                           description: Total opening balance
   *                           example: 0
   *                         costFromRoute:
   *                           type: number
   *                           description: Total cost from route
   *                           example: 500000
   *                         feeCODToRoute:
   *                           type: number
   *                           description: Total fee COD to route
   *                           example: 250000
   *                         costToRoute:
   *                           type: number
   *                           description: Total cost to route
   *                           example: 400000
   *                         feeCODFromRoute:
   *                           type: number
   *                           description: Total fee COD from route
   *                           example: 150000
   *                         accountPayable:
   *                           type: number
   *                           description: Total account payable
   *                           example: 0
   *                         receivable:
   *                           type: number
   *                           description: Total receivable
   *                           example: 0
   *                         homeDeliveryFromRoute:
   *                           type: number
   *                           description: Total home delivery from route
   *                           example: 100000
   *                         homeDeliveryToRoute:
   *                           type: number
   *                           description: Total home delivery to route
   *                           example: 75000
   *                         surchargeToRoute:
   *                           type: number
   *                           description: Total surcharge to route
   *                           example: 50000
   *                         surchargeFromRoute:
   *                           type: number
   *                           description: Total surcharge from route
   *                           example: 25000
   *                         totalDebt:
   *                           type: number
   *                           description: Total debt (can be negative)
   *                           example: 250000
   *             examples:
   *               success:
   *                 summary: Successful response
   *                 value:
   *                   success: true
   *                   message: "get list debt successful"
   *                   data:
   *                     data:
   *                       - id: "507f1f77bcf86cd799439011"
   *                         fromRoute:
   *                           id: "507f1f77bcf86cd799439011"
   *                           name: "Route A"
   *                         toRoute:
   *                           id: "507f1f77bcf86cd799439012"
   *                           name: "Route B"
   *                         openingBalance: 0
   *                         costFromRoute: 100000
   *                         feeCODToRoute: 50000
   *                         costToRoute: 80000
   *                         feeCODFromRoute: 30000
   *                         accountPayable: 0
   *                         receivable: 0
   *                         homeDeliveryFromRoute: 20000
   *                         homeDeliveryToRoute: 15000
   *                         surchargeToRoute: 10000
   *                         surchargeFromRoute: 5000
   *                         totalDebt: 50000
   *                         createdAt: "2024-01-01T00:00:00.000Z"
   *                         updatedAt: "2024-01-01T00:00:00.000Z"
   *                     total:
   *                       openingBalance: 0
   *                       costFromRoute: 500000
   *                       feeCODToRoute: 250000
   *                       costToRoute: 400000
   *                       feeCODFromRoute: 150000
   *                       accountPayable: 0
   *                       receivable: 0
   *                       homeDeliveryFromRoute: 100000
   *                       homeDeliveryToRoute: 75000
   *                       surchargeToRoute: 50000
   *                       surchargeFromRoute: 25000
   *                       totalDebt: 250000
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
   *                   example: "get list debt failed"
   */
  getListDebt = async (request: AuthRequest, res: Response): Promise<void> => {
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
      const result: IGetListDebtResponse = await this.debtService.getListDebt(request, userId);

      const response: ApiResponse = {
        success: true,
        message: 'get list debt successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'get list debt failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/debt/{id}:
   *   get:
   *     summary: Get debt detail by ID
   *     description: Returns a single debt record by ID. The debt must belong to the authenticated user's selected route (toRoute).
   *     tags: [Debt]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Debt ID (MongoDB ObjectId)
   *         example: "507f1f77bcf86cd799439011"
   *     responses:
   *       200:
   *         description: Get debt detail successful
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
   *                   example: "get debt detail successful"
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       example: "507f1f77bcf86cd799439011"
   *                     fromRoute:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         name:
   *                           type: string
   *                     toRoute:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         name:
   *                           type: string
   *                     openingBalance:
   *                       type: number
   *                       description: Opening balance (can be negative)
   *                       example: 0
   *                     costFromRoute:
   *                       type: number
   *                       example: 100000
   *                     feeCODToRoute:
   *                       type: number
   *                       example: 50000
   *                     costToRoute:
   *                       type: number
   *                       example: 80000
   *                     feeCODFromRoute:
   *                       type: number
   *                       example: 30000
   *                     accountPayable:
   *                       type: number
   *                       example: 0
   *                     receivable:
   *                       type: number
   *                       example: 0
   *                     homeDeliveryFromRoute:
   *                       type: number
   *                       example: 20000
   *                     homeDeliveryToRoute:
   *                       type: number
   *                       example: 15000
   *                     surchargeToRoute:
   *                       type: number
   *                       example: 10000
   *                     surchargeFromRoute:
   *                       type: number
   *                       example: 5000
   *                     totalDebt:
   *                       type: number
   *                       description: Total debt (can be negative)
   *                       example: 50000
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *                     updatedAt:
   *                       type: string
   *                       format: date-time
   *             examples:
   *               success:
   *                 summary: Successful response
   *                 value:
   *                   success: true
   *                   message: "get debt detail successful"
   *                   data:
   *                     id: "507f1f77bcf86cd799439011"
   *                     fromRoute:
   *                       id: "507f1f77bcf86cd799439011"
   *                       name: "Route A"
   *                     toRoute:
   *                       id: "507f1f77bcf86cd799439012"
   *                       name: "Route B"
   *                     openingBalance: 0
   *                     costFromRoute: 100000
   *                     feeCODToRoute: 50000
   *                     costToRoute: 80000
   *                     feeCODFromRoute: 30000
   *                     accountPayable: 0
   *                     receivable: 0
   *                     homeDeliveryFromRoute: 20000
   *                     homeDeliveryToRoute: 15000
   *                     surchargeToRoute: 10000
   *                     surchargeFromRoute: 5000
   *                     totalDebt: 50000
   *                     createdAt: "2024-01-01T00:00:00.000Z"
   *                     updatedAt: "2024-01-01T00:00:00.000Z"
   *       400:
   *         description: Bad request (validation error or invalid ID format)
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
   *                   example: "Validation error: Invalid debt ID format"
   *             examples:
   *               validationError:
   *                 summary: Validation error
   *                 value:
   *                   success: false
   *                   message: "Validation error: Debt ID is required"
   *               invalidId:
   *                 summary: Invalid ID format
   *                 value:
   *                   success: false
   *                   message: "Invalid debt ID format"
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
   *       404:
   *         description: Debt not found
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
   *                   example: "Debt not found"
   *             examples:
   *               notFound:
   *                 summary: Debt not found
   *                 value:
   *                   success: false
   *                   message: "Debt not found"
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
   *                   example: "get debt detail failed"
   */
  getDebtById = async (request: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!request.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = request.params;
      const userId = request.user.userId;
      const result = await this.debtService.getDebtById(id, userId);

      if (!result) {
        const response: ApiResponse = {
          success: false,
          message: 'Debt not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'get debt detail successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'get debt detail failed';

      // Determine appropriate status code based on error message
      let statusCode = 500;
      if (message.includes('not found')) {
        statusCode = 404;
      } else if (
        message.includes('validation') ||
        message.includes('invalid') ||
        message.includes('Invalid')
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
   * @swagger
   * /api/debt/get-detail-debt-with-list-values/{id}:
   *   get:
   *     summary: Get debt detail with list detail values
   *     description: |
   *       Returns a single debt record by ID with detailed lists for each field.
   *       The debt must belong to the authenticated user's selected route (toRoute).
   *       Includes arrays of delivery codes and amounts for:
   *       - NỢ CƯỚC ĐI (feeCODFromRouteList): Delivery codes with debt amounts (toRoute → fromRoute, paymentType = 'debt')
   *       - GIAO TẬN NƠI ĐI (homeDeliveryFromRouteList): Delivery codes with home delivery costs (toRoute → fromRoute, paymentType = 'paid')
   *       - PHỤ PHÍ ĐI (surchargeFromRouteList): Delivery codes with surcharge costs (toRoute → fromRoute, paymentType = 'paid')
   *       - TIỀN ĐI (costFromRouteList): Money delivery codes with amounts (toRoute → fromRoute)
   *       - TIỀN chi khác (paymentManagementList): Debt management payments descriptions with amounts
   *       - NỢ CƯỚC VỀ (feeCODToRouteList): Delivery codes with debt amounts (fromRoute → toRoute, paymentType = 'debt')
   *       - GIAO TẬN NƠI VỀ (homeDeliveryToRouteList): Delivery codes with home delivery costs (fromRoute → toRoute, paymentType = 'paid')
   *       - PHỤ PHÍ VỀ (surchargeToRouteList): Delivery codes with surcharge costs (fromRoute → toRoute, paymentType = 'paid')
   *       - TIỀN VỀ (costToRouteList): Money delivery codes with amounts (fromRoute → toRoute)
   *       - TIỀN thu khác (receivableManagementList): Debt management receipts descriptions with amounts
   *       Data is filtered by the debt's dateDebt (VN calendar day range).
   *     tags: [Debt]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Debt ID (MongoDB ObjectId)
   *         example: "507f1f77bcf86cd799439011"
   *     responses:
   *       200:
   *         description: Get debt detail with list values successful
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
   *                   example: "get debt detail with list values successful"
   *                 data:
   *                   type: object
   *                   properties:
   *                     data:
   *                       type: object
   *                       description: Debt basic information
   *                       properties:
   *                         id:
   *                           type: string
   *                           example: "507f1f77bcf86cd799439011"
   *                         fromRoute:
   *                           type: object
   *                           properties:
   *                             id:
   *                               type: string
   *                             name:
   *                               type: string
   *                         toRoute:
   *                           type: object
   *                           properties:
   *                             id:
   *                               type: string
   *                             name:
   *                               type: string
   *                         openingBalance:
   *                           type: number
   *                           example: 100000
   *                         costFromRoute:
   *                           type: number
   *                           example: 100000
   *                         feeCODToRoute:
   *                           type: number
   *                           example: 50000
   *                         costToRoute:
   *                           type: number
   *                           example: 80000
   *                         feeCODFromRoute:
   *                           type: number
   *                           example: 30000
   *                         accountPayable:
   *                           type: number
   *                           example: 0
   *                         receivable:
   *                           type: number
   *                           example: 0
   *                         homeDeliveryFromRoute:
   *                           type: number
   *                           example: 20000
   *                         homeDeliveryToRoute:
   *                           type: number
   *                           example: 15000
   *                         surchargeToRoute:
   *                           type: number
   *                           example: 10000
   *                         surchargeFromRoute:
   *                           type: number
   *                           example: 5000
   *                         totalDebt:
   *                           type: number
   *                           example: 50000
   *                         createdAt:
   *                           type: string
   *                           format: date-time
   *                         updatedAt:
   *                           type: string
   *                           format: date-time
   *                     debtDetailWithListValues:
   *                       type: object
   *                       description: Debt detail with list values for each field
   *                       properties:
   *                         id:
   *                           type: string
   *                           example: "507f1f77bcf86cd799439011"
   *                         fromRoute:
   *                           type: object
   *                           properties:
   *                             id:
   *                               type: string
   *                             name:
   *                               type: string
   *                         toRoute:
   *                           type: object
   *                           properties:
   *                             id:
   *                               type: string
   *                             name:
   *                               type: string
   *                         openingBalance:
   *                           type: number
   *                           example: 100000
   *                         costFromRoute:
   *                           type: number
   *                           example: 100000
   *                         feeCODToRoute:
   *                           type: number
   *                           example: 50000
   *                         costToRoute:
   *                           type: number
   *                           example: 80000
   *                         feeCODFromRoute:
   *                           type: number
   *                           example: 30000
   *                         accountPayable:
   *                           type: number
   *                           example: 0
   *                         receivable:
   *                           type: number
   *                           example: 0
   *                         homeDeliveryFromRoute:
   *                           type: number
   *                           example: 20000
   *                         homeDeliveryToRoute:
   *                           type: number
   *                           example: 15000
   *                         surchargeToRoute:
   *                           type: number
   *                           example: 10000
   *                         surchargeFromRoute:
   *                           type: number
   *                           example: 5000
   *                         totalDebt:
   *                           type: number
   *                           example: 50000
   *                         createdAt:
   *                           type: string
   *                           format: date-time
   *                         updatedAt:
   *                           type: string
   *                           format: date-time
   *                         feeCODFromRouteList:
   *                           type: array
   *                           description: NỢ CƯỚC ĐI - Delivery codes with debt amounts (toRoute → fromRoute, paymentType = 'debt')
   *                           items:
   *                             type: object
   *                             properties:
   *                               code:
   *                                 type: string
   *                                 example: "2501200001"
   *                               money:
   *                                 type: number
   *                                 example: 50000
   *                         homeDeliveryFromRouteList:
   *                           type: array
   *                           description: GIAO TẬN NƠI ĐI - Delivery codes with home delivery costs (toRoute → fromRoute, paymentType = 'paid')
   *                           items:
   *                             type: object
   *                             properties:
   *                               code:
   *                                 type: string
   *                                 example: "2501200001"
   *                               money:
   *                                 type: number
   *                                 example: 20000
   *                         surchargeFromRouteList:
   *                           type: array
   *                           description: PHỤ PHÍ ĐI - Delivery codes with surcharge costs (toRoute → fromRoute, paymentType = 'paid')
   *                           items:
   *                             type: object
   *                             properties:
   *                               code:
   *                                 type: string
   *                                 example: "2501200001"
   *                               money:
   *                                 type: number
   *                                 example: 10000
   *                         costFromRouteList:
   *                           type: array
   *                           description: TIỀN ĐI - Money delivery codes with amounts (toRoute → fromRoute)
   *                           items:
   *                             type: object
   *                             properties:
   *                               code:
   *                                 type: string
   *                                 example: "2501200001-T"
   *                               money:
   *                                 type: number
   *                                 example: 1000000
   *                         paymentManagementList:
   *                           type: array
   *                           description: TIỀN ĐI (from DebtManagement PAYMENT) - Payment descriptions with amounts
   *                           items:
   *                             type: object
   *                             properties:
   *                               content:
   *                                 type: string
   *                                 example: "TPHCM CK"
   *                               money:
   *                                 type: number
   *                                 example: 500000
   *                         feeCODToRouteList:
   *                           type: array
   *                           description: NỢ CƯỚC VỀ - Delivery codes with debt amounts (fromRoute → toRoute, paymentType = 'debt')
   *                           items:
   *                             type: object
   *                             properties:
   *                               code:
   *                                 type: string
   *                                 example: "2501200002"
   *                               money:
   *                                 type: number
   *                                 example: 30000
   *                         homeDeliveryToRouteList:
   *                           type: array
   *                           description: GIAO TẬN NƠI VỀ - Delivery codes with home delivery costs (fromRoute → toRoute, paymentType = 'paid')
   *                           items:
   *                             type: object
   *                             properties:
   *                               code:
   *                                 type: string
   *                                 example: "2501200002"
   *                               money:
   *                                 type: number
   *                                 example: 15000
   *                         surchargeToRouteList:
   *                           type: array
   *                           description: PHỤ PHÍ VỀ - Delivery codes with surcharge costs (fromRoute → toRoute, paymentType = 'paid')
   *                           items:
   *                             type: object
   *                             properties:
   *                               code:
   *                                 type: string
   *                                 example: "2501200002"
   *                               money:
   *                                 type: number
   *                                 example: 5000
   *                         costToRouteList:
   *                           type: array
   *                           description: TIỀN VỀ - Money delivery codes with amounts (fromRoute → toRoute)
   *                           items:
   *                             type: object
   *                             properties:
   *                               code:
   *                                 type: string
   *                                 example: "2501200002-T"
   *                               money:
   *                                 type: number
   *                                 example: 800000
   *                         receivableManagementList:
   *                           type: array
   *                           description: TIỀN VỀ (from DebtManagement RECEIPT) - Receipt descriptions with amounts
   *                           items:
   *                             type: object
   *                             properties:
   *                               content:
   *                                 type: string
   *                                 example: "TPHCM CK"
   *                               money:
   *                                 type: number
   *                                 example: 300000
   *             examples:
   *               success:
   *                 summary: Successful response
   *                 value:
   *                   success: true
   *                   message: "get debt detail with list values successful"
   *                   data:
   *                     data:
   *                       id: "507f1f77bcf86cd799439011"
   *                       fromRoute:
   *                         id: "507f1f77bcf86cd799439011"
   *                         name: "SA ĐÉC"
   *                       toRoute:
   *                         id: "507f1f77bcf86cd799439012"
   *                         name: "AN PHONG"
   *                       openingBalance: 100000
   *                       costFromRoute: 100000
   *                       feeCODToRoute: 50000
   *                       costToRoute: 80000
   *                       feeCODFromRoute: 30000
   *                       accountPayable: 0
   *                       receivable: 0
   *                       homeDeliveryFromRoute: 20000
   *                       homeDeliveryToRoute: 15000
   *                       surchargeToRoute: 10000
   *                       surchargeFromRoute: 5000
   *                       totalDebt: 50000
   *                       createdAt: "2025-01-20T10:00:00.000Z"
   *                       updatedAt: "2025-01-20T10:00:00.000Z"
   *                     debtDetailWithListValues:
   *                       id: "507f1f77bcf86cd799439011"
   *                       fromRoute:
   *                         id: "507f1f77bcf86cd799439011"
   *                         name: "SA ĐÉC"
   *                       toRoute:
   *                         id: "507f1f77bcf86cd799439012"
   *                         name: "AN PHONG"
   *                       openingBalance: 100000
   *                       costFromRoute: 100000
   *                       feeCODToRoute: 50000
   *                       costToRoute: 80000
   *                       feeCODFromRoute: 30000
   *                       accountPayable: 0
   *                       receivable: 0
   *                       homeDeliveryFromRoute: 20000
   *                       homeDeliveryToRoute: 15000
   *                       surchargeToRoute: 10000
   *                       surchargeFromRoute: 5000
   *                       totalDebt: 50000
   *                       createdAt: "2025-01-20T10:00:00.000Z"
   *                       updatedAt: "2025-01-20T10:00:00.000Z"
   *                       feeCODFromRouteList:
   *                         - code: "2501200001"
   *                           money: 50000
   *                       homeDeliveryFromRouteList:
   *                         - code: "2501200001"
   *                           money: 20000
   *                       surchargeFromRouteList:
   *                         - code: "2501200001"
   *                           money: 10000
   *                       costFromRouteList:
   *                         - code: "2501200001-T"
   *                           money: 1000000
   *                       paymentManagementList:
   *                         - content: "TPHCM CK"
   *                           money: 500000
   *                       feeCODToRouteList:
   *                         - code: "2501200002"
   *                           money: 30000
   *                       homeDeliveryToRouteList:
   *                         - code: "2501200002"
   *                           money: 15000
   *                       surchargeToRouteList:
   *                         - code: "2501200002"
   *                           money: 5000
   *                       costToRouteList:
   *                         - code: "2501200002-T"
   *                           money: 800000
   *                       receivableManagementList:
   *                         - content: "TPHCM CK"
   *                           money: 300000
   *       400:
   *         description: Bad request (validation error or invalid ID format)
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Debt not found
   *       500:
   *         description: Internal server error
   */
  getDebtDetailWithListValues = async (request: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!request.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = request.params;
      const userId = request.user.userId;
      const result = await this.debtService.getDebtDetailWithListValues(id, userId);

      if (!result) {
        const response: ApiResponse = {
          success: false,
          message: 'Debt not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<IDebtReportDetailWithListValues> = {
        success: true,
        message: 'get debt detail with list values successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'get debt detail with list values failed';

      // Determine appropriate status code based on error message
      let statusCode = 500;
      if (message.includes('not found')) {
        statusCode = 404;
      } else if (
        message.includes('validation') ||
        message.includes('invalid') ||
        message.includes('Invalid')
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
