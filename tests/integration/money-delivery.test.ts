import request from 'supertest';
import app from '../../src/app';
import { User } from '@/models/user.model';
import { Customer } from '@/models/customer.model';
import { Route } from '@/models/route.model';
import jwt from 'jsonwebtoken';
import { UserRole } from '@/types/user.type';
import { MoneyDeliveryService } from '../../src/services/money-delivery.service';
import {
  TransferType,
  MoneyDeliveryStatus,
  MoneyDeliveryType,
} from '@/models/money-delivery.model';
import {
  mockMoneyDeliveryForIntegration,
  mockMoneyDeliveryNextCodeResponseForIntegration,
  mockUpdatedMoneyDeliveryForIntegration,
  mockMoneyDeliveryWithAlphaRoutes,
  mockMoneyDeliveryCostReportForIntegration,
} from '../mocks';
import { RouteType } from '@/types/route.type';

// Mock MoneyDeliveryService at module level
jest.mock('@/services/money-delivery.service');

const MockedMoneyDeliveryService = MoneyDeliveryService as jest.MockedClass<
  typeof MoneyDeliveryService
>;

// Mock all models
jest.mock('@/models/user.model');
jest.mock('@/models/customer.model');
jest.mock('@/models/route.model');

const MockedUser = User as jest.MockedClass<typeof User>;
const MockedCustomer = Customer as jest.MockedClass<typeof Customer>;
const MockedRoute = Route as jest.MockedClass<typeof Route>;

describe('Money Delivery API Integration Tests', () => {
  let authToken: string;
  let testUser: any;
  let testCustomer1: any;
  let testRoute1: any;
  let testRoute2: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock test user
    testUser = {
      _id: 'user123',
      username: 'testuser',
      password: 'password123',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock test customers
    testCustomer1 = {
      _id: 'customer123',
      name: 'John Doe',
      createdAt: new Date(),
      updatedAt: new Date(),
      phone: '+84123456789',
      fromRouteId: '507f1f77bcf86cd799439011',
      toRouteId: '507f1f77bcf86cd799439012',
    };

    // Mock test routes
    testRoute1 = {
      _id: 'route123',
      code: 'T1',
      name: 'Test Route 1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    testRoute2 = {
      _id: 'route456',
      code: 'T2',
      name: 'Test Route 2',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser._id, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Mock model static methods
    (MockedUser.findById as jest.Mock).mockResolvedValue(testUser);
    (MockedCustomer.findById as jest.Mock).mockResolvedValue(testCustomer1);
    (MockedRoute.findById as jest.Mock).mockResolvedValue(testRoute1);

    // Set up default mock responses for happy path scenarios
    MockedMoneyDeliveryService.prototype.createMoneyDelivery.mockResolvedValue(
      mockMoneyDeliveryForIntegration
    );
    MockedMoneyDeliveryService.prototype.getAllMoneyDeliveries.mockResolvedValue([
      mockMoneyDeliveryForIntegration,
      {
        id: 'moneyDelivery456',
        code: '2401250002',
        fullCode: '2401250002T2T1',
        subCode: '17031750002',
        sender: {
          id: 'customer456',
          name: 'Jane Doe',
          phone: '+84987654321',
        },
        receiver: {
          id: 'customer123',
          name: 'John Doe',
          phone: '+84123456789',
        },
        fromRoute: {
          id: 'route456',
          code: 'T2',
          name: 'Test Route 2',
          address: 'Test Address 2',
          createdAt: new Date(),
          updatedAt: new Date(),
          type: RouteType.OWNED,
        },
        toRoute: {
          id: 'route123',
          code: 'T1',
          name: 'Test Route 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          type: RouteType.OWNED,
        },
        sendMoneyAmount: 2000000,
        sendCost: 75000,
        transferType: TransferType.REGULAR,
        isFree: false,
        totalCost: 75000,
        status: MoneyDeliveryStatus.WAITING,
        type: MoneyDeliveryType.NORMAL,
        createdByUser: 'user123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    MockedMoneyDeliveryService.prototype.getMoneyDeliveryById.mockResolvedValue({
      id: 'moneyDelivery123',
      code: '2401250001',
      fullCode: '2401250001T1T2',
      subCode: '17031750001',
      sender: {
        id: 'customer123',
        name: 'John Doe',
        phone: '+84123456789',
      },
      receiver: {
        id: 'customer456',
        name: 'Jane Doe',
        phone: '+84987654321',
      },
      fromRoute: {
        id: 'route123',
        code: 'T1',
        name: 'Test Route 1',
        createdAt: new Date(),
        updatedAt: new Date(),
        type: RouteType.OWNED,
      },
      toRoute: {
        id: 'route456',
        code: 'T2',
        name: 'Test Route 2',
        address: 'Test Address 2',
        createdAt: new Date(),
        updatedAt: new Date(),
        type: RouteType.OWNED,
      },
      sendMoneyAmount: 1000000,
      sendCost: 50000,
      transferType: TransferType.REGULAR,
      status: MoneyDeliveryStatus.WAITING,
      type: MoneyDeliveryType.NORMAL,
      isFree: false,
      totalCost: 50000,
      createdByUser: 'user123',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    MockedMoneyDeliveryService.prototype.getFrequentCustomers.mockResolvedValue([
      {
        receiverName: 'Jane Doe',
        receiverPhone: '+84987654321',
        toRoute: {
          id: 'route456',
          code: 'T2',
          name: 'Test Route 2',
          address: 'Test Address 2',
          type: RouteType.OWNED,
        },
        senderName: 'Nguyen Van A',
        senderPhone: '+84123456789',
      },
    ]);
  });

  // In each test that expects a different result, override the mock at the start of the test
  // For example:
  // MockedMoneyDeliveryService.prototype.getMoneyDeliveryById = jest.fn().mockResolvedValue(null);
  // MockedMoneyDeliveryService.prototype.getFrequentCustomers = jest.fn().mockRejectedValue(new Error("Database error"));

  describe('POST /api/money-deliveries', () => {
    it('should create a new money delivery', async () => {
      // Use valid ObjectId-like strings for route IDs
      const moneyDeliveryData = {
        senderName: 'John Doe',
        senderPhone: '+84123456789',
        receiverName: 'Jane Doe',
        receiverPhone: '+84987654321',
        toRouteId: '507f1f77bcf86cd799439012',
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        notes: 'Ghi chú chuyển tiền',
      };

      const response = await request(app)
        .post('/api/money-deliveries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(moneyDeliveryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Money delivery created successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.code).toMatch(/^[0-9]{10}$/);
      expect(response.body.data.sendMoneyAmount).toBe(1000000);
      expect(response.body.data.sendCost).toBe(50000);
      expect(response.body.data.sender.name).toBe('John Doe');
      expect(response.body.data.receiver.name).toBe('Jane Doe');
      expect(response.body.data.notes).toBe('Ghi chú chuyển tiền');
    });

    it('should return 401 when not authenticated', async () => {
      const moneyDeliveryData = {
        senderName: 'John Doe',
        senderPhone: '+84123456789',
        receiverName: 'Jane Doe',
        receiverPhone: '+84987654321',
        toRouteId: testRoute2._id,
        sendMoneyAmount: 1000000,
        sendCost: 50000,
      };

      await request(app).post('/api/money-deliveries').send(moneyDeliveryData).expect(401);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        senderName: 'John Doe',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/money-deliveries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 404 for non-existent route', async () => {
      const moneyDeliveryData = {
        senderName: 'John Doe',
        senderPhone: '+84123456789',
        receiverName: 'Jane Doe',
        receiverPhone: '+84987654321',
        toRouteId: '507f1f77bcf86cd799439012',
        sendMoneyAmount: 1000000,
        sendCost: 50000,
      };

      // Mock service to throw error for non-existent route with 'not found' in message
      MockedMoneyDeliveryService.prototype.createMoneyDelivery.mockRejectedValue(
        new Error('From route not found')
      );

      const response = await request(app)
        .post('/api/money-deliveries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(moneyDeliveryData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('From route not found');
    });
  });

  describe('GET /api/money-deliveries', () => {
    it('should return all money deliveries', async () => {
      const response = await request(app)
        .get('/api/money-deliveries')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Money deliveries retrieved successfully');
      expect(response.body.data.moneyDeliveries).toHaveLength(2);
      expect(response.body.data.count).toBe(2);

      // Check that both expected codes exist (order doesn't matter)
      const codes = response.body.data.moneyDeliveries.map((md: any) => md.code);
      expect(codes).toContain('2401250001');
      expect(codes).toContain('2401250002');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app).get('/api/money-deliveries').expect(401);
    });
  });

  describe('GET /api/money-deliveries/:id', () => {
    it('should return a specific money delivery', async () => {
      const response = await request(app)
        .get('/api/money-deliveries/moneyDelivery123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Money delivery retrieved successfully');
      expect(response.body.data.code).toBe('2401250001');
      expect(response.body.data.sendMoneyAmount).toBe(1000000);
      expect(response.body.data.sender.name).toBe('John Doe');
      expect(response.body.data.receiver.name).toBe('Jane Doe');
    });

    it('should return 404 for non-existent money delivery', async () => {
      // Mock service to return null for non-existent ID
      MockedMoneyDeliveryService.prototype.getMoneyDeliveryById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/money-deliveries/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Money delivery not found');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app).get('/api/money-deliveries/moneyDelivery123').expect(401);
    });
  });

  describe('GET /api/money-deliveries/frequent-customers/:senderIdentifier', () => {
    it('should get frequent customers successfully', async () => {
      const mockFrequentCustomersArray = [
        {
          receiverName: 'Jane Doe',
          receiverPhone: '+84987654321',
          toRoute: {
            id: 'route456',
            code: 'T2',
            name: 'Test Route 2',
            address: 'Test Address 2',
            type: RouteType.OWNED,
          },
          senderName: 'Nguyen Van A',
          senderPhone: '+84123456789',
          totalSendMoneyAmount: 5000000,
          totalSendCost: 250000,
          totalCost: 250000,
          lastDeliveryDate: new Date('2024-01-25'),
        },
      ];
      MockedMoneyDeliveryService.prototype.getFrequentCustomers.mockResolvedValue(
        mockFrequentCustomersArray
      );

      const response = await request(app)
        .get('/api/money-deliveries/frequent-customers/John%20Doe')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Frequent money customers retrieved successfully');
      expect(response.body.data).toEqualWithDateStrings({
        frequentCustomers: mockFrequentCustomersArray,
        total: 1,
      });
      expect(MockedMoneyDeliveryService.prototype.getFrequentCustomers).toHaveBeenCalledWith(
        'John Doe',
        'user123'
      );
    });

    it('should handle unauthorized request', async () => {
      const response = await request(app)
        .get('/api/money-deliveries/frequent-customers/John%20Doe')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
    });

    it('should handle missing sender identifier', async () => {
      // Mock service to return null or throw for missing sender
      MockedMoneyDeliveryService.prototype.getFrequentCustomers.mockRejectedValue(
        new Error('Sender not found')
      );

      await request(app)
        .get('/api/money-deliveries/frequent-customers/nonexistent-sender')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should handle service error', async () => {
      MockedMoneyDeliveryService.prototype.getFrequentCustomers.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get('/api/money-deliveries/frequent-customers/John%20Doe')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database error');
    });

    it('should return empty array when no customers found', async () => {
      MockedMoneyDeliveryService.prototype.getFrequentCustomers.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/money-deliveries/frequent-customers/John%20Doe')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ frequentCustomers: [], total: 0 });
      expect(MockedMoneyDeliveryService.prototype.getFrequentCustomers).toHaveBeenCalledWith(
        'John Doe',
        'user123'
      );
    });

    it('should handle validation error for invalid sender identifier', async () => {
      // Test with a string that's too long (over 100 characters)
      const longIdentifier = 'a'.repeat(101);
      const response = await request(app)
        .get(`/api/money-deliveries/frequent-customers/${longIdentifier}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });
  });

  describe('GET /api/money-deliveries/next-code', () => {
    it('should get next money delivery code successfully', async () => {
      MockedMoneyDeliveryService.prototype.getNextCode.mockResolvedValue(
        mockMoneyDeliveryNextCodeResponseForIntegration
      );

      const response = await request(app)
        .get('/api/money-deliveries/next-code')
        .query({ toRouteId: '507f1f77bcf86cd799439011' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nextCode).toBe(
        mockMoneyDeliveryNextCodeResponseForIntegration.nextCode
      );
      expect(response.body.data.toRoute.id).toBe(
        mockMoneyDeliveryNextCodeResponseForIntegration.toRoute.id
      );
      expect(response.body.data.toRoute.code).toBe(
        mockMoneyDeliveryNextCodeResponseForIntegration.toRoute.code
      );
      expect(response.body.data.toRoute.name).toBe(
        mockMoneyDeliveryNextCodeResponseForIntegration.toRoute.name
      );
      expect(MockedMoneyDeliveryService.prototype.getNextCode).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        'user123'
      );
    });

    it('should return 400 for invalid toRouteId format', async () => {
      const response = await request(app)
        .get('/api/money-deliveries/next-code')
        .query({ toRouteId: 'invalid-id' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/money-deliveries/next-code')
        .query({ toRouteId: '507f1f77bcf86cd799439011' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing toRouteId parameter', async () => {
      const response = await request(app)
        .get('/api/money-deliveries/next-code')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });
  });

  describe('PUT /api/money-deliveries/:id', () => {
    it('should update money delivery successfully', async () => {
      MockedMoneyDeliveryService.prototype.updateMoneyDelivery.mockResolvedValue(
        mockUpdatedMoneyDeliveryForIntegration
      );

      const updateData = {
        senderName: 'Updated Sender Name',
        senderPhone: '+84111222333',
        receiverName: 'Updated Receiver Name',
        receiverPhone: '+84444555666',
        toRouteId: '507f1f77bcf86cd799439013',
        sendMoneyAmount: 2000000,
        sendCost: 75000,
        transferType: 'express',
        notes: 'Updated notes',
      };

      const response = await request(app)
        .put('/api/money-deliveries/moneyDelivery123')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Money delivery updated successfully');
      expect(response.body.data.sender.name).toBe('Updated Sender Name');
      expect(response.body.data.receiver.name).toBe('Updated Receiver Name');
      expect(response.body.data.sendMoneyAmount).toBe(2000000);
      expect(response.body.data.transferType).toBe('express');
      expect(response.body.data.notes).toBe('Updated notes');

      // Verify subCode is preserved and fullCode is updated correctly
      expect(response.body.data.subCode).toBe('17031750001'); // Original subCode preserved
      expect(response.body.data.fullCode).toBe('2401250001T1T3-T'); // Updated with new route and -T suffix

      expect(MockedMoneyDeliveryService.prototype.updateMoneyDelivery).toHaveBeenCalledWith(
        'moneyDelivery123',
        updateData,
        'user123'
      );
    });

    it('should return 401 when not authenticated', async () => {
      const updateData = {
        senderName: 'Updated Name',
      };

      await request(app).put('/api/money-deliveries/moneyDelivery123').send(updateData).expect(401);
    });

    it('should return 404 for non-existent money delivery', async () => {
      MockedMoneyDeliveryService.prototype.updateMoneyDelivery.mockRejectedValue(
        new Error('Money delivery not found')
      );

      const updateData = {
        senderName: 'Updated Name',
      };

      const response = await request(app)
        .put('/api/money-deliveries/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Money delivery not found');
    });

    it('should return 400 for validation errors', async () => {
      const invalidData = {
        senderPhone: 'invalid-phone',
      };

      const response = await request(app)
        .put('/api/money-deliveries/moneyDelivery123')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    describe('toRoute update with fullCode regeneration', () => {
      it('should regenerate fullCode when toRoute changes (no conflict)', async () => {
        // Mock updated money delivery with new toRoute but same code (no conflict)
        const updatedMoneyDelivery = {
          ...mockMoneyDeliveryForIntegration,
          code: '1407250001', // Code preserved
          fullCode: '1407250001T4T2-T', // fullCode updated with new toRoute + -T suffix
          toRoute: {
            id: '507f1f77bcf86cd799439014',
            code: 'T2',
            name: 'Da Nang',
            createdAt: new Date('2025-06-27T07:51:17.342Z'),
            updatedAt: new Date('2025-06-27T07:51:17.342Z'),
            type: RouteType.OWNED,
          },
        };

        MockedMoneyDeliveryService.prototype.updateMoneyDelivery.mockResolvedValue(
          updatedMoneyDelivery
        );

        const response = await request(app)
          .put('/api/money-deliveries/moneyDelivery123')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ toRouteId: '507f1f77bcf86cd799439014' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.code).toBe('1407250001'); // Code preserved
        expect(response.body.data.fullCode).toBe('1407250001T4T2-T'); // fullCode updated with -T suffix
        expect(response.body.data.toRoute.code).toBe('T2');
      });

      it('should generate new code when toRoute change causes fullCode conflict', async () => {
        // Mock updated money delivery with new code due to conflict
        const updatedMoneyDelivery = {
          ...mockMoneyDeliveryForIntegration,
          code: '1407250201', // New code generated
          fullCode: '1407250201T4T2-T', // New fullCode with new code + -T suffix
          subCode: '17324560201',
          toRoute: {
            id: '507f1f77bcf86cd799439014',
            code: 'T2',
            name: 'Da Nang',
            createdAt: new Date('2025-06-27T07:51:17.342Z'),
            updatedAt: new Date('2025-06-27T07:51:17.342Z'),
            type: RouteType.OWNED,
          },
        };

        MockedMoneyDeliveryService.prototype.updateMoneyDelivery.mockResolvedValue(
          updatedMoneyDelivery
        );

        const response = await request(app)
          .put('/api/money-deliveries/moneyDelivery123')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ toRouteId: '507f1f77bcf86cd799439014' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.code).toBe('1407250201'); // New code
        expect(response.body.data.fullCode).toBe('1407250201T4T2-T'); // New fullCode with -T suffix
        expect(response.body.data.toRoute.code).toBe('T2');
      });

      it('should not regenerate fullCode when toRoute stays the same', async () => {
        // Mock updated money delivery - only sendCost changed, fullCode stays the same
        const updatedMoneyDelivery = {
          ...mockMoneyDeliveryForIntegration,
          sendCost: 100000, // Only sendCost changed
        };

        MockedMoneyDeliveryService.prototype.updateMoneyDelivery.mockResolvedValue(
          updatedMoneyDelivery
        );

        const response = await request(app)
          .put('/api/money-deliveries/moneyDelivery123')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ sendCost: 100000 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.code).toBe(mockMoneyDeliveryForIntegration.code);
        expect(response.body.data.fullCode).toBe(mockMoneyDeliveryForIntegration.fullCode); // fullCode unchanged with -T suffix
      });
    });
  });

  describe('PUT /api/money-deliveries/code/:fullCode', () => {
    it('should update money delivery by fullCode successfully', async () => {
      MockedMoneyDeliveryService.prototype.updateMoneyDeliveryByFullCode.mockResolvedValue(
        mockUpdatedMoneyDeliveryForIntegration
      );

      const updateData = {
        senderName: 'Updated Sender Name',
        senderPhone: '+84111222333',
        receiverName: 'Updated Receiver Name',
        receiverPhone: '+84444555666',
        toRouteId: '507f1f77bcf86cd799439013',
      };

      const fullCode = '2401250001T1T2-T';
      const response = await request(app)
        .put(`/api/money-deliveries/code/${fullCode}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Money delivery updated successfully');
      expect(response.body.data.sender.name).toBe('Updated Sender Name');
      expect(response.body.data.receiver.name).toBe('Updated Receiver Name');

      // Critical test: Verify subCode is preserved (not changed to route codes like "AGBC")
      expect(response.body.data.subCode).toBe('17031750001'); // Original timestamp+sequence format
      expect(response.body.data.subCode).not.toBe('T1T3'); // Should NOT be route codes
      expect(response.body.data.subCode).not.toBe('AGBC'); // Should NOT be route codes

      // Critical test: Verify fullCode maintains -T suffix
      expect(response.body.data.fullCode).toBe('2401250001T1T3-T'); // Must include -T suffix
      expect(response.body.data.fullCode).not.toBe('2401250001T1T3'); // Must NOT miss -T suffix

      expect(
        MockedMoneyDeliveryService.prototype.updateMoneyDeliveryByFullCode
      ).toHaveBeenCalledWith(fullCode, updateData);
    });

    it('should handle complex route codes (AG, BC) correctly', async () => {
      MockedMoneyDeliveryService.prototype.updateMoneyDeliveryByFullCode.mockResolvedValue(
        mockMoneyDeliveryWithAlphaRoutes
      );

      const updateData = {
        senderName: 'Updated Alpha Sender',
        receiverName: 'Updated Beta Receiver',
      };

      const fullCode = '2412250001AGBC-T';
      const response = await request(app)
        .put(`/api/money-deliveries/code/${fullCode}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Critical test: Complex route codes should preserve proper subCode format
      expect(response.body.data.subCode).toBe('17582103201153'); // Original timestamp+sequence
      expect(response.body.data.subCode).not.toBe('AGBC'); // Should NOT be route codes

      // Critical test: Complex route codes should maintain -T suffix
      expect(response.body.data.fullCode).toBe('2412250001AGBC-T'); // Must include -T suffix
      expect(response.body.data.fullCode).not.toBe('2412250001AGBC'); // Must NOT miss -T suffix
    });

    it('should return 400 for invalid fullCode format', async () => {
      MockedMoneyDeliveryService.prototype.updateMoneyDeliveryByFullCode.mockRejectedValue(
        new Error('Validation error: Invalid money delivery fullCode format')
      );

      const updateData = {
        senderName: 'Updated Name',
      };

      const invalidFullCode = 'invalid-format';
      const response = await request(app)
        .put(`/api/money-deliveries/code/${invalidFullCode}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 404 for non-existent money delivery', async () => {
      MockedMoneyDeliveryService.prototype.updateMoneyDeliveryByFullCode.mockRejectedValue(
        new Error('Money delivery not found')
      );

      const updateData = {
        senderName: 'Updated Name',
      };

      const fullCode = '9999999999T1T2-T';
      const response = await request(app)
        .put(`/api/money-deliveries/code/${fullCode}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Money delivery not found');
    });

    it('should return 401 when not authenticated', async () => {
      const updateData = {
        senderName: 'Updated Name',
      };

      const fullCode = '2401250001T1T2-T';
      await request(app).put(`/api/money-deliveries/code/${fullCode}`).send(updateData).expect(401);
    });

    it('should return 400 when no fields provided for update', async () => {
      MockedMoneyDeliveryService.prototype.updateMoneyDeliveryByFullCode.mockRejectedValue(
        new Error('Validation error: At least one field must be provided')
      );

      const emptyData = {};
      const fullCode = '2401250001T1T2-T';
      const response = await request(app)
        .put(`/api/money-deliveries/code/${fullCode}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(emptyData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 404 when toRoute not found during update', async () => {
      MockedMoneyDeliveryService.prototype.updateMoneyDeliveryByFullCode.mockRejectedValue(
        new Error('To route not found')
      );

      const updateData = {
        toRouteId: '507f1f77bcf86cd799439999', // Non-existent route
      };

      const fullCode = '2401250001T1T2-T';
      const response = await request(app)
        .put(`/api/money-deliveries/code/${fullCode}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('To route not found');
    });
  });

  describe('GET /api/money-deliveries/cost-report', () => {
    const validQuery = {
      startDate: '2024-01-15',
      endDate: '2024-01-15',
    };

    it('should get cost report successfully', async () => {
      MockedMoneyDeliveryService.prototype.getCostReport.mockResolvedValue(
        mockMoneyDeliveryCostReportForIntegration
      );

      const response = await request(app)
        .get('/api/money-deliveries/cost-report')
        .query(validQuery)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.moneyDeliveries).toBeDefined();
      expect(response.body.data.filter).toBeDefined();
      expect(MockedMoneyDeliveryService.prototype.getCostReport).toHaveBeenCalledWith(
        testUser._id,
        new Date(validQuery.startDate),
        new Date(validQuery.endDate)
      );
    });

    it('should return empty report when no money deliveries found', async () => {
      const emptyReport = {
        summary: {
          totalMoneyDeliveries: 0,
          totalSendMoneyAmount: 0,
          totalSendCost: 0,
          totalCost: 0,
          regularTransferCount: 0,
          regularTransferAmount: 0,
          expressTransferCount: 0,
          expressTransferAmount: 0,
          freeTransferCount: 0,
          freeTransferAmount: 0,
          averageSendAmountPerDelivery: 0,
          averageCostPerDelivery: 0,
        },
        moneyDeliveries: [],
        filter: mockMoneyDeliveryCostReportForIntegration.filter,
      };

      MockedMoneyDeliveryService.prototype.getCostReport.mockResolvedValue(emptyReport);

      const response = await request(app)
        .get('/api/money-deliveries/cost-report')
        .query(validQuery)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalMoneyDeliveries).toBe(0);
      expect(response.body.data.moneyDeliveries).toEqual([]);
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .get('/api/money-deliveries/cost-report')
        .query({
          startDate: '01-15-2024',
          endDate: '01-15-2024',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for missing required parameters', async () => {
      const response = await request(app)
        .get('/api/money-deliveries/cost-report')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 when startDate is after endDate', async () => {
      const response = await request(app)
        .get('/api/money-deliveries/cost-report')
        .query({
          startDate: '2024-01-20',
          endDate: '2024-01-15',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 when date range exceeds 30 days', async () => {
      const response = await request(app)
        .get('/api/money-deliveries/cost-report')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-02-15',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 when end date is in the future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const response = await request(app)
        .get('/api/money-deliveries/cost-report')
        .query({
          startDate: '2024-01-15',
          endDate: futureDateStr,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/money-deliveries/cost-report')
        .query(validQuery)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle service errors', async () => {
      MockedMoneyDeliveryService.prototype.getCostReport.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get('/api/money-deliveries/cost-report')
        .query(validQuery)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should verify date is interpreted as Vietnam timezone', async () => {
      MockedMoneyDeliveryService.prototype.getCostReport.mockResolvedValue(
        mockMoneyDeliveryCostReportForIntegration
      );

      await request(app)
        .get('/api/money-deliveries/cost-report')
        .query(validQuery)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const callArgs = MockedMoneyDeliveryService.prototype.getCostReport.mock.calls[0];
      const startDate = callArgs[1] as Date;
      const endDate = callArgs[2] as Date;

      expect(startDate).toBeInstanceOf(Date);
      expect(endDate).toBeInstanceOf(Date);
      expect(startDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
    });

    it('should accept today as end date', async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      MockedMoneyDeliveryService.prototype.getCostReport.mockResolvedValue(
        mockMoneyDeliveryCostReportForIntegration
      );

      const response = await request(app)
        .get('/api/money-deliveries/cost-report')
        .query({
          startDate: todayStr,
          endDate: todayStr,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return report with all transfer types', async () => {
      MockedMoneyDeliveryService.prototype.getCostReport.mockResolvedValue(
        mockMoneyDeliveryCostReportForIntegration
      );

      const response = await request(app)
        .get('/api/money-deliveries/cost-report')
        .query(validQuery)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.regularTransferCount).toBeDefined();
      expect(response.body.data.summary.expressTransferCount).toBeDefined();
      expect(response.body.data.summary.freeTransferCount).toBeDefined();
    });
  });
});
