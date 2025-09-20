import { Request, Response } from 'express';
import { CustomerService } from '@/services/customer.service';
import {
  CreateCustomerRequest,
  UpdateCustomerRequest,
  UploadImageRequest,
} from '@/schemas/customer.schema';
import { ApiResponse } from '@/types';

export class CustomerController {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
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
  updateCustomer = async (req: Request, res: Response): Promise<void> => {
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
  getCustomerById = async (req: Request, res: Response): Promise<void> => {
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
   * Upload image with auto-create customer
   */
  uploadImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, phone, routeId, type, imageIndex, rotate } = req.body as UploadImageRequest;
      const file = req.file;

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
        type || 'delivery',
        imageIndex,
        file.buffer,
        file.originalname,
        rotate || 0
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
  uploadImageById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { imageIndex, rotate } = req.body;
      const file = req.file;

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
        rotate || 0
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
  updateImageRotation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, index } = req.params;
      const { rotate } = req.body;

      const customer = await this.customerService.updateImageRotation(id, parseInt(index), rotate);

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
  deleteImage = async (req: Request, res: Response): Promise<void> => {
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
}
