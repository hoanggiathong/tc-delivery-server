import request from 'supertest';
import app from '../../src/app';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../src/types/user.type';
import { mockCustomerService } from '../mocks/customer.service';
import { createMockCustomer } from '../helpers/test-helpers';

// Mock CustomerService
jest.mock('../../src/services/customer.service', () => require('../mocks/customer.service'));

describe('Customer Endpoints', () => {
  let adminToken: string;
  let userToken: string;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Generate test tokens
    adminToken = jwt.sign(
      { userId: 'admin123', username: 'admin', role: UserRole.ADMIN },
      process.env.JWT_SECRET || 'test-secret'
    );

    userToken = jwt.sign(
      { userId: 'user123', username: 'testuser', role: UserRole.USER },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  describe('POST /api/customer', () => {
    const validCustomerData = {
      name: 'John Doe',
      phone: '+1234567890'
    };

    it('should create a new customer when authenticated as admin', async () => {
      const mockCustomer = createMockCustomer();

      mockCustomerService.createCustomer.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .post('/api/customer')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validCustomerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Customer created successfully');
      expect(response.body.data.customer).toEqual(mockCustomer);
    });

    it('should return 409 when customer already exists', async () => {
      mockCustomerService.createCustomer.mockRejectedValue(
        new Error('Customer with this name and phone already exists')
      );

      const response = await request(app)
        .post('/api/customer')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validCustomerData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Customer with this name and phone already exists');
    });

    it('should return 400 for other service errors', async () => {
      mockCustomerService.createCustomer.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/customer')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validCustomerData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database connection failed');
    });

    it('should return 403 when authenticated as regular user', async () => {
      const response = await request(app)
        .post('/api/customer')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validCustomerData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Insufficient permissions');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/customer')
        .send(validCustomerData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
    });

    it('should return 400 with validation errors for invalid data', async () => {
      const invalidData = {
        name: '', // Empty name
        phone: 'invalid-phone'
      };

      const response = await request(app)
        .post('/api/customer')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('PUT /api/customer/:id', () => {
    const customerId = '507f1f77bcf86cd799439011';
    const updateData = {
      name: 'Jane Doe',
      phone: '+1987654321'
    };

    it('should update customer successfully', async () => {
      const mockUpdatedCustomer = {
        id: customerId,
        name: 'Jane Doe',
        phone: '+1987654321',
        createdAt: '2025-06-27T07:51:17.342Z',
        updatedAt: '2025-06-27T07:51:17.342Z'
      };

      mockCustomerService.updateCustomer.mockResolvedValue(mockUpdatedCustomer);

      const response = await request(app)
        .put(`/api/customer/${customerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Customer updated successfully');
      expect(response.body.data.customer).toEqual(mockUpdatedCustomer);
    });

    it('should return 404 when customer not found', async () => {
      mockCustomerService.updateCustomer.mockRejectedValue(
        new Error('Customer not found')
      );

      const response = await request(app)
        .put(`/api/customer/${customerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Customer not found');
    });

    it('should return 409 when update creates duplicate', async () => {
      mockCustomerService.updateCustomer.mockRejectedValue(
        new Error('Customer with this name and phone already exists')
      );

      const response = await request(app)
        .put(`/api/customer/${customerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Customer with this name and phone already exists');
    });
  });

  describe('GET /api/customer/:id', () => {
    const customerId = '507f1f77bcf86cd799439011';

    it('should get customer by ID successfully', async () => {
      const mockCustomer = {
        id: customerId,
        name: 'John Doe',
        phone: '+1234567890',
        createdAt: '2025-06-27T07:51:17.342Z',
        updatedAt: '2025-06-27T07:51:17.342Z'
      };

      mockCustomerService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .get(`/api/customer/${customerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Customer retrieved successfully');
      expect(response.body.data.customer).toEqual(mockCustomer);
    });

    it('should return 404 when customer not found', async () => {
      mockCustomerService.getCustomerById.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/customer/${customerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Customer not found');
    });

    it('should return 500 when service throws error', async () => {
      mockCustomerService.getCustomerById.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get(`/api/customer/${customerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database error');
    });
  });

  describe('GET /api/customer', () => {
    it('should get all customers successfully', async () => {
      const mockCustomers = [
        createMockCustomer({ id: 'customer1' })
      ];

      mockCustomerService.getAllCustomers.mockResolvedValue(mockCustomers);

      const response = await request(app)
        .get('/api/customer')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Customers retrieved successfully');
      expect(response.body.data.customers).toEqual(mockCustomers);
      expect(response.body.data.total).toBe(1);
    });

    it('should return empty array when no customers exist', async () => {
      mockCustomerService.getAllCustomers.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/customer')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.customers).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('should return 500 when service throws error', async () => {
      mockCustomerService.getAllCustomers.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/customer')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database connection failed');
    });
  });
});