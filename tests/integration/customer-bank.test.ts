import request from 'supertest';
import app from '../../src/app';
import { CustomerService } from '@/services/customer.service';
import { UserService } from '@/services/user.service';
import jwt from 'jsonwebtoken';
import { mockCustomersForIntegration } from '../mocks';

// Mock services at module level
jest.mock('@/services/customer.service');
jest.mock('@/services/user.service');
jest.mock('@/services/customerBank.service');

// Mock image URL utility
jest.mock('@/utils/image-url.utils', () => ({
  generateVersionedUrl: jest.fn((basePath: string) => `${basePath}?v=1234567890`),
}));

// Mock QRCode library
jest.mock('qrcode', () => ({
  toFile: jest.fn().mockResolvedValue(undefined),
}));

// Mock fs module for file operations
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    existsSync: jest.fn().mockReturnValue(false),
    mkdirSync: jest.fn(),
    unlinkSync: jest.fn(),
    writeFileSync: jest.fn(),
  };
});

const MockedCustomerService = CustomerService as jest.MockedClass<typeof CustomerService>;
const MockedUserService = UserService as jest.MockedClass<typeof UserService>;

describe('Customer Bank API Integration Tests', () => {
  let authToken: string;
  let userToken: string;

  beforeEach(() => {
    jest.clearAllMocks();

    // Admin token
    authToken = jwt.sign(
      { userId: 'admin123', username: 'admin', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // User token
    userToken = jwt.sign(
      { userId: 'user123', username: 'testuser', role: 'user' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('PUT /api/customer/bank-info', () => {
    const validBankData = {
      phone: '+84912345678',
      name: 'Nguyễn Văn A',
      type: 'delivery',
      bankInfo: {
        name: 'Nguyễn Văn A',
        bankName: 'Vietcombank',
        bankAccount: '0071000123456',
        bankBranch: 'Chi nhánh Tân Bình',
        bankAddress: '285 Cách Mạng Tháng 8',
      },
    };

    it('should update existing customer with bank info successfully', async () => {
      MockedUserService.prototype.getUserSelectedRouteId.mockResolvedValue(
        '507f1f77bcf86cd799439011'
      );
      MockedCustomerService.prototype.updateCustomerBankInfo.mockResolvedValue(
        mockCustomersForIntegration.updated as any
      );

      const response = await request(app)
        .put('/api/customer/bank-info')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validBankData)
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Bank info updated successfully');
      expect(response.body.data.customer).toMatchObject({
        id: mockCustomersForIntegration.updated.id,
        name: mockCustomersForIntegration.updated.name,
        phone: mockCustomersForIntegration.updated.phone,
        fromRouteId: mockCustomersForIntegration.updated.fromRouteId,
        toRouteId: mockCustomersForIntegration.updated.toRouteId,
      });
      expect(MockedUserService.prototype.getUserSelectedRouteId).toHaveBeenCalledWith('admin123');
      expect(MockedCustomerService.prototype.updateCustomerBankInfo).toHaveBeenCalledWith(
        '+84912345678',
        '507f1f77bcf86cd799439011',
        'delivery',
        'Nguyễn Văn A',
        validBankData.bankInfo,
        undefined
      );
    });

    it('should create new customer when not found and name provided', async () => {
      MockedUserService.prototype.getUserSelectedRouteId.mockResolvedValue(
        '507f1f77bcf86cd799439011'
      );
      MockedCustomerService.prototype.updateCustomerBankInfo.mockResolvedValue(
        mockCustomersForIntegration.updated as any
      );

      const newCustomerData = {
        phone: '+84999999999',
        name: 'Nguyễn Văn B',
        type: 'delivery',
        bankInfo: {
          name: 'Nguyễn Văn B',
          bankName: 'ACB',
          bankAccount: '123456789',
        },
      };

      const response = await request(app)
        .put('/api/customer/bank-info')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newCustomerData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Bank info updated successfully');
      expect(MockedCustomerService.prototype.updateCustomerBankInfo).toHaveBeenCalledWith(
        '+84999999999',
        '507f1f77bcf86cd799439011',
        'delivery',
        'Nguyễn Văn B',
        newCustomerData.bankInfo,
        undefined
      );
    });

    it('should update customer with image upload', async () => {
      MockedUserService.prototype.getUserSelectedRouteId.mockResolvedValue(
        '507f1f77bcf86cd799439011'
      );
      MockedCustomerService.prototype.updateCustomerBankInfo.mockResolvedValue(
        mockCustomersForIntegration.updated as any
      );

      const response = await request(app)
        .put('/api/customer/bank-info')
        .set('Authorization', `Bearer ${authToken}`)
        .field('phone', '+84912345678')
        .field('name', 'Nguyễn Văn A')
        .field('type', 'delivery')
        .field('imageIndex', '1')
        .field('rotate', '90')
        .attach('image', Buffer.from('fake-image'), 'test.jpg')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(MockedCustomerService.prototype.updateCustomerBankInfo).toHaveBeenCalledWith(
        '+84912345678',
        '507f1f77bcf86cd799439011',
        'delivery',
        'Nguyễn Văn A',
        undefined,
        expect.objectContaining({
          index: 1,
          rotate: 90,
        })
      );
    });

    it('should update customer with both bank info and image', async () => {
      MockedUserService.prototype.getUserSelectedRouteId.mockResolvedValue(
        '507f1f77bcf86cd799439011'
      );
      MockedCustomerService.prototype.updateCustomerBankInfo.mockResolvedValue(
        mockCustomersForIntegration.updated as any
      );

      const response = await request(app)
        .put('/api/customer/bank-info')
        .set('Authorization', `Bearer ${authToken}`)
        .field('phone', '+84912345678')
        .field('name', 'Nguyễn Văn A')
        .field('type', 'delivery')
        .field('bankInfo[name]', 'Nguyễn Văn A')
        .field('bankInfo[bankName]', 'Vietcombank')
        .field('bankInfo[bankAccount]', '0071000123456')
        .field('imageIndex', '2')
        .field('rotate', '180')
        .attach('image', Buffer.from('fake-image'), 'test.png')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(MockedCustomerService.prototype.updateCustomerBankInfo).toHaveBeenCalledWith(
        '+84912345678',
        '507f1f77bcf86cd799439011',
        'delivery',
        'Nguyễn Văn A',
        expect.objectContaining({
          name: 'Nguyễn Văn A',
          bankName: 'Vietcombank',
          bankAccount: '0071000123456',
        }),
        expect.objectContaining({
          index: 2,
          rotate: 180,
        })
      );
    });

    it('should return 400 when customer not found and name not provided', async () => {
      MockedUserService.prototype.getUserSelectedRouteId.mockResolvedValue(
        '507f1f77bcf86cd799439011'
      );
      MockedCustomerService.prototype.updateCustomerBankInfo.mockRejectedValue(
        new Error('Name is required when creating new customer')
      );

      const response = await request(app)
        .put('/api/customer/bank-info')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: '+84888888888',
          type: 'delivery',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Name is required when creating new customer');
    });

    it('should return 400 for missing phone', async () => {
      const response = await request(app)
        .put('/api/customer/bank-info')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Nguyễn Văn A',
          type: 'delivery',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for invalid phone format', async () => {
      const response = await request(app)
        .put('/api/customer/bank-info')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: 'invalid-phone',
          name: 'Nguyễn Văn A',
          type: 'delivery',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for invalid imageIndex', async () => {
      const response = await request(app)
        .put('/api/customer/bank-info')
        .set('Authorization', `Bearer ${authToken}`)
        .field('phone', '+84912345678')
        .field('name', 'Nguyễn Văn A')
        .field('imageIndex', '6') // Invalid: > 5
        .attach('image', Buffer.from('fake-image'), 'test.jpg')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for invalid rotate value', async () => {
      const response = await request(app)
        .put('/api/customer/bank-info')
        .set('Authorization', `Bearer ${authToken}`)
        .field('phone', '+84912345678')
        .field('name', 'Nguyễn Văn A')
        .field('imageIndex', '1')
        .field('rotate', '45') // Invalid: not 0, 90, 180, 270
        .attach('image', Buffer.from('fake-image'), 'test.jpg')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 when user has no selected route', async () => {
      MockedUserService.prototype.getUserSelectedRouteId.mockRejectedValue(
        new Error('User must have a selected route')
      );

      const response = await request(app)
        .put('/api/customer/bank-info')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validBankData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User must have a selected route');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .put('/api/customer/bank-info')
        .send(validBankData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should work with user role', async () => {
      MockedUserService.prototype.getUserSelectedRouteId.mockResolvedValue(
        '507f1f77bcf86cd799439011'
      );
      MockedCustomerService.prototype.updateCustomerBankInfo.mockResolvedValue(
        mockCustomersForIntegration.updated as any
      );

      const response = await request(app)
        .put('/api/customer/bank-info')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validBankData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(MockedUserService.prototype.getUserSelectedRouteId).toHaveBeenCalledWith('user123');
    });

    it('should handle service errors gracefully', async () => {
      MockedUserService.prototype.getUserSelectedRouteId.mockResolvedValue(
        '507f1f77bcf86cd799439011'
      );
      MockedCustomerService.prototype.updateCustomerBankInfo.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .put('/api/customer/bank-info')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validBankData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database connection failed');
    });
  });
});
