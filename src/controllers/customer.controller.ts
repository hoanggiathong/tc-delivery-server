import { Request, Response } from 'express';
import { CustomerService } from '@/services/customer.service';
import { UserService } from '@/services/user.service';
import {
  CreateCustomerRequest,
  UpdateCustomerRequest,
  UploadImageRequest,
  UpdateCustomerBankRequest,
} from '@/schemas/customer.schema';
import { ApiResponse, AuthRequest, AuthRequestWithFileUploads } from '@/types';

export class CustomerController {
  private customerService: CustomerService;
  private userService: UserService;

  constructor() {
    this.customerService = new CustomerService();
    this.userService = new UserService();
  }

  /**
   * @swagger
   * /api/customer:
   *   post:
   *     summary: Create a new customer
   *     tags: [Customer]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - phone
   *             properties:
   *               name:
   *                 type: string
   *                 maxLength: 100
   *                 example: "Phạm Văn Đức"
   *               phone:
   *                 type: string
   *                 pattern: ^\+?[1-9]\d{1,14}$
   *                 example: "+84912345678"
   *           examples:
   *             newCustomer:
   *               summary: Create new customer
   *               value:
   *                 name: "Phạm Văn Đức"
   *                 phone: "+84912345678"
   *     responses:
   *       201:
   *         description: Customer created successfully
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
   *                   example: "Customer created successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     customer:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         name:
   *                           type: string
   *                         phone:
   *                           type: string
   *                         createdAt:
   *                           type: string
   *                         updatedAt:
   *                           type: string
   *             examples:
   *               created:
   *                 summary: Customer created
   *                 value:
   *                   success: true
   *                   message: "Customer created successfully"
   *                   data:
   *                     customer:
   *                       id: "507f1f77bcf86cd799439030"
   *                       name: "Phạm Văn Đức"
   *                       phone: "+84912345678"
   *                       createdAt: "2024-12-17T10:00:00.000Z"
   *                       updatedAt: "2024-12-17T10:00:00.000Z"
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
   *               invalidPhone:
   *                 summary: Invalid phone format
   *                 value:
   *                   success: false
   *                   message: "Validation error: Invalid phone number format"
   *               missingName:
   *                 summary: Missing required field
   *                 value:
   *                   success: false
   *                   message: "Validation error: Name is required"
   *       409:
   *         description: Customer with this name and phone already exists
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
   *                   example: "Customer with this name and phone already exists"
   *       403:
   *         description: Insufficient permissions
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
   *                   example: "Insufficient permissions"
   */
  createCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: CreateCustomerRequest = req.body;
      const customer = await this.customerService.createCustomer(data);

      const response: ApiResponse = {
        success: true,
        message: 'Customer created successfully',
        data: { customer },
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create customer error:', error);

      const message = error instanceof Error ? error.message : 'Failed to create customer';
      const statusCode = message.includes('already exists') ? 409 : 400;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/customer/{id}:
   *   put:
   *     summary: Update customer by ID
   *     tags: [Customer]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         example: "507f1f77bcf86cd799439030"
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 maxLength: 100
   *               phone:
   *                 type: string
   *                 pattern: ^\+?[1-9]\d{1,14}$
   *     responses:
   *       200:
   *         description: Customer updated successfully
   *       400:
   *         description: Validation error
   *       404:
   *         description: Customer not found
   *       409:
   *         description: Customer with this name and phone already exists
   *       403:
   *         description: Insufficient permissions
   */
  updateCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const data: UpdateCustomerRequest = req.body;

      const customer = await this.customerService.updateCustomer(id, data);

      const response: ApiResponse = {
        success: true,
        message: 'Customer updated successfully',
        data: { customer },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Update customer error:', error);

      const message = error instanceof Error ? error.message : 'Failed to update customer';
      let statusCode = 400;

      if (message === 'Customer not found') {
        statusCode = 404;
      } else if (message.includes('already exists')) {
        statusCode = 409;
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
   * /api/customer/{id}:
   *   get:
   *     summary: Get customer by ID
   *     tags: [Customer]
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
   *         description: Customer retrieved successfully
   *       404:
   *         description: Customer not found
   *       403:
   *         description: Insufficient permissions
   */
  getCustomerById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const customer = await this.customerService.getCustomerById(id);

      if (!customer) {
        const response: ApiResponse = {
          success: false,
          message: 'Customer not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Customer retrieved successfully',
        data: { customer },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get customer error:', error);

      const message = error instanceof Error ? error.message : 'Failed to get customer';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/customer/by-phone/{senderPhone}:
   *   get:
   *     summary: Get customer by sender phone with bank info
   *     tags: [Customer]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: senderPhone
   *         required: true
   *         schema:
   *           type: string
   *           pattern: ^\+?[1-9]\d{1,14}$
   *         example: "%2B84912345678"
   *         description: Customer phone number (URL encoded, + becomes %2B)
   *     responses:
   *       200:
   *         description: Customer retrieved successfully with bank info
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
   *                   example: "Customer retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     customer:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         name:
   *                           type: string
   *                         phone:
   *                           type: string
   *                         bankId:
   *                           type: object
   *                           properties:
   *                             id:
   *                               type: string
   *                             name:
   *                               type: string
   *                             bankName:
   *                               type: string
   *                             bankAccount:
   *                               type: string
   *                             bankBranch:
   *                               type: string
   *                             bankAddress:
   *                               type: string
   *                             qrCodeUrl:
   *                               type: string
   *                         images:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               url:
   *                                 type: string
   *                               rotate:
   *                                 type: number
   *                         createdAt:
   *                           type: string
   *                         updatedAt:
   *                           type: string
   *             examples:
   *               withBankInfo:
   *                 summary: Customer with bank info
   *                 value:
   *                   success: true
   *                   message: "Customer retrieved successfully"
   *                   data:
   *                     customer:
   *                       id: "507f1f77bcf86cd799439030"
   *                       name: "Nguyễn Văn A"
   *                       phone: "+84912345678"
   *                       bankId:
   *                         id: "507f1f77bcf86cd799439031"
   *                         name: "Nguyễn Văn A"
   *                         bankName: "Vietcombank"
   *                         bankAccount: "0071000123456"
   *                         bankBranch: "Chi nhánh Tân Bình"
   *                         bankAddress: "285 Cách Mạng Tháng 8"
   *                         qrCodeUrl: "/uploads/customers/507f1f77bcf86cd799439030/bank-qrcode.png?v=123456"
   *                       images: []
   *                       createdAt: "2024-12-17T10:00:00.000Z"
   *                       updatedAt: "2024-12-17T10:00:00.000Z"
   *               withoutBankInfo:
   *                 summary: Customer without bank info
   *                 value:
   *                   success: true
   *                   message: "Customer retrieved successfully"
   *                   data:
   *                     customer:
   *                       id: "507f1f77bcf86cd799439030"
   *                       name: "Phạm Văn Đức"
   *                       phone: "+84912345678"
   *                       bankId: null
   *                       images: []
   *                       createdAt: "2024-12-17T10:00:00.000Z"
   *                       updatedAt: "2024-12-17T10:00:00.000Z"
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
   *               invalidPhone:
   *                 summary: Invalid phone format
   *                 value:
   *                   success: false
   *                   message: "Validation error: Please enter a valid phone number"
   *               missingSenderPhone:
   *                 summary: Missing senderPhone parameter
   *                 value:
   *                   success: false
   *                   message: "Validation error: Sender phone is required"
   *       404:
   *         description: Customer not found
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
   *                   example: "Customer not found"
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
  getCustomerBySenderPhone = async (req: Request, res: Response): Promise<void> => {
    try {
      const { senderPhone } = req.params;

      const customer = await this.customerService.getCustomerBySenderPhone(senderPhone);

      if (!customer) {
        const response: ApiResponse = {
          success: false,
          message: 'Customer not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Customer retrieved successfully',
        data: { customer },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get customer by sender phone error:', error);

      const message = error instanceof Error ? error.message : 'Failed to get customer';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * Upload image with auto-create customer
   */
  uploadImage = async (req: AuthRequestWithFileUploads, res: Response): Promise<void> => {
    try {
      const { name, phone, routeId, imageIndex, rotate } = req.body as UploadImageRequest;
      const file = req.file;
      const userId = req.user?.userId;

      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No image file provided',
        });
        return;
      }

      const customer = await this.customerService.findOrCreateAndUploadImage(
        phone,
        name,
        routeId,
        imageIndex,
        file.buffer,
        file.originalname,
        rotate || 0,
        userId
      );

      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        data: { customer },
      });
    } catch (error) {
      console.error('Upload image error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload image',
      });
    }
  };

  /**
   * Upload image by customer ID (existing customer only)
   */
  uploadImageById = async (req: AuthRequestWithFileUploads, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { imageIndex, rotate } = req.body;
      const file = req.file;
      const userId = req.user?.userId;

      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No image file provided',
        });
        return;
      }

      const customer = await this.customerService.uploadImageById(
        id,
        imageIndex,
        file.buffer,
        file.originalname,
        rotate || 0,
        userId
      );

      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        data: { customer },
      });
    } catch (error) {
      console.error('Upload image error:', error);
      const statusCode =
        error instanceof Error && error.message === 'Customer not found' ? 404 : 400;

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload image',
      });
    }
  };

  /**
   * Update image rotation
   */
  updateImageRotation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id, index } = req.params;
      const { rotate } = req.body;
      const userId = req.user?.userId;

      const customer = await this.customerService.updateImageRotation(
        id,
        parseInt(index),
        rotate,
        userId
      );

      res.status(200).json({
        success: true,
        message: 'Image rotation updated successfully',
        data: { customer },
      });
    } catch (error) {
      console.error('Update rotation error:', error);
      const statusCode =
        error instanceof Error && error.message === 'Customer not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update rotation',
      });
    }
  };

  /**
   * Delete customer image
   */
  deleteImage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id, index } = req.params;

      const customer = await this.customerService.deleteCustomerImage(id, parseInt(index));

      res.status(200).json({
        success: true,
        message: 'Image deleted successfully',
        data: { customer },
      });
    } catch (error) {
      console.error('Delete image error:', error);
      const statusCode =
        error instanceof Error && error.message === 'Customer not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete image',
      });
    }
  };

  /**
   * Update customer bank info and/or upload image(s)
   */
  updateBankInfo = async (req: AuthRequestWithFileUploads, res: Response): Promise<void> => {
    try {
      const { phone, name, bankInfo, images } = req.body as UpdateCustomerBankRequest;
      const filesObject = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // Get user's selected route
      const routeId = await this.userService.getUserSelectedRouteId(userId);

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

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const customer = await this.customerService.updateCustomerBankInfo(
        phone,
        routeId,
        userId,
        name,
        bankInfo,
        imagesData.length > 0 ? imagesData : undefined
      );

      res.status(200).json({
        success: true,
        message: 'Bank info updated successfully',
        data: { customer },
      });
    } catch (error) {
      console.error('Update bank info error:', error);

      let statusCode = 400;
      const message = error instanceof Error ? error.message : 'Failed to update bank info';

      // Handle specific error cases
      if (message === 'Name is required when creating new customer') {
        statusCode = 400;
      } else if (message === 'User must have a selected route') {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message,
      });
    }
  };

  /**
   * Delete customer images and bank info
   */
  deleteImagesAndBankInfo = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;

      const id = req.params.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      await this.customerService.deleteImagesAndBankInfo(userId, id);

      res.status(200).json({
        success: true,
        message: 'Image deleted successfully',
      });
    } catch (error) {
      console.error('Delete images and bank info error:', error);
      const statusCode =
        error instanceof Error && error.message === 'Customer not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete images and bank info',
      });
    }
  };

  getListCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const customers = await this.customerService.getListCustomer(userId);

      res.status(200).json({
        success: true,
        message: 'List customer retrieved successfully',
        data: customers,
      });
    } catch (error) {
      console.error('Get list customer error:', error);
      const statusCode =
        error instanceof Error && error.message === 'Customer not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get list customer',
      });
    }
  };
}
