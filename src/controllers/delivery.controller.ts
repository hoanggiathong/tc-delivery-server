import { Response } from 'express';
import { DeliveryService } from '@/services/delivery.service';
import { DeliveryReceiptService } from '@/services/delivery-receipt.service';
import {
  CreateDeliveryRequest,
  UpdateDeliveryRequest,
  DeliveryCostReportQuery,
} from '@/schemas/delivery.schema';
import { AuthRequest, ApiResponse } from '@/types';
import Logger from '@/utils/logger';

export class DeliveryController {
  private deliveryService: DeliveryService;
  private receiptService: DeliveryReceiptService;

  constructor() {
    this.deliveryService = new DeliveryService();
    this.receiptService = new DeliveryReceiptService();
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
   *               - itemValue
   *               - itemCost
   *               - collectForCustomer
   *               - collectForCustomerCost
   *             properties:
   *               senderName:
   *                 type: string
   *                 example: "Nguyễn Văn An"
   *               senderPhone:
   *                 type: string
   *                 example: "+84901234567"
   *               receiverName:
   *                 type: string
   *                 example: "Trần Thị Bình"
   *               receiverPhone:
   *                 type: string
   *                 example: "+84907654321"
   *               fromRouteId:
   *                 type: string
   *                 description: ObjectId of the from route
   *                 example: "507f1f77bcf86cd799439011"
   *               toRouteId:
   *                 type: string
   *                 description: ObjectId of the to route
   *                 example: "507f1f77bcf86cd799439012"
   *               name:
   *                 type: string
   *                 example: "Quần áo"
   *               quantity:
   *                 type: number
   *                 default: 1
   *                 example: 2
   *                 description: Number of packages
   *               cost:
   *                 type: number
   *                 example: 30000
   *               homeDelivery:
   *                 type: string
   *                 example: "123 Nguyễn Trãi, Q.5, TP.HCM"
   *               homeDeliveryCost:
   *                 type: number
   *                 example: 20000
   *               itemValue:
   *                 type: number
   *                 example: 500000
   *               itemCost:
   *                 type: number
   *                 example: 10000
   *               collectCost:
   *                 type: number
   *                 example: 0
   *               collectForCustomer:
   *                 type: number
   *                 example: 500000
   *               collectForCustomerCost:
   *                 type: number
   *                 example: 5000
   *               collectForCustomerNote:
   *                 type: string
   *                 example: "Thu tiền hàng"
   *               paymentType:
   *                 type: string
   *                 enum: [paid, debt, free]
   *                 default: paid
   *                 example: "paid"
   *               notes:
   *                 type: string
   *                 example: "Hàng dễ vỡ, vui lòng cẩn thận"
   *               details:
   *                 type: object
   *                 description: Package details (optional)
   *                 properties:
   *                   weight:
   *                     type: number
   *                     description: Weight in kg
   *                     example: 2.5
   *                   length:
   *                     type: number
   *                     description: Length in cm
   *                     example: 30
   *                   width:
   *                     type: number
   *                     description: Width in cm
   *                     example: 20
   *                   height:
   *                     type: number
   *                     description: Height in cm
   *                     example: 10
   *                   isOverweight:
   *                     type: boolean
   *                     description: Whether package is overweight
   *                     default: false
   *                     example: false
   *                   convertedWeight:
   *                     type: number
   *                     description: Converted weight in kg
   *                     example: 3.0
   *           examples:
   *             normalDelivery:
   *               summary: Normal delivery with COD
   *               value:
   *                 senderName: "Nguyễn Văn An"
   *                 senderPhone: "+84901234567"
   *                 receiverName: "Trần Thị Bình"
   *                 receiverPhone: "+84907654321"
   *                 fromRouteId: "507f1f77bcf86cd799439011"
   *                 toRouteId: "507f1f77bcf86cd799439012"
   *                 name: "Quần áo"
   *                 quantity: 2
   *                 cost: 30000
   *                 homeDelivery: "123 Nguyễn Trãi, Q.5, TP.HCM"
   *                 homeDeliveryCost: 20000
   *                 itemValue: 500000
   *                 itemCost: 10000
   *                 collectCost: 0
   *                 collectForCustomer: 500000
   *                 collectForCustomerCost: 5000
   *                 collectForCustomerNote: "Thu tiền hàng"
   *                 notes: "Hàng dễ vỡ, vui lòng cẩn thận"
   *                 details:
   *                   weight: 2.5
   *                   length: 30
   *                   width: 20
   *                   height: 10
   *                   isOverweight: false
   *             freeDelivery:
   *               summary: Free delivery
   *               value:
   *                 senderName: "Shop ABC"
   *                 senderPhone: "+84908888888"
   *                 receiverName: "Lê Văn Cường"
   *                 receiverPhone: "+84909999999"
   *                 fromRouteId: "507f1f77bcf86cd799439011"
   *                 toRouteId: "507f1f77bcf86cd799439012"
   *                 name: "Quà tặng"
   *                 quantity: 1
   *                 cost: 0
   *                 itemValue: 100000
   *                 itemCost: 0
   *                 collectForCustomer: 0
   *                 collectForCustomerCost: 0
   *                 paymentType: "free"
   *                 notes: "Giao hàng miễn phí"
   *     responses:
   *       201:
   *         description: Delivery created successfully
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
   *                   example: "Delivery created successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     code:
   *                       type: string
   *                     totalCost:
   *                       type: number
   *             examples:
   *               created:
   *                 summary: Delivery created
   *                 value:
   *                   success: true
   *                   message: "Delivery created successfully"
   *                   data:
   *                     id: "507f1f77bcf86cd799439020"
   *                     code: "2412170001"
   *                     sender:
   *                       id: "507f1f77bcf86cd799439021"
   *                       name: "Nguyễn Văn An"
   *                       phone: "+84901234567"
   *                     receiver:
   *                       id: "507f1f77bcf86cd799439022"
   *                       name: "Trần Thị Bình"
   *                       phone: "+84907654321"
   *                     fromRoute:
   *                       id: "507f1f77bcf86cd799439011"
   *                       code: "T1"
   *                       name: "Tuyến 1"
   *                     toRoute:
   *                       id: "507f1f77bcf86cd799439012"
   *                       code: "T2"
   *                       name: "Tuyến 2"
   *                     name: "Quần áo"
   *                     quantity: 2
   *                     cost: 30000
   *                     itemValue: 500000
   *                     itemCost: 10000
   *                     collectForCustomer: 500000
   *                     collectForCustomerCost: 5000
   *                     totalCost: 45000
   *                     paymentType: "paid"
   *                     details:
   *                       weight: 2.5
   *                       length: 30
   *                       width: 20
   *                       height: 10
   *                       isOverweight: false
   *                     createdAt: "2024-12-17T10:00:00.000Z"
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
   *               invalidItemCost:
   *                 summary: Invalid item cost
   *                 value:
   *                   success: false
   *                   message: "Item cost 5000 does not match the expected fee 10000 for item value 500000"
   *               invalidPhone:
   *                 summary: Invalid phone number
   *                 value:
   *                   success: false
   *                   message: "Validation error: Invalid phone number format"
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
   */
  createDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const data: CreateDeliveryRequest = req.body;
      const delivery = await this.deliveryService.createDelivery(data, req.user.userId);

      Logger.info('Delivery created successfully', {
        deliveryId: delivery.id,
        userId: req.user.userId,
        senderName: data.senderName,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Delivery created successfully',
        data: { delivery },
      };

      res.status(201).json(response);
    } catch (error) {
      Logger.error('Failed to create delivery', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        requestBody: req.body,
      });

      const message = error instanceof Error ? error.message : 'Failed to create delivery';

      // Determine appropriate status code based on error type
      let statusCode = 400;
      if (error instanceof Error) {
        if (error.message.includes('Item cost validation failed')) {
          statusCode = 400; // Bad Request for validation errors
        } else if (error.message.includes('not found')) {
          statusCode = 404; // Not Found for missing resources
        } else if (error.message.includes('Shipping rate configuration')) {
          statusCode = 400; // Bad Request for configuration issues
        }
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
   *               paymentType:
   *                 type: string
   *                 enum: [paid, debt, free]
   *                 description: Payment type
   *               notes:
   *                 type: string
   *               details:
   *                 type: object
   *                 description: Package details (optional)
   *                 properties:
   *                   weight:
   *                     type: number
   *                     description: Weight in kg
   *                   length:
   *                     type: number
   *                     description: Length in cm
   *                   width:
   *                     type: number
   *                     description: Width in cm
   *                   height:
   *                     type: number
   *                     description: Height in cm
   *                   isOverweight:
   *                     type: boolean
   *                     description: Whether package is overweight
   *                   convertedWeight:
   *                     type: number
   *                     description: Converted weight in kg
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
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      const data: UpdateDeliveryRequest = req.body;

      const delivery = await this.deliveryService.updateDelivery(id, data);

      Logger.info('Delivery updated successfully', {
        deliveryId: id,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Delivery updated successfully',
        data: { delivery },
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to update delivery', {
        error: error instanceof Error ? error.message : error,
        deliveryId: req.params.id,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to update delivery';

      // Determine appropriate status code based on error type
      let statusCode = 400;
      if (error instanceof Error) {
        if (error.message === 'Delivery not found') {
          statusCode = 404; // Not Found for missing delivery
        } else if (error.message.includes('Item cost validation failed')) {
          statusCode = 400; // Bad Request for validation errors
        } else if (error.message.includes('not found')) {
          statusCode = 404; // Not Found for missing resources
        } else if (error.message.includes('Shipping rate configuration')) {
          statusCode = 400; // Bad Request for configuration issues
        }
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
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      const delivery = await this.deliveryService.getDeliveryById(id);

      if (!delivery) {
        Logger.warn('Delivery not found', {
          deliveryId: id,
          userId: req.user.userId,
        });

        const response: ApiResponse = {
          success: false,
          message: 'Delivery not found',
        };
        res.status(404).json(response);
        return;
      }

      Logger.info('Delivery retrieved successfully', {
        deliveryId: id,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Delivery retrieved successfully',
        data: { delivery },
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get delivery', {
        error: error instanceof Error ? error.message : error,
        deliveryId: req.params.id,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to get delivery';

      const response: ApiResponse = {
        success: false,
        message,
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
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const deliveries = (await this.deliveryService.getAllDeliveries()) || [];

      Logger.info('All deliveries retrieved successfully', {
        count: deliveries.length,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Deliveries retrieved successfully',
        data: { deliveries, total: deliveries.length },
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get deliveries', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to get deliveries';

      const response: ApiResponse = {
        success: false,
        message,
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
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      await this.deliveryService.deleteDelivery(id);

      Logger.info('Delivery deleted successfully', {
        deliveryId: id,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Delivery deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to delete delivery', {
        error: error instanceof Error ? error.message : error,
        deliveryId: req.params.id,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to delete delivery';
      const statusCode =
        error instanceof Error && error.message === 'Delivery not found' ? 404 : 400;

      const response: ApiResponse = {
        success: false,
        message,
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
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { senderName } = req.params;

      if (!senderName) {
        const response: ApiResponse = {
          success: false,
          message: 'Sender name is required',
        };
        res.status(400).json(response);
        return;
      }

      const relatedDeliveries = await this.deliveryService.getRelatedDeliveriesBySender(senderName);

      // Check if no related deliveries found
      if (!relatedDeliveries || relatedDeliveries.length === 0) {
        const response: ApiResponse = {
          success: false,
          message: 'No related deliveries found',
        };
        res.status(404).json(response);
        return;
      }

      Logger.info('Related deliveries retrieved successfully', {
        senderName,
        count: relatedDeliveries.length,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Related deliveries retrieved successfully',
        data: {
          senderName,
          relatedDeliveries,
          count: relatedDeliveries.length,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get related deliveries', {
        error: error instanceof Error ? error.message : error,
        senderName: req.params.senderName,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to get related deliveries';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/delivery/next-code:
   *   get:
   *     summary: Get next available delivery code
   *     tags: [Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: toRouteId
   *         required: true
   *         schema:
   *           type: string
   *           pattern: '^[0-9a-fA-F]{24}$'
   *         description: ObjectId of the destination route
   *         example: "507f1f77bcf86cd799439011"
   *     responses:
   *       200:
   *         description: Next code retrieved successfully
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
   *                   example: "Next delivery code retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     nextCode:
   *                       type: string
   *                       example: "2401250001"
   *                       description: The next available delivery code
   *                     toRoute:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           example: "507f1f77bcf86cd799439011"
   *                         code:
   *                           type: string
   *                           example: "T1"
   *                         name:
   *                           type: string
   *                           example: "Ha Noi"
   *                         createdAt:
   *                           type: string
   *                           format: date-time
   *                         updatedAt:
   *                           type: string
   *                           format: date-time
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
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { toRouteId } = req.query;
      const nextCodeData = await this.deliveryService.getNextCode(
        toRouteId as string,
        req.user.userId
      );

      Logger.info('Next delivery code retrieved successfully', {
        nextCode: nextCodeData.nextCode,
        toRouteId,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Next delivery code retrieved successfully',
        data: nextCodeData,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get next delivery code', {
        error: error instanceof Error ? error.message : error,
        toRouteId: req.body.toRouteId,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to get next delivery code';

      // Determine appropriate status code based on error message
      let statusCode = 500;
      if (message.includes('not found')) {
        statusCode = 404;
      } else if (message.includes('validation') || message.includes('invalid')) {
        statusCode = 400;
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
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { deliveryIdentifier } = req.params;
      const delivery = await this.deliveryService.getDeliveryByCode(deliveryIdentifier);

      if (!delivery) {
        const response: ApiResponse = {
          success: false,
          message: 'Delivery not found',
        };
        res.status(404).json(response);
        return;
      }

      Logger.info('Delivery retrieved by code successfully', {
        deliveryIdentifier,
        deliveryId: delivery.id,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Delivery retrieved successfully',
        data: { delivery },
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get delivery by code', {
        error: error instanceof Error ? error.message : error,
        deliveryIdentifier: req.params.deliveryIdentifier,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to get delivery by code';

      // Determine proper status code based on error type
      let statusCode = 500; // Default to server error
      if (error instanceof Error) {
        if (
          error.message.includes('Invalid') ||
          error.message.includes('not found') ||
          error.message.includes('route with code')
        ) {
          statusCode = 400; // Bad Request for validation/client errors
        }
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
   * /api/delivery/search/{fullCode}:
   *   get:
   *     summary: Get delivery by fullCode using current user's selected route as fromRoute
   *     tags: [Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: fullCode
   *         required: true
   *         schema:
   *           type: string
   *           example: "2401250001T1T2"
   *         description: Delivery full code in format codeFromRouteToRoute (e.g., 2401250001T1T2)
   *     responses:
   *       200:
   *         description: Delivery retrieved successfully
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
   *                   example: "Delivery retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     delivery:
   *                       $ref: '#/components/schemas/Delivery'
   *       400:
   *         description: User has no selected route or invalid fullCode format
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
   *                   example: "User must have a selected route to search for deliveries"
   *       404:
   *         description: Delivery not found or user cannot access delivery from different route
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
   *                   example: "Delivery not found"
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
   */
  getDeliveryByFullCodeFromUserRoute = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { fullCode } = req.params;
      const delivery = await this.deliveryService.getDeliveryByFullCodeFromUserRoute(
        fullCode,
        req.user.userId
      );

      if (!delivery) {
        const response: ApiResponse = {
          success: false,
          message: 'Delivery not found',
        };
        res.status(404).json(response);
        return;
      }

      Logger.info('Delivery retrieved by fullCode from user route successfully', {
        fullCode,
        deliveryId: delivery.id,
        userId: req.user.userId,
        fromRouteCode: delivery.fromRoute.code,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Delivery retrieved successfully',
        data: { delivery },
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get delivery by fullCode from user route', {
        error: error instanceof Error ? error.message : error,
        fullCode: req.params.fullCode,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to get delivery by fullCode';

      // Determine proper status code based on error type
      let statusCode = 500; // Default to server error
      if (error instanceof Error) {
        if (error.message.includes('must have a selected route')) {
          statusCode = 400; // Bad Request for user configuration issues
        }
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
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { senderIdentifier } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const frequentCustomers = await this.deliveryService.getFrequentCustomers(
        senderIdentifier,
        req.user.userId,
        page,
        limit
      );

      Logger.info('Frequent customers retrieved successfully', {
        senderIdentifier,
        page,
        limit,
        count: frequentCustomers.frequentCustomers.length,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Frequent customers retrieved successfully',
        data: frequentCustomers,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get frequent customers', {
        error: error instanceof Error ? error.message : error,
        senderIdentifier: req.params.senderIdentifier,
        page: req.query.page,
        limit: req.query.limit,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to get frequent customers';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/delivery/cost-report:
   *   get:
   *     summary: Get cost report for deliveries with date range filtering and pagination
   *     tags: [Delivery]
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
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of records per page
   *     responses:
   *       200:
   *         description: Cost report retrieved successfully
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
   *                   properties:
   *                     summary:
   *                       type: object
   *                       description: Summary statistics for the deliveries
   *                     deliveries:
   *                       type: array
   *                       description: List of deliveries with cost details
   *                     pagination:
   *                       type: object
   *                       description: Pagination information
   *                     filter:
   *                       type: object
   *                       description: Applied filter information
   *       400:
   *         description: Validation error, invalid date range, or user has no selected route
   *       401:
   *         description: Unauthorized
   */
  getCostReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      // Get query parameters from validated request
      const { startDate, endDate, page, limit } = req.query as unknown as DeliveryCostReportQuery;

      // Call service to get cost report
      const report = await this.deliveryService.getCostReport(
        req.user.userId,
        startDate,
        endDate,
        page,
        limit
      );

      const response: ApiResponse = {
        success: true,
        message: 'Cost report retrieved successfully',
        data: report,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to generate cost report', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        query: req.query,
      });

      const message = error instanceof Error ? error.message : 'Failed to generate cost report';

      // Determine appropriate status code
      let statusCode = 500;
      if (message.includes('selected route')) {
        statusCode = 400;
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
   * /api/delivery/today-report:
   *   get:
   *     summary: Get delivery report for current day (no pagination)
   *     tags: [Delivery]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Today's delivery report retrieved successfully
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
   *                   example: "Today's delivery report retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     summary:
   *                       type: object
   *                       properties:
   *                         totalDeliveries:
   *                           type: number
   *                           example: 25
   *                           description: Total number of deliveries
   *                         totalQuantity:
   *                           type: number
   *                           example: 45
   *                           description: Total quantity of all deliveries
   *                         totalCost:
   *                           type: number
   *                           example: 750000
   *                           description: Total shipping cost
   *                         totalItemCost:
   *                           type: number
   *                           example: 125000
   *                           description: Total item cost
   *                         totalCollectCost:
   *                           type: number
   *                           example: 25000
   *                           description: Total collect cost
   *                         totalCollectForCustomer:
   *                           type: number
   *                           example: 2500000
   *                           description: Total collect for customer amount
   *                         totalCollectForCustomerCost:
   *                           type: number
   *                           example: 50000
   *                           description: Total collect for customer cost
   *                         date:
   *                           type: string
   *                           format: date
   *                           example: "2024-12-17"
   *                     deliveries:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                           code:
   *                             type: string
   *                           sender:
   *                             type: object
   *                           receiver:
   *                             type: object
   *                           cost:
   *                             type: number
   *                           itemCost:
   *                             type: number
   *                           totalCost:
   *                             type: number
   *                           createdAt:
   *                             type: string
   *                             format: date-time
   *                     routeInfo:
   *                       type: object
   *                       properties:
   *                         route:
   *                           type: object
   *                         routeCode:
   *                           type: string
   *                         routeName:
   *                           type: string
   *             examples:
   *               todayReport:
   *                 summary: Today's delivery report
   *                 value:
   *                   success: true
   *                   message: "Today's delivery report retrieved successfully"
   *                   data:
   *                     summary:
   *                       totalDeliveries: 25
   *                       totalQuantity: 45
   *                       totalCost: 750000
   *                       totalItemCost: 125000
   *                       totalCollectCost: 25000
   *                       totalCollectForCustomer: 2500000
   *                       totalCollectForCustomerCost: 50000
   *                       date: "2024-12-17"
   *                     deliveries: []
   *                     routeInfo:
   *                       route:
   *                         id: "507f1f77bcf86cd799439011"
   *                         code: "T1"
   *                         name: "Tuyến 1"
   *                       routeCode: "T1"
   *                       routeName: "Tuyến 1"
   *       400:
   *         description: User has no selected route
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
   *                   example: "User has no selected route"
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
   */
  getTodayReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      // Call service to get today's delivery report
      const report = await this.deliveryService.getTodayReport(req.user.userId);

      const response: ApiResponse = {
        success: true,
        message: "Today's delivery report retrieved successfully",
        data: report,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error("Failed to generate today's delivery report", {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : "Failed to generate today's report";

      // Determine appropriate status code
      let statusCode = 500;
      if (message.includes('selected route')) {
        statusCode = 400;
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
   * /api/delivery/receipt/{code}:
   *   get:
   *     summary: Generate PDF receipt for delivery by code
   *     tags: [Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *         description: Delivery code
   *         example: "2412170001"
   *     responses:
   *       200:
   *         description: PDF receipt generated successfully
   *         content:
   *           application/pdf:
   *             schema:
   *               type: string
   *               format: binary
   *         headers:
   *           Content-Disposition:
   *             schema:
   *               type: string
   *               example: "attachment; filename=delivery-receipt-2412170001.pdf"
   *       404:
   *         description: Delivery not found
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
   *                   example: "Delivery not found"
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Failed to generate PDF receipt
   */
  generateDeliveryReceiptByCode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { code } = req.params;

      // Get delivery by code with populated references
      const delivery = await this.deliveryService.getDeliveryByCodeWithPopulation(code);

      if (!delivery) {
        Logger.warn('Delivery not found for receipt generation', {
          deliveryCode: code,
          userId: req.user.userId,
        });
        const response: ApiResponse = {
          success: false,
          message: 'Delivery not found',
        };
        res.status(404).json(response);
        return;
      }

      // Generate PDF receipt
      const pdfBuffer = await this.receiptService.generateReceiptPDF(delivery);

      Logger.info('PDF receipt generated successfully', {
        deliveryId: delivery.id,
        deliveryCode: delivery.code,
        userId: req.user.userId,
      });

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=delivery-receipt-${delivery.code}.pdf`
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error) {
      Logger.error('Failed to generate delivery receipt', {
        error: error instanceof Error ? error.message : error,
        deliveryCode: req.params.code,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to generate PDF receipt';
      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/delivery/receipt-preview/{code}:
   *   get:
   *     summary: Generate HTML preview for delivery receipt
   *     tags: [Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *         description: Delivery code
   *         example: "2412170001"
   *     responses:
   *       200:
   *         description: HTML preview generated successfully
   *         content:
   *           text/html:
   *             schema:
   *               type: string
   *       404:
   *         description: Delivery not found
   *       401:
   *         description: Unauthorized
   */
  generateDeliveryReceiptPreview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { code } = req.params;

      // Get delivery by code with populated references
      const delivery = await this.deliveryService.getDeliveryByCodeWithPopulation(code);

      if (!delivery) {
        const response: ApiResponse = {
          success: false,
          message: 'Delivery not found',
        };
        res.status(404).json(response);
        return;
      }

      // Generate HTML preview
      const html = await this.receiptService.generateReceiptHTMLPreview(delivery);

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      Logger.error('Failed to generate delivery receipt preview', {
        error: error instanceof Error ? error.message : error,
        deliveryCode: req.params.code,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to generate HTML preview';
      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };
}
