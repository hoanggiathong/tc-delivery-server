import request from 'supertest';
import app from '../../src/app';
import { User } from '@/models/user.model';
import { Route } from '@/models/route.model';
import jwt from 'jsonwebtoken';
import { UserRole } from '@/types/user.type';
import { DraftDeliveryService } from '../../src/services/draft-delivery.service';
import {
  mockDraftDeliveryForIntegration,
  mockDraftDeliveryWithHomeDeliveryForIntegration,
  mockDraftDeliveriesListForIntegration,
} from '../mocks';
import { VehicleType } from '@/models/delivery.model';

// Mock DraftDeliveryService at module level
jest.mock('@/services/draft-delivery.service');

const MockedDraftDeliveryService = DraftDeliveryService as jest.MockedClass<
  typeof DraftDeliveryService
>;

// Mock all models
jest.mock('@/models/user.model');
jest.mock('@/models/route.model');

const MockedUser = User as jest.MockedClass<typeof User>;
const MockedRoute = Route as jest.MockedClass<typeof Route>;

describe('Draft Delivery API Integration Tests', () => {
  let authToken: string;
  let testUser: any;
  let testRoute1: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock test user with selected route
    testUser = {
      _id: '507f1f77bcf86cd799439040',
      username: 'testuser',
      password: 'password123',
      role: UserRole.USER,
      selectedRoute: '507f1f77bcf86cd799439011',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock test routes
    testRoute1 = {
      _id: '507f1f77bcf86cd799439011',
      code: 'T1',
      name: 'TP.HCM',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser._id, username: testUser.username, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Mock model static methods
    (MockedUser.findById as jest.Mock).mockResolvedValue(testUser);
    (MockedRoute.findById as jest.Mock).mockResolvedValue(testRoute1);

    // Set up default mock responses
    MockedDraftDeliveryService.prototype.createDraft.mockResolvedValue(
      mockDraftDeliveryForIntegration
    );
    MockedDraftDeliveryService.prototype.getUserDrafts.mockResolvedValue(
      mockDraftDeliveriesListForIntegration
    );
    MockedDraftDeliveryService.prototype.getDraftById.mockResolvedValue(
      mockDraftDeliveryForIntegration
    );
    MockedDraftDeliveryService.prototype.updateDraft.mockResolvedValue(
      mockDraftDeliveryForIntegration
    );
    MockedDraftDeliveryService.prototype.deleteAllUserDrafts.mockResolvedValue({
      deletedCount: 2,
    });
  });

  describe('POST /api/draft-deliveries', () => {
    it('should create draft delivery successfully without home delivery', async () => {
      const requestData = {
        senderName: 'Nguyễn Văn An',
        senderPhone: '+84901234567',
        receiverName: 'Trần Thị Bình',
        receiverPhone: '+84907654321',
        fromRouteId: '507f1f77bcf86cd799439011',
        toRouteId: '507f1f77bcf86cd799439012',
        name: 'Quần áo',
        quantity: 1,
        cost: 30000,
        homeDeliveryCost: 0,
        carryCost: 0,
        vehicleType: VehicleType.MOTORBIKE,
        itemValue: 500000,
        itemCost: 5000,
        collectCost: 0,
        collectForCustomer: 0,
        collectForCustomerCost: 0,
        paymentType: 'paid',
      };

      const response = await request(app)
        .post('/api/draft-deliveries')
        .send(requestData)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Draft created successfully');
      expect(response.body.data).toEqual(mockDraftDeliveryForIntegration);
      expect(response.body.data.carryCost).toBe(0);
      expect(response.body.data.vehicleType).toBe(VehicleType.MOTORBIKE);
      expect(MockedDraftDeliveryService.prototype.createDraft).toHaveBeenCalledWith(
        requestData,
        testUser._id
      );
    });

    it('should create draft delivery successfully with home delivery and carryCost', async () => {
      MockedDraftDeliveryService.prototype.createDraft.mockResolvedValue(
        mockDraftDeliveryWithHomeDeliveryForIntegration
      );

      const requestData = {
        senderName: 'Shop ABC',
        senderPhone: '+84908888888',
        receiverName: 'Lê Văn Cường',
        receiverPhone: '+84909999999',
        fromRouteId: '507f1f77bcf86cd799439011',
        toRouteId: '507f1f77bcf86cd799439012',
        name: 'Điện thoại',
        quantity: 2,
        cost: 50000,
        homeDelivery: '123 Nguyễn Văn Linh, Q7',
        homeDeliveryCost: 15000,
        carryCost: 10000,
        vehicleType: VehicleType.SMALL_TRUCK,
        itemValue: 15000000,
        itemCost: 150000,
        collectForCustomer: 15000000,
        collectForCustomerCost: 150000,
        collectForCustomerNote: 'Thu hộ tiền bán hàng',
        details: {
          weight: 0.8,
          length: 15,
          width: 8,
          height: 2,
          isOverweight: false,
          convertedWeight: 1.2,
        },
        notes: 'Hàng giá trị cao, cẩn thận',
        paymentType: 'paid',
      };

      const response = await request(app)
        .post('/api/draft-deliveries')
        .send(requestData)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.carryCost).toBe(10000);
      expect(response.body.data.homeDeliveryCostTotal).toBe(25000);
      expect(response.body.data.vehicleType).toBe(VehicleType.SMALL_TRUCK);
      expect(response.body.data.homeDelivery).toBe('123 Nguyễn Văn Linh, Q7');
    });

    it('should return 400 for invalid carryCost with missing homeDelivery', async () => {
      MockedDraftDeliveryService.prototype.createDraft.mockRejectedValue(
        new Error('homeDelivery is required when carryCost or homeDeliveryCost is greater than 0')
      );

      const requestData = {
        senderName: 'Nguyễn Văn An',
        senderPhone: '+84901234567',
        receiverName: 'Trần Thị Bình',
        receiverPhone: '+84907654321',
        fromRouteId: '507f1f77bcf86cd799439011',
        toRouteId: '507f1f77bcf86cd799439012',
        name: 'Quần áo',
        cost: 30000,
        carryCost: 10000, // carryCost > 0 but no homeDelivery
        itemValue: 500000,
        itemCost: 5000,
        paymentType: 'paid',
      };

      const response = await request(app)
        .post('/api/draft-deliveries')
        .send(requestData)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('homeDelivery is required');
    });

    it('should return 400 for invalid vehicleType', async () => {
      const requestData = {
        senderName: 'Nguyễn Văn An',
        senderPhone: '+84901234567',
        receiverName: 'Trần Thị Bình',
        receiverPhone: '+84907654321',
        fromRouteId: '507f1f77bcf86cd799439011',
        toRouteId: '507f1f77bcf86cd799439012',
        name: 'Quần áo',
        cost: 30000,
        vehicleType: 'invalid-vehicle-type',
        itemValue: 500000,
        itemCost: 5000,
        paymentType: 'paid',
      };

      const response = await request(app)
        .post('/api/draft-deliveries')
        .send(requestData)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/draft-deliveries')
        .send({})
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/draft-deliveries')
        .send({
          senderName: 'Test',
          senderPhone: '+84901234567',
          receiverName: 'Test Receiver',
          receiverPhone: '+84907654321',
          fromRouteId: '507f1f77bcf86cd799439011',
          toRouteId: '507f1f77bcf86cd799439012',
          name: 'Test Package',
          cost: 30000,
          itemValue: 500000,
          itemCost: 5000,
          paymentType: 'paid',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/draft-deliveries', () => {
    it('should get all user drafts successfully', async () => {
      const response = await request(app)
        .get('/api/draft-deliveries')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Drafts retrieved successfully');
      expect(response.body.data.drafts).toEqual(mockDraftDeliveriesListForIntegration);
      expect(response.body.data.total).toBe(2);
      expect(MockedDraftDeliveryService.prototype.getUserDrafts).toHaveBeenCalledWith(testUser._id);
    });

    it('should return empty array when no drafts found', async () => {
      MockedDraftDeliveryService.prototype.getUserDrafts.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/draft-deliveries')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.drafts).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app).get('/api/draft-deliveries').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/draft-deliveries/:id', () => {
    it('should get draft by id successfully', async () => {
      const response = await request(app)
        .get('/api/draft-deliveries/507f1f77bcf86cd799439030')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Draft retrieved successfully');
      expect(response.body.data).toEqual(mockDraftDeliveryForIntegration);
      expect(MockedDraftDeliveryService.prototype.getDraftById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439030',
        testUser._id
      );
    });

    it('should return 404 for draft not found', async () => {
      MockedDraftDeliveryService.prototype.getDraftById.mockRejectedValue(
        new Error('Draft not found')
      );

      const response = await request(app)
        .get('/api/draft-deliveries/507f1f77bcf86cd799439099')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid id format', async () => {
      const response = await request(app)
        .get('/api/draft-deliveries/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/draft-deliveries/507f1f77bcf86cd799439030')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/draft-deliveries/:id', () => {
    it('should update draft successfully', async () => {
      const updateData = {
        cost: 45000,
        carryCost: 5000,
        vehicleType: VehicleType.SMALL_TRUCK,
        notes: 'Updated draft',
      };

      const updatedDraft = {
        ...mockDraftDeliveryForIntegration,
        ...updateData,
      };

      MockedDraftDeliveryService.prototype.updateDraft.mockResolvedValue(updatedDraft);

      const response = await request(app)
        .put('/api/draft-deliveries/507f1f77bcf86cd799439030')
        .send(updateData)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Draft updated successfully');
      expect(response.body.data.cost).toBe(45000);
      expect(response.body.data.carryCost).toBe(5000);
      expect(response.body.data.vehicleType).toBe(VehicleType.SMALL_TRUCK);
      expect(MockedDraftDeliveryService.prototype.updateDraft).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439030',
        updateData,
        testUser._id
      );
    });

    it('should return 404 for draft not found', async () => {
      MockedDraftDeliveryService.prototype.updateDraft.mockRejectedValue(
        new Error('Draft not found')
      );

      const response = await request(app)
        .put('/api/draft-deliveries/507f1f77bcf86cd799439099')
        .send({ cost: 45000 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid id format', async () => {
      const response = await request(app)
        .put('/api/draft-deliveries/invalid-id')
        .send({ cost: 45000 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .put('/api/draft-deliveries/507f1f77bcf86cd799439030')
        .send({ cost: 45000 })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/draft-deliveries/:id', () => {
    it('should delete draft successfully', async () => {
      MockedDraftDeliveryService.prototype.deleteDraft.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/draft-deliveries/507f1f77bcf86cd799439030')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Draft deleted successfully');
      expect(MockedDraftDeliveryService.prototype.deleteDraft).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439030',
        testUser._id
      );
    });

    it('should return 404 for draft not found', async () => {
      MockedDraftDeliveryService.prototype.deleteDraft.mockRejectedValue(
        new Error('Draft not found')
      );

      const response = await request(app)
        .delete('/api/draft-deliveries/507f1f77bcf86cd799439099')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid id format', async () => {
      const response = await request(app)
        .delete('/api/draft-deliveries/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .delete('/api/draft-deliveries/507f1f77bcf86cd799439030')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/draft-deliveries/:id/convert', () => {
    it('should convert draft to delivery successfully', async () => {
      const mockConvertedDelivery = {
        id: '507f1f77bcf86cd799439050',
        code: '2501270001',
        fullCode: '2501270001T1T2',
        sender: {
          id: '507f1f77bcf86cd799439051',
          name: 'Nguyễn Văn An',
          phone: '+84901234567',
        },
        receiver: {
          id: '507f1f77bcf86cd799439052',
          name: 'Trần Thị Bình',
          phone: '+84907654321',
        },
        fromRoute: mockDraftDeliveryForIntegration.fromRoute,
        toRoute: mockDraftDeliveryForIntegration.toRoute,
        name: mockDraftDeliveryForIntegration.name,
        quantity: mockDraftDeliveryForIntegration.quantity,
        cost: mockDraftDeliveryForIntegration.cost,
        carryCost: mockDraftDeliveryForIntegration.carryCost,
        vehicleType: mockDraftDeliveryForIntegration.vehicleType,
        homeDeliveryCost: mockDraftDeliveryForIntegration.homeDeliveryCost,
        itemValue: mockDraftDeliveryForIntegration.itemValue,
        itemCost: mockDraftDeliveryForIntegration.itemCost,
        collectCost: mockDraftDeliveryForIntegration.collectCost,
        collectForCustomer: mockDraftDeliveryForIntegration.collectForCustomer,
        collectForCustomerCost: mockDraftDeliveryForIntegration.collectForCustomerCost,
        totalCost: mockDraftDeliveryForIntegration.totalCost,
        paymentType: mockDraftDeliveryForIntegration.paymentType,
        createdAt: new Date().toISOString(),
      };

      MockedDraftDeliveryService.prototype.convertToDelivery.mockResolvedValue(
        mockConvertedDelivery
      );

      const response = await request(app)
        .post('/api/draft-deliveries/507f1f77bcf86cd799439030/convert')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Draft converted to delivery successfully');
      expect(response.body.data.code).toBeDefined();
      expect(response.body.data.carryCost).toBe(0);
      expect(response.body.data.vehicleType).toBe(VehicleType.MOTORBIKE);
      expect(MockedDraftDeliveryService.prototype.convertToDelivery).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439030',
        testUser._id
      );
    });

    it('should return 404 for draft not found', async () => {
      MockedDraftDeliveryService.prototype.convertToDelivery.mockRejectedValue(
        new Error('Draft not found')
      );

      const response = await request(app)
        .post('/api/draft-deliveries/507f1f77bcf86cd799439099/convert')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid id format', async () => {
      const response = await request(app)
        .post('/api/draft-deliveries/invalid-id/convert')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/draft-deliveries/507f1f77bcf86cd799439030/convert')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/draft-deliveries/all', () => {
    it('should delete all user drafts successfully', async () => {
      const response = await request(app)
        .delete('/api/draft-deliveries/all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('2 drafts deleted successfully');
      expect(response.body.data.deletedCount).toBe(2);
      expect(MockedDraftDeliveryService.prototype.deleteAllUserDrafts).toHaveBeenCalledWith(
        testUser._id
      );
    });

    it('should return 0 when no drafts to delete', async () => {
      MockedDraftDeliveryService.prototype.deleteAllUserDrafts.mockResolvedValue({
        deletedCount: 0,
      });

      const response = await request(app)
        .delete('/api/draft-deliveries/all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('0 drafts deleted successfully');
      expect(response.body.data.deletedCount).toBe(0);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app).delete('/api/draft-deliveries/all').expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
