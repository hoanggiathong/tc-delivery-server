import {
  CreateDeliveryRequest,
  DeliveryCostReportQuery,
  GetListDeliveryInventoryQuery,
  UpdateDeliveryRequest,
} from '@/schemas/delivery.schema';
import { RemovedDeliveryService } from '@/services/delivery-removed.service';
import { DeliveryService } from '@/services/delivery.service';
import { ApiResponse, AuthRequest } from '@/types';
import Logger from '@/utils/logger';
import { Response } from 'express';

export class DeliveryController {
  private deliveryService: DeliveryService;
  private removedDeliveryService: RemovedDeliveryService;

  constructor() {
    this.deliveryService = new DeliveryService();
    this.removedDeliveryService = new RemovedDeliveryService();
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
   *                 enum: [paid, debt]
   *                 default: paid
   *                 example: "paid"
   *               isFree:
   *                 type: boolean
   *                 default: false
   *                 description: Whether delivery is free (totalCost will be 0)
   *                 example: false
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
   *                 paymentType: "paid"
   *                 isFree: false
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
   *                 paymentType: "paid"
   *                 isFree: true
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
   *                     code: "0907250001"
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
   *                     isFree: false
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
   *                 enum: [paid, debt]
   *                 description: Payment type
   *               isFree:
   *                 type: boolean
   *                 description: Whether delivery is free
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

      const delivery = await this.deliveryService.updateDelivery(id, data, req.user.userId);

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

  /**
   * @swagger
   * /api/delivery/by-fullcode/{fullCode}:
   *   delete:
   *     summary: Delete delivery by fullCode with password verification
   *     tags: [Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: fullCode
   *         required: true
   *         schema:
   *           type: string
   *           pattern: '^[0-9]{10}[A-Z0-9]{2,10}$'
   *         description: The full code of the delivery (format YYMMDDNNNNXXYY)
   *         example: "2412170001T1T2"
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - password
   *               - reason
   *             properties:
   *               password:
   *                 type: string
   *                 minLength: 6
   *                 description: User's current password for verification
   *                 example: "password123"
   *               reason:
   *                 type: string
   *                 maxLength: 500
   *                 description: Reason for deleting the delivery
   *                 example: "Duplicate entry created by mistake"
   *     responses:
   *       200:
   *         description: Delivery deleted successfully
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
   *                   example: "Delivery deleted successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     deletedDelivery:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           example: "507f1f77bcf86cd799439020"
   *                         fullCode:
   *                           type: string
   *                           example: "2412170001T1T2"
   *                         deletedAt:
   *                           type: string
   *                           format: date-time
   *                           example: "2024-12-17T10:30:00.000Z"
   *                         reason:
   *                           type: string
   *                           example: "Duplicate entry created by mistake"
   *       400:
   *         description: Validation error or invalid data
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
   *               invalidPassword:
   *                 summary: Invalid password
   *                 value:
   *                   success: false
   *                   message: "Invalid password"
   *               invalidFullCode:
   *                 summary: Invalid fullCode format
   *                 value:
   *                   success: false
   *                   message: "Validation error: Invalid delivery identifier format"
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
   */
  deleteDeliveryByFullCode = async (req: AuthRequest, res: Response): Promise<void> => {
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
      const { password, reason } = req.body;

      const result = await this.removedDeliveryService.moveDeliveryToRemoved(
        fullCode,
        req.user.userId,
        password,
        reason
      );

      Logger.info('Delivery deleted by fullCode successfully', {
        fullCode,
        userId: req.user.userId,
        reason,
      });

      res.status(200).json(result);
    } catch (error) {
      Logger.error('Failed to delete delivery by fullCode', {
        error: error instanceof Error ? error.message : error,
        fullCode: req.params.fullCode,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to delete delivery';
      let statusCode = 400;

      if (error instanceof Error) {
        if (error.message === 'Delivery not found') {
          statusCode = 404;
        } else if (error.message === 'User not found' || error.message === 'Invalid password') {
          statusCode = 401;
        }
      }

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
   *                       example: "0907250001"
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
   *           example: "0907250001T4T1"
   *         description: Delivery identifier in format codeFromRouteToRoute (e.g., 0907250001T4T1)
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
   *           example: "0907250001T4T1"
   *         description: Delivery full code in format codeFromRouteToRoute (e.g., 0907250001T4T1)
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

  getDeliveryByFullCodeForTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Phiên đăng nhập đã hết hạn',
        });
        return;
      }

      const { fullCode } = req.params;

      const delivery = await this.deliveryService.getDeliveryByFullCodeForTransfer(
        fullCode,
        req.user.userId
      );

      if (!delivery) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy mã hàng hoặc mã hàng không thuộc trạm hiện tại',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Tìm thấy đơn hàng và đã điền thông tin vào form',
        data: { delivery },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể lấy thông tin mã hàng';

      res.status(400).json({
        success: false,
        message,
      });
    }
  };

  /**
   * @swagger
   * /api/delivery/frequent-customers/{senderIdentifier}:
   *   get:
   *     summary: Get all frequent customers for a sender
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
   *     responses:
   *       200:
   *         description: Frequent customers retrieved successfully
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
   *                   example: "Frequent customers retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     frequentCustomers:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           receiverName:
   *                             type: string
   *                             example: "Nguyễn Thị Mai"
   *                           receiverPhone:
   *                             type: string
   *                             example: "+84901234567"
   *                           toRoute:
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
   *                           deliveryCount:
   *                             type: number
   *                             example: 5
   *                             description: Number of deliveries to this customer
   *                     total:
   *                       type: number
   *                       example: 10
   *                       description: Total number of frequent customers
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
   *                   example: "Validation error"
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

      const frequentCustomers = await this.deliveryService.getFrequentCustomers(
        senderIdentifier,
        req.user.userId
      );

      Logger.info('Frequent customers retrieved successfully', {
        senderIdentifier,
        count: frequentCustomers.length,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Frequent customers retrieved successfully',
        data: { frequentCustomers, total: frequentCustomers.length },
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get frequent customers', {
        error: error instanceof Error ? error.message : error,
        senderIdentifier: req.params.senderIdentifier,
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
   *     summary: Get cost report for all deliveries within date range (max 30 days, Vietnam timezone)
   *     description: Returns all deliveries from user's selected route within the specified date range (Vietnam time UTC+7). No pagination - all matching records are returned. Date range cannot exceed 30 days. Dates are interpreted as Vietnam timezone and automatically converted to UTC for database queries.
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
   *         description: Start date in YYYY-MM-DD format (Vietnam timezone). Will query from 00:00:00 Vietnam time. Date range cannot exceed 30 days.
   *         example: "2024-01-01"
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: End date in YYYY-MM-DD format (Vietnam timezone). Will query until 23:59:59 Vietnam time. Cannot be in the future. Date range cannot exceed 30 days.
   *         example: "2024-01-31"
   *     responses:
   *       200:
   *         description: Cost report retrieved successfully with all deliveries in date range
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
   *                   example: "Cost report retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     deliveries:
   *                       type: array
   *                       description: Complete list of all deliveries with cost details (sorted by date descending)
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                           code:
   *                             type: string
   *                           sender:
   *                             type: object
   *                             properties:
   *                               name:
   *                                 type: string
   *                               phone:
   *                                 type: string
   *                           receiver:
   *                             type: object
   *                             properties:
   *                               name:
   *                                 type: string
   *                               phone:
   *                                 type: string
   *                           totalCost:
   *                             type: number
   *                           actualRevenue:
   *                             type: number
   *                           upItems:
   *                             type: string
   *                             nullable: true
   *                             description: Items loaded at origin (lên hàng)
   *                             example: "Hàng lên tại HCM"
   *                           downItems:
   *                             type: string
   *                             nullable: true
   *                             description: Items unloaded at destination (xuống hàng)
   *                             example: "Hàng xuống tại Hà Nội"
   *                     routeInfo:
   *                       type: object
   *                       description: Route information
   *                       properties:
   *                         route:
   *                           type: object
   *                           properties:
   *                             id:
   *                               type: string
   *                             code:
   *                               type: string
   *                             name:
   *                               type: string
   *       400:
   *         description: Validation error (date range > 30 days, invalid dates) or user has no selected route
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
   *                   example: "Date range cannot exceed 30 days"
   *       401:
   *         description: Unauthorized - missing or invalid authentication token
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
      const { startDate, endDate } = req.query as unknown as DeliveryCostReportQuery;

      // Call service to get cost report (no pagination - returns all records)
      const report = await this.deliveryService.getCostReport(req.user.userId, startDate, endDate);

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
      if (message.includes('selected route') || message.includes('Date range')) {
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

      Logger.info('Getting today delivery report', {
        userId: req.user.userId,
        path: req.path,
        originalUrl: req.originalUrl,
      });

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
   * Recovery delivery by fullCode
   * PUT /api/delivery/recovery
   * @swagger
   * /api/delivery/recovery:
   *   put:
   *     summary: Recovery delivery by fullCode
   *     description: Khôi phục đơn hàng trả về (isReturn = true) về trạng thái bình thường. Nếu đơn hàng có money delivery với status DONE thì không cho recovery. Nếu money delivery có status WAITING thì xóa money delivery đó.
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
   *               - fullCode
   *               - note
   *             properties:
   *               fullCode:
   *                 type: string
   *                 description: Full code of the delivery (e.g., 0907250001T4T1)
   *                 example: "0907250001T4T1"
   *               note:
   *                 type: string
   *                 description: Ghi chú khôi phục (sẽ được append vào notes cũ)
   *                 minLength: 1
   *                 maxLength: 500
   *                 example: "Khôi phục: mã đơn hàng 0907250001T4T1 bởi Nguyen Van A"
   *           examples:
   *             recovery:
   *               summary: Recovery delivery
   *               value:
   *                 fullCode: "0907250001T4T1"
   *                 note: "Khôi phục: mã đơn hàng 0907250001T4T1 bởi Nguyen Van A"
   *     responses:
   *       200:
   *         description: Delivery recovered successfully
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
   *                   example: "Delivery recovered successfully"
   *       400:
   *         description: Validation error or cannot recover
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
   *               invalidFullCode:
   *                 summary: Invalid fullCode format
   *                 value:
   *                   success: false
   *                   message: "Validation error: Delivery fullCode must match pattern"
   *               cannotRecover:
   *                 summary: Cannot recover because money delivery is DONE
   *                 value:
   *                   success: false
   *                   message: "Cannot recover delivery 0907250001T4T1 because associated money delivery has status DONE"
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
   *             examples:
   *               notFound:
   *                 summary: Delivery not found
   *                 value:
   *                   success: false
   *                   message: "Delivery not found with fullCode: 0907250001T4T1 and isReturn: true"
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
   *                   example: "Failed to recover delivery by fullCode"
   */
  recoveryDeliveryByFullCode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { fullCode, note } = req.body;

      //await this.deliveryService.recoveryDeliveryByFullCode(fullCode, note);
      await this.deliveryService.recoveryDeliveryByFullCode(fullCode, note, req.user.userId);

      Logger.info(`Delivery recovered: ${fullCode}`, {
        userId: req.user.userId,
        fullCode,
        note,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Delivery recovered successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to recover delivery by fullCode', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        fullCode: req.body?.fullCode,
      });

      let statusCode = 500;
      const message =
        error instanceof Error ? error.message : 'Failed to recover delivery by fullCode';

      if (message.includes('not found')) {
        statusCode = 404;
      } else if (
        message.includes('Validation error') ||
        message.includes('required') ||
        message.includes('Cannot recover')
      ) {
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
   * /api/delivery/inventory:
   *   get:
   *     summary: Get list delivery inventory with various filter conditions
   *     tags: [Delivery]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: inventoryType
   *         required: true
   *         schema:
   *           type: string
   *           enum: [fromRoute, toRoute]
   *         description: Filter by inventory type - 'fromRoute' to filter by user's selected route for fromRoute, 'toRoute' to filter by user's selected route for toRoute
   *         example: toRoute
   *         examples:
   *           fromRoute:
   *             value: fromRoute
   *             summary: Filter by fromRoute
   *           toRoute:
   *             value: toRoute
   *             summary: Filter by toRoute
   *       - in: query
   *         name: collectCost
   *         schema:
   *           type: boolean
   *         description: If true, filter by collectCost > 0
   *         example: true
   *       - in: query
   *         name: homeDeliveryCost
   *         schema:
   *           type: boolean
   *         description: If true, filter by homeDeliveryCost > 0
   *         example: true
   *       - in: query
   *         name: collectForCustomer
   *         schema:
   *           type: boolean
   *         description: If true, filter by collectForCustomer > 0
   *         example: true
   *       - in: query
   *         name: paymentType
   *         schema:
   *           type: boolean
   *         description: If true, filter by paymentType == 'debt'
   *         example: true
   *       - in: query
   *         name: itemValue
   *         schema:
   *           type: boolean
   *         description: If true, filter by itemValue > 0
   *         example: true
   *       - in: query
   *         name: time
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 15
   *         description: Number of days to look back (default 15). Finds orders older than X days based on createdAt
   *         example: 15
   *     responses:
   *       200:
   *         description: Delivery inventory list retrieved successfully
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
   *                   example: "Delivery inventory list retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     deliveries:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/ReturnDeliveryResponse'
   *                     total:
   *                       type: number
   *                       example: 10
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  getListDeliveryInventory = async (req: AuthRequest, res: Response): Promise<void> => {
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
      const query = req.query as unknown as GetListDeliveryInventoryQuery;

      // Call service to get delivery inventory list
      const deliveries = await this.deliveryService.getListDeliveryInventory(
        req.user.userId,
        query
      );

      const response: ApiResponse = {
        success: true,
        message: 'Delivery inventory list retrieved successfully',
        data: { deliveries, total: deliveries.length },
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get delivery inventory list', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        query: req.query,
      });

      const message =
        error instanceof Error ? error.message : 'Failed to get delivery inventory list';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/delivery/inventory/home-delivery:
   *   get:
   *     summary: Get list delivery inventory about home delivery with summary calculations
   *     description: Returns list of deliveries with homeDeliveryCost > 0 filtered by user's selected route (toRoute) and calculates summary totals by payment type
   *     tags: [Delivery]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Delivery inventory about home delivery list retrieved successfully
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
   *                   example: "Delivery inventory about home delivery list retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     data:
   *                       type: array
   *                       description: List of delivery items with homeDeliveryCost > 0
   *                       items:
   *                         $ref: '#/components/schemas/ReturnDeliveryResponse'
   *                     sum:
   *                       type: object
   *                       description: Summary calculations grouped by payment type
   *                       properties:
   *                         totalAllCostWithPaymentTypePaid:
   *                           type: number
   *                           description: Tổng cước phí (đã thu) - bao gồm cost + itemCost + collectForCustomerCost
   *                           example: 1000000
   *                         totalHomeDeliveryCostWithPaymentTypePaid:
   *                           type: number
   *                           description: Tổng phí giao tận nhà (đã thu)
   *                           example: 500000
   *                         totalAllCostWithPaymentTypeDebt:
   *                           type: number
   *                           description: Tổng cước phí (nợ) - bao gồm cost + itemCost + collectForCustomerCost
   *                           example: 500000
   *                         totalHomeDeliveryCostWithPaymentTypeDebt:
   *                           type: number
   *                           description: Tổng phí giao tận nhà (nợ)
   *                           example: 250000
   *                         totalCost:
   *                           type: number
   *                           description: Tổng cước phí (tổng của đã thu + nợ)
   *                           example: 1500000
   *                         totalHomeDeliveryCost:
   *                           type: number
   *                           description: Tổng phí giao tận nhà (tổng của đã thu + nợ)
   *                           example: 750000
   *                         totalCollectForCustomer:
   *                           type: number
   *                           description: Tổng thu dùm
   *                           example: 2000000
   *                         totalCollectCost:
   *                           type: number
   *                           description: Tổng thu hộ
   *                           example: 3000000
   *                         totalActualCost:
   *                           type: number
   *                           description: Tổng thực thu (totalAllCostWithPaymentTypeDebt + totalHomeDeliveryCostWithPaymentTypeDebt + totalCollectCost + totalCollectForCustomer)
   *                           example: 6500000
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  getListDeliveryInventoryAboutHomeDelivery = async (
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

      // Call service to get delivery inventory about home delivery list
      const result = await this.deliveryService.getListDeliveryInventoryAboutHomeDelivery(
        req.user.userId
      );

      const response: ApiResponse = {
        success: true,
        message: 'Delivery inventory about home delivery list retrieved successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get delivery inventory about home delivery list', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        query: req.query,
      });

      const message =
        error instanceof Error
          ? error.message
          : 'Failed to get delivery inventory about home delivery list';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };
}
