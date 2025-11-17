import { ReturnMoneyDeliveriesService } from '@/services/return-money-deliveries.service';
import { ApiResponse, AuthRequest, DateRangeQuery } from '@/types';
import { IReturnMoneyDeliveryQuery } from '@/types/return-money-deliveries.type';
import { Response } from 'express';

export class ReturnMoneyDeliveriesController {
  private returnMoneyDeliveriesService: ReturnMoneyDeliveriesService;

  constructor() {
    this.returnMoneyDeliveriesService = new ReturnMoneyDeliveriesService();
  }

  /**
   * @swagger
   * /api/return-money-deliveries/get-list-return-money-deliveries-type-collect-status-done:
   *   get:
   *     summary: Get list return money deliveries type collect status done (max 30 days, Vietnam timezone)
   *     description: Returns all money deliveries with type COLLECT and status DONE from user's selected route within the specified date range (Vietnam time UTC+7). Date range cannot exceed 30 days. Dates are interpreted as Vietnam timezone and automatically converted to UTC for database queries.
   *     tags: [Return Money Deliveries]
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
   *         description: Get list return money deliveries type collect status done successful
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
   *                   example: "Get list return money deliveries type collect status done successful"
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/MoneyDelivery'
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
   *                   example: "Validation failed: Date range cannot exceed 30 days"
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
   *                   example: "get list return money deliveries type collect status done failed"
   */
  getListReturnMoneyDeliveriesTypeCollectStatusDone = async (
    req: AuthRequest,
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

      const { startDate, endDate } = req.query as unknown as DateRangeQuery;

      const query: IReturnMoneyDeliveryQuery = {
        startDate: String(startDate),
        endDate: String(endDate),
      };

      const result =
        await this.returnMoneyDeliveriesService.getListReturnMoneyDeliveriesTypeCollectStatusDone(
          query,
          req.user.userId
        );

      const response: ApiResponse = {
        success: true,
        message: 'Get list return money deliveries type collect status done successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get list return money deliveries type collect status done error:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'get list return money deliveries type collect status done failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };
}
