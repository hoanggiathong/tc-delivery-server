import { Response } from 'express';
import { ReportService } from '@/services/report.service';
import { ApiResponse, AuthRequest } from '@/types';
import {
  IAccountingReportRequest,
  IReportReturnMoneyDeliveryAndReturnDeliveryRequest,
} from '@/types/report.type';
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
   *                   message: "Date must be in YYYY-MM-DD format"
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

  /**
   * @swagger
   * /api/report/accounting:
   *   get:
   *     summary: Get accounting report grouped by route (max 45 days, Vietnam timezone)
   *     description: |
   *       Returns an accounting report (Báo Cáo Kế Toán) grouped by route (TUYẾN).
   *       Each route contains 7 rows: HÀNG CHUYỂN THƯỜNG (không GTN), HÀNG GIAO TẬN NƠI,
   *       TIỀN CHUYỂN THƯỜNG, TIỀN CHUYỂN NHANH, TIỀN THU HỘ GIỮ, NỢ CƯỚC, TỔNG CỘNG TIỀN THỰC THU.
   *       Each row has 3 columns: transferMoney (Chuyển tiền), shippingFee (Cước phí), surcharge (Phụ phí).
   *       The total section contains grand totals across all routes.
   *       Date range cannot exceed 45 days. Dates use Vietnam timezone (UTC+7).
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
   *         description: Start date in YYYY-MM-DD format (Vietnam timezone). Date range cannot exceed 45 days.
   *         example: "2025-11-01"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date in YYYY-MM-DD format (Vietnam timezone). Date range cannot exceed 45 days.
   *         example: "2025-11-30"
   *     responses:
   *       200:
   *         description: Accounting report retrieved successfully
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
   *                   example: "Accounting report retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     routes:
   *                       type: array
   *                       description: List of routes with per-route accounting data
   *                       items:
   *                         type: object
   *                         properties:
   *                           routeId:
   *                             type: string
   *                           routeCode:
   *                             type: string
   *                           routeName:
   *                             type: string
   *                           normalDelivery:
   *                             type: object
   *                             description: |
   *                               Row 1: HÀNG CHUYỂN THƯỜNG (chỉ đơn không giao tận nơi, bao gồm nợ cước + đã thu)
   *                               - shippingFee: tổng cước + phí trị giá (cost + itemCost) không GTN
   *                               - surcharge: tổng phụ phí (collectForCustomerCost) không GTN
   *                             properties:
   *                               transferMoney:
   *                                 type: number
   *                               shippingFee:
   *                                 type: number
   *                                 description: Tổng cước + phí trị giá đơn hàng không GTN (nc + đã thu)
   *                               surcharge:
   *                                 type: number
   *                                 description: Tổng phụ phí đơn hàng không GTN (nc + đã thu)
   *                           homeDelivery:
   *                             type: object
   *                             description: |
   *                               Row 2: HÀNG GIAO TẬN NƠI (đơn có giao tận nơi, bao gồm nc + đã thu)
   *                               - shippingFee: tổng cước gửi hàng + phí trị giá (cost + itemCost) đơn GTN
   *                               - surcharge: tổng phụ phí (collectForCustomerCost) đơn GTN
   *                               - homeDeliveryCostTotal: tổng cước giao tận nơi (homeDeliveryCost) tất cả đơn
   *                             properties:
   *                               transferMoney:
   *                                 type: number
   *                               shippingFee:
   *                                 type: number
   *                                 description: Tổng cước gửi hàng + phí trị giá đơn GTN (nc + đã thu)
   *                               surcharge:
   *                                 type: number
   *                                 description: Tổng phụ phí đơn GTN (nc + đã thu)
   *                               homeDeliveryCostTotal:
   *                                 type: number
   *                                 description: Tổng cước giao tận nơi (homeDeliveryCost) bao gồm nc + đã thu
   *                           normalMoneyTransfer:
   *                             type: object
   *                             description: "Row 3: TIỀN CHUYỂN THƯỜNG"
   *                             properties:
   *                               transferMoney:
   *                                 type: number
   *                               shippingFee:
   *                                 type: number
   *                               surcharge:
   *                                 type: number
   *                           expressMoneyTransfer:
   *                             type: object
   *                             description: "Row 4: TIỀN CHUYỂN NHANH"
   *                             properties:
   *                               transferMoney:
   *                                 type: number
   *                               shippingFee:
   *                                 type: number
   *                               surcharge:
   *                                 type: number
   *                           collectHoldMoney:
   *                             type: object
   *                             description: "Row 5: TIỀN THU HỘ GIỮ"
   *                             properties:
   *                               transferMoney:
   *                                 type: number
   *                               shippingFee:
   *                                 type: number
   *                               surcharge:
   *                                 type: number
   *                           debtCost:
   *                             type: object
   *                             description: "Row 6: NỢ CƯỚC"
   *                             properties:
   *                               transferMoney:
   *                                 type: number
   *                               shippingFee:
   *                                 type: number
   *                               surcharge:
   *                                 type: number
   *                           totalActualCollected:
   *                             type: object
   *                             description: |
   *                               Row 7: TỔNG CỘNG TIỀN THỰC THU
   *                               - Chuyển tiền = Tiền chuyển thường + Tiền chuyển nhanh + Tiền thu hộ giữ
   *                               - Cước phí = (Hàng chuyển thường + Hàng giao tận nơi + Tiền chuyển thường + Tiền chuyển nhanh + Tiền thu hộ giữ) - Nợ cước
   *                               - Phụ phí = Phụ phí Hàng chuyển thường + Phụ phí Hàng giao tận nơi - Phụ phí Nợ cước
   *                             properties:
   *                               transferMoney:
   *                                 type: number
   *                               shippingFee:
   *                                 type: number
   *                               surcharge:
   *                                 type: number
   *                     total:
   *                       type: object
   *                       description: Grand totals across all routes
   *                       properties:
   *                         totalSendMoneyToStations:
   *                           type: number
   *                           description: "Tổng tiền gửi các trạm gửi: Total tiền gửi đi tất cả tuyến (gửi nhanh + thường)"
   *                         totalCollectHoldMoney:
   *                           type: number
   *                           description: "Tổng tiền thu hộ giữ: Total tiền thu hộ giữ tất cả tuyến"
   *                         totalShippingCostDebt:
   *                           type: number
   *                           description: "Tổng cước gửi nợ cước: Total Nợ cước hàng đi tất cả tuyến"
   *                         totalHomeDeliveryCostDebt:
   *                           type: number
   *                           description: "Tổng tiền GTN nợ cước: Total cước GTN nợ cước hàng đi tất cả Tuyến"
   *                         totalActualRevenue:
   *                           type: number
   *                           description: "Tổng thực thu: Total cột Cước phí mục Tổng cộng tiền thực thu tất cả Tuyến"
   *                         cashInSafe:
   *                           type: number
   *                           description: "Tiền trong tủ = Tổng tiền gửi các trạm + Tổng tiền thu hộ giữ + Tổng thực thu"
   *                         revenue:
   *                           type: number
   *                           description: "Doanh thu (có GTN đi + Phụ phí đi) = Total cước gửi hàng đi + Tổng cước gửi tiền + Tổng cước phí thu hộ giữ + Tổng phụ phí đi"
   *                         totalOutgoingHomeDeliveryCost:
   *                           type: number
   *                           description: "Tổng cước GTN đi: Tổng cước GTN đi tất cả Tuyến (đã thu + nc)"
   *                         totalOutgoingSurcharge:
   *                           type: number
   *                           description: "Tổng phụ phí đi: Tổng Phụ Phí đi tất cả tuyến (đã thu + nc)"
   *                         totalRevenueFundSubmission:
   *                           type: number
   *                           description: "Tổng doanh thu nộp quỹ (BCTC) = Doanh thu - Tổng cước GTN đi - Tổng phụ phí đi"
   *             examples:
   *               reportWithData:
   *                 summary: Accounting report with data
   *                 value:
   *                   success: true
   *                   message: "Accounting report retrieved successfully"
   *                   data:
   *                     routes:
   *                       - routeId: "507f1f77bcf86cd799439011"
   *                         routeCode: "T1"
   *                         routeName: "LONG XUYÊN"
   *                         normalDelivery: { transferMoney: 0, shippingFee: 4452000, surcharge: 150000 }
   *                         homeDelivery: { transferMoney: 0, shippingFee: 1200000, surcharge: 50000, homeDeliveryCostTotal: 80000 }
   *                         normalMoneyTransfer: { transferMoney: 50000, shippingFee: 5000, surcharge: 0 }
   *                         expressMoneyTransfer: { transferMoney: 0, shippingFee: 0, surcharge: 0 }
   *                         collectHoldMoney: { transferMoney: 700000, shippingFee: 15000, surcharge: 0 }
   *                         debtCost: { transferMoney: 0, shippingFee: 2365000, surcharge: 80000 }
   *                         totalActualCollected: { transferMoney: 750000, shippingFee: 3307000, surcharge: 120000 }
   *                     total:
   *                       totalSendMoneyToStations: 1400000
   *                       totalCollectHoldMoney: 439935000
   *                       totalShippingCostDebt: 75490000
   *                       totalHomeDeliveryCostDebt: 0
   *                       totalActualRevenue: 74034000
   *                       cashInSafe: 515369000
   *                       revenue: 150684000
   *                       totalOutgoingHomeDeliveryCost: 2750000
   *                       totalOutgoingSurcharge: 2535000
   *                       totalRevenueFundSubmission: 145399000
   *               emptyReport:
   *                 summary: Empty accounting report
   *                 value:
   *                   success: true
   *                   message: "Accounting report retrieved successfully"
   *                   data:
   *                     routes: []
   *                     total:
   *                       totalSendMoneyToStations: 0
   *                       totalCollectHoldMoney: 0
   *                       totalShippingCostDebt: 0
   *                       totalHomeDeliveryCostDebt: 0
   *                       totalActualRevenue: 0
   *                       cashInSafe: 0
   *                       revenue: 0
   *                       totalOutgoingHomeDeliveryCost: 0
   *                       totalOutgoingSurcharge: 0
   *                       totalRevenueFundSubmission: 0
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
   *                   message: "Date range cannot exceed 45 days"
   *               invalidDateFormat:
   *                 summary: Invalid date format
   *                 value:
   *                   success: false
   *                   message: "Date must be in YYYY-MM-DD format"
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
   *                   example: "Failed to get accounting report"
   */
  accountingReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const query: IAccountingReportRequest = req.query as unknown as IAccountingReportRequest;

      Logger.info('Getting accounting report', {
        userId: req.user.userId,
        query,
        path: req.path,
        originalUrl: req.originalUrl,
      });

      const result = await this.reportService.getAccountingReport(query, req.user.userId);

      const response: ApiResponse = {
        success: true,
        message: 'Accounting report retrieved successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get accounting report', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        path: req.path,
      });

      const message = error instanceof Error ? error.message : 'Failed to get accounting report';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };
}
