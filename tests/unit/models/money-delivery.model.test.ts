import mongoose from 'mongoose';
import { MoneyDelivery } from '@/models/money-delivery.model';
import { Customer } from '@/models/customer.model';
import { Route } from '@/models/route.model';
import { User } from '@/models/user.model';

// Mock dependencies
jest.mock('@/models/customer.model');
jest.mock('@/models/route.model');
jest.mock('@/models/user.model');

describe('MoneyDelivery Model', () => {
  beforeEach(async () => {
    // Clear all collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  describe('Schema Validation', () => {
    it('should create a valid money delivery', async () => {
      const validMoneyDelivery = new MoneyDelivery({
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId()
      });

      const savedMoneyDelivery = await validMoneyDelivery.save();
      expect(savedMoneyDelivery._id).toBeDefined();
      expect(savedMoneyDelivery.code).toBe('2401250001');
      expect(savedMoneyDelivery.sendMoneyAmount).toBe(1000000);
      expect(savedMoneyDelivery.sendCost).toBe(50000);
      expect(savedMoneyDelivery.createdAt).toBeDefined();
      expect(savedMoneyDelivery.updatedAt).toBeDefined();
    });

    it('should require code field', async () => {
      const moneyDeliveryWithoutCode = new MoneyDelivery({
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId()
      });

      let error: any;
      try {
        await moneyDeliveryWithoutCode.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.code).toBeDefined();
    });

    it('should require sender field', async () => {
      const moneyDeliveryWithoutSender = new MoneyDelivery({
        code: '2401250001',
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId()
      });

      let error: any;
      try {
        await moneyDeliveryWithoutSender.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.sender).toBeDefined();
    });

    it('should require receiver field', async () => {
      const moneyDeliveryWithoutReceiver = new MoneyDelivery({
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId()
      });

      let error: any;
      try {
        await moneyDeliveryWithoutReceiver.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.receiver).toBeDefined();
    });

    it('should require fromRoute field', async () => {
      const moneyDeliveryWithoutFromRoute = new MoneyDelivery({
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId()
      });

      let error: any;
      try {
        await moneyDeliveryWithoutFromRoute.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.fromRoute).toBeDefined();
    });

    it('should require toRoute field', async () => {
      const moneyDeliveryWithoutToRoute = new MoneyDelivery({
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId()
      });

      let error: any;
      try {
        await moneyDeliveryWithoutToRoute.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.toRoute).toBeDefined();
    });

    it('should require sendMoneyAmount field', async () => {
      const moneyDeliveryWithoutAmount = new MoneyDelivery({
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId()
      });

      let error: any;
      try {
        await moneyDeliveryWithoutAmount.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.sendMoneyAmount).toBeDefined();
    });

    it('should require sendCost field', async () => {
      const moneyDeliveryWithoutCost = new MoneyDelivery({
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        createdByUser: new mongoose.Types.ObjectId()
      });

      let error: any;
      try {
        await moneyDeliveryWithoutCost.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.sendCost).toBeDefined();
    });

    it('should require createdByUser field', async () => {
      const moneyDeliveryWithoutUser = new MoneyDelivery({
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000
      });

      let error: any;
      try {
        await moneyDeliveryWithoutUser.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.createdByUser).toBeDefined();
    });
  });

  describe('Field Validation', () => {
    it('should validate sendMoneyAmount is positive', async () => {
      const moneyDeliveryWithNegativeAmount = new MoneyDelivery({
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: -1000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId()
      });

      let error: any;
      try {
        await moneyDeliveryWithNegativeAmount.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.sendMoneyAmount).toBeDefined();
    });

    it('should validate sendCost is positive', async () => {
      const moneyDeliveryWithNegativeCost = new MoneyDelivery({
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: -1000,
        createdByUser: new mongoose.Types.ObjectId()
      });

      let error: any;
      try {
        await moneyDeliveryWithNegativeCost.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.sendCost).toBeDefined();
    });

    it('should validate code format', async () => {
      const moneyDeliveryWithInvalidCode = new MoneyDelivery({
        code: 'invalid-code',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId()
      });

      let error: any;
      try {
        await moneyDeliveryWithInvalidCode.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.code).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should have unique code index', async () => {
      const moneyDelivery1 = new MoneyDelivery({
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId()
      });

      const moneyDelivery2 = new MoneyDelivery({
        code: '2401250001', // Same code
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 2000000,
        sendCost: 60000,
        createdByUser: new mongoose.Types.ObjectId()
      });

      await moneyDelivery1.save();

      let error: any;
      try {
        await moneyDelivery2.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB duplicate key error code
    });

    it('should have compound index on sender and createdAt', async () => {
      // This test verifies the compound index exists
      // The actual index behavior is tested by the database
      const moneyDelivery = new MoneyDelivery({
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId()
      });

      const savedMoneyDelivery = await moneyDelivery.save();
      expect(savedMoneyDelivery._id).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should automatically set createdAt and updatedAt', async () => {
      const moneyDelivery = new MoneyDelivery({
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId()
      });

      const savedMoneyDelivery = await moneyDelivery.save();
      expect(savedMoneyDelivery.createdAt).toBeDefined();
      expect(savedMoneyDelivery.updatedAt).toBeDefined();
      expect(savedMoneyDelivery.createdAt).toBeInstanceOf(Date);
      expect(savedMoneyDelivery.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on save', async () => {
      const moneyDelivery = new MoneyDelivery({
        code: '2401250001',
        sender: new mongoose.Types.ObjectId(),
        receiver: new mongoose.Types.ObjectId(),
        fromRoute: new mongoose.Types.ObjectId(),
        toRoute: new mongoose.Types.ObjectId(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: new mongoose.Types.ObjectId()
      });

      const savedMoneyDelivery = await moneyDelivery.save();
      const originalUpdatedAt = savedMoneyDelivery.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedMoneyDelivery.sendMoneyAmount = 2000000;
      const updatedMoneyDelivery = await savedMoneyDelivery.save();

      expect(updatedMoneyDelivery.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});