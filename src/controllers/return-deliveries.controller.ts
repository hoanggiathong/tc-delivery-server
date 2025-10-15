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
}
