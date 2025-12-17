import { Response } from 'express';
import { ReportService } from '@/services/report.service';
import { ApiResponse, AuthRequest } from '@/types';
import { IReportReturnMoneyDeliveryAndReturnDeliveryRequest } from '@/types/report.type';
import Logger from '@/utils/logger';

export class ReportController {
  private reportService: ReportService;

  constructor() {
    this.reportService = new ReportService();
  }

  /**
   * @swagger
   * /api/report/return-money-delivery-and-return-delivery:
   *   get:
   *     summary: Get report for return money delivery and return delivery (max 45 days, Vietnam timezone)
   *     description: Returns a comprehensive report including return deliveries, money deliveries type NORMAL with status DONE, and money deliveries type COLLECT with status DONE within the specified date range (Vietnam time UTC+7). Date range cannot exceed 45 days. Dates are interpreted as Vietnam timezone and automatically converted to UTC for database queries. If routeId is provided, results will be filtered by that route; otherwise, all routes are included.
   *     tags: [Report]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date in YYYY-MM-DD format (Vietnam timezone). Will query from 00:00:00 Vietnam time. Date range cannot exceed 45 days.
   *         example: "2025-10-01"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date in YYYY-MM-DD format (Vietnam timezone). Will query until 23:59:59 Vietnam time. Cannot be in the future. Date range cannot exceed 45 days.
   *         example: "2025-10-31"
   *       - in: query
   *         name: routeId
   *         required: false
   *         schema:
   *           type: string
   *           pattern: '^[0-9a-fA-F]{24}$'
   *         description: Route ID to filter by (optional). If provided, filters return deliveries by toRoute, money deliveries type NORMAL by fromRoute, and money deliveries type COLLECT by toRoute.
   *         example: "507f1f77bcf86cd799439011"
   *     responses:
   *       200:
   *         description: Report retrieved successfully
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
   *                   example: "Report retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     deliveries:
   *                       type: array
   *                       description: List of return deliveries (isReturn = true) within the date range
   *                       items:
   *                         $ref: '#/components/schemas/Delivery'
   *                     moneyDeliveriesTypeNormal:
   *                       type: array
   *                       description: List of money deliveries with type NORMAL and status DONE within the date range
   *                       items:
   *                         $ref: '#/components/schemas/MoneyDelivery'
   *                     moneyDeliveriesTypeCollect:
   *                       type: array
   *                       description: List of money deliveries with type COLLECT and status DONE within the date range
   *                       items:
   *                         $ref: '#/components/schemas/MoneyDelivery'
   *             examples:
   *               reportWithData:
   *                 summary: Report with data
   *                 value:
   *                   success: true
   *                   message: "Report retrieved successfully"
   *                   data:
   *                     deliveries:
   *                       - id: "507f1f77bcf86cd799439020"
   *                         code: "0907250001"
   *                         fullCode: "0907250001T4T1"
   *                         name: "Hàng trả về"
   *                         sender:
   *                           id: "507f1f77bcf86cd799439021"
   *                           name: "Nguyễn Văn A"
   *                           phone: "+84901234567"
   *                         receiver:
   *                           id: "507f1f77bcf86cd799439022"
   *                           name: "Trần Thị B"
   *                           phone: "+84907654321"
   *                     moneyDeliveriesTypeNormal:
   *                       - id: "507f1f77bcf86cd799439030"
   *                         code: "2412170001"
   *                         sendMoneyAmount: 1000000
   *                         sendCost: 50000
   *                         status: "done"
   *                         type: "normal"
   *                     moneyDeliveriesTypeCollect:
   *                       - id: "507f1f77bcf86cd799439040"
   *                         code: "2412170002"
   *                         sendMoneyAmount: 2000000
   *                         sendCost: 75000
   *                         status: "done"
   *                         type: "collect"
   *               emptyReport:
   *                 summary: Empty report
   *                 value:
   *                   success: true
   *                   message: "Report retrieved successfully"
   *                   data:
   *                     deliveries: []
   *                     moneyDeliveriesTypeNormal: []
   *                     moneyDeliveriesTypeCollect: []
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
   *               invalidDateRange:
   *                 summary: Date range exceeds limit
   *                 value:
   *                   success: false
   *                   message: "The difference between start date and end date must be less than or equal to 45 days"
   *               invalidDateFormat:
   *                 summary: Invalid date format
   *                 value:
   *                   success: false
   *                   message: "Please provide a valid start date in ISO format"
   *               invalidRouteId:
   *                 summary: Invalid route ID format
   *                 value:
   *                   success: false
   *                   message: "Invalid ObjectId format"
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
   *       403:
   *         description: Forbidden - Insufficient permissions
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
   *                   example: "Insufficient permissions"
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
   *                   example: "Failed to get report return money delivery and return delivery"
   */
  getReportReturnMoneyDeliveryAndReturnDelivery = async (
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

      const query: IReportReturnMoneyDeliveryAndReturnDeliveryRequest =
        req.query as unknown as IReportReturnMoneyDeliveryAndReturnDeliveryRequest;

      Logger.info('Getting report return money delivery and return delivery', {
        userId: req.user.userId,
        query,
        path: req.path,
        originalUrl: req.originalUrl,
      });

      const result = await this.reportService.getReportReturnMoneyDeliveryAndReturnDelivery(
        query,
        req.user.userId
      );

      const response: ApiResponse = {
        success: true,
        message: 'Report retrieved successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get report return money delivery and return delivery', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        path: req.path,
      });

      const message =
        error instanceof Error
          ? error.message
          : 'Failed to get report return money delivery and return delivery';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };
}
