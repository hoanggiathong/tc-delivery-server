import { CodeGeneratorService } from '@/services/code-generator.service';
import { Delivery } from '@/models/delivery.model';
import { DeliveryCounter } from '@/models/delivery-counter.model';
import { Types } from 'mongoose';

// Mock the models
jest.mock('@/models/delivery.model');
jest.mock('@/models/delivery-counter.model');

describe('CodeGeneratorService', () => {
  let mockDeliveryModel: jest.Mocked<typeof Delivery>;
  let mockDeliveryCounterModel: jest.Mocked<typeof DeliveryCounter>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeliveryModel = Delivery as jest.Mocked<typeof Delivery>;
    mockDeliveryCounterModel = DeliveryCounter as jest.Mocked<typeof DeliveryCounter>;
  });

  describe('generateNextCode', () => {
    it('should generate first code for a new day', async () => {
      const testDate = new Date('2024-01-25');

      // Mock DeliveryCounter.findOneAndUpdate to return counter with sequence 1
      const mockCounter = {
        deliverySequence: 1,
        datePrefix: '250124',
        toRoute: new Types.ObjectId('507f1f77bcf86cd799439011'),
      };
      mockDeliveryCounterModel.findOneAndUpdate = jest.fn().mockResolvedValue(mockCounter);

      // Mock Delivery.exists to return false (no duplicate)
      mockDeliveryModel.exists = jest.fn().mockResolvedValue(false);

      const result = await CodeGeneratorService.generateNextCode(
        '507f1f77bcf86cd799439011',
        testDate
      );

      expect(result).toBe('2501240001'); // 25/01/24 + 0001
      expect(mockDeliveryCounterModel.findOneAndUpdate).toHaveBeenCalledWith(
        { datePrefix: '250124', toRoute: new Types.ObjectId('507f1f77bcf86cd799439011') },
        { $inc: { deliverySequence: 1 } },
        { new: true, upsert: true }
      );
    });

    it('should generate next code in sequence', async () => {
      const testDate = new Date('2024-01-25');

      // Mock DeliveryCounter.findOneAndUpdate to return counter with sequence 6
      const mockCounter = {
        deliverySequence: 6,
        datePrefix: '250124',
        toRoute: new Types.ObjectId('507f1f77bcf86cd799439011'),
      };
      mockDeliveryCounterModel.findOneAndUpdate = jest.fn().mockResolvedValue(mockCounter);

      // Mock Delivery.exists to return false (no duplicate)
      mockDeliveryModel.exists = jest.fn().mockResolvedValue(false);

      const result = await CodeGeneratorService.generateNextCode(
        '507f1f77bcf86cd799439011',
        testDate
      );

      expect(result).toBe('2501240006'); // 25/01/24 + 0006
    });

    it('should handle existing code collision', async () => {
      const testDate = new Date('2024-01-25');

      // Mock DeliveryCounter.findOneAndUpdate to return counter with sequence 8
      const mockCounter = {
        deliverySequence: 8,
        datePrefix: '250124',
        toRoute: new Types.ObjectId('507f1f77bcf86cd799439011'),
      };
      mockDeliveryCounterModel.findOneAndUpdate = jest.fn().mockResolvedValue(mockCounter);

      // Mock Delivery.exists to return false (no duplicate after retry)
      mockDeliveryModel.exists = jest.fn().mockResolvedValue(false);

      const result = await CodeGeneratorService.generateNextCode(
        '507f1f77bcf86cd799439011',
        testDate
      );

      expect(result).toBe('2501240008'); // 25/01/24 + 0008
    });

    it('should throw error when maximum sequence reached', async () => {
      const testDate = new Date('2024-01-25');

      // Mock DeliveryCounter.findOneAndUpdate to return counter exceeding maximum
      const mockCounter = {
        deliverySequence: 10000, // Exceeds MAX_SEQUENCE (9999)
        datePrefix: '250124',
        toRoute: new Types.ObjectId('507f1f77bcf86cd799439011'),
      };
      mockDeliveryCounterModel.findOneAndUpdate = jest.fn().mockResolvedValue(mockCounter);

      await expect(
        CodeGeneratorService.generateNextCode('507f1f77bcf86cd799439011', testDate)
      ).rejects.toThrow('Maximum number of deliveries (9999) reached for date 250124');
    });

    it("should generate code with today's date by default", async () => {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = String(today.getFullYear()).slice(-2);
      const expectedPrefix = `${day}${month}${year}`;

      // Mock DeliveryCounter.findOneAndUpdate to return counter with sequence 1
      const mockCounter = {
        deliverySequence: 1,
        datePrefix: expectedPrefix,
        toRoute: new Types.ObjectId('507f1f77bcf86cd799439011'),
      };
      mockDeliveryCounterModel.findOneAndUpdate = jest.fn().mockResolvedValue(mockCounter);

      // Mock Delivery.exists to return false (no duplicate)
      mockDeliveryModel.exists = jest.fn().mockResolvedValue(false);

      const result = await CodeGeneratorService.generateNextCode('507f1f77bcf86cd799439011');

      expect(result).toMatch(new RegExp(`^${expectedPrefix}0001$`));
    });
  });

  describe('getNextCodePreview', () => {
    it('should return next code preview', async () => {
      const testDate = new Date('2024-01-25');

      // Mock findOne to return existing code
      const mockFindOneQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ code: '2501240005' }),
      };

      mockDeliveryModel.findOne = jest.fn().mockReturnValue(mockFindOneQuery);

      const result = await CodeGeneratorService.getNextCodePreview(
        '507f1f77bcf86cd799439011',
        testDate
      );

      expect(result).toBe('2501240006');
    });
  });

  describe('validateCodeFormat', () => {
    it('should validate correct code format', () => {
      expect(CodeGeneratorService.validateCodeFormat('2501240001')).toBe(true);
      expect(CodeGeneratorService.validateCodeFormat('3112239999')).toBe(true);
    });

    it('should reject invalid code format', () => {
      expect(CodeGeneratorService.validateCodeFormat('250124001')).toBe(false); // Too short
      expect(CodeGeneratorService.validateCodeFormat('25012400001')).toBe(false); // Too long
      expect(CodeGeneratorService.validateCodeFormat('2501240000')).toBe(false); // Invalid sequence
      expect(CodeGeneratorService.validateCodeFormat('3201240001')).toBe(false); // Invalid day
      expect(CodeGeneratorService.validateCodeFormat('2513240001')).toBe(false); // Invalid month
      expect(CodeGeneratorService.validateCodeFormat('250124abcd')).toBe(false); // Non-numeric
    });

    it('should validate date logic', () => {
      expect(CodeGeneratorService.validateCodeFormat('2902240001')).toBe(true); // Valid leap year
      expect(CodeGeneratorService.validateCodeFormat('3002240001')).toBe(false); // Invalid leap year
      expect(CodeGeneratorService.validateCodeFormat('3104240001')).toBe(false); // Invalid April 31st
    });
  });

  describe('parseCode', () => {
    it('should parse valid code correctly', () => {
      const result = CodeGeneratorService.parseCode('2501240001');
      expect(result).toEqual({
        date: new Date(2024, 0, 25), // January 25, 2024
        sequence: 1,
      });
    });

    it('should return null for invalid code', () => {
      expect(CodeGeneratorService.parseCode('2501240000')).toBeNull();
      expect(CodeGeneratorService.parseCode('invalid')).toBeNull();
    });

    it('should handle year conversion correctly', () => {
      const result = CodeGeneratorService.parseCode('2501240001');
      expect(result?.date.getFullYear()).toBe(2024);
    });
  });

  describe('getDeliveryCountForDate', () => {
    it('should return delivery count for date without toRoute filter', async () => {
      const testDate = new Date('2024-01-25');

      mockDeliveryModel.countDocuments = jest.fn().mockResolvedValue(5);

      const result = await CodeGeneratorService.getDeliveryCountForDate(testDate);

      expect(result).toBe(5);
      expect(mockDeliveryModel.countDocuments).toHaveBeenCalledWith({
        code: /^250124\d{4}$/, // 25/01/24
      });
    });

    it('should return delivery count for date with toRoute filter', async () => {
      const testDate = new Date('2024-01-25');

      mockDeliveryModel.countDocuments = jest.fn().mockResolvedValue(3);

      const result = await CodeGeneratorService.getDeliveryCountForDate(
        testDate,
        '507f1f77bcf86cd799439011'
      );

      expect(result).toBe(3);
      expect(mockDeliveryModel.countDocuments).toHaveBeenCalledWith({
        code: /^250124\d{4}$/, // 25/01/24
        toRoute: new Types.ObjectId('507f1f77bcf86cd799439011'),
      });
    });

    it('should return 0 for date with no deliveries', async () => {
      const testDate = new Date('2024-01-25');

      mockDeliveryModel.countDocuments = jest.fn().mockResolvedValue(0);

      const result = await CodeGeneratorService.getDeliveryCountForDate(testDate);

      expect(result).toBe(0);
    });
  });

  describe('isMaxDeliveriesReached', () => {
    it('should return false when under limit', async () => {
      const testDate = new Date('2024-01-25');

      mockDeliveryModel.countDocuments = jest.fn().mockResolvedValue(5000);

      const result = await CodeGeneratorService.isMaxDeliveriesReached(testDate);

      expect(result).toBe(false);
    });

    it('should return true when at limit', async () => {
      const testDate = new Date('2024-01-25');

      mockDeliveryModel.countDocuments = jest.fn().mockResolvedValue(9999);

      const result = await CodeGeneratorService.isMaxDeliveriesReached(testDate);

      expect(result).toBe(true);
    });

    it('should return true when over limit', async () => {
      const testDate = new Date('2024-01-25');

      mockDeliveryModel.countDocuments = jest.fn().mockResolvedValue(10000);

      const result = await CodeGeneratorService.isMaxDeliveriesReached(testDate);

      expect(result).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle database errors in generateNextCode', async () => {
      // Mock DeliveryCounter.findOneAndUpdate to throw error
      mockDeliveryCounterModel.findOneAndUpdate = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      await expect(
        CodeGeneratorService.generateNextCode('507f1f77bcf86cd799439011')
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors in getDeliveryCountForDate', async () => {
      mockDeliveryModel.countDocuments = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(CodeGeneratorService.getDeliveryCountForDate(new Date())).rejects.toThrow(
        'Database error'
      );
    });
  });
});
