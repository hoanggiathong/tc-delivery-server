import { Response } from 'express';
import { DeliveryService } from '@/services/delivery.service';
import { CreateDeliveryRequest, UpdateDeliveryRequest } from '@/schemas/delivery.schema';
import { AuthRequest, ApiResponse } from '@/types';
import Logger from '@/utils/logger';

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
   *               - fromRouteId
   *               - toRouteId
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
   *               fromRouteId:
   *                 type: string
   *                 description: ObjectId of the from route
   *               toRouteId:
   *                 type: string
   *                 description: ObjectId of the to route
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

      Logger.info('Delivery created successfully', {
        deliveryId: delivery.id,
        userId: req.user.userId,
        senderName: data.senderName
      });

      const response: ApiResponse = {
        success: true,
        message: 'Delivery created successfully',
        data: { delivery }
      };

      res.status(201).json(response);
    } catch (error) {
      Logger.error('Failed to create delivery', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        requestBody: req.body
      });

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
   *               fromRouteId:
   *                 type: string
   *                 description: ObjectId of the from route
   *               toRouteId:
   *                 type: string
   *                 description: ObjectId of the to route
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

      Logger.info('Delivery updated successfully', {
        deliveryId: id,
        userId: req.user.userId
      });

      const response: ApiResponse = {
        success: true,
        message: 'Delivery updated successfully',
        data: { delivery }
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to update delivery', {
        error: error instanceof Error ? error.message : error,
        deliveryId: req.params.id,
        userId: req.user?.userId
      });

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
        Logger.warn('Delivery not found', {
          deliveryId: id,
          userId: req.user.userId
        });

        const response: ApiResponse = {
          success: false,
          message: 'Delivery not found'
        };
        res.status(404).json(response);
        return;
      }

      Logger.info('Delivery retrieved successfully', {
        deliveryId: id,
        userId: req.user.userId
      });

      const response: ApiResponse = {
        success: true,
        message: 'Delivery retrieved successfully',
        data: { delivery }
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get delivery', {
        error: error instanceof Error ? error.message : error,
        deliveryId: req.params.id,
        userId: req.user?.userId
      });

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

      Logger.info('All deliveries retrieved successfully', {
        count: deliveries.length,
        userId: req.user.userId
      });

      const response: ApiResponse = {
        success: true,
        message: 'Deliveries retrieved successfully',
        data: { deliveries, total: deliveries.length }
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get deliveries', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId
      });

      const message = error instanceof Error ? error.message : 'Failed to get deliveries';

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(500).json(response);
    }
  };

    // Delete delivery
  deleteDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
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
      await this.deliveryService.deleteDelivery(id);

      Logger.info('Delivery deleted successfully', {
        deliveryId: id,
        userId: req.user.userId
      });

      const response: ApiResponse = {
        success: true,
        message: 'Delivery deleted successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to delete delivery', {
        error: error instanceof Error ? error.message : error,
        deliveryId: req.params.id,
        userId: req.user?.userId
      });

      const message = error instanceof Error ? error.message : 'Failed to delete delivery';
      const statusCode = error instanceof Error && error.message === 'Delivery not found' ? 404 : 400;

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(statusCode).json(response);
    }
  };

    // Get related deliveries by sender name
  getRelatedDeliveriesBySender = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized'
        };
        res.status(401).json(response);
        return;
      }

      const { senderName } = req.params;

      if (!senderName) {
        const response: ApiResponse = {
          success: false,
          message: 'Sender name is required'
        };
        res.status(400).json(response);
        return;
      }

      const relatedDeliveries = await this.deliveryService.getRelatedDeliveriesBySender(senderName);

      Logger.info('Related deliveries retrieved successfully', {
        senderName,
        count: relatedDeliveries.length,
        userId: req.user.userId
      });

      const response: ApiResponse = {
        success: true,
        message: 'Related deliveries retrieved successfully',
        data: {
          senderName,
          deliveries: relatedDeliveries,
          count: relatedDeliveries.length
        }
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get related deliveries', {
        error: error instanceof Error ? error.message : error,
        senderName: req.params.senderName,
        userId: req.user?.userId
      });

      const message = error instanceof Error ? error.message : 'Failed to get related deliveries';

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/delivery/next-code:
   *   post:
   *     summary: Get next available delivery code
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
   */
  getNextCode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized'
        };
        res.status(401).json(response);
        return;
      }

      const { toRouteId } = req.body;
      const nextCodeData = await this.deliveryService.getNextCode(toRouteId);

      Logger.info('Next delivery code retrieved successfully', {
        nextCode: nextCodeData.nextCode,
        toRouteId,
        userId: req.user.userId
      });

      const response: ApiResponse = {
        success: true,
        message: 'Next delivery code retrieved successfully',
        data: nextCodeData
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get next delivery code', {
        error: error instanceof Error ? error.message : error,
        toRouteId: req.body.toRouteId,
        userId: req.user?.userId
      });

      const message = error instanceof Error ? error.message : 'Failed to get next delivery code';

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(400).json(response);
    }
  };

  /**
   * @swagger
   * /api/delivery/code/{deliveryIdentifier}:
   *   get:
   *     summary: Get delivery by code and route combination
   *     tags: [Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: deliveryIdentifier
   *         required: true
   *         schema:
   *           type: string
   *           example: "2401250001T1T2"
   *         description: Delivery identifier in format codeFromRouteToRoute (e.g., 2401250001T1T2)
   *     responses:
   *       200:
   *         description: Delivery retrieved successfully
   *       400:
   *         description: Invalid delivery identifier format
   *       404:
   *         description: Delivery not found
   *       401:
   *         description: Unauthorized
   */
  getDeliveryByCode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized'
        };
        res.status(401).json(response);
        return;
      }

      const { deliveryIdentifier } = req.params;
      const delivery = await this.deliveryService.getDeliveryByCode(deliveryIdentifier);

      if (!delivery) {
        const response: ApiResponse = {
          success: false,
          message: 'Delivery not found'
        };
        res.status(404).json(response);
        return;
      }

      Logger.info('Delivery retrieved by code successfully', {
        deliveryIdentifier,
        deliveryId: delivery.id,
        userId: req.user.userId
      });

      const response: ApiResponse = {
        success: true,
        message: 'Delivery retrieved successfully',
        data: { delivery }
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get delivery by code', {
        error: error instanceof Error ? error.message : error,
        deliveryIdentifier: req.params.deliveryIdentifier,
        userId: req.user?.userId
      });

      const message = error instanceof Error ? error.message : 'Failed to get delivery by code';

      // Determine proper status code based on error type
      let statusCode = 500; // Default to server error
      if (error instanceof Error) {
        if (error.message.includes('Invalid') ||
            error.message.includes('not found') ||
            error.message.includes('route with code')) {
          statusCode = 400; // Bad Request for validation/client errors
        }
      }

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/delivery/frequent-customers/{senderIdentifier}:
   *   get:
   *     summary: Get frequent customers for a sender with pagination
   *     tags: [Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: senderIdentifier
   *         required: true
   *         schema:
   *           type: string
   *         description: Sender name or phone number to search for
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of records per page
   *     responses:
   *       200:
   *         description: Frequent customers retrieved successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  getFrequentCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized'
        };
        res.status(401).json(response);
        return;
      }

      const { senderIdentifier } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const frequentCustomers = await this.deliveryService.getFrequentCustomers(senderIdentifier, page, limit);

      Logger.info('Frequent customers retrieved successfully', {
        senderIdentifier,
        page,
        limit,
        count: frequentCustomers.frequentCustomers.length,
        userId: req.user.userId
      });

      const response: ApiResponse = {
        success: true,
        message: 'Frequent customers retrieved successfully',
        data: frequentCustomers
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get frequent customers', {
        error: error instanceof Error ? error.message : error,
        senderIdentifier: req.params.senderIdentifier,
        page: req.query.page,
        limit: req.query.limit,
        userId: req.user?.userId
      });

      const message = error instanceof Error ? error.message : 'Failed to get frequent customers';

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(500).json(response);
    }
  };
}