import { IMoneyDeliveryResponse } from '@/types/money-delivery.type';
import {
  MoneyDeliveryStatus,
  MoneyDeliveryType,
  TransferType,
} from '@/models/money-delivery.model';

export const createMockMoneyDelivery = (
  overrides: Partial<IMoneyDeliveryResponse> = {}
): IMoneyDeliveryResponse => {
  return {
    id: 'money-delivery-id-1',
    code: '2401250001',
    fullCode: '2401250001T1T2',
    subCode: '17031750001',
    sender: {
      id: 'customer-id-1',
      name: 'John Doe',
      phone: '1234567890',
      fromRouteId: '507f1f77bcf86cd799439011',
      toRouteId: '507f1f77bcf86cd799439012',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    receiver: {
      id: 'customer-id-2',
      name: 'Jane Doe',
      phone: '0987654321',
      fromRouteId: '507f1f77bcf86cd799439011',
      toRouteId: '507f1f77bcf86cd799439012',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    fromRoute: {
      id: 'route-id-1',
      code: 'T1',
      name: 'Test Route 1',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    toRoute: {
      id: 'route-id-2',
      code: 'T2',
      name: 'Test Route 2',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    sendMoneyAmount: 1000000,
    sendCost: 50000,
    transferType: TransferType.REGULAR,
    isFree: false,
    totalCost: 50000,
    status: MoneyDeliveryStatus.WAITING,
    type: MoneyDeliveryType.NORMAL,
    createdByUser: 'testuser',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    ...overrides,
  };
};

export const createMockMoneyDeliveryRequest = (overrides: any = {}) => {
  return {
    senderId: 'customer-id-1',
    receiverId: 'customer-id-2',
    fromRouteId: 'route-id-1',
    toRouteId: 'route-id-2',
    sendMoneyAmount: 1000000,
    sendCost: 50000,
    ...overrides,
  };
};

export const createMockNextCodeResult = (overrides: any = {}) => {
  return {
    nextCode: '2401250001',
    fullCode: '2401250001T1T2',
    subCode: '17031750001',
    toRoute: {
      id: 'route-id-1',
      code: 'T1',
      name: 'Test Route 1',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    fromRoute: {
      id: 'route-id-2',
      code: 'T2',
      name: 'Test Route 2',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    ...overrides,
  };
};

export const createMockMoneyDeliveryList = (count: number = 3): IMoneyDeliveryResponse[] => {
  return Array.from({ length: count }, (_, index) => {
    const sendMoneyAmount = 500000 + index * 100000;
    const sendCost = 25000 + index * 5000;
    return createMockMoneyDelivery({
      id: `money-delivery-id-${index + 1}`,
      code: `240125000${index + 1}`,
      sendMoneyAmount,
      sendCost,
      totalCost: sendCost,
    });
  });
};

// ===== INTEGRATION TEST MOCKS =====
// These are specific mock objects used in integration tests

/**
 * Mock money delivery for integration tests - matches the exact structure used in tests
 */
export const mockMoneyDeliveryForIntegration = {
  id: 'moneyDelivery123',
  code: '2401250001',
  fullCode: '2401250001T1T2',
  subCode: '17031750001',
  sender: {
    id: 'customer123',
    name: 'John Doe',
    phone: '+84123456789',
    fromRouteId: '507f1f77bcf86cd799439011',
    toRouteId: '507f1f77bcf86cd799439012',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  receiver: {
    id: 'customer456',
    name: 'Jane Doe',
    phone: '+84987654321',
    fromRouteId: '507f1f77bcf86cd799439011',
    toRouteId: '507f1f77bcf86cd799439012',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  fromRoute: {
    id: 'route123',
    code: 'T1',
    name: 'Test Route 1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  toRoute: {
    id: 'route456',
    code: 'T2',
    name: 'Test Route 2',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  sendMoneyAmount: 1000000,
  sendCost: 50000,
  transferType: TransferType.REGULAR,
  isFree: false,
  totalCost: 50000,
  status: MoneyDeliveryStatus.WAITING,
  type: MoneyDeliveryType.NORMAL,
  notes: 'Ghi chú chuyển tiền',
  createdByUser: 'user123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Mock next code response for money delivery integration tests
 */
export const mockMoneyDeliveryNextCodeResponseForIntegration = {
  nextCode: '2407240001',
  fullCode: '2407240001T1T2',
  subCode: '17031750001',
  toRoute: {
    id: 'route-id',
    code: 'T1',
    name: 'Test Route',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  fromRoute: {
    id: 'route-id-2',
    code: 'T2',
    name: 'Test Route 2',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

/**
 * Mock updated money delivery responses for integration tests
 */
export const mockUpdatedMoneyDeliveryForIntegration = {
  id: 'moneyDelivery123',
  code: '2401250001',
  fullCode: '2401250001T1T3-T', // Route changed from T2 to T3
  subCode: '17031750001', // Original subCode preserved
  sender: {
    id: 'customer123',
    name: 'Updated Sender Name',
    phone: '+84111222333',
    fromRouteId: '507f1f77bcf86cd799439011',
    toRouteId: '507f1f77bcf86cd799439013',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  receiver: {
    id: 'customer456',
    name: 'Updated Receiver Name',
    phone: '+84444555666',
    fromRouteId: '507f1f77bcf86cd799439011',
    toRouteId: '507f1f77bcf86cd799439013',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  fromRoute: {
    id: 'route123',
    code: 'T1',
    name: 'Test Route 1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  toRoute: {
    id: 'route789',
    code: 'T3',
    name: 'Test Route 3',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  sendMoneyAmount: 2000000,
  sendCost: 75000,
  transferType: TransferType.EXPRESS,
  isFree: false,
  totalCost: 75000,
  status: MoneyDeliveryStatus.WAITING,
  type: MoneyDeliveryType.NORMAL,
  notes: 'Updated notes',
  createdByUser: 'user123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Mock money delivery with route codes like AG, BC for testing fullCode format
 */
export const mockMoneyDeliveryWithAlphaRoutes = {
  id: 'moneyDelivery456',
  code: '2412250001',
  fullCode: '2412250001AGBC-T', // Complex route codes
  subCode: '17582103201153', // Original subCode format
  sender: {
    id: 'customer789',
    name: 'Alpha Sender',
    phone: '+84123456789',
    fromRouteId: '507f1f77bcf86cd799439014',
    toRouteId: '507f1f77bcf86cd799439015',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  receiver: {
    id: 'customer101',
    name: 'Beta Receiver',
    phone: '+84987654321',
    fromRouteId: '507f1f77bcf86cd799439014',
    toRouteId: '507f1f77bcf86cd799439015',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  fromRoute: {
    id: 'route014',
    code: 'AG',
    name: 'Alpha Gamma Route',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  toRoute: {
    id: 'route015',
    code: 'BC',
    name: 'Beta Charlie Route',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  sendMoneyAmount: 5000000,
  sendCost: 150000,
  transferType: TransferType.REGULAR,
  isFree: false,
  totalCost: 150000,
  status: MoneyDeliveryStatus.WAITING,
  type: MoneyDeliveryType.NORMAL,
  notes: 'Complex route codes test',
  createdByUser: 'user123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Mock frequent customers responses for integration tests
 */
export const mockFrequentCustomersForIntegration = {
  withResults: {
    senderIdentifier: 'John Doe',
    senderInfo: {
      name: 'John Doe',
      phone: '+84123456789',
    },
    frequentCustomers: [
      {
        name: 'Jane Smith',
        phone: '+84987654321',
        frequency: 5,
      },
      {
        name: 'Bob Johnson',
        phone: '+84555666777',
        frequency: 3,
      },
    ],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalCount: 2,
      limit: 5,
    },
  },
  empty: {
    senderIdentifier: 'John Doe',
    senderInfo: null,
    frequentCustomers: [],
    pagination: {
      currentPage: 1,
      totalPages: 0,
      totalCount: 0,
      limit: 5,
    },
  },
  page2Empty: {
    senderIdentifier: 'John Doe',
    senderInfo: null,
    frequentCustomers: [],
    pagination: {
      currentPage: 2,
      totalPages: 1,
      totalCount: 0,
      limit: 5,
    },
  },
};
