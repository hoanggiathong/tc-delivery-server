import { CodeGeneratorService } from '@/services/code-generator.service';
import { Delivery } from '@/models/delivery.model';

// Mock the Delivery model
jest.mock('@/models/delivery.model');

describe('CodeGeneratorService', () => {
  let mockDeliveryModel: jest.Mocked<typeof Delivery>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeliveryModel = Delivery as jest.Mocked<typeof Delivery>;
  });

  describe('generateNextCode', () => {
    it('should generate first code for a new day', async () => {
      const testDate = new Date('2024-01-25');

      // Mock findOne to return null (no existing codes)
      const mockFindOneQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      mockDeliveryModel.findOne = jest.fn().mockReturnValue(mockFindOneQuery);

      // Mock the second findOne call (verification)
      const mockVerificationQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };
      mockDeliveryModel.findOne = jest
        .fn()
        .mockReturnValueOnce(mockFindOneQuery) // First call in findLastCodeForDate
        .mockReturnValueOnce(mockVerificationQuery); // Second call in generateNextCode

      const result = await CodeGeneratorService.generateNextCode(testDate);

      expect(result).toBe('2501240001'); // 25/01/24 + 0001
      expect(mockDeliveryModel.findOne).toHaveBeenCalledWith({ code: /^250124\d{4}$/ });
    });

    it('should generate next code in sequence', async () => {
      const testDate = new Date('2024-01-25');

      // Mock findOne to return existing code
      const mockFindOneQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ code: '2501240005' }),
      };

      // Mock the second findOne call (verification)
      const mockVerificationQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };

      mockDeliveryModel.findOne = jest
        .fn()
        .mockReturnValueOnce(mockFindOneQuery) // First call in findLastCodeForDate
        .mockReturnValueOnce(mockVerificationQuery); // Second call in generateNextCode

      const result = await CodeGeneratorService.generateNextCode(testDate);

      expect(result).toBe('2501240006'); // 25/01/24 + 0006
    });

    it('should handle existing code collision', async () => {
      const testDate = new Date('2024-01-25');

      // Mock findOne to return existing code
      const mockFindOneQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ code: '2501240006' }),
      };

      // Mock the verification calls - first one returns existing, second returns null
      const mockVerificationQuery1 = {
        lean: jest.fn().mockResolvedValue({ code: '2501240007' }),
      };
      const mockVerificationQuery2 = {
        lean: jest.fn().mockResolvedValue(null),
      };

      mockDeliveryModel.findOne = jest
        .fn()
        .mockReturnValueOnce(mockFindOneQuery) // First call in findLastCodeForDate (returns 0006)
        .mockReturnValueOnce(mockVerificationQuery1) // First verification (0007 exists)
        .mockReturnValueOnce(mockVerificationQuery2); // Second verification (0008 does not exist)

      const result = await CodeGeneratorService.generateNextCode(testDate);

      expect(result).toBe('2501240008'); // 25/01/24 + 0008
    });

    it('should throw error when maximum sequence reached', async () => {
      const testDate = new Date('2024-01-25');

      // Mock findOne to return maximum code
      const mockFindOneQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ code: '2501249999' }),
      };

      mockDeliveryModel.findOne = jest.fn().mockReturnValue(mockFindOneQuery);

      await expect(CodeGeneratorService.generateNextCode(testDate)).rejects.toThrow(
        'Maximum number of deliveries (9999) reached for date 250124'
      );
    });

    it("should generate code with today's date by default", async () => {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = String(today.getFullYear()).slice(-2);
      const expectedPrefix = `${day}${month}${year}`;

      // Mock findOne to return null
      const mockFindOneQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };

      const mockVerificationQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };

      mockDeliveryModel.findOne = jest
        .fn()
        .mockReturnValueOnce(mockFindOneQuery)
        .mockReturnValueOnce(mockVerificationQuery);

      const result = await CodeGeneratorService.generateNextCode();

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

      const result = await CodeGeneratorService.getNextCodePreview(testDate);

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
    it('should return delivery count for date', async () => {
      const testDate = new Date('2024-01-25');

      mockDeliveryModel.countDocuments = jest.fn().mockResolvedValue(5);

      const result = await CodeGeneratorService.getDeliveryCountForDate(testDate);

      expect(result).toBe(5);
      expect(mockDeliveryModel.countDocuments).toHaveBeenCalledWith({
        code: /^250124\d{4}$/, // 25/01/24
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
      // Mock findOne to throw error
      const mockFindOneQuery = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      mockDeliveryModel.findOne = jest.fn().mockReturnValue(mockFindOneQuery);

      await expect(CodeGeneratorService.generateNextCode()).rejects.toThrow('Database error');
    });

    it('should handle database errors in getDeliveryCountForDate', async () => {
      mockDeliveryModel.countDocuments = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(CodeGeneratorService.getDeliveryCountForDate(new Date())).rejects.toThrow(
        'Database error'
      );
    });
  });
});
