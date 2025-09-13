import { CustomerService } from '@/services/customer.service';
import { Customer } from '@/models/customer.model';

// Mock Customer model
jest.mock('@/models/customer.model');
const MockedCustomer = Customer as jest.MockedClass<typeof Customer>;

describe('CustomerService', () => {
  let customerService: CustomerService;
  let mockCustomerInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    customerService = new CustomerService();

    // Mock customer instance
    mockCustomerInstance = {
      _id: 'customer123',
      name: 'John Doe',
      phone: '+1234567890',
      fromRouteId: '507f1f77bcf86cd799439011',
      toRouteId: '507f1f77bcf86cd799439012',
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn(),
    };
  });

  describe('createCustomer', () => {
    it('should create a new customer successfully', async () => {
      const customerData = {
        name: 'John Doe',
        phone: '+1234567890',
        fromRouteId: '507f1f77bcf86cd799439011',
        toRouteId: '507f1f77bcf86cd799439012',
      };

      // Mock findOne to return null (no existing customer)
      MockedCustomer.findOne = jest.fn().mockResolvedValue(null);

      // Update mockCustomerInstance with customerData values
      mockCustomerInstance.name = customerData.name;
      mockCustomerInstance.phone = customerData.phone;

      // Mock constructor and save
      MockedCustomer.mockImplementation(() => mockCustomerInstance);
      mockCustomerInstance.save.mockResolvedValue(mockCustomerInstance);

      const result = await customerService.createCustomer(customerData);

      expect(MockedCustomer.findOne).toHaveBeenCalledWith({
        name: customerData.name,
        phone: customerData.phone,
      });
      expect(MockedCustomer).toHaveBeenCalledWith(customerData);
      expect(mockCustomerInstance.save).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'customer123',
        name: customerData.name,
        phone: customerData.phone,
        createdAt: mockCustomerInstance.createdAt,
        updatedAt: mockCustomerInstance.updatedAt,
      });
    });

    it('should throw error when customer already exists', async () => {
      const customerData = {
        name: 'John Doe',
        phone: '+1234567890',
        fromRouteId: '507f1f77bcf86cd799439011',
        toRouteId: '507f1f77bcf86cd799439012',
      };

      // Mock findOne to return existing customer
      MockedCustomer.findOne = jest.fn().mockResolvedValue(mockCustomerInstance);

      await expect(customerService.createCustomer(customerData)).rejects.toThrow(
        'Customer with this name and phone already exists'
      );

      expect(MockedCustomer.findOne).toHaveBeenCalledWith({
        name: customerData.name,
        phone: customerData.phone,
      });
      expect(MockedCustomer).not.toHaveBeenCalled();
    });
  });

  describe('updateCustomer', () => {
    it('should update customer successfully', async () => {
      const customerId = 'customer123';
      const updateData = {
        name: 'Jane Doe',
      };

      const updatedCustomer = {
        ...mockCustomerInstance,
        name: 'Jane Doe',
      };

      // Mock findById to return existing customer
      MockedCustomer.findById = jest.fn().mockResolvedValue(mockCustomerInstance);

      // Mock findOne to return null (no duplicate)
      MockedCustomer.findOne = jest.fn().mockResolvedValue(null);

      // Mock save to return updated customer
      mockCustomerInstance.save = jest.fn().mockResolvedValue(updatedCustomer);

      const result = await customerService.updateCustomer(customerId, updateData);

      expect(MockedCustomer.findById).toHaveBeenCalledWith(customerId);
      expect(mockCustomerInstance.save).toHaveBeenCalled();
      expect(result.name).toBe('Jane Doe');
    });

    it('should throw error when customer not found', async () => {
      const customerId = 'nonexistent';
      const updateData = { name: 'Jane Doe' };

      // Mock findById to return null
      MockedCustomer.findById = jest.fn().mockResolvedValue(null);

      await expect(customerService.updateCustomer(customerId, updateData)).rejects.toThrow(
        'Customer not found'
      );

      expect(MockedCustomer.findById).toHaveBeenCalledWith(customerId);
    });
  });

  describe('getCustomerById', () => {
    it('should return customer when found', async () => {
      const customerId = 'customer123';

      const mockFindById = {
        lean: jest.fn().mockResolvedValue(mockCustomerInstance),
      };
      MockedCustomer.findById = jest.fn().mockReturnValue(mockFindById);

      const result = await customerService.getCustomerById(customerId);

      expect(MockedCustomer.findById).toHaveBeenCalledWith(customerId);
      expect(mockFindById.lean).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'customer123',
        name: 'John Doe',
        phone: '+1234567890',
        createdAt: mockCustomerInstance.createdAt,
        updatedAt: mockCustomerInstance.updatedAt,
      });
    });

    it('should return null when customer not found', async () => {
      const customerId = 'nonexistent';

      const mockFindById = {
        lean: jest.fn().mockResolvedValue(null),
      };
      MockedCustomer.findById = jest.fn().mockReturnValue(mockFindById);

      const result = await customerService.getCustomerById(customerId);

      expect(MockedCustomer.findById).toHaveBeenCalledWith(customerId);
      expect(mockFindById.lean).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('getAllCustomers', () => {
    it('should return all customers', async () => {
      const mockCustomers = [mockCustomerInstance];
      const mockFind = {
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockCustomers),
        }),
      };

      MockedCustomer.find = jest.fn().mockReturnValue(mockFind);

      const result = await customerService.getAllCustomers();

      expect(MockedCustomer.find).toHaveBeenCalledWith({});
      expect(mockFind.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('customer123');
    });
  });

  describe('findOrCreateCustomer', () => {
    it('should return existing customer if found', async () => {
      const name = 'John Doe';
      const phone = '+1234567890';

      const mockFindOne = {
        lean: jest.fn().mockResolvedValue(mockCustomerInstance),
      };
      MockedCustomer.findOne = jest.fn().mockReturnValue(mockFindOne);

      const result = await customerService.findOrCreateCustomer(
        name,
        phone,
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012'
      );

      expect(MockedCustomer.findOne).toHaveBeenCalledWith({ name, phone });
      expect(mockFindOne.lean).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'customer123',
        name: 'John Doe',
        phone: '+1234567890',
        createdAt: mockCustomerInstance.createdAt,
        updatedAt: mockCustomerInstance.updatedAt,
      });
    });

    it('should create new customer if not found', async () => {
      const name = 'Jane Doe';
      const phone = '+0987654321';

      // Mock findOne to return null (not found)
      const mockFindOne = {
        lean: jest.fn().mockResolvedValue(null),
      };
      MockedCustomer.findOne = jest.fn().mockReturnValue(mockFindOne);

      // Update mockCustomerInstance with input values
      mockCustomerInstance.name = name;
      mockCustomerInstance.phone = phone;

      // Mock constructor and save
      MockedCustomer.mockImplementation(() => mockCustomerInstance);
      mockCustomerInstance.save.mockResolvedValue(mockCustomerInstance);

      const result = await customerService.findOrCreateCustomer(
        name,
        phone,
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012'
      );

      expect(MockedCustomer.findOne).toHaveBeenCalledWith({ name, phone });
      expect(mockFindOne.lean).toHaveBeenCalled();
      expect(MockedCustomer).toHaveBeenCalledWith({ name, phone });
      expect(mockCustomerInstance.save).toHaveBeenCalled();
      expect(result.id).toBe('customer123');
      expect(result.name).toBe(name);
      expect(result.phone).toBe(phone);
    });
  });
});
