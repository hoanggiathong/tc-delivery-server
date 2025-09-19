import request from 'supertest';
import app from '../../src/app';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../src/types/user.type';
import { DeliveryService } from '../../src/services/delivery.service';
import {
  createMockDelivery,
  createMockCustomer,
  createMockDeliveryRequestWithoutHome,
  mockCostReportForIntegration,
  mockDeliveryNextCodeResponseForIntegration,
  customerToResponse,
} from '../mocks';

// Mock DeliveryService
jest.mock('../../src/services/delivery.service');

const MockedDeliveryService = DeliveryService as jest.MockedClass<typeof DeliveryService>;

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
      collectForCustomerNote: 'Handle with care',
    };

    it('should create a new delivery when authenticated as admin', async () => {
      const mockDelivery = createMockDelivery();

      MockedDeliveryService.prototype.createDelivery.mockResolvedValue(mockDelivery);

      const response = await request(app)
        .post('/api/delivery')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validDeliveryData)
        .expect(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Delivery created successfully');
      expect(response.body.data.delivery).toEqualWithDateStrings(mockDelivery);
      expect(MockedDeliveryService.prototype.createDelivery).toHaveBeenCalledWith(
        validDeliveryData,
        'admin123'
      );
    });

    it('should create a new delivery when authenticated as regular user', async () => {
      const mockDelivery = createMockDelivery({
        createdByUser: 'testuser',
      });

      MockedDeliveryService.prototype.createDelivery.mockResolvedValue(mockDelivery);

      const response = await request(app)
        .post('/api/delivery')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validDeliveryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Delivery created successfully');
      expect(MockedDeliveryService.prototype.createDelivery).toHaveBeenCalledWith(
        validDeliveryData,
        'user123'
      );
    });

    it('should create a new delivery without homeDelivery', async () => {
      const mockDelivery = createMockDelivery({
        homeDelivery: undefined,
        homeDeliveryCost: 0,
        totalCost: 100000, // Auto-calculated: 50000 + 0 + 30000 + 20000 (excluding collectCost)
      });

      MockedDeliveryService.prototype.createDelivery.mockResolvedValue(mockDelivery);

      const requestData = createMockDeliveryRequestWithoutHome();

      const response = await request(app)
        .post('/api/delivery')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(requestData)
        .expect(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Delivery created successfully');
      expect(response.body.data.delivery).toEqualWithDateStrings(mockDelivery);
      expect(MockedDeliveryService.prototype.createDelivery).toHaveBeenCalledWith(
        { ...requestData, homeDeliveryCost: 0 },
        'admin123'
      );
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).post('/api/delivery').send(validDeliveryData).expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
      expect(MockedDeliveryService.prototype.createDelivery).not.toHaveBeenCalled();
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
      expect(MockedDeliveryService.prototype.createDelivery).not.toHaveBeenCalled();
    });

    it('should return 400 for service errors', async () => {
      MockedDeliveryService.prototype.createDelivery.mockRejectedValue(
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
      cost: 75000,
    };

    it('should update delivery successfully', async () => {
      const mockUpdatedDelivery = createMockDelivery({
        id: deliveryId,
        sender: customerToResponse(
          createMockCustomer({ name: 'Updated Sender', phone: '+1111111111' })
        ),
        fromRoute: {
          id: '507f1f77bcf86cd799439013',
          code: 'T3',
          name: 'Can Tho',
          createdAt: new Date('2025-06-27T07:51:17.342Z'),
          updatedAt: new Date('2025-06-27T07:51:17.342Z'),
        },
        toRoute: {
          id: '507f1f77bcf86cd799439014',
          code: 'T4',
          name: 'An Giang',
          createdAt: new Date('2025-06-27T07:51:17.342Z'),
          updatedAt: new Date('2025-06-27T07:51:17.342Z'),
        },
        cost: 75000,
      });

      MockedDeliveryService.prototype.updateDelivery.mockResolvedValue(mockUpdatedDelivery);

      const response = await request(app)
        .put(`/api/delivery/${deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Delivery updated successfully');
      expect(response.body.data.delivery).toEqualWithDateStrings(mockUpdatedDelivery);
      expect(MockedDeliveryService.prototype.updateDelivery).toHaveBeenCalledWith(
        deliveryId,
        updateData,
        'admin123'
      );
    });

    it('should return 404 when delivery not found', async () => {
      MockedDeliveryService.prototype.updateDelivery.mockRejectedValue(
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

      MockedDeliveryService.prototype.getDeliveryById.mockResolvedValue(mockDelivery);

      const response = await request(app)
        .get(`/api/delivery/${deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Delivery retrieved successfully');
      expect(response.body.data.delivery).toEqualWithDateStrings(mockDelivery);
      expect(MockedDeliveryService.prototype.getDeliveryById).toHaveBeenCalledWith(deliveryId);
    });

    it('should return 404 when delivery not found', async () => {
      MockedDeliveryService.prototype.getDeliveryById.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/delivery/${deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Delivery not found');
    });

    it('should return 500 when service throws error', async () => {
      MockedDeliveryService.prototype.getDeliveryById.mockRejectedValue(
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
          sender: customerToResponse(createMockCustomer({ _id: 'sender1', name: 'John Sender' })),
          receiver: customerToResponse(
            createMockCustomer({ _id: 'receiver1', name: 'Jane Receiver' })
          ),
        }),
      ];

      MockedDeliveryService.prototype.getAllDeliveries.mockResolvedValue(mockDeliveries);

      const response = await request(app)
        .get('/api/delivery')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Deliveries retrieved successfully');
      expect(response.body.data.deliveries).toEqualWithDateStrings(mockDeliveries);
    });

    it('should return 500 when service throws error', async () => {
      MockedDeliveryService.prototype.getAllDeliveries.mockRejectedValue(
        new Error('Failed to retrieve deliveries')
      );

      const response = await request(app)
        .get('/api/delivery')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve deliveries');
    });
  });

  describe('DELETE /api/delivery/:id', () => {
    const deliveryId = '507f1f77bcf86cd799439012';

    it('should delete delivery successfully', async () => {
      MockedDeliveryService.prototype.deleteDelivery.mockResolvedValue(undefined);

      const response = await request(app)
        .delete(`/api/delivery/${deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Delivery deleted successfully');
      expect(MockedDeliveryService.prototype.deleteDelivery).toHaveBeenCalledWith(deliveryId);
    });

    it('should return 404 when delivery not found', async () => {
      MockedDeliveryService.prototype.deleteDelivery.mockRejectedValue(
        new Error('Delivery not found')
      );

      const response = await request(app)
        .delete(`/api/delivery/${deliveryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Delivery not found');
    });
  });

  describe('GET /api/delivery/next-code', () => {
    it('should get the next delivery code successfully', async () => {
      // Use the centralized mock data
      MockedDeliveryService.prototype.getNextCode.mockResolvedValue(
        mockDeliveryNextCodeResponseForIntegration
      );

      const response = await request(app)
        .get('/api/delivery/next-code')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ toRouteId: '507f1f77bcf86cd799439012' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqualWithDateStrings(mockDeliveryNextCodeResponseForIntegration);
      // Verify the service method was called
      expect(MockedDeliveryService.prototype.getNextCode).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439012',
        'admin123'
      );
    });

    it('should return 404 when route not found', async () => {
      MockedDeliveryService.prototype.getNextCode.mockRejectedValue(new Error('Route not found'));

      const response = await request(app)
        .get('/api/delivery/next-code')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ toRouteId: '507f1f77bcf86cd799439011' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Route not found');
    });
  });

  describe('GET /api/delivery/code/:deliveryIdentifier', () => {
    const deliveryIdentifier = '2401250001T1T2';

    it('should get delivery by code successfully', async () => {
      const mockDelivery = createMockDelivery({ code: '2401250001' });

      MockedDeliveryService.prototype.getDeliveryByCode.mockResolvedValue(mockDelivery);

      const response = await request(app)
        .get(`/api/delivery/code/${deliveryIdentifier}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.delivery).toEqualWithDateStrings(mockDelivery);
      expect(MockedDeliveryService.prototype.getDeliveryByCode).toHaveBeenCalledWith(
        deliveryIdentifier
      );
    });

    it('should return 404 when delivery not found', async () => {
      MockedDeliveryService.prototype.getDeliveryByCode.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/delivery/code/${deliveryIdentifier}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Delivery not found');
    });
  });

  describe('GET /api/delivery/related/:senderName', () => {
    const senderName = 'John Sender';

    it('should get related deliveries successfully', async () => {
      const mockRelatedDeliveries = [
        createMockDelivery({
          sender: customerToResponse(createMockCustomer({ name: 'John Sender' })),
        }),
      ];

      MockedDeliveryService.prototype.getRelatedDeliveriesBySender.mockResolvedValue(
        mockRelatedDeliveries
      );

      const response = await request(app)
        .get(`/api/delivery/related/${senderName}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.relatedDeliveries).toEqualWithDateStrings(mockRelatedDeliveries);
    });

    it('should return 404 when no related deliveries found', async () => {
      MockedDeliveryService.prototype.getRelatedDeliveriesBySender.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/delivery/related/${senderName}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No related deliveries found');
    });
  });

  describe('GET /api/delivery/cost-report', () => {
    // Use recent dates that are within 1 month
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const validQuery = {
      startDate: oneWeekAgo.toISOString().split('T')[0],
      endDate: yesterday.toISOString().split('T')[0],
      page: '1',
      limit: '20',
    };

    it('should get cost report successfully', async () => {
      MockedDeliveryService.prototype.getCostReport.mockResolvedValue(mockCostReportForIntegration);

      const response = await request(app)
        .get('/api/delivery/cost-report')
        .query(validQuery)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqualWithDateStrings(mockCostReportForIntegration);
      expect(MockedDeliveryService.prototype.getCostReport).toHaveBeenCalledWith(
        'admin123',
        new Date(validQuery.startDate),
        new Date(validQuery.endDate),
        1,
        20
      );
    });

    it('should return 400 for missing startDate', async () => {
      const invalidQuery: Partial<typeof validQuery> = { ...validQuery };
      delete invalidQuery.startDate;

      const response = await request(app)
        .get('/api/delivery/cost-report')
        .query(invalidQuery)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for missing endDate', async () => {
      const invalidQuery: Partial<typeof validQuery> = { ...validQuery };
      delete invalidQuery.endDate;

      const response = await request(app)
        .get('/api/delivery/cost-report')
        .query(invalidQuery)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for invalid startDate format', async () => {
      const invalidQuery = { ...validQuery, startDate: 'invalid-date' };

      const response = await request(app)
        .get('/api/delivery/cost-report')
        .query(invalidQuery)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for invalid endDate format', async () => {
      const invalidQuery = { ...validQuery, endDate: 'invalid-date' };

      const response = await request(app)
        .get('/api/delivery/cost-report')
        .query(invalidQuery)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for endDate in the future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const invalidQuery = { ...validQuery, endDate: futureDate.toISOString().split('T')[0] };

      const response = await request(app)
        .get('/api/delivery/cost-report')
        .query(invalidQuery)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for startDate more than 1 month in the past', async () => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      const invalidQuery = { ...validQuery, startDate: twoMonthsAgo.toISOString().split('T')[0] };

      const response = await request(app)
        .get('/api/delivery/cost-report')
        .query(invalidQuery)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for startDate after endDate', async () => {
      const invalidQuery = {
        ...validQuery,
        startDate: '2024-01-31',
        endDate: '2024-01-01',
      };

      const response = await request(app)
        .get('/api/delivery/cost-report')
        .query(invalidQuery)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/delivery/cost-report')
        .query(validQuery)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when user has no selected route', async () => {
      const errorMessage = 'User does not have a selected route';
      MockedDeliveryService.prototype.getCostReport.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .get('/api/delivery/cost-report')
        .query(validQuery)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(errorMessage);
    });

    it('should handle service errors with proper status codes', async () => {
      MockedDeliveryService.prototype.getCostReport.mockRejectedValue(
        new Error('Failed to generate cost report')
      );

      const response = await request(app)
        .get('/api/delivery/cost-report')
        .query(validQuery)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to generate cost report');
    });

    it('should use default pagination values', async () => {
      MockedDeliveryService.prototype.getCostReport.mockResolvedValue(mockCostReportForIntegration);

      const queryWithoutPagination = {
        startDate: validQuery.startDate,
        endDate: validQuery.endDate,
      };

      const response = await request(app)
        .get('/api/delivery/cost-report')
        .query(queryWithoutPagination)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(MockedDeliveryService.prototype.getCostReport).toHaveBeenCalledWith(
        'admin123',
        new Date(validQuery.startDate),
        new Date(validQuery.endDate),
        1, // default page
        100 // default limit
      );
    });
  });
});
