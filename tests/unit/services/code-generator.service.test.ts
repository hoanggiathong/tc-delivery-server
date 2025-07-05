import { CodeGeneratorService } from '@/services/code-generator.service';
import { Delivery } from '@/models/delivery.model';

// Mock the Delivery model
jest.mock('@/models/delivery.model', () => ({
  Delivery: {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn()
  }
}));

const mockDelivery = jest.mocked(Delivery);

describe('CodeGeneratorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateNextCode', () => {
    it('should generate first code for a new day', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };
      (mockDelivery.find as any).mockReturnValue(mockQuery);

      const mockFindOneQuery = {
        lean: jest.fn().mockResolvedValue(null)
      };
      (mockDelivery.findOne as any).mockReturnValue(mockFindOneQuery);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.generateNextCode(testDate);

      expect(result).toBe('2501240001'); // 25/01/24 + 0001
      expect(mockDelivery.find).toHaveBeenCalledWith(
        { code: { $regex: /^250124\d{4}$/ } },
        { code: 1 }
      );
    });

    it('should generate next code in sequence', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ code: '2501240005' }])
      };
      (mockDelivery.find as any).mockReturnValue(mockQuery);

      const mockFindOneQuery = {
        lean: jest.fn().mockResolvedValue(null)
      };
      (mockDelivery.findOne as any).mockReturnValue(mockFindOneQuery);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.generateNextCode(testDate);

      expect(result).toBe('2501240006'); // 25/01/24 + 0006
    });

    it('should handle existing code collision', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ code: '2501240005' }])
      };
      (mockDelivery.find as any).mockReturnValue(mockQuery);

      const mockFindOneQuery1 = {
        lean: jest.fn().mockResolvedValue({ code: '2501240006' })
      };
      const mockFindOneQuery2 = {
        lean: jest.fn().mockResolvedValue(null)
      };
      (mockDelivery.findOne as any)
        .mockReturnValueOnce(mockFindOneQuery1)
        .mockReturnValueOnce(mockFindOneQuery2);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.generateNextCode(testDate);

      expect(result).toBe('2501240007'); // 25/01/24 + 0007
    });

    it('should throw error when maximum sequence reached', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ code: '2501249999' }])
      };
      (mockDelivery.find as any).mockReturnValue(mockQuery);

      const testDate = new Date('2024-01-25');

      await expect(CodeGeneratorService.generateNextCode(testDate))
        .rejects.toThrow('Maximum number of deliveries (9999) reached for date 250124');
    });

    it('should generate code with today\'s date by default', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };
      (mockDelivery.find as any).mockReturnValue(mockQuery);

      const mockFindOneQuery = {
        lean: jest.fn().mockResolvedValue(null)
      };
      (mockDelivery.findOne as any).mockReturnValue(mockFindOneQuery);

      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = String(today.getFullYear()).slice(-2);
      const expectedPrefix = `${day}${month}${year}`;

      const result = await CodeGeneratorService.generateNextCode();

      expect(result).toBe(`${expectedPrefix}0001`);
    });
  });

  describe('getNextCodePreview', () => {
    it('should return next code preview', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };
      (mockDelivery.find as any).mockReturnValue(mockQuery);

      const mockFindOneQuery = {
        lean: jest.fn().mockResolvedValue(null)
      };
      (mockDelivery.findOne as any).mockReturnValue(mockFindOneQuery);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.getNextCodePreview(testDate);

      expect(result).toBe('2501240001'); // 25/01/24 + 0001
    });
  });

  describe('validateCodeFormat', () => {
    it('should validate correct code format', () => {
      expect(CodeGeneratorService.validateCodeFormat('2501240001')).toBe(true); // 25/01/24
      expect(CodeGeneratorService.validateCodeFormat('3112249999')).toBe(true); // 31/12/24
    });

    it('should reject invalid code format', () => {
      expect(CodeGeneratorService.validateCodeFormat('250124000')).toBe(false); // Too short
      expect(CodeGeneratorService.validateCodeFormat('25012400001')).toBe(false); // Too long
      expect(CodeGeneratorService.validateCodeFormat('250124000a')).toBe(false); // Contains letter
      expect(CodeGeneratorService.validateCodeFormat('0001240001')).toBe(false); // Invalid day
      expect(CodeGeneratorService.validateCodeFormat('3201240001')).toBe(false); // Invalid day
      expect(CodeGeneratorService.validateCodeFormat('2500240001')).toBe(false); // Invalid month
      expect(CodeGeneratorService.validateCodeFormat('2513240001')).toBe(false); // Invalid month
      expect(CodeGeneratorService.validateCodeFormat('2501240000')).toBe(false); // Invalid sequence
    });

    it('should validate date logic', () => {
      expect(CodeGeneratorService.validateCodeFormat('2902240001')).toBe(true); // Valid leap year - 29/02/24
      expect(CodeGeneratorService.validateCodeFormat('2902230001')).toBe(false); // Invalid leap year - 29/02/23
      expect(CodeGeneratorService.validateCodeFormat('3004240001')).toBe(true); // Valid April 30 - 30/04/24
      expect(CodeGeneratorService.validateCodeFormat('3104240001')).toBe(false); // Invalid April 31 - 31/04/24
    });
  });

  describe('parseCode', () => {
    it('should parse valid code correctly', () => {
      const result = CodeGeneratorService.parseCode('2501240001');

      expect(result).toEqual({
        date: new Date(2024, 0, 25), // Month is 0-indexed, 25/01/24
        sequence: 1
      });
    });

    it('should return null for invalid code', () => {
      expect(CodeGeneratorService.parseCode('invalid')).toBeNull();
      expect(CodeGeneratorService.parseCode('250124000')).toBeNull(); // Too short
    });

    it('should handle year conversion correctly', () => {
      const result2024 = CodeGeneratorService.parseCode('2501240001'); // 25/01/24
      const result2099 = CodeGeneratorService.parseCode('2501990001'); // 25/01/99

      expect(result2024?.date.getFullYear()).toBe(2024);
      expect(result2099?.date.getFullYear()).toBe(2099);
    });
  });

  describe('getDeliveryCountForDate', () => {
    it('should return delivery count for date', async () => {
      mockDelivery.countDocuments.mockResolvedValueOnce(5);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.getDeliveryCountForDate(testDate);

      expect(result).toBe(5);
      expect(mockDelivery.countDocuments).toHaveBeenCalledWith({
        code: { $regex: /^250124\d{4}$/ } // 25/01/24
      });
    });

    it('should return 0 for date with no deliveries', async () => {
      mockDelivery.countDocuments.mockResolvedValueOnce(0);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.getDeliveryCountForDate(testDate);

      expect(result).toBe(0);
    });
  });

  describe('isMaxDeliveriesReached', () => {
    it('should return false when under limit', async () => {
      mockDelivery.countDocuments.mockResolvedValueOnce(5000);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.isMaxDeliveriesReached(testDate);

      expect(result).toBe(false);
    });

    it('should return true when at limit', async () => {
      mockDelivery.countDocuments.mockResolvedValueOnce(9999);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.isMaxDeliveriesReached(testDate);

      expect(result).toBe(true);
    });

    it('should return true when over limit', async () => {
      mockDelivery.countDocuments.mockResolvedValueOnce(10000);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.isMaxDeliveriesReached(testDate);

      expect(result).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle database errors in generateNextCode', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('Database error'))
      };
      (mockDelivery.find as any).mockReturnValue(mockQuery);

      await expect(CodeGeneratorService.generateNextCode())
        .rejects.toThrow('Database error');
    });

    it('should handle database errors in getDeliveryCountForDate', async () => {
      mockDelivery.countDocuments.mockRejectedValueOnce(new Error('Database error'));

      await expect(CodeGeneratorService.getDeliveryCountForDate(new Date()))
        .rejects.toThrow('Database error');
    });
  });
});