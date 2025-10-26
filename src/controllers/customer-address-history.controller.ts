import { Request, Response } from 'express';
import { CustomerAddressHistoryService } from '@/services/customer-address-history.service';
import { ApiResponse } from '@/types';
import { IAddressHistoryCreateRequest } from '@/types/customer-address-history.type';

export class CustomerAddressHistoryController {
  private customerAddressHistoryService: CustomerAddressHistoryService;

  constructor() {
    this.customerAddressHistoryService = new CustomerAddressHistoryService();
  }

  /**
   * @swagger
   * /api/customer-address-history/{phone}:
   *   get:
   *     summary: Get all address history for a customer by phone
   *     tags: [Customer Address History]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: phone
   *         required: true
   *         schema:
   *           type: string
   *           pattern: ^\+?[1-9]\d{1,14}$
   *         description: Customer phone number (international format)
   *         example: "+84901234567"
   *     responses:
   *       200:
   *         description: Address history retrieved successfully
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
   *                   example: "Address history retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     addressHistory:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                           customerId:
   *                             type: string
   *                           address:
   *                             type: string
   *                           homeDeliveryCost:
   *                             type: number
   *                           carryCost:
   *                             type: number
   *                           homeDeliveryTotalCost:
   *                             type: number
   *                           vehicleType:
   *                             type: string
   *                             enum: [motorbike, small-truck, large-truck]
   *                           createdAt:
   *                             type: string
   *                             format: date-time
   *                           updatedAt:
   *                             type: string
   *                             format: date-time
   *                     total:
   *                       type: number
   *             examples:
   *               withHistory:
   *                 summary: Customer with address history
   *                 value:
   *                   success: true
   *                   message: "Address history retrieved successfully"
   *                   data:
   *                     addressHistory:
   *                       - id: "60d5ec49f1b2c72b8c8e4a01"
   *                         customerId: "507f1f77bcf86cd799439011"
   *                         address: "123 Hoàng Văn Thụ, Phường 4, Quận Tân Bình, TP.HCM"
   *                         homeDeliveryCost: 30000
   *                         carryCost: 20000
   *                         homeDeliveryTotalCost: 50000
   *                         vehicleType: "motorbike"
   *                         createdAt: "2025-01-15T10:30:00.000Z"
   *                         updatedAt: "2025-01-15T10:30:00.000Z"
   *                     total: 1
   *               empty:
   *                 summary: Customer with no history
   *                 value:
   *                   success: true
   *                   message: "Address history retrieved successfully"
   *                   data:
   *                     addressHistory: []
   *                     total: 0
   *       400:
   *         description: Invalid customer ID format
   *       404:
   *         description: Customer not found
   *       401:
   *         description: Unauthorized
   */
  getAddressHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone } = req.params;

      const addressHistory = await this.customerAddressHistoryService.getAddressHistory(phone);

      const response: ApiResponse = {
        success: true,
        message: 'Address history retrieved successfully',
        data: {
          addressHistory,
          total: addressHistory.length,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get address history',
      };

      if (error instanceof Error && error.message === 'Customer not found') {
        res.status(404).json(response);
      } else {
        res.status(500).json(response);
      }
    }
  };

  /**
   * @swagger
   * /api/customer-address-history/{phone}:
   *   post:
   *     summary: Create new address history manually by phone
   *     tags: [Customer Address History]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: phone
   *         required: true
   *         schema:
   *           type: string
   *           pattern: ^\+?[1-9]\d{1,14}$
   *         description: Customer phone number (international format)
   *         example: "+84901234567"
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - address
   *             properties:
   *               address:
   *                 type: string
   *                 maxLength: 500
   *                 example: "123 Hoàng Văn Thụ, Phường 4, Quận Tân Bình, TP.HCM"
   *               homeDeliveryCost:
   *                 type: number
   *                 minimum: 0
   *                 default: 0
   *                 example: 30000
   *               carryCost:
   *                 type: number
   *                 minimum: 0
   *                 default: 0
   *                 example: 20000
   *               vehicleType:
   *                 type: string
   *                 enum: [motorbike, small-truck, large-truck]
   *                 default: motorbike
   *                 example: "motorbike"
   *     responses:
   *       201:
   *         description: Address history created successfully
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
   *                   example: "Address history created successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     customerId:
   *                       type: string
   *                     address:
   *                       type: string
   *                     homeDeliveryCost:
   *                       type: number
   *                     carryCost:
   *                       type: number
   *                     homeDeliveryTotalCost:
   *                       type: number
   *                     vehicleType:
   *                       type: string
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *                     updatedAt:
   *                       type: string
   *                       format: date-time
   *       400:
   *         description: Validation error
   *       404:
   *         description: Customer not found
   *       401:
   *         description: Unauthorized
   */
  createAddressHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone } = req.params;
      const data: IAddressHistoryCreateRequest = req.body;

      const addressHistory = await this.customerAddressHistoryService.createAddressHistory(
        phone,
        data
      );

      const response: ApiResponse = {
        success: true,
        message: 'Address history created successfully',
        data: addressHistory,
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create address history',
      };

      if (error instanceof Error && error.message === 'Customer not found') {
        res.status(404).json(response);
      } else if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json(response);
      } else {
        res.status(500).json(response);
      }
    }
  };

  /**
   * @swagger
   * /api/customer-address-history/{phone}/{addressHistoryId}:
   *   delete:
   *     summary: Delete address history by phone with ownership verification
   *     tags: [Customer Address History]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: phone
   *         required: true
   *         schema:
   *           type: string
   *           pattern: ^\+?[1-9]\d{1,14}$
   *         description: Customer phone number (international format)
   *         example: "+84901234567"
   *       - in: path
   *         name: addressHistoryId
   *         required: true
   *         schema:
   *           type: string
   *           pattern: ^[0-9a-fA-F]{24}$
   *         description: Address History ID
   *         example: "60d5ec49f1b2c72b8c8e4a01"
   *     responses:
   *       200:
   *         description: Address history deleted successfully
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
   *                   example: "Address history deleted successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     deletedId:
   *                       type: string
   *                       example: "60d5ec49f1b2c72b8c8e4a01"
   *       400:
   *         description: Invalid ID format
   *       403:
   *         description: Address history does not belong to customer
   *       404:
   *         description: Address history not found
   *       401:
   *         description: Unauthorized
   */
  deleteAddressHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone, addressHistoryId } = req.params;

      await this.customerAddressHistoryService.deleteAddressHistory(phone, addressHistoryId);

      const response: ApiResponse = {
        success: true,
        message: 'Address history deleted successfully',
        data: {
          deletedId: addressHistoryId,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete address history',
      };

      if (error instanceof Error && error.message === 'Address history not found') {
        res.status(404).json(response);
      } else if (
        error instanceof Error &&
        error.message.includes('does not belong to the specified customer')
      ) {
        res.status(403).json(response);
      } else if (error instanceof Error && error.message === 'Customer not found') {
        res.status(404).json(response);
      } else {
        res.status(500).json(response);
      }
    }
  };
}
