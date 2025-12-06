import { ReturnMoneyDeliveriesService } from '@/services/return-money-deliveries.service';
import { ApiResponse, AuthRequest, AuthRequestWithFileUploads, DateRangeQuery } from '@/types';
import { IReturnMoneyDeliveryQuery } from '@/types/return-money-deliveries.type';
import { Response } from 'express';
import Logger from '@/utils/logger';

export class ReturnMoneyDeliveriesController {
  private returnMoneyDeliveriesService: ReturnMoneyDeliveriesService;

  constructor() {
    this.returnMoneyDeliveriesService = new ReturnMoneyDeliveriesService();
  }

  /**
   * @swagger
   * /api/return-money-deliveries/information-receiver/{phoneReceiver}:
   *   get:
   *     summary: Get information receiver
   *     tags: [Return Money Deliveries]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: phoneReceiver
   *         required: true
   *         schema:
   *           type: string
   *         description: Phone receiver
   *         example: "+84123456789"
   *     responses:
   *       200:
   *         description: Information receiver retrieved successfully
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
   *                   example: "Information receiver retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     receiver:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           name:
   *                             type: string
   *                             example: "Nguyễn Thị Mai"
   *                           phone:
   *                             type: string
   *                             example: "+84901234567"
   *                           route:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: string
   *                                 example: "507f1f77bcf86cd799439011"
   *                               code:
   *                                 type: string
   *                                 example: "T1"
   *                               name:
   *                                 type: string
   *                                 example: "Tuyến Hà Nội"
   *                           type:
   *                             type: string
   *                             example: "money"
   *                           address:
   *                             type: string
   *                             example: "123 Đường ABC, Quận XYZ, TP. HCM"
   *                           identityCardIssuedDate:
   *                             type: string
   *                             example: "2024-01-01"
   *                           identityCardNumber:
   *                             type: string
   *                             example: "1234567890"
   *                           createdAt:
   *                             type: string
   *                             example: "2024-01-01T00:00:00.000Z"
   *                           updatedAt:
   *                             type: string
   *                             example: "2024-01-01T00:00:00.000Z"
   *       400:
   *         description: Phone receiver is required
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
   *                   example: "Phone receiver is required"
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
   *                   example: "get information receiver failed"
   */
  getInformationReceiver = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { phoneReceiver } = req.params;
      if (!phoneReceiver) {
        const response: ApiResponse = {
          success: false,
          message: 'Phone receiver is required',
        };
        res.status(400).json(response);
        return;
      }
      const result = await this.returnMoneyDeliveriesService.getInformationReceiver(phoneReceiver);

      const response: ApiResponse = {
        success: true,
        message: 'get information receiver successful',
        data: result,
      };
      res.status(200).json(response);
    } catch (error) {
      Logger.error('get information receiver error:', {
        error: error instanceof Error ? error.message : error,
      });
      const message = error instanceof Error ? error.message : 'get information receiver failed';
      const response: ApiResponse = {
        success: false,
        message,
      };
      res.status(500).json(response);
    }
  };

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
   *         example: "2025-10-01"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date in YYYY-MM-DD format (Vietnam timezone). Will query until 23:59:59 Vietnam time. Cannot be in the future. Date range cannot exceed 30 days.
   *         example: "2025-10-31"
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
      Logger.error('Get list return money deliveries type collect status done error:', {
        error: error instanceof Error ? error.message : error,
      });

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

  /**
   * @swagger
   * /api/return-money-deliveries/get-list-old-money-delivery-not-type-collect-cost:
   *   get:
   *     summary: Get list money delivery not type collect cost (max 30 days, Vietnam timezone)
   *     description: Returns all money deliveries with type NOT COLLECT (NORMAL or COLLECT_FOR_CUSTOMER) from user's selected route within the specified date range (Vietnam time UTC+7). Date range cannot exceed 30 days. Dates are interpreted as Vietnam timezone and automatically converted to UTC for database queries.
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
   *         example: "2025-10-01"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date in YYYY-MM-DD format (Vietnam timezone). Will query until 23:59:59 Vietnam time. Cannot be in the future. Date range cannot exceed 30 days.
   *         example: "2025-10-31"
   *     responses:
   *       200:
   *         description: Get list old money delivery not type collect cost successful
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
   *                   example: "Get list old money delivery not type collect cost successful"
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
   *                   example: "get list old money delivery not type collect cost failed"
   */
  getListOldMoneyDeliveryNotTypeCollectCost = async (
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
        await this.returnMoneyDeliveriesService.getListOldMoneyDeliveryNotTypeCollectCost(
          query,
          req.user.userId
        );

      const response: ApiResponse = {
        success: true,
        message: 'Get list old money delivery not type collect cost successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Get list old money delivery not type collect cost error:', {
        error: error instanceof Error ? error.message : error,
      });

      const message =
        error instanceof Error
          ? error.message
          : 'get list old money delivery not type collect cost failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/return-money-deliveries/get-list-money-delivery-not-type-collect-cost-with-status-done:
   *   get:
   *     summary: Get list money delivery not type collect cost with status done (max 30 days, Vietnam timezone)
   *     description: Returns all money deliveries with type NOT COLLECT (NORMAL or COLLECT_FOR_CUSTOMER) and status DONE from user's selected route within the specified date range (Vietnam time UTC+7). Date range cannot exceed 30 days. Dates are interpreted as Vietnam timezone and automatically converted to UTC for database queries.
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
   *         example: "2025-10-01"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date in YYYY-MM-DD format (Vietnam timezone). Will query until 23:59:59 Vietnam time. Cannot be in the future. Date range cannot exceed 30 days.
   *         example: "2025-10-31"
   *     responses:
   *       200:
   *         description: Get list money delivery not type collect cost with status done successful
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
   *                   example: "Get list money delivery not type collect cost with status done successful"
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
   *                   example: "get list money delivery not type collect cost with status done failed"
   */
  getListMoneyDeliveryNotTypeCollectCostWithStatusDone = async (
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
        await this.returnMoneyDeliveriesService.getListMoneyDeliveryNotTypeCollectCostWithStatusDone(
          query,
          req.user.userId
        );

      const response: ApiResponse = {
        success: true,
        message: 'Get list money delivery not type collect cost with status done successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Get list money delivery not type collect cost with status done error:', {
        error: error instanceof Error ? error.message : error,
      });

      const message =
        error instanceof Error
          ? error.message
          : 'get list money delivery not type collect cost with status done failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/return-money-deliveries/get-list-money-delivery-type-normal-with-status-waiting:
   *   get:
   *     summary: Get list money delivery type normal with status waiting (max 30 days, Vietnam timezone)
   *     description: Returns all money deliveries with type NORMAL and status WAITING from user's selected route within the specified date range (Vietnam time UTC+7). Date range cannot exceed 30 days. Dates are interpreted as Vietnam timezone and automatically converted to UTC for database queries.
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
   *         example: "2025-10-01"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date in YYYY-MM-DD format (Vietnam timezone). Will query until 23:59:59 Vietnam time. Cannot be in the future. Date range cannot exceed 30 days.
   *         example: "2025-10-31"
   *     responses:
   *       200:
   *         description: Get list money delivery type normal with status waiting successful
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
   *                   example: "Get list money delivery type normal with status waiting successful"
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
   *                   example: "get list money delivery type normal with status waiting failed"
   */
  getListMoneyDeliveryTypeNormalWithStatusWaiting = async (
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
        await this.returnMoneyDeliveriesService.getListMoneyDeliveryTypeNormalWithStatusWaiting(
          query,
          req.user.userId
        );

      const response: ApiResponse = {
        success: true,
        message: 'Get list money delivery type normal with status waiting successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Get list money delivery type normal with status waiting error:', {
        error: error instanceof Error ? error.message : error,
      });

      const message =
        error instanceof Error
          ? error.message
          : 'get list money delivery type normal with status waiting failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/return-money-deliveries/get-list-money-delivery-type-collect-cost-with-status-done:
   *   get:
   *     summary: Get list money delivery type collect cost with status done (max 30 days, Vietnam timezone)
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
   *         example: "2025-10-01"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date in YYYY-MM-DD format (Vietnam timezone). Will query until 23:59:59 Vietnam time. Cannot be in the future. Date range cannot exceed 30 days.
   *         example: "2025-10-31"
   *     responses:
   *       200:
   *         description: Get list money delivery type collect cost with status done successful
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
   *                   example: "Get list money delivery type collect cost with status done successful"
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
   *                   example: "get list money delivery type collect cost with status done failed"
   */
  getListMoneyDeliveryTypeCollectCostWithStatusDone = async (
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
        await this.returnMoneyDeliveriesService.getListMoneyDeliveryTypeCollectCostWithStatusDone(
          query,
          req.user.userId
        );

      const response: ApiResponse = {
        success: true,
        message: 'Get list money delivery type collect cost with status done successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Get list money delivery type collect cost with status done error:', {
        error: error instanceof Error ? error.message : error,
      });

      const message =
        error instanceof Error
          ? error.message
          : 'get list money delivery type collect cost with status done failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/return-money-deliveries/get-list-return-money-type-collect-cost-with-status-waiting:
   *   get:
   *     summary: Get list return money type collect cost with status waiting (max 30 days, Vietnam timezone)
   *     description: Returns all money deliveries with type COLLECT and status WAITING from user's selected route within the specified date range (Vietnam time UTC+7). Date range cannot exceed 30 days. Dates are interpreted as Vietnam timezone and automatically converted to UTC for database queries. The response includes populated delivery object with relation fields.
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
   *         example: "2025-11-01"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date in YYYY-MM-DD format (Vietnam timezone). Will query until 23:59:59 Vietnam time. Cannot be in the future. Date range cannot exceed 30 days.
   *         example: "2025-11-24"
   *     responses:
   *       200:
   *         description: Get list return money type collect cost with status waiting successful
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
   *                   example: "Get list return money type collect cost with status waiting successful"
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
   *                   example: "get list return money type collect cost with status waiting failed"
   */
  getListReturnMoneyTypeCollectCostWithStatusWaiting = async (
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
        await this.returnMoneyDeliveriesService.getListReturnMoneyTypeCollectCostWithStatusWaiting(
          query,
          req.user.userId
        );

      const response: ApiResponse = {
        success: true,
        message: 'Get list return money type collect cost with status waiting successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Get list return money type collect cost with status waiting error:', {
        error: error instanceof Error ? error.message : error,
      });

      const message =
        error instanceof Error
          ? error.message
          : 'get list return money type collect cost with status waiting failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/return-money-deliveries/get-list-report-return-money-delivery-type-collect-with-status-done:
   *   get:
   *     summary: Get report for return money delivery type collect with status done
   *     description: Returns statistical report of collection returns with status DONE. Includes count of today's returns and old returns (from 7 days ago until today with dateReturn = today). No date parameters needed as it calculates based on today's date.
   *     tags: [Return Money Deliveries]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Get report successful
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
   *                   example: "Get report return money delivery type collect with status done successful"
   *                 data:
   *                   type: object
   *                   properties:
   *                     quantityReturnIsToday:
   *                       type: number
   *                       description: Number of returns created today
   *                       example: 5
   *                     quantityReturnIsOld:
   *                       type: number
   *                       description: Number of returns created from 7 days ago with dateReturn = today
   *                       example: 3
   *                     quantityReturnTotalToday:
   *                       type: number
   *                       description: Total of today's and old returns
   *                       example: 8
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
   *                   example: "get list report return money delivery type collect with status done failed"
   */
  getListReportReturnMoneyDeliveryTypeCollectWithStatusDone = async (
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

      const result =
        await this.returnMoneyDeliveriesService.getListReportReturnMoneyDeliveryTypeCollectWithStatusDone(
          req.user.userId
        );

      const response: ApiResponse = {
        success: true,
        message: 'Get report return money delivery type collect with status done successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Get report return money delivery type collect with status done error:', {
        error: error instanceof Error ? error.message : error,
      });

      const message =
        error instanceof Error
          ? error.message
          : 'get list report return money delivery type collect with status done failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/return-money-deliveries/get-list-report-return-money-delivery-not-type-collect-with-status-done:
   *   get:
   *     summary: Get report for return money delivery not type collect with status done
   *     description: Returns statistical report of non-collection returns with status DONE. Includes count of today's returns and old returns (from 7 days ago until today with dateReturn = today). No date parameters needed as it calculates based on today's date.
   *     tags: [Return Money Deliveries]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Get report successful
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
   *                   example: "Get report return money delivery not type collect with status done successful"
   *                 data:
   *                   type: object
   *                   properties:
   *                     quantityReturnIsToday:
   *                       type: number
   *                       description: Number of returns created today (not type COLLECT)
   *                       example: 5
   *                     quantityReturnIsOld:
   *                       type: number
   *                       description: Number of returns created from 7 days ago with dateReturn = today (not type COLLECT)
   *                       example: 3
   *                     quantityReturnTotalToday:
   *                       type: number
   *                       description: Total of today's and old returns
   *                       example: 8
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
   *                   example: "get list report return money delivery not type collect with status done failed"
   */
  getListReportReturnMoneyDeliveryNotTypeCollectWithStatusDone = async (
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

      const result =
        await this.returnMoneyDeliveriesService.getListReportReturnMoneyDeliveryNotTypeCollectWithStatusDone(
          req.user.userId
        );

      const response: ApiResponse = {
        success: true,
        message: 'Get report return money delivery not type collect with status done successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Get report return money delivery not type collect with status done error:', {
        error: error instanceof Error ? error.message : error,
      });

      const message =
        error instanceof Error
          ? error.message
          : 'get list report return money delivery not type collect with status done failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/return-money-deliveries/update-status-with-images:
   *   put:
   *     summary: Update status of return money delivery with images
   *     description: Updates the status of a money delivery to DONE and optionally uploads images. Updates notes with return date and sets dateReturn field.
   *     tags: [Return Money Deliveries]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - moneyDeliveryId
   *             properties:
   *               moneyDeliveryId:
   *                 type: string
   *                 example: "507f1f77bcf86cd799439011"
   *                 description: Money delivery ID
   *               contentReturn:
   *                 type: string
   *                 example: "Nội dung trả tiền"
   *                 description: Content return (optional)
   *               # Money delivery images support (up to 5 images)
   *               images:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *                 maxItems: 5
   *                 description: Array of money delivery image files (optional, max 5)
   *               images[0][index]:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *                 example: 1
   *                 description: Index for first image (1-5)
   *               images[0][rotate]:
   *                 type: integer
   *                 enum: [0, 90, 180, 270]
   *                 default: 0
   *                 description: Rotation angle for first image
   *     responses:
   *       200:
   *         description: Return money delivery status updated with images successfully
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
   *                   example: "Return money delivery status updated with images successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     moneyDelivery:
   *                       $ref: '#/components/schemas/MoneyDelivery'
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
   *                   example: "Money delivery ID is required"
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
   *                   example: "Money delivery with ID not found"
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
   *                   example: "Failed to update status with images"
   */
  updateStatusReturnMoneyDeliveryWithImages = async (
    req: AuthRequestWithFileUploads,
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

      const { moneyDeliveryId, contentReturn, images } = req.body;
      const filesObject = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      // Prepare image data for money delivery images
      let imagesData: Array<{
        index: number;
        buffer: Buffer;
        originalName: string;
        rotate: number;
      }> = [];

      // Handle money delivery images
      if (
        filesObject &&
        !Array.isArray(filesObject) &&
        filesObject.images &&
        filesObject.images.length > 0 &&
        images
      ) {
        imagesData = filesObject.images.map((file, idx) => ({
          index: images[idx]?.index || idx + 1,
          buffer: file.buffer,
          originalName: file.originalname,
          rotate: images[idx]?.rotate || 0,
        }));
      }

      const result =
        await this.returnMoneyDeliveriesService.updateStatusReturnMoneyDeliveryWithImages(
          moneyDeliveryId,
          contentReturn,
          imagesData.length > 0 ? imagesData : undefined
        );

      const response: ApiResponse = {
        success: true,
        message: 'Return money delivery status updated with images successfully',
        data: { moneyDelivery: result },
      };
      res.status(200).json(response);
    } catch (error) {
      Logger.error('Update status return money delivery with images error:', {
        error: error instanceof Error ? error.message : error,
      });

      let statusCode = 400;
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update status return money delivery with images';

      // Handle specific error cases
      if (message.includes('not found')) {
        statusCode = 404;
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
   * /api/return-money-deliveries/update-status-with-customer-images-and-money-images:
   *   put:
   *     summary: Update status of return money delivery with customer and money images
   *     description: Updates the status of a money delivery to DONE with optional customer images and money images. Both image fields are optional. Updates notes with return date and sets dateReturn field.
   *     tags: [Return Money Deliveries]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - moneyDeliveryId
   *               - customerId
   *             properties:
   *               moneyDeliveryId:
   *                 type: string
   *                 example: "507f1f77bcf86cd799439011"
   *                 description: Money delivery ID
   *               customerId:
   *                 type: string
   *                 example: "507f1f77bcf86cd799439012"
   *                 description: Customer ID
   *               address:
   *                 type: string
   *                 example: "123 Đường ABC, Quận 1, TP.HCM"
   *                 description: Customer address (optional)
   *               identityCardIssuedDate:
   *                 type: string
   *                 example: "2020-01-01"
   *                 description: Identity card issued date (optional)
   *               identityCardNumber:
   *                 type: string
   *                 example: "123456789"
   *                 description: Identity card number (optional)
   *               contentReturn:
   *                 type: string
   *                 example: "Nội dung trả tiền"
   *                 description: Content return (optional)
   *               # Customer images support (up to 5 images, optional)
   *               customerImages:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *                 maxItems: 5
   *                 description: Array of customer image files (optional, max 5)
   *               customerImages[0][index]:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *                 example: 1
   *                 description: Index for first customer image (1-5)
   *               customerImages[0][rotate]:
   *                 type: integer
   *                 enum: [0, 90, 180, 270]
   *                 default: 0
   *                 description: Rotation angle for first customer image
   *               # Money images support (up to 5 images, optional)
   *               moneyImages:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *                 maxItems: 5
   *                 description: Array of money image files (optional, max 5)
   *               moneyImages[0][index]:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *                 example: 1
   *                 description: Index for first money image (1-5)
   *               moneyImages[0][rotate]:
   *                 type: integer
   *                 enum: [0, 90, 180, 270]
   *                 default: 0
   *                 description: Rotation angle for first money image
   *     responses:
   *       200:
   *         description: Return money delivery status updated with dual images successfully
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
   *                   example: "Return money delivery status updated with dual images successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     moneyDelivery:
   *                       $ref: '#/components/schemas/MoneyDelivery'
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
   *                   example: "Money delivery ID is required"
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
   *                   example: "Money delivery with ID not found"
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
   *                   example: "Failed to update status with dual images"
   */
  updateStatusWithCustomerImagesAndMoneyImages = async (
    req: AuthRequestWithFileUploads,
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

      const {
        moneyDeliveryId,
        customerId,
        address,
        identityCardIssuedDate,
        identityCardNumber,
        contentReturn,
        identityCardName,
        customerImages,
        moneyImages,
      } = req.body;
      const filesObject = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      // Prepare customer images data
      let customerImagesData: Array<{
        index: number;
        buffer: Buffer;
        originalName: string;
        rotate: number;
      }> = [];

      // Prepare money images data
      let moneyImagesData: Array<{
        index: number;
        buffer: Buffer;
        originalName: string;
        rotate: number;
      }> = [];

      // Handle customer images
      if (
        filesObject &&
        !Array.isArray(filesObject) &&
        filesObject.customerImages &&
        filesObject.customerImages.length > 0 &&
        customerImages
      ) {
        customerImagesData = filesObject.customerImages.map((file, idx) => ({
          index: customerImages[idx]?.index || idx + 1,
          buffer: file.buffer,
          originalName: file.originalname,
          rotate: customerImages[idx]?.rotate || 0,
        }));
      }

      // Handle money images
      if (
        filesObject &&
        !Array.isArray(filesObject) &&
        filesObject.moneyImages &&
        filesObject.moneyImages.length > 0 &&
        moneyImages
      ) {
        moneyImagesData = filesObject.moneyImages.map((file, idx) => ({
          index: moneyImages[idx]?.index || idx + 1,
          buffer: file.buffer,
          originalName: file.originalname,
          rotate: moneyImages[idx]?.rotate || 0,
        }));
      }

      const result =
        await this.returnMoneyDeliveriesService.updateStatusWithCustomerImagesAndMoneyImages(
          {
            moneyDeliveryId,
            customerId,
            address,
            identityCardName,
            identityCardIssuedDate,
            identityCardNumber,
          },
          contentReturn,
          customerImagesData.length > 0 ? customerImagesData : undefined,
          moneyImagesData.length > 0 ? moneyImagesData : undefined
        );

      const response: ApiResponse = {
        success: true,
        message: 'Return money delivery status updated with dual images successfully',
        data: { moneyDelivery: result },
      };
      res.status(200).json(response);
    } catch (error) {
      Logger.error('Update status with customer images and money images error:', {
        error: error instanceof Error ? error.message : error,
      });

      let statusCode = 400;
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update status with customer images and money images';

      // Handle specific error cases
      if (message.includes('not found')) {
        statusCode = 404;
      }

      const response: ApiResponse = {
        success: false,
        message,
      };
      res.status(statusCode).json(response);
    }
  };
}
