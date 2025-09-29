import { DebtService } from '@/services/debt.service';
import { ApiResponse } from '@/types';
import { IDebtRow } from '@/types/debt.type';
import { Request, Response } from 'express';

export class DebtController {
  private debtService: DebtService;

  constructor() {
    this.debtService = new DebtService();
  }

  /**
   * @swagger
   * /api/debt/get-list-debt:
   *   get:
   *     summary: api get list debt
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
   *         description: End date for filtering (ISO format). Cannot be in the future.
   *         example: "2024-01-31"
   *       - in: query
   *         name: fromRouteId
   *         required: true
   *         schema:
   *           type: string
   *           pattern: '^[0-9a-fA-F]{24}$'
   *         description: ObjectId of the destination route
   *         example: "507f1f77bcf86cd799439011"
   *       - in: query
   *         name: keySort
   *         required: false
   *         schema:
   *           type: string
   *           enum: ["toRoute","totalCost"]
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
   *         description: get list debt successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
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
   *                   example: "get list debt fail"
   */
  getListDebt = async (request: Request, res: Response): Promise<void> => {
    try {
      const result: IDebtRow[] = await this.debtService.getListDebt(request);

      const response: ApiResponse = {
        success: true,
        message: 'get list debt successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('get list debt error:', error);

      const message = error instanceof Error ? error.message : 'get list debt failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };
}
