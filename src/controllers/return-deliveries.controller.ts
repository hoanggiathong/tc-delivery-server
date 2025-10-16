import { ReturnDeliveriesService } from '@/services/return-deliveries.service';
import { ApiResponse, AuthRequest } from '@/types';
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
   *         name: phoneReceiver
   *         schema:
   *           type: string
   *           pattern: '^[0-9]+$'
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

      const result = await this.returnDeliveriesService.getListReturnDeliveries(
        req,
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
      console.error('get information receiver error:', error);
      const message = error instanceof Error ? error.message : 'get information receiver failed';
      const response: ApiResponse = {
        success: false,
        message,
      };
      res.status(500).json(response);
    }
  };
}
