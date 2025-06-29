import { DeliveryService } from '@/services/delivery.service';
import { Delivery } from '@/models/delivery.model';
import { CustomerService } from '@/services/customer.service';
import { IDeliveryResponse } from '@/types/delivery.type';
import { mockCustomerService } from '../../mocks/customer.service';

// Mock the Delivery model
jest.mock('@/models/delivery.model');
jest.mock('@/services/customer.service', () => require('../../mocks/customer.service'));

const MockedDelivery = Delivery as jest.MockedClass<typeof Delivery>;

describe('DeliveryService', () => {
  let deliveryService: DeliveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    deliveryService = new DeliveryService();
  });

  describe('createDelivery', () => {
    const mockDeliveryData = {
      senderName: 'John Sender',
      senderPhone: '+1234567890',
      receiverName: 'Jane Receiver',
      receiverPhone: '+1987654321',
      route: 'Route A to B',
      name: 'Package Item',
      cost: 100,
      homeDelivery: '123 Main St',
      homeDeliveryCost: 20,
      itemValue: 500,
      itemCost: 50,
      collectCost: 30,
      collectForCustomer: 25000,
      collectForCustomerCost: 40,
      collectForCustomerNote: 'Test note'
    };

    const mockSender = {
      id: 'sender123',
      name: 'John Sender',
      phone: '+1234567890',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };

    const mockReceiver = {
      id: 'receiver123',
      name: 'Jane Receiver',
      phone: '+1987654321',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };

    const mockDelivery = {
      _id: 'delivery123',
      sender: 'sender123',
      receiver: 'receiver123',
      route: 'Route A to B',
      name: 'Package Item',
      cost: 100,
      homeDelivery: '123 Main St',
      homeDeliveryCost: 20,
      itemValue: 500,
      itemCost: 50,
      collectCost: 30,
      collectForCustomer: 25000,
      collectForCustomerCost: 40,
      collectForCustomerNote: 'Test note',
      createdByUser: 'user123',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      save: jest.fn().mockResolvedValue(true)
    };

    const mockExpectedResponse: IDeliveryResponse = {
      id: 'delivery123',
      sender: mockSender,
      receiver: mockReceiver,
      route: 'Route A to B',
      name: 'Package Item',
      cost: 100,
      homeDelivery: '123 Main St',
      homeDeliveryCost: 20,
      itemValue: 500,
      itemCost: 50,
      collectCost: 30,
      collectForCustomer: 25000,
      collectForCustomerCost: 40,
      collectForCustomerNote: 'Test note',
      createdByUser: 'testuser',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };

    it('should create a delivery successfully', async () => {
      // Mock customer service methods
      mockCustomerService.findOrCreateCustomer
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(mockReceiver);

      // Mock Delivery constructor and save
      MockedDelivery.mockImplementation(() => mockDelivery as any);

      // Mock the transformDeliveryToResponse method
      jest.spyOn(deliveryService as any, 'transformDeliveryToResponse')
        .mockResolvedValue(mockExpectedResponse);

      const result = await deliveryService.createDelivery(mockDeliveryData, 'user123');

      expect(mockCustomerService.findOrCreateCustomer).toHaveBeenCalledWith('John Sender', '+1234567890');
      expect(mockCustomerService.findOrCreateCustomer).toHaveBeenCalledWith('Jane Receiver', '+1987654321');
      expect(MockedDelivery).toHaveBeenCalledWith({
        sender: 'sender123',
        receiver: 'receiver123',
        route: 'Route A to B',
        name: 'Package Item',
        cost: 100,
        homeDelivery: '123 Main St',
        homeDeliveryCost: 20,
        itemValue: 500,
        itemCost: 50,
        collectCost: 30,
        collectForCustomer: 25000,
        collectForCustomerCost: 40,
        collectForCustomerNote: 'Test note',
        createdByUser: 'user123'
      });
      expect(mockDelivery.save).toHaveBeenCalled();
      expect(result).toEqual(mockExpectedResponse);
    });

    it('should throw error when sender creation fails', async () => {
      mockCustomerService.findOrCreateCustomer.mockRejectedValue(new Error('Failed to create sender'));

      await expect(deliveryService.createDelivery(mockDeliveryData, 'user123'))
        .rejects.toThrow('Failed to create sender');
    });

    it('should throw error when receiver creation fails', async () => {
      mockCustomerService.findOrCreateCustomer
        .mockResolvedValueOnce(mockSender)
        .mockRejectedValue(new Error('Failed to create receiver'));

      await expect(deliveryService.createDelivery(mockDeliveryData, 'user123'))
        .rejects.toThrow('Failed to create receiver');
    });

    it('should throw error when delivery save fails', async () => {
      mockCustomerService.findOrCreateCustomer
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(mockReceiver);

      const mockFailingDelivery = {
        ...mockDelivery,
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      };
      MockedDelivery.mockImplementation(() => mockFailingDelivery as any);

      await expect(deliveryService.createDelivery(mockDeliveryData, 'user123'))
        .rejects.toThrow('Database error');
    });
  });

  describe('updateDelivery', () => {
    const mockUpdateData = {
      senderName: 'Updated Sender',
      senderPhone: '+1111111111',
      route: 'Updated Route',
      cost: 150
    };

    const mockExistingDelivery = {
      _id: 'delivery123',
      sender: 'sender123',
      receiver: 'receiver123',
      route: 'Old Route',
      name: 'Package Item',
      cost: 100
    };

    const mockUpdatedSender = {
      id: 'newsender123',
      name: 'Updated Sender',
      phone: '+1111111111',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };

    const mockExpectedResponse: IDeliveryResponse = {
      id: 'delivery123',
      sender: mockUpdatedSender,
      receiver: {
        id: 'receiver123',
        name: 'Jane Receiver',
        phone: '+1987654321',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      route: 'Updated Route',
      name: 'Package Item',
      cost: 150,
      homeDelivery: '123 Main St',
      homeDeliveryCost: 20,
      itemValue: 500,
      itemCost: 50,
      collectCost: 30,
      collectForCustomer: 25000,
      collectForCustomerCost: 40,
      collectForCustomerNote: 'Test note',
      createdByUser: 'testuser',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };

    it('should update delivery successfully', async () => {
      // Mock findById
      MockedDelivery.findById = jest.fn().mockResolvedValue(mockExistingDelivery);

      // Mock customer service
      mockCustomerService.findOrCreateCustomer.mockResolvedValue(mockUpdatedSender);

      // Mock findByIdAndUpdate
      const mockUpdatedDelivery = {
        ...mockExistingDelivery,
        sender: 'newsender123',
        route: 'Updated Route',
        cost: 150
      };
      MockedDelivery.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedDelivery);

      // Mock the transformDeliveryToResponse method
      jest.spyOn(deliveryService as any, 'transformDeliveryToResponse')
        .mockResolvedValue(mockExpectedResponse);

      const result = await deliveryService.updateDelivery('delivery123', mockUpdateData);

      expect(MockedDelivery.findById).toHaveBeenCalledWith('delivery123');
      expect(mockCustomerService.findOrCreateCustomer).toHaveBeenCalledWith('Updated Sender', '+1111111111');
      expect(MockedDelivery.findByIdAndUpdate).toHaveBeenCalledWith(
        'delivery123',
        {
          $set: {
            sender: 'newsender123',
            receiver: 'receiver123',
            route: 'Updated Route',
            cost: 150
          }
        },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockExpectedResponse);
    });

    it('should throw error when delivery not found', async () => {
      MockedDelivery.findById = jest.fn().mockResolvedValue(null);

      await expect(deliveryService.updateDelivery('nonexistent', mockUpdateData))
        .rejects.toThrow('Delivery not found');
    });

    it('should throw error when update fails', async () => {
      MockedDelivery.findById = jest.fn().mockResolvedValue(mockExistingDelivery);
      mockCustomerService.findOrCreateCustomer.mockResolvedValue(mockUpdatedSender);
      MockedDelivery.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      await expect(deliveryService.updateDelivery('delivery123', mockUpdateData))
        .rejects.toThrow('Failed to update delivery');
    });
  });

  describe('getDeliveryById', () => {
    const mockExpectedResponse: IDeliveryResponse = {
      id: 'delivery123',
      sender: {
        id: 'sender123',
        name: 'John Sender',
        phone: '+1234567890',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      receiver: {
        id: 'receiver123',
        name: 'Jane Receiver',
        phone: '+1987654321',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      route: 'Route A to B',
      name: 'Package Item',
      cost: 100,
      homeDelivery: '123 Main St',
      homeDeliveryCost: 20,
      itemValue: 500,
      itemCost: 50,
      collectCost: 30,
      collectForCustomer: 25000,
      collectForCustomerCost: 40,
      collectForCustomerNote: 'Test note',
      createdByUser: 'testuser',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };

    it('should return delivery when found', async () => {
      const mockDelivery = { _id: 'delivery123' };
      MockedDelivery.findById = jest.fn().mockResolvedValue(mockDelivery);

      // Mock the transformDeliveryToResponse method
      jest.spyOn(deliveryService as any, 'transformDeliveryToResponse')
        .mockResolvedValue(mockExpectedResponse);

      const result = await deliveryService.getDeliveryById('delivery123');

      expect(MockedDelivery.findById).toHaveBeenCalledWith('delivery123');
      expect(result).toEqual(mockExpectedResponse);
    });

    it('should return null when delivery not found', async () => {
      MockedDelivery.findById = jest.fn().mockResolvedValue(null);

      const result = await deliveryService.getDeliveryById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when error occurs', async () => {
      MockedDelivery.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await deliveryService.getDeliveryById('delivery123');

      expect(result).toBeNull();
    });
  });

  describe('getAllDeliveries', () => {
    const mockDeliveries = [
      {
        _id: 'delivery1',
        sender: 'sender1',
        receiver: 'receiver1',
        route: 'Route 1',
        name: 'Package 1',
        cost: 100,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        _id: 'delivery2',
        sender: 'sender2',
        receiver: 'receiver2',
        route: 'Route 2',
        name: 'Package 2',
        cost: 200,
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02')
      }
    ];

    const mockExpectedResponses: IDeliveryResponse[] = [
      {
        id: 'delivery1',
        sender: {
          id: 'sender1',
          name: 'Sender 1',
          phone: '+1111111111',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01')
        },
        receiver: {
          id: 'receiver1',
          name: 'Receiver 1',
          phone: '+2222222222',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01')
        },
        route: 'Route 1',
        name: 'Package 1',
        cost: 100,
        homeDelivery: '123 Main St',
        homeDeliveryCost: 20,
        itemValue: 500,
        itemCost: 50,
        collectCost: 30,
        collectForCustomer: 25000,
        collectForCustomerCost: 40,
        createdByUser: 'user1',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: 'delivery2',
        sender: {
          id: 'sender2',
          name: 'Sender 2',
          phone: '+3333333333',
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02')
        },
        receiver: {
          id: 'receiver2',
          name: 'Receiver 2',
          phone: '+4444444444',
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02')
        },
        route: 'Route 2',
        name: 'Package 2',
        cost: 200,
        homeDelivery: '456 Oak St',
        homeDeliveryCost: 25,
        itemValue: 600,
        itemCost: 60,
        collectCost: 35,
        collectForCustomer: 0,
        collectForCustomerCost: 0,
        createdByUser: 'user2',
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02')
      }
    ];

    it('should return all deliveries', async () => {
      // Mock find with sort
      const mockSort = jest.fn().mockResolvedValue(mockDeliveries);
      MockedDelivery.find = jest.fn().mockReturnValue({ sort: mockSort });

      // Mock the transformDeliveryToResponse method for each delivery
      const mockTransform = jest.spyOn(deliveryService as any, 'transformDeliveryToResponse')
        .mockResolvedValueOnce(mockExpectedResponses[0])
        .mockResolvedValueOnce(mockExpectedResponses[1]);

      const result = await deliveryService.getAllDeliveries();

      expect(MockedDelivery.find).toHaveBeenCalledWith({});
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockTransform).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockExpectedResponses);
    });

    it('should throw error when database fails', async () => {
      const mockSort = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      MockedDelivery.find = jest.fn().mockReturnValue({ sort: mockSort });

      await expect(deliveryService.getAllDeliveries())
        .rejects.toThrow('Failed to fetch deliveries');
    });

    it('should return empty array when no deliveries found', async () => {
      const mockSort = jest.fn().mockResolvedValue([]);
      MockedDelivery.find = jest.fn().mockReturnValue({ sort: mockSort });

      const result = await deliveryService.getAllDeliveries();

      expect(result).toEqual([]);
    });
  });
});