import { IMoneyDeliveryResponse } from '@/types/money-delivery.type';

export const mockMoneyDeliveryService = {
  createMoneyDelivery: jest.fn(),
  getAllMoneyDeliveries: jest.fn(),
  getMoneyDeliveryById: jest.fn(),
  updateMoneyDelivery: jest.fn(),
  deleteMoneyDelivery: jest.fn(),
  getNextCode: jest.fn(),
  getMoneyDeliveryByCode: jest.fn()
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