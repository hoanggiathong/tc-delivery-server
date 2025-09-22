import request from 'supertest';
import app from '../../src/app';
import { SettingsService } from '@/services/settings.service';
import jwt from 'jsonwebtoken';

jest.mock('@/services/settings.service');
const MockedSettingsService = SettingsService as jest.MockedClass<typeof SettingsService>;

jest.mock('@/models/settings.model');

describe('Settings API Integration Tests', () => {
  let adminToken: string;
  let superadminToken: string;
  let userToken: string;

  const mockShippingRates = [
    {
      fromAmount: 0,
      toAmount: 1000000,
      regularShippingFee: 15000,
      expressShippingFee: 20000,
    },
    {
      fromAmount: 1000001,
      toAmount: 2000000,
      regularShippingFee: 15000,
      expressShippingFee: 30000,
    },
  ];

  const mockSettings = {
    _id: '507f1f77bcf86cd799439011',
    name: 'shipping_rates',
    metadata: mockShippingRates,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adminToken = jwt.sign(
      { userId: 'admin123', username: 'admin', role: 'admin' },
      'test-jwt-secret-key-for-testing-only',
      { expiresIn: '1h' }
    );
    superadminToken = jwt.sign(
      { userId: 'superadmin123', username: 'superadmin', role: 'superadmin' },
      'test-jwt-secret-key-for-testing-only',
      { expiresIn: '1h' }
    );
    userToken = jwt.sign(
      { userId: 'user123', username: 'testuser', role: 'user' },
      'test-jwt-secret-key-for-testing-only',
      { expiresIn: '1h' }
    );
  });

  describe('POST /api/settings', () => {
    it('should create settings successfully with admin token', async () => {
      MockedSettingsService.prototype.create.mockResolvedValue(mockSettings as any);

      const response = await request(app)
        .post('/api/settings')
        .send({
          name: 'shipping_rates',
          metadata: mockShippingRates,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Settings created successfully');
      expect(response.body.data).toMatchObject({
        name: 'shipping_rates',
        metadata: mockShippingRates,
      });
    });

    it('should return 403 for user without admin role', async () => {
      const response = await request(app)
        .post('/api/settings')
        .send({
          name: 'shipping_rates',
          metadata: mockShippingRates,
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient');
    });

    it('should return 400 for invalid metadata format', async () => {
      const response = await request(app)
        .post('/api/settings')
        .send({
          name: 'shipping_rates',
          metadata: [
            {
              fromAmount: 1000,
              toAmount: 500,
              regularShippingFee: 15000,
              expressShippingFee: 20000,
            },
          ],
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/settings')
        .send({
          name: 'shipping_rates',
          metadata: mockShippingRates,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/settings', () => {
    it('should get all settings successfully with admin token', async () => {
      MockedSettingsService.prototype.getAll.mockResolvedValue([mockSettings] as any);

      const response = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        name: 'shipping_rates',
        metadata: mockShippingRates,
      });
    });

    it('should return 403 for user without admin role', async () => {
      const response = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app).get('/api/settings').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/settings/:name', () => {
    it('should update settings successfully with admin token', async () => {
      const updatedSettings = { ...mockSettings, metadata: mockShippingRates };
      MockedSettingsService.prototype.update.mockResolvedValue(updatedSettings as any);

      const response = await request(app)
        .put('/api/settings/shipping_rates')
        .send({
          metadata: mockShippingRates,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Settings updated successfully');
      expect(response.body.data).toMatchObject({
        name: 'shipping_rates',
        metadata: mockShippingRates,
      });
    });

    it('should return 403 for user without admin role', async () => {
      const response = await request(app)
        .put('/api/settings/shipping_rates')
        .send({
          metadata: mockShippingRates,
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid metadata', async () => {
      const response = await request(app)
        .put('/api/settings/shipping_rates')
        .send({
          metadata: [],
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .put('/api/settings/shipping_rates')
        .send({
          metadata: mockShippingRates,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/settings/:name', () => {
    it('should delete settings successfully with superadmin token', async () => {
      MockedSettingsService.prototype.delete.mockResolvedValue();

      const response = await request(app)
        .delete('/api/settings/shipping_rates')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Settings deleted successfully');
    });

    it('should return 403 for admin without superadmin role', async () => {
      const response = await request(app)
        .delete('/api/settings/shipping_rates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app).delete('/api/settings/shipping_rates').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/settings/calculate-shipping-fee', () => {
    it('should calculate shipping fee successfully', async () => {
      MockedSettingsService.prototype.calculateShippingFee.mockResolvedValue(15000);

      const response = await request(app)
        .post('/api/settings/calculate-shipping-fee')
        .send({
          amount: 1500000,
          isExpress: false,
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        amount: 1500000,
        isExpress: false,
        isFree: false,
        shippingFee: 15000,
      });
    });

    it('should calculate express shipping fee successfully', async () => {
      MockedSettingsService.prototype.calculateShippingFee.mockResolvedValue(30000);

      const response = await request(app)
        .post('/api/settings/calculate-shipping-fee')
        .send({
          amount: 1500000,
          isExpress: true,
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        amount: 1500000,
        isExpress: true,
        isFree: false,
        shippingFee: 30000,
      });
    });

    it('should return 0 for free shipping', async () => {
      MockedSettingsService.prototype.calculateShippingFee.mockResolvedValue(0);
      const response = await request(app)
        .post('/api/settings/calculate-shipping-fee')
        .send({
          amount: 1500000,
          isExpress: false,
          isFree: true,
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        amount: 1500000,
        isExpress: false,
        isFree: true,
        shippingFee: 0,
      });
    });

    it('should return 0 for free express shipping', async () => {
      MockedSettingsService.prototype.calculateShippingFee.mockResolvedValue(0);
      const response = await request(app)
        .post('/api/settings/calculate-shipping-fee')
        .send({
          amount: 1500000,
          isExpress: true,
          isFree: true,
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        amount: 1500000,
        isExpress: true,
        isFree: true,
        shippingFee: 0,
      });
    });

    it('should return 400 for negative amount', async () => {
      const response = await request(app)
        .post('/api/settings/calculate-shipping-fee')
        .send({
          amount: -1000,
          isExpress: false,
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/settings/calculate-shipping-fee')
        .send({
          amount: 1500000,
          isExpress: false,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/settings/products/:id', () => {
    const validProductId = '507f1f77bcf86cd799439011';
    const invalidProductId = 'invalid-id';

    it('should update product successfully with admin token', async () => {
      const mockUpdatedProduct = {
        _id: validProductId,
        name: 'Updated Product Name',
        cost: 35000,
      } as any;

      MockedSettingsService.prototype.updateProductById.mockResolvedValue(mockUpdatedProduct);

      const response = await request(app)
        .put(`/api/settings/products/${validProductId}`)
        .send({
          name: 'Updated Product Name',
          cost: 35000,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product updated successfully');
      expect(response.body.data).toEqual({
        id: validProductId,
        name: 'Updated Product Name',
        cost: 35000,
      });
      expect(MockedSettingsService.prototype.updateProductById).toHaveBeenCalledWith(
        validProductId,
        { name: 'Updated Product Name', cost: 35000 }
      );
    });

    it('should update product name only', async () => {
      const mockUpdatedProduct = {
        _id: validProductId,
        name: 'New Product Name',
        cost: 25000,
      } as any;

      MockedSettingsService.prototype.updateProductById.mockResolvedValue(mockUpdatedProduct);

      const response = await request(app)
        .put(`/api/settings/products/${validProductId}`)
        .send({
          name: 'New Product Name',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product updated successfully');
      expect(response.body.data).toEqual({
        id: validProductId,
        name: 'New Product Name',
        cost: 25000,
      });
      expect(MockedSettingsService.prototype.updateProductById).toHaveBeenCalledWith(
        validProductId,
        { name: 'New Product Name' }
      );
    });

    it('should update product cost only', async () => {
      const mockUpdatedProduct = {
        _id: validProductId,
        name: 'Existing Product',
        cost: 50000,
      } as any;

      MockedSettingsService.prototype.updateProductById.mockResolvedValue(mockUpdatedProduct);

      const response = await request(app)
        .put(`/api/settings/products/${validProductId}`)
        .send({
          cost: 50000,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product updated successfully');
      expect(response.body.data).toEqual({
        id: validProductId,
        name: 'Existing Product',
        cost: 50000,
      });
      expect(MockedSettingsService.prototype.updateProductById).toHaveBeenCalledWith(
        validProductId,
        { cost: 50000 }
      );
    });

    it('should return 404 for non-existent product', async () => {
      const notFoundError = new Error('Product with id "507f1f77bcf86cd799439012" not found');
      MockedSettingsService.prototype.updateProductById.mockRejectedValue(notFoundError);

      const response = await request(app)
        .put('/api/settings/products/507f1f77bcf86cd799439012')
        .send({
          name: 'Updated Name',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid ObjectId format', async () => {
      const response = await request(app)
        .put(`/api/settings/products/${invalidProductId}`)
        .send({
          name: 'Updated Name',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 when no fields are provided', async () => {
      const response = await request(app)
        .put(`/api/settings/products/${validProductId}`)
        .send({})
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for invalid cost (negative)', async () => {
      const response = await request(app)
        .put(`/api/settings/products/${validProductId}`)
        .send({
          cost: -100,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for invalid name (empty)', async () => {
      const response = await request(app)
        .put(`/api/settings/products/${validProductId}`)
        .send({
          name: '',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 403 for user without admin role', async () => {
      const response = await request(app)
        .put(`/api/settings/products/${validProductId}`)
        .send({
          name: 'Updated Name',
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .put(`/api/settings/products/${validProductId}`)
        .send({
          name: 'Updated Name',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/settings/shipping-rates/:id', () => {
    const validRateId = '507f1f77bcf86cd799439011';
    const invalidRateId = 'invalid-id';

    it('should update shipping rate successfully with all fields', async () => {
      const mockUpdatedRate = {
        _id: validRateId,
        fromAmount: 0,
        toAmount: 1500000,
        regularShippingFee: 18000,
        expressShippingFee: 25000,
        fromAmountUnit: 'VND',
        toAmountUnit: 'VND',
        regularShippingFeeUnit: 'VND',
        expressShippingFeeUnit: 'VND',
      } as any;

      MockedSettingsService.prototype.updateShippingRateById.mockResolvedValue(mockUpdatedRate);

      const response = await request(app)
        .put(`/api/settings/shipping-rates/${validRateId}`)
        .send({
          fromAmount: 0,
          toAmount: 1500000,
          regularShippingFee: 18000,
          expressShippingFee: 25000,
          fromAmountUnit: 'VND',
          toAmountUnit: 'VND',
          regularShippingFeeUnit: 'VND',
          expressShippingFeeUnit: 'VND',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Shipping rate updated successfully');
      expect(response.body.data).toEqual({
        id: validRateId,
        fromAmount: 0,
        toAmount: 1500000,
        regularShippingFee: 18000,
        expressShippingFee: 25000,
        fromAmountUnit: 'VND',
        toAmountUnit: 'VND',
        regularShippingFeeUnit: 'VND',
        expressShippingFeeUnit: 'VND',
      });
      expect(MockedSettingsService.prototype.updateShippingRateById).toHaveBeenCalledWith(
        validRateId,
        {
          fromAmount: 0,
          toAmount: 1500000,
          regularShippingFee: 18000,
          expressShippingFee: 25000,
          fromAmountUnit: 'VND',
          toAmountUnit: 'VND',
          regularShippingFeeUnit: 'VND',
          expressShippingFeeUnit: 'VND',
        }
      );
    });

    it('should update shipping rate with partial fields (fees only)', async () => {
      const mockUpdatedRate = {
        _id: validRateId,
        fromAmount: 0,
        toAmount: 1000000,
        regularShippingFee: 20000,
        expressShippingFee: 30000,
        fromAmountUnit: 'VND',
        toAmountUnit: 'VND',
        regularShippingFeeUnit: 'VND',
        expressShippingFeeUnit: 'VND',
      } as any;

      MockedSettingsService.prototype.updateShippingRateById.mockResolvedValue(mockUpdatedRate);

      const response = await request(app)
        .put(`/api/settings/shipping-rates/${validRateId}`)
        .send({
          regularShippingFee: 20000,
          expressShippingFee: 30000,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Shipping rate updated successfully');
      expect(response.body.data).toEqual({
        id: validRateId,
        fromAmount: 0,
        toAmount: 1000000,
        regularShippingFee: 20000,
        expressShippingFee: 30000,
        fromAmountUnit: 'VND',
        toAmountUnit: 'VND',
        regularShippingFeeUnit: 'VND',
        expressShippingFeeUnit: 'VND',
      });
      expect(MockedSettingsService.prototype.updateShippingRateById).toHaveBeenCalledWith(
        validRateId,
        {
          regularShippingFee: 20000,
          expressShippingFee: 30000,
        }
      );
    });

    it('should update shipping rate with amount range', async () => {
      const mockUpdatedRate = {
        _id: validRateId,
        fromAmount: 500000,
        toAmount: 2000000,
        regularShippingFee: 15000,
        expressShippingFee: 20000,
        fromAmountUnit: 'VND',
        toAmountUnit: 'VND',
        regularShippingFeeUnit: 'VND',
        expressShippingFeeUnit: 'VND',
      } as any;

      MockedSettingsService.prototype.updateShippingRateById.mockResolvedValue(mockUpdatedRate);

      const response = await request(app)
        .put(`/api/settings/shipping-rates/${validRateId}`)
        .send({
          fromAmount: 500000,
          toAmount: 2000000,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Shipping rate updated successfully');
      expect(response.body.data).toEqual({
        id: validRateId,
        fromAmount: 500000,
        toAmount: 2000000,
        regularShippingFee: 15000,
        expressShippingFee: 20000,
        fromAmountUnit: 'VND',
        toAmountUnit: 'VND',
        regularShippingFeeUnit: 'VND',
        expressShippingFeeUnit: 'VND',
      });
      expect(MockedSettingsService.prototype.updateShippingRateById).toHaveBeenCalledWith(
        validRateId,
        {
          fromAmount: 500000,
          toAmount: 2000000,
        }
      );
    });

    it('should update shipping rate with currency units', async () => {
      const mockUpdatedRate = {
        _id: validRateId,
        fromAmount: 0,
        toAmount: 1000000,
        regularShippingFee: 15000,
        expressShippingFee: 20000,
        fromAmountUnit: 'USD',
        toAmountUnit: 'USD',
        regularShippingFeeUnit: '%',
        expressShippingFeeUnit: '%',
      } as any;

      MockedSettingsService.prototype.updateShippingRateById.mockResolvedValue(mockUpdatedRate);

      const response = await request(app)
        .put(`/api/settings/shipping-rates/${validRateId}`)
        .send({
          fromAmountUnit: 'USD',
          toAmountUnit: 'USD',
          regularShippingFeeUnit: '%',
          expressShippingFeeUnit: '%',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Shipping rate updated successfully');
      expect(response.body.data).toEqual({
        id: validRateId,
        fromAmount: 0,
        toAmount: 1000000,
        regularShippingFee: 15000,
        expressShippingFee: 20000,
        fromAmountUnit: 'USD',
        toAmountUnit: 'USD',
        regularShippingFeeUnit: '%',
        expressShippingFeeUnit: '%',
      });
      expect(MockedSettingsService.prototype.updateShippingRateById).toHaveBeenCalledWith(
        validRateId,
        {
          fromAmountUnit: 'USD',
          toAmountUnit: 'USD',
          regularShippingFeeUnit: '%',
          expressShippingFeeUnit: '%',
        }
      );
    });

    it('should return 404 for non-existent shipping rate', async () => {
      const notFoundError = new Error('Shipping rate with id "507f1f77bcf86cd799439012" not found');
      MockedSettingsService.prototype.updateShippingRateById.mockRejectedValue(notFoundError);

      const response = await request(app)
        .put('/api/settings/shipping-rates/507f1f77bcf86cd799439012')
        .send({
          regularShippingFee: 20000,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid ObjectId format', async () => {
      const response = await request(app)
        .put(`/api/settings/shipping-rates/${invalidRateId}`)
        .send({
          regularShippingFee: 20000,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 when no fields are provided', async () => {
      const response = await request(app)
        .put(`/api/settings/shipping-rates/${validRateId}`)
        .send({})
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(
        response.body.errors.some((error: any) =>
          error.message.includes('At least one field must be provided')
        )
      ).toBe(true);
    });

    it('should return 400 for invalid amount range (toAmount <= fromAmount)', async () => {
      const response = await request(app)
        .put(`/api/settings/shipping-rates/${validRateId}`)
        .send({
          fromAmount: 1000000,
          toAmount: 500000,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(
        response.body.errors.some((error: any) =>
          error.message.includes('To amount must be greater than from amount')
        )
      ).toBe(true);
    });

    it('should return 400 for negative fromAmount', async () => {
      const response = await request(app)
        .put(`/api/settings/shipping-rates/${validRateId}`)
        .send({
          fromAmount: -100,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for negative toAmount', async () => {
      const response = await request(app)
        .put(`/api/settings/shipping-rates/${validRateId}`)
        .send({
          toAmount: -500,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for negative regularShippingFee', async () => {
      const response = await request(app)
        .put(`/api/settings/shipping-rates/${validRateId}`)
        .send({
          regularShippingFee: -1000,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for negative expressShippingFee', async () => {
      const response = await request(app)
        .put(`/api/settings/shipping-rates/${validRateId}`)
        .send({
          expressShippingFee: -2000,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 400 for invalid currency unit', async () => {
      const response = await request(app)
        .put(`/api/settings/shipping-rates/${validRateId}`)
        .send({
          fromAmountUnit: 'INVALID',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return 403 for user without admin role', async () => {
      const response = await request(app)
        .put(`/api/settings/shipping-rates/${validRateId}`)
        .send({
          regularShippingFee: 20000,
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .put(`/api/settings/shipping-rates/${validRateId}`)
        .send({
          regularShippingFee: 20000,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should work with superadmin token', async () => {
      const mockUpdatedRate = {
        _id: validRateId,
        fromAmount: 0,
        toAmount: 1000000,
        regularShippingFee: 25000,
        expressShippingFee: 35000,
        fromAmountUnit: 'VND',
        toAmountUnit: 'VND',
        regularShippingFeeUnit: 'VND',
        expressShippingFeeUnit: 'VND',
      } as any;

      MockedSettingsService.prototype.updateShippingRateById.mockResolvedValue(mockUpdatedRate);

      const response = await request(app)
        .put(`/api/settings/shipping-rates/${validRateId}`)
        .send({
          regularShippingFee: 25000,
          expressShippingFee: 35000,
        })
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Shipping rate updated successfully');
      expect(response.body.data).toEqual({
        id: validRateId,
        fromAmount: 0,
        toAmount: 1000000,
        regularShippingFee: 25000,
        expressShippingFee: 35000,
        fromAmountUnit: 'VND',
        toAmountUnit: 'VND',
        regularShippingFeeUnit: 'VND',
        expressShippingFeeUnit: 'VND',
      });
    });
  });
});
