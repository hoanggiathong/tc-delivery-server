import { MoneyDeliveryService } from '@/services/money-delivery.service';
import { CustomerService } from '@/services/customer.service';
import { CodeGeneratorService } from '@/services/code-generator.service';
import { MoneyDelivery } from '@/models/money-delivery.model';
import { Route } from '@/models/route.model';
import { Customer } from '@/models/customer.model';
import {
  IMoneyDeliveryCreateRequest,
  IMoneyDeliveryUpdateRequest,
} from '@/types/money-delivery.type';

// Mock all dependencies
jest.mock('@/services/customer.service');
jest.mock('@/services/code-generator.service');
jest.mock('@/models/money-delivery.model');
jest.mock('@/models/route.model');
jest.mock('@/models/customer.model');

const MockedMoneyDelivery = MoneyDelivery as jest.MockedClass<typeof MoneyDelivery>;
const MockedCustomer = Customer as jest.MockedClass<typeof Customer>;
const MockedRoute = Route as jest.MockedClass<typeof Route>;
const MockedCodeGeneratorService = CodeGeneratorService as jest.Mocked<typeof CodeGeneratorService>;
const MockedCustomerService = CustomerService as jest.MockedClass<typeof CustomerService>;

describe('MoneyDeliveryService', () => {
  let moneyDeliveryService: MoneyDeliveryService;

  const mockCustomer = {
    _id: 'customer-id-1',
    id: 'customer-id-1',
    name: 'John Doe',
    phone: '1234567890',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRoute = {
    _id: 'route-id-1',
    code: 'T1',
    name: 'Test Route 1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMoneyDelivery = {
    _id: 'money-delivery-id-1',
    code: '2401250001',
    sender: mockCustomer,
    receiver: mockCustomer,
    fromRoute: mockRoute,
    toRoute: mockRoute,
    sendMoneyAmount: 1000000,
    sendCost: 50000,
    notes: 'Ghi chú chuyển tiền',
    createdByUser: { _id: 'user-id-1', username: 'testuser' },
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
    populate: jest.fn().mockResolvedValue({
      _id: 'money-delivery-id-1',
      code: '2401250001',
      sender: mockCustomer,
      receiver: mockCustomer,
      fromRoute: mockRoute,
      toRoute: mockRoute,
      sendMoneyAmount: 1000000,
      sendCost: 50000,
      notes: 'Ghi chú chuyển tiền',
      createdByUser: { _id: 'user-id-1', username: 'testuser' },
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock CustomerService methods
    MockedCustomerService.prototype.findOrCreateCustomer = jest
      .fn()
      .mockResolvedValue(mockCustomer);

    // Create service
    moneyDeliveryService = new MoneyDeliveryService();

    // Mock CodeGeneratorService methods
    MockedCodeGeneratorService.generateNextMoneyDeliveryCode = jest
      .fn()
      .mockResolvedValue('2401250001');

    // Mock Mongoose models
    MockedRoute.findById = jest.fn().mockResolvedValue(mockRoute);
    MockedRoute.findOne = jest.fn().mockResolvedValue(mockRoute);
  });

  describe('createMoneyDelivery', () => {
    const createData: IMoneyDeliveryCreateRequest = {
      senderName: 'John Doe',
      senderPhone: '1234567890',
      receiverName: 'Jane Doe',
      receiverPhone: '0987654321',
      fromRouteId: 'route-id-1',
      toRouteId: 'route-id-2',
      sendMoneyAmount: 1000000,
      sendCost: 50000,
      notes: 'Ghi chú chuyển tiền',
    };

    it('should create a new money delivery successfully', async () => {
      const userId = 'user-id-1';

      // Mock MoneyDelivery constructor
      MockedMoneyDelivery.mockImplementation(() => mockMoneyDelivery as any);

      // Mock the transformMoneyDeliveryToResponse method
      jest
        .spyOn(moneyDeliveryService as any, 'transformMoneyDeliveryToResponse')
        .mockResolvedValue({
          id: 'money-delivery-id-1',
          code: '2401250001',
          sender: mockCustomer,
          receiver: mockCustomer,
          fromRoute: mockRoute,
          toRoute: mockRoute,
          sendMoneyAmount: 1000000,
          sendCost: 50000,
          createdByUser: 'testuser',
          createdAt: new Date(),
          updatedAt: new Date(),
          notes: 'Ghi chú chuyển tiền',
        });

      const result = await moneyDeliveryService.createMoneyDelivery(createData, userId);

      expect(MockedCustomerService.prototype.findOrCreateCustomer).toHaveBeenCalledTimes(2);
      expect(MockedCustomerService.prototype.findOrCreateCustomer).toHaveBeenCalledWith(
        'John Doe',
        '1234567890'
      );
      expect(MockedCustomerService.prototype.findOrCreateCustomer).toHaveBeenCalledWith(
        'Jane Doe',
        '0987654321'
      );
      expect(MockedRoute.findById).toHaveBeenCalledTimes(2);
      expect(MockedCodeGeneratorService.generateNextMoneyDeliveryCode).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.code).toBe('2401250001');
      expect(result).toMatchObject({
        code: expect.any(String),
        sender: expect.any(Object),
        receiver: expect.any(Object),
        fromRoute: expect.any(Object),
        toRoute: expect.any(Object),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        notes: 'Ghi chú chuyển tiền',
        createdByUser: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should throw error when fromRoute not found', async () => {
      MockedRoute.findById = jest.fn().mockResolvedValueOnce(null);

      await expect(
        moneyDeliveryService.createMoneyDelivery(createData, 'user-id-1')
      ).rejects.toThrow('From route not found');
    });

    it('should throw error when toRoute not found', async () => {
      MockedRoute.findById = jest.fn().mockResolvedValueOnce(mockRoute).mockResolvedValueOnce(null);

      await expect(
        moneyDeliveryService.createMoneyDelivery(createData, 'user-id-1')
      ).rejects.toThrow('To route not found');
    });
  });

  describe('updateMoneyDelivery', () => {
    const updateData: IMoneyDeliveryUpdateRequest = {
      senderName: 'Updated Sender',
      sendMoneyAmount: 2000000,
      notes: 'Ghi chú chuyển tiền update',
    };

    it('should update money delivery successfully', async () => {
      const mockExistingMoneyDelivery = {
        ...mockMoneyDelivery,
        sender: 'old-sender-id',
        receiver: 'old-receiver-id',
      };

      MockedMoneyDelivery.findById = jest.fn().mockResolvedValue(mockExistingMoneyDelivery);
      MockedMoneyDelivery.findByIdAndUpdate = jest.fn().mockResolvedValue(mockMoneyDelivery);

      // Mock the transformMoneyDeliveryToResponse method
      jest
        .spyOn(moneyDeliveryService as any, 'transformMoneyDeliveryToResponse')
        .mockResolvedValue({
          id: 'money-delivery-id-1',
          code: '2401250001',
          sender: mockCustomer,
          receiver: mockCustomer,
          fromRoute: mockRoute,
          toRoute: mockRoute,
          sendMoneyAmount: 2000000,
          sendCost: 50000,
          createdByUser: 'testuser',
          createdAt: new Date(),
          updatedAt: new Date(),
          notes: 'Ghi chú chuyển tiền update',
        });

      const result = await moneyDeliveryService.updateMoneyDelivery(
        'money-delivery-id-1',
        updateData
      );

      expect(MockedMoneyDelivery.findById).toHaveBeenCalledWith('money-delivery-id-1');
      expect(MockedMoneyDelivery.findByIdAndUpdate).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result).toMatchObject({
        code: expect.any(String),
        sender: expect.any(Object),
        receiver: expect.any(Object),
        fromRoute: expect.any(Object),
        toRoute: expect.any(Object),
        sendMoneyAmount: 2000000,
        sendCost: 50000,
        notes: 'Ghi chú chuyển tiền update',
        createdByUser: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should throw error when money delivery not found', async () => {
      MockedMoneyDelivery.findById = jest.fn().mockResolvedValue(null);

      await expect(
        moneyDeliveryService.updateMoneyDelivery('non-existent-id', updateData)
      ).rejects.toThrow('Money delivery not found');
    });

    it('should throw error when fromRoute not found during update', async () => {
      const mockExistingMoneyDelivery = {
        ...mockMoneyDelivery,
        sender: 'old-sender-id',
        receiver: 'old-receiver-id',
      };

      MockedMoneyDelivery.findById = jest.fn().mockResolvedValue(mockExistingMoneyDelivery);
      MockedRoute.findById = jest.fn().mockResolvedValue(null);

      const updateDataWithRoute = { ...updateData, fromRouteId: 'non-existent-route' };

      await expect(
        moneyDeliveryService.updateMoneyDelivery('money-delivery-id-1', updateDataWithRoute)
      ).rejects.toThrow('From route not found');
    });
  });

  describe('getMoneyDeliveryById', () => {
    it('should return money delivery when found', async () => {
      const mockPopulatedMoneyDelivery = {
        ...mockMoneyDelivery,
        sender: mockCustomer,
        receiver: mockCustomer,
        fromRoute: mockRoute,
        toRoute: mockRoute,
        createdByUser: { _id: 'user-id-1', username: 'testuser' },
      };

      MockedMoneyDelivery.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockPopulatedMoneyDelivery),
        }),
      });

      const result = await moneyDeliveryService.getMoneyDeliveryById('money-delivery-id-1');

      expect(MockedMoneyDelivery.findById).toHaveBeenCalledWith('money-delivery-id-1');
      expect(result).toBeDefined();
      expect(result?.code).toBe('2401250001');
      expect(result).toMatchObject({
        code: expect.any(String),
        sender: expect.any(Object),
        receiver: expect.any(Object),
        fromRoute: expect.any(Object),
        toRoute: expect.any(Object),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        notes: 'Ghi chú chuyển tiền',
        createdByUser: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should return null when money delivery not found', async () => {
      MockedMoneyDelivery.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await moneyDeliveryService.getMoneyDeliveryById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getAllMoneyDeliveries', () => {
    it('should return all money deliveries', async () => {
      const mockMoneyDeliveries = [
        mockMoneyDelivery,
        { ...mockMoneyDelivery, _id: 'money-delivery-id-2' },
      ];

      MockedMoneyDelivery.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockMoneyDeliveries),
          }),
        }),
      });

      const result = await moneyDeliveryService.getAllMoneyDeliveries();

      expect(MockedMoneyDelivery.find).toHaveBeenCalledWith({});
      expect(result).toHaveLength(2);
    });

    it('should throw error when database fails', async () => {
      MockedMoneyDelivery.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      });

      await expect(moneyDeliveryService.getAllMoneyDeliveries()).rejects.toThrow(
        'Failed to fetch money deliveries'
      );
    });
  });

  describe('deleteMoneyDelivery', () => {
    it('should delete money delivery successfully', async () => {
      MockedMoneyDelivery.findById = jest.fn().mockResolvedValue(mockMoneyDelivery);
      MockedMoneyDelivery.findByIdAndDelete = jest.fn().mockResolvedValue(mockMoneyDelivery);

      await expect(
        moneyDeliveryService.deleteMoneyDelivery('money-delivery-id-1')
      ).resolves.not.toThrow();

      expect(MockedMoneyDelivery.findById).toHaveBeenCalledWith('money-delivery-id-1');
      expect(MockedMoneyDelivery.findByIdAndDelete).toHaveBeenCalledWith('money-delivery-id-1');
    });

    it('should throw error when money delivery not found', async () => {
      MockedMoneyDelivery.findById = jest.fn().mockResolvedValue(null);

      await expect(moneyDeliveryService.deleteMoneyDelivery('non-existent-id')).rejects.toThrow(
        'Money delivery not found'
      );
    });
  });

  describe('getNextCode', () => {
    it('should return next code and route info', async () => {
      const result = await moneyDeliveryService.getNextCode('route-id-1');

      expect(MockedRoute.findById).toHaveBeenCalledWith('route-id-1');
      expect(MockedCodeGeneratorService.generateNextMoneyDeliveryCode).toHaveBeenCalled();
      expect(result).toHaveProperty('nextCode');
      expect(result).toHaveProperty('toRoute');
      expect(result.nextCode).toBe('2401250001');
    });

    it('should throw error when toRoute not found', async () => {
      MockedRoute.findById = jest.fn().mockResolvedValue(null);

      await expect(moneyDeliveryService.getNextCode('non-existent-route')).rejects.toThrow(
        'To route not found'
      );
    });
  });

  describe('getMoneyDeliveryByCode', () => {
    it('should return money delivery when found by code', async () => {
      const mockPopulatedMoneyDelivery = {
        ...mockMoneyDelivery,
        sender: mockCustomer,
        receiver: mockCustomer,
        fromRoute: mockRoute,
        toRoute: mockRoute,
        createdByUser: { _id: 'user-id-1', username: 'testuser' },
      };

      MockedRoute.findOne = jest.fn().mockResolvedValue(mockRoute);
      MockedMoneyDelivery.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockPopulatedMoneyDelivery),
        }),
      });

      const result = await moneyDeliveryService.getMoneyDeliveryByCode('2401250001T1T2');

      expect(MockedRoute.findOne).toHaveBeenCalledTimes(2);
      expect(MockedMoneyDelivery.findOne).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.code).toBe('2401250001');
      expect(result).toMatchObject({
        code: expect.any(String),
        sender: expect.any(Object),
        receiver: expect.any(Object),
        fromRoute: expect.any(Object),
        toRoute: expect.any(Object),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        notes: 'Ghi chú chuyển tiền',
        createdByUser: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should return null when delivery identifier format is invalid', async () => {
      const result = await moneyDeliveryService.getMoneyDeliveryByCode('invalid-format');

      expect(result).toBeNull();
    });

    it('should return null when route not found', async () => {
      MockedRoute.findOne = jest.fn().mockResolvedValue(null);

      const result = await moneyDeliveryService.getMoneyDeliveryByCode('2401250001T1T2');

      expect(result).toBeNull();
    });

    it('should return null when money delivery not found', async () => {
      MockedRoute.findOne = jest.fn().mockResolvedValue(mockRoute);
      MockedMoneyDelivery.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await moneyDeliveryService.getMoneyDeliveryByCode('2401250001T1T2');

      expect(result).toBeNull();
    });
  });

  describe('getFrequentCustomers', () => {
    it('should return frequent customers for a sender', async () => {
      // Mock data
      const mockAggregationResult = [
        {
          data: [
            {
              _id: {
                receiverName: 'John Doe',
                receiverPhone: '1234567890',
                toRouteId: 'route1',
                toRouteCode: 'T1',
                toRouteName: 'Route 1',
              },
              deliveryCount: 5,
              totalSendMoneyAmount: 50000,
              totalSendCost: 1000,
              lastDeliveryDate: new Date('2024-01-15'),
              firstDeliveryDate: new Date('2024-01-01'),
              senderInfo: {
                name: 'Sender Name',
                phone: '0987654321',
              },
            },
          ],
          totalCount: [{ count: 1 }],
        },
      ];

      // Mock Customer.find to return sender IDs
      const mockSenders = [{ _id: 'sender1' }, { _id: 'sender2' }];
      MockedCustomer.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockSenders),
        }),
      });

      // Mock the MoneyDelivery model
      jest.spyOn(MoneyDelivery, 'aggregate').mockResolvedValue(mockAggregationResult as any);

      const result = await moneyDeliveryService.getFrequentCustomers('Sender Name', 1, 10);

      expect(result).toEqual({
        senderIdentifier: 'Sender Name',
        senderInfo: {
          name: 'Sender Name',
          phone: '0987654321',
        },
        frequentCustomers: [
          {
            receiverName: 'John Doe',
            receiverPhone: '1234567890',
            toRoute: {
              id: 'route1',
              code: 'T1',
              name: 'Route 1',
            },
            deliveryCount: 5,
            totalSendMoneyAmount: 50000,
            totalSendCost: 1000,
            lastDeliveryDate: new Date('2024-01-15'),
            firstDeliveryDate: new Date('2024-01-01'),
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalRecords: 1,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });

      expect(MoneyDelivery.aggregate).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      // Mock Customer.find to return empty array (no senders found)
      MockedCustomer.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await moneyDeliveryService.getFrequentCustomers('NonExistentSender', 1, 10);

      expect(result).toEqual({
        senderIdentifier: 'NonExistentSender',
        senderInfo: null,
        frequentCustomers: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalRecords: 0,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    });

    it('should handle aggregation errors', async () => {
      // Mock Customer.find to return sender IDs
      const mockSenders = [{ _id: 'sender1' }];
      MockedCustomer.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockSenders),
        }),
      });

      jest.spyOn(MoneyDelivery, 'aggregate').mockRejectedValue(new Error('Database error'));

      await expect(moneyDeliveryService.getFrequentCustomers('Sender Name', 1, 10)).rejects.toThrow(
        'Failed to get frequent money customers'
      );
    });
  });
});
