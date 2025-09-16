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
      routeId: '507f1f77bcf86cd799439011',
      type: 'delivery',
      relativeReceiver: [],
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
        routeId: '507f1f77bcf86cd799439011',
        type: 'delivery' as const,
        relativeReceiver: [],
      };

      // Mock constructor and save
      MockedCustomer.mockImplementation(() => mockCustomerInstance);
      mockCustomerInstance.save.mockResolvedValue(mockCustomerInstance);

      const result = await customerService.createCustomer(customerData);

      expect(MockedCustomer).toHaveBeenCalledWith({
        name: customerData.name,
        phone: customerData.phone,
        routeId: expect.any(Object), // Types.ObjectId
        type: customerData.type,
        relativeReceiver: [],
      });
      expect(mockCustomerInstance.save).toHaveBeenCalled();
      expect(result).toEqual(mockCustomerInstance);
    });

    it('should throw error when save fails', async () => {
      const customerData = {
        name: 'John Doe',
        phone: '+1234567890',
        routeId: '507f1f77bcf86cd799439011',
        type: 'delivery' as const,
        relativeReceiver: [],
      };

      // Mock constructor and save to fail
      MockedCustomer.mockImplementation(() => mockCustomerInstance);
      mockCustomerInstance.save.mockRejectedValue(new Error('Database error'));

      await expect(customerService.createCustomer(customerData)).rejects.toThrow(
        'Failed to create customer: Database error'
      );
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

      // Mock findByIdAndUpdate to return updated customer
      MockedCustomer.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedCustomer);

      const result = await customerService.updateCustomer(customerId, updateData);

      expect(MockedCustomer.findByIdAndUpdate).toHaveBeenCalledWith(customerId, updateData, {
        new: true,
        runValidators: true,
      });
      expect(result).toEqual(updatedCustomer);
    });

    it('should return null when customer not found', async () => {
      const customerId = 'nonexistent';
      const updateData = { name: 'Jane Doe' };

      // Mock findByIdAndUpdate to return null
      MockedCustomer.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      const result = await customerService.updateCustomer(customerId, updateData);

      expect(MockedCustomer.findByIdAndUpdate).toHaveBeenCalledWith(customerId, updateData, {
        new: true,
        runValidators: true,
      });
      expect(result).toBeNull();
    });
  });

  describe('getCustomerById', () => {
    it('should return customer when found', async () => {
      const customerId = 'customer123';

      const mockFindById = {
        populate: jest.fn().mockResolvedValue(mockCustomerInstance),
      };
      MockedCustomer.findById = jest.fn().mockReturnValue(mockFindById);

      const result = await customerService.getCustomerById(customerId);

      expect(MockedCustomer.findById).toHaveBeenCalledWith(customerId);
      expect(mockFindById.populate).toHaveBeenCalledWith('relativeReceiver');
      expect(result).toEqual(mockCustomerInstance);
    });

    it('should return null when customer not found', async () => {
      const customerId = 'nonexistent';

      const mockFindById = {
        populate: jest.fn().mockResolvedValue(null),
      };
      MockedCustomer.findById = jest.fn().mockReturnValue(mockFindById);

      const result = await customerService.getCustomerById(customerId);

      expect(MockedCustomer.findById).toHaveBeenCalledWith(customerId);
      expect(mockFindById.populate).toHaveBeenCalledWith('relativeReceiver');
      expect(result).toBeNull();
    });
  });

  describe('getAllCustomers', () => {
    it('should return all customers', async () => {
      const mockCustomers = [mockCustomerInstance];
      const mockFind = {
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockCustomers),
            }),
          }),
        }),
      };

      MockedCustomer.find = jest.fn().mockReturnValue(mockFind);
      MockedCustomer.countDocuments = jest.fn().mockResolvedValue(1);

      const result = await customerService.getAllCustomers();

      expect(MockedCustomer.find).toHaveBeenCalled();
      expect(result.customers).toEqual(mockCustomers);
      expect(result.total).toBe(1);
      expect(result.pages).toBe(1);
    });
  });

  describe('findOrCreateCustomer', () => {
    it('should create or update customer', async () => {
      const phone = '+1234567890';
      const name = 'John Doe';
      const routeId = '507f1f77bcf86cd799439011';
      const type = 'delivery';

      MockedCustomer.findOneAndUpdate = jest.fn().mockResolvedValue(mockCustomerInstance);

      const result = await customerService.findOrCreateCustomer(phone, name, routeId, type);

      expect(MockedCustomer.findOneAndUpdate).toHaveBeenCalledWith(
        { phone, type },
        {
          name,
          routeId: expect.any(Object), // Types.ObjectId
          type,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
      expect(result).toEqual(mockCustomerInstance);
    });

    it('should handle errors during upsert', async () => {
      const phone = '+0987654321';
      const name = 'Jane Doe';
      const routeId = '507f1f77bcf86cd799439011';
      const type = 'delivery';

      MockedCustomer.findOneAndUpdate = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(
        customerService.findOrCreateCustomer(phone, name, routeId, type)
      ).rejects.toThrow('Failed to find or create customer: Database error');
    });
  });
});
