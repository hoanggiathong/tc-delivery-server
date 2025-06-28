import request from 'supertest';
import app from '../../src/app';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../src/types/user.type';
import { mockDeliveryService } from '../mocks/delivery.service';
import { createMockDelivery, createMockCustomer } from '../helpers/test-helpers';

// Mock DeliveryService
jest.mock('../../src/services/delivery.service', () => require('../mocks/delivery.service'));

describe('Delivery Endpoints', () => {
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

  describe('POST /api/delivery', () => {
    const validDeliveryData = {
      senderName: 'John Sender',
      senderPhone: '+1234567890',
      receiverName: 'Jane Receiver',
      receiverPhone: '+1987654321',
      route: 'Hanoi - HCMC',
      name: 'Electronics Package',
      cost: 50000,
      homeDelivery: '123 Main Street, District 1',
      homeDeliveryCost: 10000,
      itemValue: 1000000,
      itemCost: 30000,
      collectCost: 15000,
      collectForCustomer: true,
      collectForCustomerCost: 20000,
      collectForCustomerNote: 'Handle with care'
    };

    it('should create a new delivery when authenticated as admin', async () => {
      const mockDelivery = createMockDelivery();

      mockDeliveryService.createDelivery.mockResolvedValue(mockDelivery);

      const response = await request(app)
        .post('/api/delivery')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validDeliveryData)
        .expect(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Delivery created successfully');
      expect(response.body.data.delivery).toEqual(mockDelivery);
      expect(mockDeliveryService.createDelivery).toHaveBeenCalledWith(validDeliveryData, 'admin123');
    });

    it('should create a new delivery when authenticated as regular user', async () => {
      const mockDelivery = createMockDelivery({
        createdByUser: 'testuser'
      });

      mockDeliveryService.createDelivery.mockResolvedValue(mockDelivery);

      const response = await request(app)
        .post('/api/delivery')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validDeliveryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Delivery created successfully');
      expect(mockDeliveryService.createDelivery).toHaveBeenCalledWith(validDeliveryData, 'user123');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/delivery')
        .send(validDeliveryData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
      expect(mockDeliveryService.createDelivery).not.toHaveBeenCalled();
    });

    it('should return 400 with validation errors for invalid data', async () => {
      const invalidData = {
        senderName: '', // Empty sender name
        senderPhone: 'invalid-phone',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/delivery')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(mockDeliveryService.createDelivery).not.toHaveBeenCalled();
    });

    it('should return 400 for service errors', async () => {
      mockDeliveryService.createDelivery.mockRejectedValue(
        new Error('Failed to create delivery')
      );

      const response = await request(app)
        .post('/api/delivery')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validDeliveryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to create delivery');
    });
  });

  describe('PUT /api/delivery/:id', () => {
    const deliveryId = '507f1f77bcf86cd799439012';
    const updateData = {
      senderName: 'Updated Sender',
      senderPhone: '+1111111111',
      route: 'Updated Route',
      cost: 75000
    };

    it('should update delivery successfully', async () => {
      const mockUpdatedDelivery = createMockDelivery({
        id: deliveryId,
        sender: createMockCustomer({ name: 'Updated Sender', phone: '+1111111111' }),
        route: 'Updated Route',
        cost: 75000
      });

      mockDeliveryService.updateDelivery.mockResolvedValue(mockUpdatedDelivery);

      const response = await request(app)
        .put(`/api/delivery/${deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Delivery updated successfully');
      expect(response.body.data.delivery).toEqual(mockUpdatedDelivery);
      expect(mockDeliveryService.updateDelivery).toHaveBeenCalledWith(deliveryId, updateData);
    });

    it('should return 404 when delivery not found', async () => {
      mockDeliveryService.updateDelivery.mockRejectedValue(
        new Error('Delivery not found')
      );

      const response = await request(app)
        .put(`/api/delivery/${deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Delivery not found');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put(`/api/delivery/${deliveryId}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
    });
  });

  describe('GET /api/delivery/:id', () => {
    const deliveryId = '507f1f77bcf86cd799439012';

    it('should get delivery by ID successfully', async () => {
      const mockDelivery = createMockDelivery({ id: deliveryId });

      mockDeliveryService.getDeliveryById.mockResolvedValue(mockDelivery);

      const response = await request(app)
        .get(`/api/delivery/${deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Delivery retrieved successfully');
      expect(response.body.data.delivery).toEqual(mockDelivery);
      expect(mockDeliveryService.getDeliveryById).toHaveBeenCalledWith(deliveryId);
    });

    it('should return 404 when delivery not found', async () => {
      mockDeliveryService.getDeliveryById.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/delivery/${deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Delivery not found');
    });

    it('should return 500 when service throws error', async () => {
      mockDeliveryService.getDeliveryById.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get(`/api/delivery/${deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database error');
    });
  });

  describe('GET /api/delivery', () => {
    it('should get all deliveries successfully', async () => {
      const mockDeliveries = [
        createMockDelivery({
          id: 'delivery1',
          name: 'Package 1',
          sender: createMockCustomer({ id: 'sender1', name: 'John Sender' }),
          receiver: createMockCustomer({ id: 'receiver1', name: 'Jane Receiver' })
        })
      ];

      mockDeliveryService.getAllDeliveries.mockResolvedValue(mockDeliveries);

      const response = await request(app)
        .get('/api/delivery')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Deliveries retrieved successfully');
      expect(response.body.data.deliveries).toEqual(mockDeliveries);
      expect(response.body.data.total).toBe(1);
      expect(mockDeliveryService.getAllDeliveries).toHaveBeenCalled();
    });

    it('should return empty array when no deliveries exist', async () => {
      mockDeliveryService.getAllDeliveries.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/delivery')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deliveries).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('should return 500 when service throws error', async () => {
      mockDeliveryService.getAllDeliveries.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/delivery')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database connection failed');
    });
  });
});