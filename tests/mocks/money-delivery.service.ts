import { IMoneyDeliveryResponse } from '@/types/money-delivery.type';

// Create mock functions
const mockCreateMoneyDelivery = jest.fn();
const mockGetAllMoneyDeliveries = jest.fn();
const mockGetMoneyDeliveryById = jest.fn();
const mockUpdateMoneyDelivery = jest.fn();
const mockDeleteMoneyDelivery = jest.fn();
const mockGetNextCode = jest.fn();
const mockGetMoneyDeliveryByCode = jest.fn();
const mockGetFrequentCustomers = jest.fn();

// Export class for Jest mock
export class MoneyDeliveryService {
  createMoneyDelivery = mockCreateMoneyDelivery;
  getAllMoneyDeliveries = mockGetAllMoneyDeliveries;
  getMoneyDeliveryById = mockGetMoneyDeliveryById;
  updateMoneyDelivery = mockUpdateMoneyDelivery;
  deleteMoneyDelivery = mockDeleteMoneyDelivery;
  getNextCode = mockGetNextCode;
  getMoneyDeliveryByCode = mockGetMoneyDeliveryByCode;
  getFrequentCustomers = mockGetFrequentCustomers;
}

// Export default for compatibility
export default MoneyDeliveryService;

// Export mock functions for test setup
export {
  mockCreateMoneyDelivery,
  mockGetAllMoneyDeliveries,
  mockGetMoneyDeliveryById,
  mockUpdateMoneyDelivery,
  mockDeleteMoneyDelivery,
  mockGetNextCode,
  mockGetMoneyDeliveryByCode,
  mockGetFrequentCustomers
};

export const createMockMoneyDelivery = (overrides: Partial<IMoneyDeliveryResponse> = {}): IMoneyDeliveryResponse => {
  return {
    id: 'money-delivery-id-1',
    code: '2401250001',
    sender: {
      id: 'customer-id-1',
      name: 'John Doe',
      phone: '1234567890',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    },
    receiver: {
      id: 'customer-id-2',
      name: 'Jane Doe',
      phone: '0987654321',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    },
    fromRoute: {
      id: 'route-id-1',
      code: 'T1',
      name: 'Test Route 1',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    },
    toRoute: {
      id: 'route-id-2',
      code: 'T2',
      name: 'Test Route 2',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    },
    sendMoneyAmount: 1000000,
    sendCost: 50000,
    createdByUser: 'testuser',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    ...overrides
  };
};

export const createMockNextCodeResult = (overrides: any = {}) => {
  return {
    nextCode: '2401250001',
    toRoute: {
      id: 'route-id-1',
      code: 'T1',
      name: 'Test Route 1',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    },
    ...overrides
  };
};

export const createMockFrequentCustomersResult = (overrides: any = {}) => {
  return {
    senderIdentifier: 'John Doe',
    senderInfo: { name: 'John Doe', phone: '+84123456789' },
    frequentCustomers: [
      {
        receiverName: 'Jane Doe',
        receiverPhone: '+84987654321',
        toRoute: { id: 'route456', code: 'T2', name: 'Test Route 2' },
        deliveryCount: 5,
        totalSendMoneyAmount: 5000000,
        totalSendCost: 250000,
        lastDeliveryDate: new Date('2024-01-25'),
        firstDeliveryDate: new Date('2024-01-20'),
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
    ...overrides
  };
};