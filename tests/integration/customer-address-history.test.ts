import request from 'supertest';
import app from '../../src/app';
import { CustomerAddressHistoryService } from '@/services/customer-address-history.service';
import jwt from 'jsonwebtoken';
import { UserRole } from '@/types/user.type';
import { VehicleType } from '@/models/delivery.model';
import {
  mockAddressHistoryForIntegration,
  mockAddressHistoryListForIntegration,
} from '../mocks/data/customer-address-history';

// Mock service at module level
jest.mock('@/services/customer-address-history.service');
const MockedService = CustomerAddressHistoryService as jest.MockedClass<
  typeof CustomerAddressHistoryService
>;

// Mock Customer model
jest.mock('@/models/customer.model');

describe('Customer Address History API Integration Tests', () => {
  let authToken: string;
  const validPhone = '84901234567'; // Valid international format
  const validAddressHistoryId = '60d5ec49f1b2c72b8c8e4a01';

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = jwt.sign(
      { userId: 'user123', username: 'testuser', role: UserRole.USER },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/customer-address-history/:phone', () => {
    it('should get address history successfully', async () => {
      MockedService.prototype.getAddressHistory.mockResolvedValue(
        mockAddressHistoryListForIntegration
      );

      const response = await request(app)
        .get(`/api/customer-address-history/${validPhone}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Address history retrieved successfully');
      expect(response.body.data.addressHistory).toEqualWithDateStrings(
        mockAddressHistoryListForIntegration
      );
      expect(response.body.data.total).toBe(2);
      expect(MockedService.prototype.getAddressHistory).toHaveBeenCalledWith(validPhone);
    });

    it('should return empty array when no address history found', async () => {
      MockedService.prototype.getAddressHistory.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/customer-address-history/${validPhone}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.addressHistory).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get(`/api/customer-address-history/${validPhone}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid phone format', async () => {
      const response = await request(app)
        .get('/api/customer-address-history/invalid-phone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 404 when customer not found', async () => {
      MockedService.prototype.getAddressHistory.mockRejectedValue(new Error('Customer not found'));

      const response = await request(app)
        .get(`/api/customer-address-history/${validPhone}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Customer not found');
    });
  });

  describe('POST /api/customer-address-history/:phone', () => {
    const validRequestBody = {
      address: '123 Hoàng Văn Thụ, Phường 4, Quận Tân Bình, TP.HCM',
      homeDeliveryCost: 30000,
      carryCost: 20000,
      vehicleType: VehicleType.MOTORBIKE,
    };

    it('should create address history successfully', async () => {
      MockedService.prototype.createAddressHistory.mockResolvedValue(
        mockAddressHistoryForIntegration
      );

      const response = await request(app)
        .post(`/api/customer-address-history/${validPhone}`)
        .send(validRequestBody)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Address history created successfully');
      expect(response.body.data).toEqualWithDateStrings(mockAddressHistoryForIntegration);
      expect(MockedService.prototype.createAddressHistory).toHaveBeenCalledWith(
        validPhone,
        validRequestBody
      );
    });

    it('should calculate homeDeliveryTotalCost correctly', async () => {
      const mockResponse = {
        ...mockAddressHistoryForIntegration,
        homeDeliveryCost: 40000,
        carryCost: 25000,
        homeDeliveryTotalCost: 65000,
      };
      MockedService.prototype.createAddressHistory.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post(`/api/customer-address-history/${validPhone}`)
        .send({
          address: 'Test Address',
          homeDeliveryCost: 40000,
          carryCost: 25000,
          vehicleType: VehicleType.LARGE_TRUCK,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.homeDeliveryTotalCost).toBe(65000);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post(`/api/customer-address-history/${validPhone}`)
        .send({})
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for invalid address (too long)', async () => {
      const response = await request(app)
        .post(`/api/customer-address-history/${validPhone}`)
        .send({
          address: 'A'.repeat(501), // Exceeds 500 characters
          homeDeliveryCost: 30000,
          carryCost: 20000,
          vehicleType: VehicleType.MOTORBIKE,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for negative costs', async () => {
      const response = await request(app)
        .post(`/api/customer-address-history/${validPhone}`)
        .send({
          address: 'Test Address',
          homeDeliveryCost: -1000,
          carryCost: 20000,
          vehicleType: VehicleType.MOTORBIKE,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post(`/api/customer-address-history/${validPhone}`)
        .send(validRequestBody)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when customer not found', async () => {
      MockedService.prototype.createAddressHistory.mockRejectedValue(
        new Error('Customer not found')
      );

      const response = await request(app)
        .post(`/api/customer-address-history/${validPhone}`)
        .send(validRequestBody)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Customer not found');
    });

    it('should use default values when optional fields not provided', async () => {
      MockedService.prototype.createAddressHistory.mockResolvedValue(
        mockAddressHistoryForIntegration
      );

      const response = await request(app)
        .post(`/api/customer-address-history/${validPhone}`)
        .send({
          address: 'Test Address',
          vehicleType: 'motorbike',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/customer-address-history/:phone/:addressHistoryId', () => {
    it('should delete address history successfully', async () => {
      MockedService.prototype.deleteAddressHistory.mockResolvedValue(undefined);

      const response = await request(app)
        .delete(`/api/customer-address-history/${validPhone}/${validAddressHistoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Address history deleted successfully');
      expect(response.body.data.deletedId).toBe(validAddressHistoryId);
      expect(MockedService.prototype.deleteAddressHistory).toHaveBeenCalledWith(
        validPhone,
        validAddressHistoryId
      );
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .delete(`/api/customer-address-history/${validPhone}/${validAddressHistoryId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid phone format', async () => {
      const response = await request(app)
        .delete(`/api/customer-address-history/invalid-phone/${validAddressHistoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for invalid addressHistoryId format', async () => {
      const response = await request(app)
        .delete(`/api/customer-address-history/${validPhone}/invalid-id`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 404 when address history not found', async () => {
      MockedService.prototype.deleteAddressHistory.mockRejectedValue(
        new Error('Address history not found')
      );

      const response = await request(app)
        .delete(`/api/customer-address-history/${validPhone}/${validAddressHistoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Address history not found');
    });

    it('should return 403 when address history does not belong to customer', async () => {
      MockedService.prototype.deleteAddressHistory.mockRejectedValue(
        new Error('This address history does not belong to the specified customer')
      );

      const response = await request(app)
        .delete(`/api/customer-address-history/${validPhone}/${validAddressHistoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('does not belong to the specified customer');
    });
  });
});
