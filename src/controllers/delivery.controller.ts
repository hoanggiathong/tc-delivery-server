import { Response } from 'express';
import { DeliveryService } from '@/services/delivery.service';
import { CreateDeliveryRequest, UpdateDeliveryRequest } from '@/schemas/delivery.schema';
import { AuthRequest, ApiResponse } from '@/types';

export class DeliveryController {
  private deliveryService: DeliveryService;

  constructor() {
    this.deliveryService = new DeliveryService();
  }

  /**
   * @swagger
   * /api/delivery:
   *   post:
   *     summary: Create a new delivery
   *     tags: [Delivery]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - senderName
   *               - senderPhone
   *               - receiverName
   *               - receiverPhone
   *               - route
   *               - name
   *               - cost
   *               - homeDelivery
   *               - homeDeliveryCost
   *               - itemValue
   *               - itemCost
   *               - collectCost
   *               - collectForCustomer
   *               - collectForCustomerCost
   *               - collectForCustomerNote
   *             properties:
   *               senderName:
   *                 type: string
   *               senderPhone:
   *                 type: string
   *               receiverName:
   *                 type: string
   *               receiverPhone:
   *                 type: string
   *               route:
   *                 type: string
   *               name:
   *                 type: string
   *               cost:
   *                 type: number
   *               homeDelivery:
   *                 type: string
   *               homeDeliveryCost:
   *                 type: number
   *               itemValue:
   *                 type: number
   *               itemCost:
   *                 type: number
   *               collectCost:
   *                 type: number
   *               collectForCustomer:
   *                 type: boolean
   *               collectForCustomerCost:
   *                 type: number
   *               collectForCustomerNote:
   *                 type: string
   *     responses:
   *       201:
   *         description: Delivery created successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  createDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized'
        };
        res.status(401).json(response);
        return;
      }

      const data: CreateDeliveryRequest = req.body;
      const delivery = await this.deliveryService.createDelivery(data, req.user.userId);

      const response: ApiResponse = {
        success: true,
        message: 'Delivery created successfully',
        data: { delivery }
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create delivery error:', error);

      const message = error instanceof Error ? error.message : 'Failed to create delivery';

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(400).json(response);
    }
  };

  /**
   * @swagger
   * /api/delivery/{id}:
   *   put:
   *     summary: Update delivery by ID
   *     tags: [Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               senderName:
   *                 type: string
   *               senderPhone:
   *                 type: string
   *               receiverName:
   *                 type: string
   *               receiverPhone:
   *                 type: string
   *               route:
   *                 type: string
   *               name:
   *                 type: string
   *               cost:
   *                 type: number
   *               homeDelivery:
   *                 type: string
   *               homeDeliveryCost:
   *                 type: number
   *               itemValue:
   *                 type: number
   *               itemCost:
   *                 type: number
   *               collectCost:
   *                 type: number
   *               collectForCustomer:
   *                 type: boolean
   *               collectForCustomerCost:
   *                 type: number
   *               collectForCustomerNote:
   *                 type: string
   *     responses:
   *       200:
   *         description: Delivery updated successfully
   *       400:
   *         description: Validation error
   *       404:
   *         description: Delivery not found
   *       401:
   *         description: Unauthorized
   */
  updateDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized'
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      const data: UpdateDeliveryRequest = req.body;

      const delivery = await this.deliveryService.updateDelivery(id, data);

      const response: ApiResponse = {
        success: true,
        message: 'Delivery updated successfully',
        data: { delivery }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Update delivery error:', error);

      const message = error instanceof Error ? error.message : 'Failed to update delivery';
      const statusCode = message === 'Delivery not found' ? 404 : 400;

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/delivery/{id}:
   *   get:
   *     summary: Get delivery by ID
   *     tags: [Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Delivery retrieved successfully
   *       404:
   *         description: Delivery not found
   *       401:
   *         description: Unauthorized
   */
  getDeliveryById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized'
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      const delivery = await this.deliveryService.getDeliveryById(id);

      if (!delivery) {
        const response: ApiResponse = {
          success: false,
          message: 'Delivery not found'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Delivery retrieved successfully',
        data: { delivery }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get delivery error:', error);

      const message = error instanceof Error ? error.message : 'Failed to get delivery';

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/delivery:
   *   get:
   *     summary: Get all deliveries
   *     tags: [Delivery]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Deliveries retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  getAllDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized'
        };
        res.status(401).json(response);
        return;
      }

      const deliveries = await this.deliveryService.getAllDeliveries() || [];

      const response: ApiResponse = {
        success: true,
        message: 'Deliveries retrieved successfully',
        data: { deliveries, total: deliveries.length }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get all deliveries error:', error);

      const message = error instanceof Error ? error.message : 'Failed to get deliveries';

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(500).json(response);
    }
  };
}