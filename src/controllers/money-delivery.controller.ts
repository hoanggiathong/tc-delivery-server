import { Response } from 'express';
import { MoneyDeliveryService } from '@/services/money-delivery.service';
import {
  CreateMoneyDeliveryRequest,
  UpdateMoneyDeliveryRequest,
  GetNextMoneyDeliveryCodeRequest,
  MoneyDeliveryCodeParams
} from '@/schemas/money-delivery.schema';
import { AuthRequest, ApiResponse } from '@/types';
import logger from '@/utils/logger';

export class MoneyDeliveryController {
  private moneyDeliveryService: MoneyDeliveryService;

  constructor() {
    this.moneyDeliveryService = new MoneyDeliveryService();
  }

  /**
   * Create a new money delivery
   * POST /api/money-deliveries
   * @swagger
   * /api/money-deliveries:
   *   post:
   *     summary: Create a new money delivery
   *     tags: [MoneyDelivery]
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
   *               - fromRouteId
   *               - toRouteId
   *               - sendMoneyAmount
   *               - sendCost
   *             properties:
   *               senderName:
   *                 type: string
   *                 description: Name of the sender
   *               senderPhone:
   *                 type: string
   *                 description: Phone number of the sender
   *               receiverName:
   *                 type: string
   *                 description: Name of the receiver
   *               receiverPhone:
   *                 type: string
   *                 description: Phone number of the receiver
   *               fromRouteId:
   *                 type: string
   *                 description: ObjectId of the from route
   *               toRouteId:
   *                 type: string
   *                 description: ObjectId of the to route
   *               sendMoneyAmount:
   *                 type: number
   *                 description: Amount of money to send
   *               sendCost:
   *                 type: number
   *                 description: Service cost for money transfer
   *               notes:
   *                 type: string
   *                 description: Optional notes for the money delivery
   *     responses:
   *       201:
   *         description: Money delivery created successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Route not found
   */
  createMoneyDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated'
        };
        res.status(401).json(response);
        return;
      }

      const moneyDeliveryData: CreateMoneyDeliveryRequest = req.body;
      const userId = req.user.userId;

      const moneyDelivery = await this.moneyDeliveryService.createMoneyDelivery(moneyDeliveryData, userId);

      logger.info(`Money delivery created: ${moneyDelivery.code} by user: ${userId}`);

      const response: ApiResponse = {
        success: true,
        message: 'Money delivery created successfully',
        data: moneyDelivery
      };

      res.status(201).json(response);

    } catch (error) {
      logger.error('Error creating money delivery:', error);
      const message = error instanceof Error ? error.message : 'Failed to create money delivery';

      // Determine appropriate status code based on error message
      let statusCode = 500;
      if (message.includes('not found')) {
        statusCode = 404;
      } else if (message.includes('validation') || message.includes('invalid')) {
        statusCode = 400;
      }

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * Get all money deliveries
   * GET /api/money-deliveries
   * @swagger
   * /api/money-deliveries:
   *   get:
   *     summary: Get all money deliveries
   *     tags: [MoneyDelivery]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Money deliveries retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  getAllMoneyDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated'
        };
        res.status(401).json(response);
        return;
      }

      const moneyDeliveries = await this.moneyDeliveryService.getAllMoneyDeliveries();

      logger.info(`Retrieved ${moneyDeliveries.length} money deliveries`);

      const response: ApiResponse = {
        success: true,
        message: 'Money deliveries retrieved successfully',
        data: { moneyDeliveries, count: moneyDeliveries.length }
      };

      res.status(200).json(response);

    } catch (error) {
      logger.error('Error retrieving money deliveries:', error);
      const message = error instanceof Error ? error.message : 'Failed to retrieve money deliveries';

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(500).json(response);
    }
  };

  /**
   * Get money delivery by ID
   * GET /api/money-deliveries/:id
   * @swagger
   * /api/money-deliveries/{id}:
   *   get:
   *     summary: Get money delivery by ID
   *     tags: [MoneyDelivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Money delivery ID
   *     responses:
   *       200:
   *         description: Money delivery retrieved successfully
   *       404:
   *         description: Money delivery not found
   *       401:
   *         description: Unauthorized
   */
  getMoneyDeliveryById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated'
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;

      const moneyDelivery = await this.moneyDeliveryService.getMoneyDeliveryById(id);

      if (!moneyDelivery) {
        const response: ApiResponse = {
          success: false,
          message: 'Money delivery not found'
        };
        res.status(404).json(response);
        return;
      }

      logger.info(`Retrieved money delivery: ${moneyDelivery.code}`);

      const response: ApiResponse = {
        success: true,
        message: 'Money delivery retrieved successfully',
        data: moneyDelivery
      };

      res.status(200).json(response);

    } catch (error) {
      logger.error('Error retrieving money delivery:', error);
      const message = error instanceof Error ? error.message : 'Failed to retrieve money delivery';

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(500).json(response);
    }
  };

  /**
   * Update money delivery by ID
   * PUT /api/money-deliveries/:id
   * @swagger
   * /api/money-deliveries/{id}:
   *   put:
   *     summary: Update money delivery by ID
   *     tags: [MoneyDelivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Money delivery ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               senderName:
   *                 type: string
   *                 description: Name of the sender
   *               senderPhone:
   *                 type: string
   *                 description: Phone number of the sender
   *               receiverName:
   *                 type: string
   *                 description: Name of the receiver
   *               receiverPhone:
   *                 type: string
   *                 description: Phone number of the receiver
   *               fromRouteId:
   *                 type: string
   *                 description: ObjectId of the from route
   *               toRouteId:
   *                 type: string
   *                 description: ObjectId of the to route
   *               sendMoneyAmount:
   *                 type: number
   *                 description: Amount of money to send
   *               sendCost:
   *                 type: number
   *                 description: Service cost for money transfer
   *               notes:
   *                 type: string
   *                 description: Optional notes for the money delivery
   *     responses:
   *       200:
   *         description: Money delivery updated successfully
   *       400:
   *         description: Validation error
   *       404:
   *         description: Money delivery not found
   *       401:
   *         description: Unauthorized
   */
  updateMoneyDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated'
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      const updateData: UpdateMoneyDeliveryRequest = req.body;

      const updatedMoneyDelivery = await this.moneyDeliveryService.updateMoneyDelivery(id, updateData);

      logger.info(`Money delivery updated: ${updatedMoneyDelivery.code}`);

      const response: ApiResponse = {
        success: true,
        message: 'Money delivery updated successfully',
        data: updatedMoneyDelivery
      };

      res.status(200).json(response);

    } catch (error) {
      logger.error('Error updating money delivery:', error);

      const message = error instanceof Error ? error.message : 'Failed to update money delivery';
      const statusCode = message.includes('not found') ? 404 : 500;

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * Delete money delivery by ID
   * DELETE /api/money-deliveries/:id
   * @swagger
   * /api/money-deliveries/{id}:
   *   delete:
   *     summary: Delete money delivery by ID
   *     tags: [MoneyDelivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Money delivery ID
   *     responses:
   *       200:
   *         description: Money delivery deleted successfully
   *       404:
   *         description: Money delivery not found
   *       401:
   *         description: Unauthorized
   */
  deleteMoneyDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated'
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;

      await this.moneyDeliveryService.deleteMoneyDelivery(id);

      logger.info(`Money delivery deleted: ${id}`);

      const response: ApiResponse = {
        success: true,
        message: 'Money delivery deleted successfully'
      };

      res.status(200).json(response);

    } catch (error) {
      logger.error('Error deleting money delivery:', error);

      const message = error instanceof Error ? error.message : 'Failed to delete money delivery';
      const statusCode = message.includes('not found') ? 404 : 500;

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * Get next money delivery code for a specific route
   * POST /api/money-deliveries/next-code
   * @swagger
   * /api/money-deliveries/next-code:
   *   post:
   *     summary: Get next available money delivery code
   *     tags: [MoneyDelivery]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - toRouteId
   *             properties:
   *               toRouteId:
   *                 type: string
   *                 description: ObjectId of the destination route
   *     responses:
   *       200:
   *         description: Next code retrieved successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Route not found
   */
  getNextCode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated'
        };
        res.status(401).json(response);
        return;
      }

      const { toRouteId }: GetNextMoneyDeliveryCodeRequest = req.body;

      const result = await this.moneyDeliveryService.getNextCode(toRouteId);

      logger.info(`Generated next money delivery code: ${result.nextCode} for route: ${result.toRoute.code}`);

      const response: ApiResponse = {
        success: true,
        message: 'Next money delivery code generated successfully',
        data: result
      };

      res.status(200).json(response);

    } catch (error) {
      logger.error('Error generating next money delivery code:', error);

      const message = error instanceof Error ? error.message : 'Failed to generate next money delivery code';
      const statusCode = message.includes('not found') ? 404 : 500;

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * Get money delivery by code
   * GET /api/money-deliveries/code/:deliveryIdentifier
   * @swagger
   * /api/money-deliveries/code/{deliveryIdentifier}:
   *   get:
   *     summary: Get money delivery by code and route combination
   *     tags: [MoneyDelivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: deliveryIdentifier
   *         required: true
   *         schema:
   *           type: string
   *           example: "2401250001T1T2"
   *         description: Money delivery identifier in format codeFromRouteToRoute (e.g., 2401250001T1T2)
   *     responses:
   *       200:
   *         description: Money delivery retrieved successfully
   *       400:
   *         description: Invalid delivery identifier format
   *       404:
   *         description: Money delivery not found
   *       401:
   *         description: Unauthorized
   */
  getMoneyDeliveryByCode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated'
        };
        res.status(401).json(response);
        return;
      }

      const { deliveryIdentifier } = req.params;

      const moneyDelivery = await this.moneyDeliveryService.getMoneyDeliveryByCode(deliveryIdentifier);

      if (!moneyDelivery) {
        const response: ApiResponse = {
          success: false,
          message: 'Money delivery not found'
        };
        res.status(404).json(response);
        return;
      }

      logger.info(`Retrieved money delivery by code: ${moneyDelivery.code}`);

      const response: ApiResponse = {
        success: true,
        message: 'Money delivery retrieved successfully',
        data: moneyDelivery
      };

      res.status(200).json(response);

    } catch (error) {
      logger.error('Error retrieving money delivery by code:', error);
      const message = error instanceof Error ? error.message : 'Failed to retrieve money delivery by code';

      // Determine appropriate status code based on error message
      let statusCode = 500;
      if (message.includes('not found')) {
        statusCode = 404;
      } else if (message.includes('validation') || message.includes('invalid')) {
        statusCode = 400;
      }

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(statusCode).json(response);
    }
  };
}