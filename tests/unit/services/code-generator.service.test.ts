import { CodeGeneratorService } from '@/services/code-generator.service';
import {
  mockDeliveryModel,
  setupCodeGeneratorMocks,
  resetDeliveryMocks,
  MockDelivery
} from '../../utils';

// Mock the Delivery model
jest.mock('@/models/delivery.model', () => {
  const { MockDelivery } = require('../../utils');
  return {
    Delivery: MockDelivery
  };
});

describe('CodeGeneratorService', () => {
  let mocks: ReturnType<typeof setupCodeGeneratorMocks>;

  beforeEach(() => {
    resetDeliveryMocks();
    mocks = setupCodeGeneratorMocks();
  });

  describe('generateNextCode', () => {
    it('should generate first code for a new day', async () => {
      (mockDeliveryModel.find as any).mockReturnValue(mocks.mockEmptyQuery);
      (mockDeliveryModel.findOne as any).mockReturnValue(mocks.mockNullFindOneQuery);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.generateNextCode(testDate);

      expect(result).toBe('2501240001'); // 25/01/24 + 0001
      expect(mockDeliveryModel.find).toHaveBeenCalledWith(
        { code: { $regex: /^250124\d{4}$/ } },
        { code: 1 }
      );
    });

    it('should generate next code in sequence', async () => {
      (mockDeliveryModel.find as any).mockReturnValue(mocks.mockSequenceQuery);
      (mockDeliveryModel.findOne as any).mockReturnValue(mocks.mockNullFindOneQuery);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.generateNextCode(testDate);

      expect(result).toBe('2501240006'); // 25/01/24 + 0006
    });

    it('should handle existing code collision', async () => {
      (mockDeliveryModel.find as any).mockReturnValue(mocks.mockCollisionQuery);
      (mockDeliveryModel.findOne as any)
        .mockReturnValueOnce(mocks.mockCollisionFindOneQuery)
        .mockReturnValueOnce(mocks.mockNoCollisionFindOneQuery);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.generateNextCode(testDate);

      expect(result).toBe('2501240007'); // 25/01/24 + 0007
    });

    it('should throw error when maximum sequence reached', async () => {
      (mockDeliveryModel.find as any).mockReturnValue(mocks.mockMaxSequenceQuery);

      const testDate = new Date('2024-01-25');

      await expect(CodeGeneratorService.generateNextCode(testDate))
        .rejects.toThrow('Maximum number of deliveries (9999) reached for date 250124');
    });

    it('should generate code with today\'s date by default', async () => {
      (mockDeliveryModel.find as any).mockReturnValue(mocks.mockEmptyQuery);
      (mockDeliveryModel.findOne as any).mockReturnValue(mocks.mockNullFindOneQuery);

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
      (mockDeliveryModel.find as any).mockReturnValue(mocks.mockEmptyQuery);
      (mockDeliveryModel.findOne as any).mockReturnValue(mocks.mockNullFindOneQuery);

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
      mockDeliveryModel.countDocuments.mockResolvedValueOnce(5);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.getDeliveryCountForDate(testDate);

      expect(result).toBe(5);
      expect(mockDeliveryModel.countDocuments).toHaveBeenCalledWith({
        code: { $regex: /^250124\d{4}$/ } // 25/01/24
      });
    });

    it('should return 0 for date with no deliveries', async () => {
      mockDeliveryModel.countDocuments.mockResolvedValueOnce(0);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.getDeliveryCountForDate(testDate);

      expect(result).toBe(0);
    });
  });

  describe('isMaxDeliveriesReached', () => {
    it('should return false when under limit', async () => {
      mockDeliveryModel.countDocuments.mockResolvedValueOnce(5000);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.isMaxDeliveriesReached(testDate);

      expect(result).toBe(false);
    });

    it('should return true when at limit', async () => {
      mockDeliveryModel.countDocuments.mockResolvedValueOnce(9999);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.isMaxDeliveriesReached(testDate);

      expect(result).toBe(true);
    });

    it('should return true when over limit', async () => {
      mockDeliveryModel.countDocuments.mockResolvedValueOnce(10000);

      const testDate = new Date('2024-01-25');
      const result = await CodeGeneratorService.isMaxDeliveriesReached(testDate);

      expect(result).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle database errors in generateNextCode', async () => {
      (mockDeliveryModel.find as any).mockReturnValue(mocks.mockErrorQuery);

      await expect(CodeGeneratorService.generateNextCode())
        .rejects.toThrow('Database error');
    });

    it('should handle database errors in getDeliveryCountForDate', async () => {
      mockDeliveryModel.countDocuments.mockRejectedValueOnce(new Error('Database error'));

      await expect(CodeGeneratorService.getDeliveryCountForDate(new Date()))
        .rejects.toThrow('Database error');
    });
  });
});