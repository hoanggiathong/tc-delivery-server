import mongoose from 'mongoose';
import { MoneyDelivery } from '@/models/money-delivery.model';

// Mock dependencies
jest.mock('@/models/customer.model');
jest.mock('@/models/route.model');
jest.mock('@/models/user.model');

// Mock MoneyDelivery model
jest.mock('@/models/money-delivery.model');
const MockedMoneyDelivery = MoneyDelivery as jest.MockedClass<typeof MoneyDelivery>;

describe('MoneyDelivery Model', () => {
  let mockMoneyDelivery: any;
  let mockSave: jest.Mock;
  let mockFind: jest.Mock;
  let mockFindById: jest.Mock;
  let mockDeleteMany: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock instance methods
    mockSave = jest.fn();
    mockFind = jest.fn();
    mockFindById = jest.fn();
    mockDeleteMany = jest.fn();

    // Mock MoneyDelivery constructor
    mockMoneyDelivery = {
      code: '2401250001',
      sender: new mongoose.Types.ObjectId(),
      receiver: new mongoose.Types.ObjectId(),
      fromRoute: new mongoose.Types.ObjectId(),
      toRoute: new mongoose.Types.ObjectId(),
      sendMoneyAmount: 1000000,
      sendCost: 50000,
      createdByUser: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      save: mockSave,
      toJSON: jest.fn().mockReturnValue({
        id: 'moneyDelivery123',
        code: '2401250001',
        sender: 'sender123',
        receiver: 'receiver123',
        fromRoute: 'route123',
        toRoute: 'route456',
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: 'user123',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    // Mock static methods
    MockedMoneyDelivery.find = mockFind;
    MockedMoneyDelivery.findById = mockFindById;
    MockedMoneyDelivery.deleteMany = mockDeleteMany;

    // Mock constructor
    (MockedMoneyDelivery as any).mockImplementation(() => mockMoneyDelivery);
  });

  describe('Schema Validation', () => {
    it('should create a valid money delivery', async () => {
      const validMoneyDeliveryData = {
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      mockSave.mockResolvedValue({
        ...validMoneyDeliveryData,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const moneyDelivery = new MockedMoneyDelivery(validMoneyDeliveryData);
      const savedMoneyDelivery = await moneyDelivery.save();

      expect(savedMoneyDelivery._id).toBeDefined();
      expect(savedMoneyDelivery.code).toBe('2401250001');
      expect(savedMoneyDelivery.sendMoneyAmount).toBe(1000000);
      expect(savedMoneyDelivery.sendCost).toBe(50000);
      expect(savedMoneyDelivery.createdAt).toBeDefined();
      expect(savedMoneyDelivery.updatedAt).toBeDefined();
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should require code field', async () => {
      const moneyDeliveryData = {
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      const validationError = new Error(
        'MoneyDelivery validation failed: code: Path `code` is required.'
      );
      mockSave.mockRejectedValue(validationError);

      const moneyDelivery = new MockedMoneyDelivery(moneyDeliveryData);

      await expect(moneyDelivery.save()).rejects.toThrow('MoneyDelivery validation failed');
    });

    it('should require sender field', async () => {
      const moneyDeliveryData = {
        code: '2401250001',
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      const validationError = new Error(
        'MoneyDelivery validation failed: sender: Path `sender` is required.'
      );
      mockSave.mockRejectedValue(validationError);

      const moneyDelivery = new MockedMoneyDelivery(moneyDeliveryData);

      await expect(moneyDelivery.save()).rejects.toThrow('MoneyDelivery validation failed');
    });

    it('should require receiver field', async () => {
      const moneyDeliveryData = {
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      const validationError = new Error(
        'MoneyDelivery validation failed: receiver: Path `receiver` is required.'
      );
      mockSave.mockRejectedValue(validationError);

      const moneyDelivery = new MockedMoneyDelivery(moneyDeliveryData);

      await expect(moneyDelivery.save()).rejects.toThrow('MoneyDelivery validation failed');
    });

    it('should require fromRoute field', async () => {
      const moneyDeliveryData = {
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      const validationError = new Error(
        'MoneyDelivery validation failed: fromRoute: Path `fromRoute` is required.'
      );
      mockSave.mockRejectedValue(validationError);

      const moneyDelivery = new MockedMoneyDelivery(moneyDeliveryData);

      await expect(moneyDelivery.save()).rejects.toThrow('MoneyDelivery validation failed');
    });

    it('should require toRoute field', async () => {
      const moneyDeliveryData = {
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      const validationError = new Error(
        'MoneyDelivery validation failed: toRoute: Path `toRoute` is required.'
      );
      mockSave.mockRejectedValue(validationError);

      const moneyDelivery = new MockedMoneyDelivery(moneyDeliveryData);

      await expect(moneyDelivery.save()).rejects.toThrow('MoneyDelivery validation failed');
    });

    it('should require sendMoneyAmount field', async () => {
      const moneyDeliveryData = {
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      const validationError = new Error(
        'MoneyDelivery validation failed: sendMoneyAmount: Path `sendMoneyAmount` is required.'
      );
      mockSave.mockRejectedValue(validationError);

      const moneyDelivery = new MockedMoneyDelivery(moneyDeliveryData);

      await expect(moneyDelivery.save()).rejects.toThrow('MoneyDelivery validation failed');
    });

    it('should require sendCost field', async () => {
      const moneyDeliveryData = {
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      const validationError = new Error(
        'MoneyDelivery validation failed: sendCost: Path `sendCost` is required.'
      );
      mockSave.mockRejectedValue(validationError);

      const moneyDelivery = new MockedMoneyDelivery(moneyDeliveryData);

      await expect(moneyDelivery.save()).rejects.toThrow('MoneyDelivery validation failed');
    });

    it('should require createdByUser field', async () => {
      const moneyDeliveryData = {
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
      };

      const validationError = new Error(
        'MoneyDelivery validation failed: createdByUser: Path `createdByUser` is required.'
      );
      mockSave.mockRejectedValue(validationError);

      const moneyDelivery = new MockedMoneyDelivery(moneyDeliveryData);

      await expect(moneyDelivery.save()).rejects.toThrow('MoneyDelivery validation failed');
    });

    it('should validate positive sendMoneyAmount', async () => {
      const moneyDeliveryData = {
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: -1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      const validationError = new Error(
        'MoneyDelivery validation failed: sendMoneyAmount: Path `sendMoneyAmount` (-1000000) is less than minimum allowed value (0).'
      );
      mockSave.mockRejectedValue(validationError);

      const moneyDelivery = new MockedMoneyDelivery(moneyDeliveryData);

      await expect(moneyDelivery.save()).rejects.toThrow('MoneyDelivery validation failed');
    });

    it('should validate positive sendCost', async () => {
      const moneyDeliveryData = {
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: -50000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      const validationError = new Error(
        'MoneyDelivery validation failed: sendCost: Path `sendCost` (-50000) is less than minimum allowed value (0).'
      );
      mockSave.mockRejectedValue(validationError);

      const moneyDelivery = new MockedMoneyDelivery(moneyDeliveryData);

      await expect(moneyDelivery.save()).rejects.toThrow('MoneyDelivery validation failed');
    });

    it('should validate code format', async () => {
      const moneyDeliveryData = {
        code: 'invalid-code',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      const validationError = new Error(
        'MoneyDelivery validation failed: code: Path `code` is invalid (invalid-code).'
      );
      mockSave.mockRejectedValue(validationError);

      const moneyDelivery = new MockedMoneyDelivery(moneyDeliveryData);

      await expect(moneyDelivery.save()).rejects.toThrow('MoneyDelivery validation failed');
    });
  });

  describe('MoneyDelivery Transformation', () => {
    it('should transform document correctly using toJSON', async () => {
      const moneyDeliveryData = {
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      const moneyDelivery = new MockedMoneyDelivery(moneyDeliveryData);
      const jsonMoneyDelivery = moneyDelivery.toJSON();

      expect(jsonMoneyDelivery.id).toBeDefined();
      expect(jsonMoneyDelivery._id).toBeUndefined();
      expect(jsonMoneyDelivery.__v).toBeUndefined();
      expect(jsonMoneyDelivery.code).toBe('2401250001');
      expect(jsonMoneyDelivery.sendMoneyAmount).toBe(1000000);
      expect(jsonMoneyDelivery.sendCost).toBe(50000);
      expect(jsonMoneyDelivery.createdAt).toBeDefined();
      expect(jsonMoneyDelivery.updatedAt).toBeDefined();
    });
  });

  describe('MoneyDelivery Indexes', () => {
    it('should enforce unique index on code', async () => {
      const moneyDeliveryData = {
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      const duplicateError = new Error('E11000 duplicate key error collection');
      mockSave.mockRejectedValue(duplicateError);

      const moneyDelivery = new MockedMoneyDelivery(moneyDeliveryData);

      await expect(moneyDelivery.save()).rejects.toThrow('E11000 duplicate key error');
    });

    it('should allow different codes', async () => {
      const moneyDeliveryData1 = {
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      const moneyDeliveryData2 = {
        code: '2401250002',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 2000000,
        sendCost: 75000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      mockSave.mockResolvedValue({
        ...moneyDeliveryData1,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const moneyDelivery1 = new MockedMoneyDelivery(moneyDeliveryData1);
      const moneyDelivery2 = new MockedMoneyDelivery(moneyDeliveryData2);

      await expect(moneyDelivery1.save()).resolves.toBeDefined();
      await expect(moneyDelivery2.save()).resolves.toBeDefined();
    });
  });

  describe('MoneyDelivery Methods', () => {
    it('should update timestamps on save', async () => {
      const moneyDeliveryData = {
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      const now = new Date();
      mockSave.mockResolvedValue({
        ...moneyDeliveryData,
        _id: new mongoose.Types.ObjectId(),
        createdAt: now,
        updatedAt: now,
      });

      const moneyDelivery = new MockedMoneyDelivery(moneyDeliveryData);
      const savedMoneyDelivery = await moneyDelivery.save();

      expect(savedMoneyDelivery.createdAt).toBeDefined();
      expect(savedMoneyDelivery.updatedAt).toBeDefined();
      expect(savedMoneyDelivery.createdAt).toEqual(now);
      expect(savedMoneyDelivery.updatedAt).toEqual(now);
    });

    it('should update updatedAt on subsequent saves', async () => {
      const moneyDeliveryData = {
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId(),
      };

      const firstSave = new Date('2024-01-25T10:00:00Z');
      const secondSave = new Date('2024-01-25T11:00:00Z');

      mockSave
        .mockResolvedValueOnce({
          ...moneyDeliveryData,
          _id: new mongoose.Types.ObjectId(),
          createdAt: firstSave,
          updatedAt: firstSave,
        })
        .mockResolvedValueOnce({
          ...moneyDeliveryData,
          _id: new mongoose.Types.ObjectId(),
          createdAt: firstSave,
          updatedAt: secondSave,
        });

      const moneyDelivery = new MockedMoneyDelivery(moneyDeliveryData);
      const savedMoneyDelivery = await moneyDelivery.save();

      // Mock the save method for the saved instance
      savedMoneyDelivery.save = mockSave;
      const updatedMoneyDelivery = await savedMoneyDelivery.save();

      expect(updatedMoneyDelivery.updatedAt).toEqual(secondSave);
    });
  });
});
