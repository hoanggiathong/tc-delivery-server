import { Request, Response } from 'express';
import { CustomerService } from '@/services/customer.service';
import { CreateCustomerRequest, UpdateCustomerRequest } from '@/schemas/customer.schema';
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
   *               phone:
   *                 type: string
   *                 pattern: ^\+?[1-9]\d{1,14}$
   *     responses:
   *       201:
   *         description: Customer created successfully
   *       400:
   *         description: Validation error
   *       409:
   *         description: Customer with this name and phone already exists
   *       403:
   *         description: Insufficient permissions
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
   * @swagger
   * /api/customer:
   *   get:
   *     summary: Get all customers
   *     tags: [Customer]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Customers retrieved successfully
   *       403:
   *         description: Insufficient permissions
   */
  getAllCustomers = async (req: Request, res: Response): Promise<void> => {
    try {
      const customers = await this.customerService.getAllCustomers();

      const customersArray = customers || [];

      const response: ApiResponse = {
        success: true,
        message: 'Customers retrieved successfully',
        data: { customers: customersArray, total: customersArray.length },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get all customers error:', error);

      const message = error instanceof Error ? error.message : 'Failed to get customers';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };
}
