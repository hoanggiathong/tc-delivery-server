import { DebtService } from '@/services/debt.service';
import { ApiResponse, AuthRequest } from '@/types';
import { IGetListDebtResponse } from '@/types/debt.type';
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
   *     description: Returns debt records filtered by user's selected route (toRoute). The toRouteId is automatically taken from the authenticated user's selected route.
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
   *                   example: "get list debt failed"
   *             examples:
   *               serverError:
   *                 summary: Server error
   *                 value:
   *                   success: false
   *                   message: "get list debt failed"
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
   *             examples:
   *               serverError:
   *                 summary: Server error
   *                 value:
   *                   success: false
   *                   message: "get debt detail failed"
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
}
