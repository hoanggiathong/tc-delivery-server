import { IMoneyDeliveryResponse } from '@/types/money-delivery.type';

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
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    receiver: {
      id: 'customer-id-2',
      name: 'Jane Doe',
      phone: '0987654321',
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
    transferType: 'regular' as const,
    totalCost: 50000, // sendCost only
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
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  receiver: {
    id: 'customer456',
    name: 'Jane Doe',
    phone: '+84987654321',
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
  transferType: 'regular' as const,
  totalCost: 50000,
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
