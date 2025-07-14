import mongoose from 'mongoose';
import { Customer } from '@/models/customer.model';

describe('Customer Model', () => {
  describe('Schema Validation', () => {
    it('should create customer with valid data', () => {
      const customerData = {
        name: 'John Doe',
        phone: '+1234567890',
      };

      const customer = new Customer(customerData);
      expect(customer.name).toBe(customerData.name);
      expect(customer.phone).toBe(customerData.phone);
    });

    it('should fail validation without name', () => {
      const customerData = {
        phone: '+1234567890',
      };

      const customer = new Customer(customerData);
      const error = customer.validateSync();
      expect(error?.errors.name).toBeDefined();
      expect(error?.errors.name.message).toBe('Name is required');
    });

    it('should fail validation without phone', () => {
      const customerData = {
        name: 'John Doe',
      };

      const customer = new Customer(customerData);
      const error = customer.validateSync();
      expect(error?.errors.phone).toBeDefined();
      expect(error?.errors.phone.message).toBe('Phone is required');
    });

    it('should fail validation with invalid phone format', () => {
      const customerData = {
        name: 'John Doe',
        phone: 'abc123', // Invalid format - contains letters
      };

      const customer = new Customer(customerData);
      const error = customer.validateSync();
      expect(error?.errors.phone).toBeDefined();
      expect(error?.errors.phone.message).toBe('Please enter a valid phone number');
    });

    it('should fail validation with phone starting with 0', () => {
      const customerData = {
        name: 'John Doe',
        phone: '+0123456789', // Invalid - can't start with 0 after +
      };

      const customer = new Customer(customerData);
      const error = customer.validateSync();
      expect(error?.errors.phone).toBeDefined();
    });

    it('should fail validation with name too long', () => {
      const customerData = {
        name: 'a'.repeat(101), // Exceeds 100 characters
        phone: '+1234567890',
      };

      const customer = new Customer(customerData);
      const error = customer.validateSync();
      expect(error?.errors.name).toBeDefined();
      expect(error?.errors.name.message).toBe('Name must not exceed 100 characters');
    });

    it('should accept valid phone formats', () => {
      const validPhones = ['+1234567890', '1234567890', '+12345678901234', '987654321'];

      validPhones.forEach(phone => {
        const customerData = {
          name: 'John Doe',
          phone,
        };

        const customer = new Customer(customerData);
        const error = customer.validateSync();
        expect(error?.errors.phone).toBeUndefined();
      });
    });

    it('should trim whitespace from name and phone', () => {
      const customerData = {
        name: '  John Doe  ',
        phone: '  +1234567890  ',
      };

      const customer = new Customer(customerData);
      expect(customer.name).toBe('John Doe');
      expect(customer.phone).toBe('+1234567890');
    });
  });

  describe('toJSON Transform', () => {
    it('should transform document correctly', () => {
      const customerData = {
        _id: new mongoose.Types.ObjectId(),
        name: 'John Doe',
        phone: '+1234567890',
        __v: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const customer = new Customer(customerData);
      const jsonCustomer = customer.toJSON();

      expect(jsonCustomer.id).toBeDefined();
      expect(jsonCustomer._id).toBeUndefined();
      expect(jsonCustomer.__v).toBeUndefined();
      expect(jsonCustomer.name).toBe(customerData.name);
      expect(jsonCustomer.phone).toBe(customerData.phone);
      expect(jsonCustomer.createdAt).toBeDefined();
      expect(jsonCustomer.updatedAt).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should have compound index on name and phone', () => {
      const indexes = Customer.schema.indexes();
      const compoundIndex = indexes.find(index => index[0].name === 1 && index[0].phone === 1);

      expect(compoundIndex).toBeDefined();
      expect(compoundIndex?.[1].unique).toBe(true);
    });
  });
});
