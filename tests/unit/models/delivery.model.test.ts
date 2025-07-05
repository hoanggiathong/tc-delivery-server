import mongoose from 'mongoose';
import { Delivery } from '@/models/delivery.model';

describe('Delivery Model', () => {
  const validDeliveryData = {
    sender: new mongoose.Types.ObjectId(),
    receiver: new mongoose.Types.ObjectId(),
    fromRoute: new mongoose.Types.ObjectId(),
    toRoute: new mongoose.Types.ObjectId(),
    name: 'Test Item',
    cost: 100,
    homeDelivery: '123 Main St',
    homeDeliveryCost: 50,
    itemValue: 200,
    itemCost: 150,
    collectCost: 25,
    collectForCustomer: 75,
    collectForCustomerCost: 10,
    collectForCustomerNote: 'Handle with care',
    createdByUser: new mongoose.Types.ObjectId()
  };

  describe('Schema Validation', () => {
    it('should create delivery with valid data', () => {
      const delivery = new Delivery(validDeliveryData);
      expect(delivery.sender).toEqual(validDeliveryData.sender);
      expect(delivery.receiver).toEqual(validDeliveryData.receiver);
      expect(delivery.fromRoute).toEqual(validDeliveryData.fromRoute);
      expect(delivery.toRoute).toEqual(validDeliveryData.toRoute);
      expect(delivery.name).toBe(validDeliveryData.name);
      expect(delivery.cost).toBe(validDeliveryData.cost);
    });

    it('should fail validation without sender', () => {
      const deliveryData = { ...validDeliveryData };
      delete (deliveryData as any).sender;

      const delivery = new Delivery(deliveryData);
      const error = delivery.validateSync();
      expect(error?.errors.sender).toBeDefined();
      expect(error?.errors.sender.message).toBe('Sender is required');
    });

    it('should fail validation without receiver', () => {
      const deliveryData = { ...validDeliveryData };
      delete (deliveryData as any).receiver;

      const delivery = new Delivery(deliveryData);
      const error = delivery.validateSync();
      expect(error?.errors.receiver).toBeDefined();
      expect(error?.errors.receiver.message).toBe('Receiver is required');
    });

    it('should fail validation without fromRoute', () => {
      const deliveryData = { ...validDeliveryData };
      delete (deliveryData as any).fromRoute;

      const delivery = new Delivery(deliveryData);
      const error = delivery.validateSync();
      expect(error?.errors.fromRoute).toBeDefined();
      expect(error?.errors.fromRoute.message).toBe('From route is required');
    });

    it('should fail validation without toRoute', () => {
      const deliveryData = { ...validDeliveryData };
      delete (deliveryData as any).toRoute;

      const delivery = new Delivery(deliveryData);
      const error = delivery.validateSync();
      expect(error?.errors.toRoute).toBeDefined();
      expect(error?.errors.toRoute.message).toBe('To route is required');
    });

    it('should fail validation without item name', () => {
      const deliveryData = { ...validDeliveryData };
      delete (deliveryData as any).name;

      const delivery = new Delivery(deliveryData);
      const error = delivery.validateSync();
      expect(error?.errors.name).toBeDefined();
      expect(error?.errors.name.message).toBe('Item name is required');
    });

    it('should fail validation with negative cost', () => {
      const deliveryData = {
        ...validDeliveryData,
        cost: -100
      };

      const delivery = new Delivery(deliveryData);
      const error = delivery.validateSync();
      expect(error?.errors.cost).toBeDefined();
      expect(error?.errors.cost.message).toBe('Cost must be positive');
    });

    it('should fail validation with negative home delivery cost', () => {
      const deliveryData = {
        ...validDeliveryData,
        homeDeliveryCost: -50
      };

      const delivery = new Delivery(deliveryData);
      const error = delivery.validateSync();
      expect(error?.errors.homeDeliveryCost).toBeDefined();
      expect(error?.errors.homeDeliveryCost.message).toBe('Home delivery cost must be positive');
    });

    it('should fail validation with negative item value', () => {
      const deliveryData = {
        ...validDeliveryData,
        itemValue: -200
      };

      const delivery = new Delivery(deliveryData);
      const error = delivery.validateSync();
      expect(error?.errors.itemValue).toBeDefined();
      expect(error?.errors.itemValue.message).toBe('Item value must be positive');
    });

    it('should fail validation with negative item cost', () => {
      const deliveryData = {
        ...validDeliveryData,
        itemCost: -150
      };

      const delivery = new Delivery(deliveryData);
      const error = delivery.validateSync();
      expect(error?.errors.itemCost).toBeDefined();
      expect(error?.errors.itemCost.message).toBe('Item cost must be positive');
    });

    it('should fail validation with negative collect cost', () => {
      const deliveryData = {
        ...validDeliveryData,
        collectCost: -25
      };

      const delivery = new Delivery(deliveryData);
      const error = delivery.validateSync();
      expect(error?.errors.collectCost).toBeDefined();
      expect(error?.errors.collectCost.message).toBe('Collect cost must be positive');
    });

    it('should fail validation with negative collect for customer amount', () => {
      const deliveryData = {
        ...validDeliveryData,
        collectForCustomer: -75
      };

      const delivery = new Delivery(deliveryData);
      const error = delivery.validateSync();
      expect(error?.errors.collectForCustomer).toBeDefined();
      expect(error?.errors.collectForCustomer.message).toBe('Collect for customer amount must be positive');
    });

    it('should fail validation with negative collect for customer cost', () => {
      const deliveryData = {
        ...validDeliveryData,
        collectForCustomerCost: -10
      };

      const delivery = new Delivery(deliveryData);
      const error = delivery.validateSync();
      expect(error?.errors.collectForCustomerCost).toBeDefined();
      expect(error?.errors.collectForCustomerCost.message).toBe('Collect for customer cost must be positive');
    });

    it('should set default value for collectForCustomer', () => {
      const deliveryData = { ...validDeliveryData };
      delete (deliveryData as any).collectForCustomer;

      const delivery = new Delivery(deliveryData);
      expect(delivery.collectForCustomer).toBe(0);
    });

    it('should trim whitespace from string fields', () => {
      const deliveryData = {
        ...validDeliveryData,
        name: '  Test Item  ',
        homeDelivery: '  123 Main St  ',
        collectForCustomerNote: '  Handle with care  '
      };

      const delivery = new Delivery(deliveryData);
      expect(delivery.name).toBe('Test Item');
      expect(delivery.homeDelivery).toBe('123 Main St');
      expect(delivery.collectForCustomerNote).toBe('Handle with care');
    });

    it('should allow optional collectForCustomerNote', () => {
      const deliveryData = { ...validDeliveryData };
      delete (deliveryData as any).collectForCustomerNote;

      const delivery = new Delivery(deliveryData);
      const error = delivery.validateSync();
      expect(error?.errors.collectForCustomerNote).toBeUndefined();
    });
  });

  describe('toJSON Transform', () => {
    it('should transform document correctly', () => {
      const deliveryData = {
        _id: new mongoose.Types.ObjectId(),
        ...validDeliveryData,
        __v: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const delivery = new Delivery(deliveryData);
      const jsonDelivery = delivery.toJSON();

      expect(jsonDelivery.id).toBeDefined();
      expect(jsonDelivery._id).toBeUndefined();
      expect(jsonDelivery.__v).toBeUndefined();
      expect(jsonDelivery.sender).toEqual(validDeliveryData.sender);
      expect(jsonDelivery.receiver).toEqual(validDeliveryData.receiver);
      expect(jsonDelivery.fromRoute).toEqual(validDeliveryData.fromRoute);
      expect(jsonDelivery.toRoute).toEqual(validDeliveryData.toRoute);
      expect(jsonDelivery.name).toBe(validDeliveryData.name);
      expect(jsonDelivery.cost).toBe(validDeliveryData.cost);
      expect(jsonDelivery.createdAt).toBeDefined();
      expect(jsonDelivery.updatedAt).toBeDefined();
    });
  });
});