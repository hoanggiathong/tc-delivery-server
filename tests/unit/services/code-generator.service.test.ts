import { CodeGeneratorService } from '@/services/code-generator.service';
import { Delivery } from '@/models/delivery.model';
import { MoneyDelivery } from '@/models/money-delivery.model';
import { Route } from '@/models/route.model';
import { Types } from 'mongoose';
import logger from '@/utils/logger';

// Mock the models
jest.mock('@/models/delivery.model');
jest.mock('@/models/money-delivery.model');
jest.mock('@/models/route.model');
jest.mock('@/utils/logger');

const MockedDelivery = Delivery as jest.MockedClass<typeof Delivery>;
const MockedMoneyDelivery = MoneyDelivery as jest.MockedClass<typeof MoneyDelivery>;
const MockedRoute = Route as jest.MockedClass<typeof Route>;

describe('CodeGeneratorService', () => {
  const mockToRouteId = '507f1f77bcf86cd799439011';
  const mockFromRouteId = '507f1f77bcf86cd799439012';
  
  const mockToRoute = {
    _id: mockToRouteId,
    code: 'T2',
    name: 'Test Route 2',
  };
  
  const mockFromRoute = {
    _id: mockFromRouteId,
    code: 'T1', 
    name: 'Test Route 1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // Always return middle value
    jest.spyOn(Date, 'now').mockReturnValue(1703175000000); // Fixed timestamp
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateCode', () => {
    it('should generate unique code successfully', async () => {
      MockedRoute.findById = jest.fn()
        .mockResolvedValueOnce(mockToRoute)
        .mockResolvedValueOnce(mockFromRoute);
      
      MockedDelivery.exists = jest.fn().mockResolvedValue(null);
      MockedMoneyDelivery.exists = jest.fn().mockResolvedValue(null);

      const result = await CodeGeneratorService.generateCode(
        mockToRouteId,
        mockFromRouteId,
        'delivery'
      );

      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('fullCode');
      expect(result).toHaveProperty('subCode');
      expect(result.code).toMatch(/^\d{10}$/);
      expect(result.fullCode).toBe(`${result.code}T1T2`);
      expect(result.subCode).toMatch(/^\d{14}$/);
    });

    it('should throw error for invalid toRouteId', async () => {
      await expect(
        CodeGeneratorService.generateCode('invalid', mockFromRouteId, 'delivery')
      ).rejects.toThrow('toRouteId and fromRouteId must be valid ObjectIds');
    });

    it('should throw error for invalid fromRouteId', async () => {
      await expect(
        CodeGeneratorService.generateCode(mockToRouteId, 'invalid', 'delivery')
      ).rejects.toThrow('toRouteId and fromRouteId must be valid ObjectIds');
    });

    it('should throw error when route not found', async () => {
      MockedRoute.findById = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockFromRoute);

      await expect(
        CodeGeneratorService.generateCode(mockToRouteId, mockFromRouteId, 'delivery')
      ).rejects.toThrow('Route not found');
    });

    it('should retry on fullCode collision', async () => {
      MockedRoute.findById = jest.fn()
        .mockResolvedValueOnce(mockToRoute)
        .mockResolvedValueOnce(mockFromRoute);
      
      // First call returns collision, second call succeeds
      MockedDelivery.exists = jest.fn()
        .mockResolvedValueOnce({ _id: 'exists' }) // Collision
        .mockResolvedValueOnce(null); // Success
      MockedMoneyDelivery.exists = jest.fn().mockResolvedValue(null);

      const result = await CodeGeneratorService.generateCode(
        mockToRouteId,
        mockFromRouteId,
        'delivery'
      );

      expect(result).toHaveProperty('fullCode');
      expect(MockedDelivery.exists).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateNextCode', () => {
    it('should generate delivery code', async () => {
      MockedRoute.findById = jest.fn()
        .mockResolvedValueOnce(mockToRoute)
        .mockResolvedValueOnce(mockFromRoute);
      
      MockedDelivery.exists = jest.fn().mockResolvedValue(null);
      MockedMoneyDelivery.exists = jest.fn().mockResolvedValue(null);

      const result = await CodeGeneratorService.generateNextCode(
        mockToRouteId,
        mockFromRouteId
      );

      expect(result.code).toMatch(/^\d{10}$/);
      expect(result.fullCode).toContain('T1T2');
    });
  });

  describe('generateNextMoneyDeliveryCode', () => {
    it('should generate money delivery code', async () => {
      MockedRoute.findById = jest.fn()
        .mockResolvedValueOnce(mockToRoute)
        .mockResolvedValueOnce(mockFromRoute);
      
      MockedDelivery.exists = jest.fn().mockResolvedValue(null);
      MockedMoneyDelivery.exists = jest.fn().mockResolvedValue(null);

      const result = await CodeGeneratorService.generateNextMoneyDeliveryCode(
        mockToRouteId,
        mockFromRouteId
      );

      expect(result.code).toMatch(/^\d{10}$/);
      expect(result.fullCode).toContain('T1T2');
    });
  });

  describe('validateCodeFormat', () => {
    it('should validate correct code format', () => {
      expect(CodeGeneratorService.validateCodeFormat('2401250001')).toBe(true);
    });

    it('should reject invalid code format', () => {
      expect(CodeGeneratorService.validateCodeFormat('240125000')).toBe(false); // Too short
      expect(CodeGeneratorService.validateCodeFormat('24012500011')).toBe(false); // Too long
      expect(CodeGeneratorService.validateCodeFormat('240125000a')).toBe(false); // Contains letter
    });

    it('should reject invalid dates', () => {
      expect(CodeGeneratorService.validateCodeFormat('2413250001')).toBe(false); // Invalid month
      expect(CodeGeneratorService.validateCodeFormat('2401320001')).toBe(false); // Invalid day
    });
  });

  describe('parseCode', () => {
    it('should parse valid code', () => {
      const result = CodeGeneratorService.parseCode('2401250001');
      expect(result).toEqual({
        date: new Date(2024, 0, 25), // Month is 0-indexed
        sequence: 1
      });
    });

    it('should return null for invalid code', () => {
      const result = CodeGeneratorService.parseCode('invalid');
      expect(result).toBeNull();
    });
  });

  describe('getNextCodePreview', () => {
    it('should generate code preview', async () => {
      MockedRoute.findById = jest.fn()
        .mockResolvedValueOnce(mockToRoute)
        .mockResolvedValueOnce(mockFromRoute);

      const result = await CodeGeneratorService.getNextCodePreview(
        mockToRouteId,
        mockFromRouteId
      );

      expect(result.code).toMatch(/^\d{10}$/);
      expect(result.fullCode).toContain('T1T2');
      expect(result.subCode).toMatch(/^\d{14}$/);
    });
  });

  describe('getDeliveryCountForDate', () => {
    it('should get delivery count for date', async () => {
      MockedDelivery.countDocuments = jest.fn().mockResolvedValue(5);

      const count = await CodeGeneratorService.getDeliveryCountForDate(new Date('2024-01-25'));

      expect(count).toBe(5);
      expect(MockedDelivery.countDocuments).toHaveBeenCalledWith({
        code: /^2401250\d{4}$/
      });
    });
  });

  describe('getMoneyDeliveryCountForDate', () => {
    it('should get money delivery count for date', async () => {
      MockedMoneyDelivery.countDocuments = jest.fn().mockResolvedValue(3);

      const count = await CodeGeneratorService.getMoneyDeliveryCountForDate(new Date('2024-01-25'));

      expect(count).toBe(3);
      expect(MockedMoneyDelivery.countDocuments).toHaveBeenCalledWith({
        code: /^2401250\d{4}$/
      });
    });
  });
});