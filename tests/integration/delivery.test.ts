import request from 'supertest';
import app from '../../src/app';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../src/types/user.type';
import { mockDeliveryService } from '../utils';
import { createMockDelivery, createMockCustomer } from '../utils';

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
      fromRouteId: '507f1f77bcf86cd799439011',
      toRouteId: '507f1f77bcf86cd799439012',
      name: 'Electronics Package',
      cost: 50000,
      homeDelivery: '123 Main Street, District 1',
      homeDeliveryCost: 10000,
      itemValue: 1000000,
      itemCost: 30000,
      collectCost: 15000,
      collectForCustomer: 25000,
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
      fromRouteId: '507f1f77bcf86cd799439013',
      toRouteId: '507f1f77bcf86cd799439014',
      cost: 75000
    };

    it('should update delivery successfully', async () => {
      const mockUpdatedDelivery = createMockDelivery({
        id: deliveryId,
        sender: createMockCustomer({ name: 'Updated Sender', phone: '+1111111111' }),
        fromRoute: { id: '507f1f77bcf86cd799439013', code: 'T3', name: 'Can Tho', createdAt: '2025-06-27T07:51:17.342Z', updatedAt: '2025-06-27T07:51:17.342Z' },
        toRoute: { id: '507f1f77bcf86cd799439014', code: 'T4', name: 'An Giang', createdAt: '2025-06-27T07:51:17.342Z', updatedAt: '2025-06-27T07:51:17.342Z' },
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

  describe('GET /api/delivery/related/:senderName', () => {
    const senderName = 'John Sender';

    it('should get related deliveries by sender name successfully', async () => {
      const mockRelatedDeliveries = [
        createMockDelivery({
          id: 'delivery1',
          sender: createMockCustomer({ name: 'John Sender', phone: '+1234567890' }),
          receiver: createMockCustomer({ name: 'Alice Receiver', phone: '+1111111111' }),
          route: 'Hanoi - HCMC'
        }),
        createMockDelivery({
          id: 'delivery2',
          sender: createMockCustomer({ name: 'John Sender', phone: '+1234567890' }),
          receiver: createMockCustomer({ name: 'Bob Receiver', phone: '+2222222222' }),
          route: 'HCMC - Da Nang'
        }),
        createMockDelivery({
          id: 'delivery3',
          sender: createMockCustomer({ name: 'John Sender', phone: '+1234567890' }),
          receiver: createMockCustomer({ name: 'Alice Receiver', phone: '+1111111111' }),
          route: 'Hanoi - Da Nang'
        })
      ];

      mockDeliveryService.getRelatedDeliveriesBySender.mockResolvedValue(mockRelatedDeliveries);

      const response = await request(app)
        .get(`/api/delivery/related/${encodeURIComponent(senderName)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Related deliveries retrieved successfully');
      expect(response.body.data.senderName).toBe(senderName);
      expect(response.body.data.deliveries).toEqual(mockRelatedDeliveries);
      expect(response.body.data.count).toBe(3);
      expect(mockDeliveryService.getRelatedDeliveriesBySender).toHaveBeenCalledWith(senderName);
    });

    it('should return empty array when no related deliveries found', async () => {
      mockDeliveryService.getRelatedDeliveriesBySender.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/delivery/related/${encodeURIComponent(senderName)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deliveries).toEqual([]);
      expect(response.body.data.count).toBe(0);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`/api/delivery/related/${encodeURIComponent(senderName)}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
    });

    it('should return 500 when service throws error', async () => {
      mockDeliveryService.getRelatedDeliveriesBySender.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get(`/api/delivery/related/${encodeURIComponent(senderName)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database connection failed');
    });
  });

  describe('DELETE /api/delivery/:id', () => {
    const deliveryId = '507f1f77bcf86cd799439012';

    it('should delete delivery successfully', async () => {
      mockDeliveryService.deleteDelivery.mockResolvedValue(undefined);

      const response = await request(app)
        .delete(`/api/delivery/${deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Delivery deleted successfully');
      expect(mockDeliveryService.deleteDelivery).toHaveBeenCalledWith(deliveryId);
    });

    it('should return 404 when delivery not found', async () => {
      mockDeliveryService.deleteDelivery.mockRejectedValue(
        new Error('Delivery not found')
      );

      const response = await request(app)
        .delete(`/api/delivery/${deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Delivery not found');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .delete(`/api/delivery/${deliveryId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
    });
  });

  describe('POST /api/delivery/next-code', () => {
    const validRequestData = {
      toRouteId: '507f1f77bcf86cd799439012'
    };

    it('should get next delivery code successfully', async () => {
      const mockNextCodeResponse = {
        nextCode: '2501270001',
        toRoute: {
          id: '507f1f77bcf86cd799439012',
          code: 'T2',
          name: 'Long An',
          createdAt: '2025-01-27T00:00:00.000Z',
          updatedAt: '2025-01-27T00:00:00.000Z'
        }
      };

      mockDeliveryService.getNextCode.mockResolvedValue(mockNextCodeResponse);

      const response = await request(app)
        .post('/api/delivery/next-code')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validRequestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Next delivery code retrieved successfully');
      expect(response.body.data).toEqual(mockNextCodeResponse);
      expect(mockDeliveryService.getNextCode).toHaveBeenCalledWith('507f1f77bcf86cd799439012');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/delivery/next-code')
        .send(validRequestData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
      expect(mockDeliveryService.getNextCode).not.toHaveBeenCalled();
    });

    it('should return 400 with validation errors for invalid toRouteId', async () => {
      const invalidData = {
        toRouteId: 'invalid-id'
      };

      const response = await request(app)
        .post('/api/delivery/next-code')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(mockDeliveryService.getNextCode).not.toHaveBeenCalled();
    });

    it('should return 400 when to route not found', async () => {
      mockDeliveryService.getNextCode.mockRejectedValue(
        new Error('To route not found')
      );

      const response = await request(app)
        .post('/api/delivery/next-code')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validRequestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('To route not found');
    });

    it('should return 400 when maximum deliveries reached for the day', async () => {
      mockDeliveryService.getNextCode.mockRejectedValue(
        new Error('Maximum number of deliveries (9999) reached for date 250127')
      );

      const response = await request(app)
        .post('/api/delivery/next-code')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validRequestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Maximum number of deliveries (9999) reached for date 250127');
    });
  });

  describe('GET /api/delivery/code/:deliveryIdentifier', () => {
    const validDeliveryIdentifier = '2501270001T1T2';

    it('should get delivery by code successfully', async () => {
      const mockDelivery = createMockDelivery({
        id: 'delivery123',
        code: '2501270001',
        fromRoute: { id: '507f1f77bcf86cd799439011', code: 'T1', name: 'Ho Chi Minh', createdAt: '2025-01-27T00:00:00.000Z', updatedAt: '2025-01-27T00:00:00.000Z' },
        toRoute: { id: '507f1f77bcf86cd799439012', code: 'T2', name: 'Long An', createdAt: '2025-01-27T00:00:00.000Z', updatedAt: '2025-01-27T00:00:00.000Z' }
      });

      mockDeliveryService.getDeliveryByCode.mockResolvedValue(mockDelivery);

      const response = await request(app)
        .get(`/api/delivery/code/${validDeliveryIdentifier}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Delivery retrieved successfully');
      expect(response.body.data.delivery).toEqual(mockDelivery);
      expect(mockDeliveryService.getDeliveryByCode).toHaveBeenCalledWith(validDeliveryIdentifier);
    });

    it('should return 404 when delivery not found', async () => {
      mockDeliveryService.getDeliveryByCode.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/delivery/code/${validDeliveryIdentifier}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Delivery not found');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`/api/delivery/code/${validDeliveryIdentifier}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
      expect(mockDeliveryService.getDeliveryByCode).not.toHaveBeenCalled();
    });

    it('should return 400 with validation errors for invalid delivery identifier format', async () => {
      const invalidIdentifier = 'invalid-format';

      const response = await request(app)
        .get(`/api/delivery/code/${invalidIdentifier}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(mockDeliveryService.getDeliveryByCode).not.toHaveBeenCalled();
    });

    it('should return 400 when delivery identifier format is invalid in service', async () => {
      mockDeliveryService.getDeliveryByCode.mockRejectedValue(
        new Error('Invalid delivery identifier format. Expected: codeFromRouteToRoute (e.g., 2401250001T1T2)')
      );

      const response = await request(app)
        .get(`/api/delivery/code/${validDeliveryIdentifier}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid delivery identifier format. Expected: codeFromRouteToRoute (e.g., 2401250001T1T2)');
    });

    it('should return 400 when from route not found', async () => {
      mockDeliveryService.getDeliveryByCode.mockRejectedValue(
        new Error('From route with code T1 not found')
      );

      const response = await request(app)
        .get(`/api/delivery/code/${validDeliveryIdentifier}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('From route with code T1 not found');
    });

    it('should return 400 when to route not found', async () => {
      mockDeliveryService.getDeliveryByCode.mockRejectedValue(
        new Error('To route with code T2 not found')
      );

      const response = await request(app)
        .get(`/api/delivery/code/${validDeliveryIdentifier}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('To route with code T2 not found');
    });

    it('should return 500 when service throws unexpected error', async () => {
      mockDeliveryService.getDeliveryByCode.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get(`/api/delivery/code/${validDeliveryIdentifier}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database connection failed');
    });
  });
});