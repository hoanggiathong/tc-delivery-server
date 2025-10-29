import { ReturnDeliveriesService } from '@/services/return-deliveries.service';
import { ApiResponse, AuthRequest, AuthRequestWithFileUploads } from '@/types';
import {
  IReturnDeliveryListRequest,
  IReturnDeliveryListDebtOfReturnDeliveriesTodayRequest,
  IReturnDeliveryUpdateRequest,
} from '@/types/return-delivery.type';
import { Response } from 'express';

export class ReturnDeliveriesController {
  private returnDeliveriesService: ReturnDeliveriesService;

  constructor() {
    this.returnDeliveriesService = new ReturnDeliveriesService();
  }

  /**
   * @swagger
   * /api/return-deliveries/get-list-return-deliveries:
   *   get:
   *     summary: api get list payment debt management
   *     tags: [Return Deliveries]
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
   *         example: "2025-10-01T00:00:00.000Z"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for filtering (ISO format). Cannot be in the future.
   *         example: "2025-10-31T23:59:59.999Z"
   *       - in: query
   *         name: phoneReceiver
   *         schema:
   *           type: string
   *           pattern: '^\+?[1-9]\d{1,14}$'
   *         description: Phone receiver
   *         example: "+84123456789"
   *       - in: query
   *         name: keySort
   *         required: false
   *         schema:
   *           type: string
   *           enum: ["createdAt"]
   *         description: field to want to sort
   *         example: "createdAt"
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
   *         description: get list return deliveries successful
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
   *                   example: "get list return deliveries fail"
   */
  getListReturnDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const query: IReturnDeliveryListRequest = req.query as unknown as IReturnDeliveryListRequest;

      const result = await this.returnDeliveriesService.getListReturnDeliveries(
        query,
        req.user?.userId
      );

      const response: ApiResponse = {
        success: true,
        message: 'get list return deliveries by to route successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('get list return deliveries by to route error:', error);

      const message =
        error instanceof Error ? error.message : 'get list return deliveries by to route failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/return-deliveries/information-receiver/{phoneReceiver}:
   *   get:
   *     summary: Get information receiver
   *     tags: [Return Deliveries]
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
   *                             example: "delivery"
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
      const result = await this.returnDeliveriesService.getInformationReceiver(phoneReceiver);

      const response: ApiResponse = {
        success: true,
        message: 'get information receiver successful',
        data: result,
      };
      res.status(200).json(response);
    } catch (error) {
      // console.error('get information receiver error:', error);
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
   * /api/return-deliveries/get-list-debt-of-return-deliveries-today:
   *   get:
   *     summary: Get list debt of return deliveries today
   *     tags: [Return Deliveries]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date for filtering (ISO format)
   *         example: "2025-10-01T00:00:00.000Z"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for filtering (ISO format)
   *         example: "2025-10-31T23:59:59.999Z"
   *     responses:
   *       200:
   *         description: Get list debt of return deliveries today successful
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
   *                   example: "get list debt of return deliveries today successful"
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ReturnDeliveryResponse'
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
   *                   example: "get list debt of return deliveries today failed"
   */
  getListDebtOfReturnDeliveriesToday = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const query: IReturnDeliveryListDebtOfReturnDeliveriesTodayRequest =
        req.query as unknown as IReturnDeliveryListDebtOfReturnDeliveriesTodayRequest;

      const result = await this.returnDeliveriesService.getListDebtOfReturnDeliveriesToday(
        query,
        req.user?.userId
      );

      const response: ApiResponse = {
        success: true,
        message: 'get list debt of return deliveries today successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('get list debt of return deliveries today error:', error);

      const message =
        error instanceof Error ? error.message : 'get list debt of return deliveries today failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/return-deliveries/get-list-collect-for-customer-not-collected:
   *   get:
   *     summary: Get list collect for customer of return deliveries not collected
   *     tags: [Return Deliveries]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Get list collect for customer of return deliveries not collected successful
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
   *                   example: "get list collect for customer of return deliveries not collected successful"
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ReturnDeliveryResponse'
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
   *                   example: "get list collect for customer of return deliveries not collected failed"
   */
  getListCollectForCustomerOfReturnDeliveriesNotCollected = async (
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
        await this.returnDeliveriesService.getListCollectForCustomerOfReturnDeliveriesNotCollected(
          req.user?.userId
        );

      const response: ApiResponse = {
        success: true,
        message: 'get list collect for customer of return deliveries not collected successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error(
        'get list collect for customer of return deliveries not collected error:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'get list collect for customer of return deliveries not collected failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/return-deliveries/get-list-all-return-deliveries:
   *   get:
   *     summary: Get list all return deliveries
   *     tags: [Return Deliveries]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date for filtering (ISO format)
   *         example: "2025-10-01T00:00:00.000Z"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for filtering (ISO format)
   *     responses:
   *       200:
   *         description: Get list all return deliveries successful
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
   *                   example: "get list all return deliveries successful"
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ReturnDeliveryResponse'
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
   *                   example: "get list all return deliveries failed"
   */
  getListAllReturnDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const result = await this.returnDeliveriesService.getListAllReturnDeliveries(
        req.user?.userId
      );

      const response: ApiResponse = {
        success: true,
        message: 'get list all return deliveries successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('get list all return deliveries error:', error);

      const message =
        error instanceof Error ? error.message : 'get list all return deliveries failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/return-deliveries/get-list-return-deliveries-is-return:
   *   get:
   *     summary: Get list return deliveries is return
   *     tags: [Return Deliveries]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Get list return deliveries is return successful
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
   *                   example: "get list return deliveries is return successful"
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ReturnDeliveryResponse'
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
   *                   example: "get list return deliveries is return failed"
   */
  getListReturnDeliveriesIsReturn = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const result = await this.returnDeliveriesService.getListReturnDeliveriesIsReturn(
        req.user?.userId
      );

      const response: ApiResponse = {
        success: true,
        message: 'get list return deliveries is return successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('get list return deliveries is return error:', error);

      const message =
        error instanceof Error ? error.message : 'get list return deliveries is return failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/return-deliveries/get-detail-images-return-delivery/{deliveryId}:
   *   get:
   *     summary: Get detail images return delivery
   *     tags: [Return Deliveries]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: deliveryId
   *         required: true
   *         schema:
   *           type: string
   *         description: Delivery ID
   *     responses:
   *       200:
   *         description: Get detail images return delivery successful
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
   *                   example: "get detail images return delivery successful"
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ReturnDeliveryImage'
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
   *                   example: "get detail images return delivery failed"
   */
  getDetailImagesReturnDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { deliveryId } = req.params;
      const result = await this.returnDeliveriesService.getDetailImagesReturnDelivery(deliveryId);

      const response: ApiResponse = {
        success: true,
        message: 'get detail images return delivery successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('get detail images return delivery error:', error);

      const message =
        error instanceof Error ? error.message : 'get detail images return delivery failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/return-deliveries/update-note-return-delivery/{deliveryId}:
   *   put:
   *     summary: Update note return delivery
   *     tags: [Return Deliveries]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: deliveryId
   *         required: true
   *         schema:
   *           type: string
   *         description: Delivery ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               note:
   *                 type: string
   *                 description: Note
   *     responses:
   *       200:
   *         description: Update note return delivery successful
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
   *                   example: "update note return delivery successful"
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
   *                   example: "update note return delivery failed"
   */
  updateNoteReturnDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { deliveryId } = req.params;
      const { note } = req.body;
      const result = await this.returnDeliveriesService.updateNoteReturnDelivery(deliveryId, note);

      const response: ApiResponse = {
        success: true,
        message: 'update note return delivery successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('update note return delivery error:', error);

      const message = error instanceof Error ? error.message : 'update note return delivery failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/return-deliveries/get-list-collect-cost-of-return-deliveries-not-collected:
   *   get:
   *     summary: Get list collect cost of return deliveries not collected
   *     tags: [Return Deliveries]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Get list collect cost of return deliveries not collected successful
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
   *                   example: "get list collect cost of return deliveries not collected successful"
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         example: "507f1f77bcf86cd799439011"
   *                       code:
   *                         type: string
   *                         example: "2412170001"
   *                       fullCode:
   *                         type: string
   *                         example: "2412170001"
   *                       sender:
   *                         type: object
   *                         properties:
   *                           name:
   *                             type: string
   *                             example: "Nguyễn Văn A"
   *                           phone:
   *                             type: string
   *                             example: "+84912345678"
   *                       receiver:
   *                         type: object
   *                         properties:
   *                           name:
   *                             type: string
   *                             example: "Trần Thị B"
   *                           phone:
   *                             type: string
   *                             example: "+84987654321"
   *                       collectCost:
   *                         type: number
   *                         example: 50000
   *                       collectForCustomer:
   *                         type: number
   *                         example: 1000000
   *                       collectForCustomerCost:
   *                         type: number
   *                         example: 50000
   *                       totalCollectCost:
   *                         type: number
   *                         example: 100000
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                         example: "2024-12-17T10:00:00.000Z"
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
   *                   example: "get list collect cost of return deliveries not collected failed"
   */
  getListCollectCostOfReturnDeliveriesNotCollected = async (
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
        await this.returnDeliveriesService.getListCollectCostOfReturnDeliveriesNotCollected(
          req.user.userId
        );

      const response: ApiResponse = {
        success: true,
        message: 'get list collect cost of return deliveries not collected successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('get list collect cost of return deliveries not collected error:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'get list collect cost of return deliveries not collected failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/return-deliveries/upload-images:
   *   put:
   *     summary: Upload images to return delivery
   *     tags: [Return Deliveries]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - deliveryId
   *             properties:
   *               deliveryId:
   *                 type: string
   *                 pattern: '^[0-9a-fA-F]{24}$'
   *                 example: '507f1f77bcf86cd799439011'
   *                 description: Return delivery ID
   *               # Multiple images support (up to 5 images)
   *               images:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *                 maxItems: 5
   *                 description: Array of image files to upload (optional, max 5)
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
   *               images[1][index]:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *                 example: 2
   *                 description: Index for second image (1-5)
   *               images[1][rotate]:
   *                 type: integer
   *                 enum: [0, 90, 180, 270]
   *                 default: 0
   *                 description: Rotation angle for second image
   *     responses:
   *       200:
   *         description: Images uploaded successfully
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
   *                   example: 'Images uploaded successfully'
   *                 data:
   *                   type: object
   *                   properties:
   *                     returnDelivery:
   *                       type: object
   *       400:
   *         description: Validation error or business logic error
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
   *                   examples:
   *                     validation:
   *                       value: 'Validation failed: Delivery ID is required'
   *                     not_found:
   *                       value: 'Return delivery not found'
   *       401:
   *         description: Unauthorized - Invalid or missing token
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
   *                   example: 'Unauthorized'
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
   *                   example: 'Internal server error'
   */
  uploadImagesReturnDelivery = async (
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

      const { deliveryId, images } = req.body;
      const filesObject = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      // Prepare image data for multiple images
      let imagesData: Array<{
        index: number;
        buffer: Buffer;
        originalName: string;
        rotate: number;
      }> = [];

      // Handle multiple images
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

      const result = await this.returnDeliveriesService.uploadImagesReturnDelivery(
        deliveryId,
        imagesData.length > 0 ? imagesData : undefined
      );

      const response: ApiResponse = {
        success: true,
        message: 'Images uploaded successfully',
        data: { returnDelivery: result },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Upload images error:', error);

      let statusCode = 400;
      const message = error instanceof Error ? error.message : 'Failed to upload images';

      // Handle specific error cases
      if (message === 'Return delivery not found') {
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
   * /api/return-deliveries/update-status-with-images:
   *   put:
   *     summary: Update status of return delivery with images (new formData format)
   *     tags: [Return Deliveries]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - deliveryId
   *               - customerId
   *             properties:
   *               deliveryId:
   *                 type: string
   *                 example: "507f1f77bcf86cd799439011"
   *                 description: Return delivery ID
   *               customerId:
   *                 type: string
   *                 example: "507f1f77bcf86cd799439012"
   *                 description: Customer ID
   *               address:
   *                 type: string
   *                 example: "123 ABC Street"
   *                 description: Customer address (optional)
   *               identityCardIssuedDate:
   *                 type: string
   *                 example: "2024-01-01"
   *                 description: Identity card issued date (optional)
   *               identityCardNumber:
   *                 type: string
   *                 example: "123456789"
   *                 description: Identity card number (optional)
   *               imagesIdentityCard:
   *                 type: string
   *                 example: "base64_image_string"
   *                 description: Identity card image (optional)
   *               # Customer images support (up to 5 images)
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
   *               # Return delivery images support (up to 5 images)
   *               returnDeliveryImages:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *                 maxItems: 5
   *                 description: Array of return delivery image files (optional, max 5)
   *               returnDeliveryImages[0][index]:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *                 example: 1
   *                 description: Index for first return delivery image (1-5)
   *               returnDeliveryImages[0][rotate]:
   *                 type: integer
   *                 enum: [0, 90, 180, 270]
   *                 default: 0
   *                 description: Rotation angle for first return delivery image
   *               returnDeliveryImages[1][index]:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *                 example: 2
   *                 description: Index for second return delivery image (1-5)
   *               returnDeliveryImages[1][rotate]:
   *                 type: integer
   *                 enum: [0, 90, 180, 270]
   *                 default: 0
   *                 description: Rotation angle for second return delivery image
   *           examples:
   *             withImages:
   *               summary: Update with return delivery images
   *               value:
   *                 deliveryId: "507f1f77bcf86cd799439011"
   *                 customerId: "507f1f77bcf86cd799439012"
   *                 address: "123 ABC Street"
   *                 identityCardIssuedDate: "2024-01-01"
   *                 identityCardNumber: "123456789"
   *             withoutImages:
   *               summary: Update without images
   *               value:
   *                 deliveryId: "507f1f77bcf86cd799439011"
   *                 customerId: "507f1f77bcf86cd799439012"
   *                 address: "123 ABC Street"
   *     responses:
   *       200:
   *         description: Return delivery status updated with images successfully
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
   *                   example: "Return delivery status updated with images successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     delivery:
   *                       type: object
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
   *                   example: "Delivery ID is required"
   *       404:
   *         description: Delivery or customer not found
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
   *                   example: "Delivery with ID not found"
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
  updateStatusWithImages = async (
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
        deliveryId,
        customerId,
        address,
        identityCardIssuedDate,
        identityCardNumber,
        customerImages,
        returnDeliveryImages,
      } = req.body;
      const filesObject = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      // Prepare image data for customer images
      let customerImagesData: Array<{
        index: number;
        buffer: Buffer;
        originalName: string;
        rotate: number;
      }> = [];

      // Prepare image data for return delivery images
      let returnDeliveryImagesData: Array<{
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

      // Handle return delivery images
      if (
        filesObject &&
        !Array.isArray(filesObject) &&
        filesObject.returnDeliveryImages &&
        filesObject.returnDeliveryImages.length > 0 &&
        returnDeliveryImages
      ) {
        returnDeliveryImagesData = filesObject.returnDeliveryImages.map((file, idx) => ({
          index: returnDeliveryImages[idx]?.index || idx + 1,
          buffer: file.buffer,
          originalName: file.originalname,
          rotate: returnDeliveryImages[idx]?.rotate || 0,
        }));
      }

      const result = await this.returnDeliveriesService.updateStatusWithImages(
        req.user?.userId,
        {
          deliveryId,
          customerId,
          address,
          identityCardIssuedDate,
          identityCardNumber,
        },
        customerImagesData.length > 0 ? customerImagesData : undefined,
        returnDeliveryImagesData.length > 0 ? returnDeliveryImagesData : undefined
      );

      const response: ApiResponse = {
        success: true,
        message: 'Return delivery status updated with images successfully',
        data: { delivery: result },
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Update status with images error:', error);

      let statusCode = 400;
      const message =
        error instanceof Error ? error.message : 'Failed to update status with images';

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
   * /api/return-deliveries/update-status-without-images:
   *   put:
   *     summary: Update status of return deliveries without images (case update data only)
   *     tags: [Return Deliveries]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               arrayListReturnDelivery:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     deliveryId:
   *                       type: string
   *                       example: "507f1f77bcf86cd799439011"
   *           examples:
   *             singleReturn:
   *               summary: Single return delivery without images
   *               value:
   *                 arrayListReturnDelivery: [{"deliveryId":"507f1f77bcf86cd799439011"}]
   *             multipleReturns:
   *               summary: Multiple return deliveries without images
   *               value:
   *                 arrayListReturnDelivery: [{"deliveryId":"507f1f77bcf86cd799439011"},{"deliveryId":"507f1f77bcf86cd799439013"}]
   *     responses:
   *       200:
   *         description: Return delivery status updated without images successfully
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
   *                   example: "Return delivery status updated without images successfully"
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
   *                   example: "Array list return delivery is empty"
   *       404:
   *         description: Delivery or customer not found
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
   *                   example: "Delivery with ID not found"
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
   *                   example: "Failed to update status without images"
   */
  updateStatusWithoutImages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const updateData: IReturnDeliveryUpdateRequest = req.body;

      await this.returnDeliveriesService.updateStatusReturnDeliveryWithoutImages(
        req.user?.userId,
        updateData
      );

      const response: ApiResponse = {
        success: true,
        message: 'Return delivery status updated without images successfully',
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Update status without images error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to update status without images';
      const response: ApiResponse = {
        success: false,
        message,
      };
      res.status(500).json(response);
    }
  };
}
