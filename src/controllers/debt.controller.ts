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
   *                           _id:
   *                             type: string
   *                             example: "507f1f77bcf86cd799439011"
   *                           fromRoute:
   *                             type: object
   *                             properties:
   *                               _id:
   *                                 type: string
   *                               name:
   *                                 type: string
   *                           toRoute:
   *                             type: object
   *                             properties:
   *                               _id:
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
}
