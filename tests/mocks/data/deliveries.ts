import { IDeliveryResponse } from '@/types/delivery.type';

export const createMockDelivery = (
  overrides: Partial<IDeliveryResponse> = {}
): IDeliveryResponse => {
  return {
    id: 'delivery-id-1',
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
    name: 'Test Package',
    quantity: 1,
    cost: 50000,
    homeDelivery: 'Test Home Address',
    homeDeliveryCost: 10000,
    itemValue: 100000,
    itemCost: 5000,
    collectCost: 2000,
    collectForCustomer: 50000,
    collectForCustomerCost: 3000,
    collectForCustomerNote: 'Test note',
    notes: 'Test delivery notes',
    totalCost: 58000, // 50000 + 5000 + 3000 (cost + itemCost + collectForCustomerCost, homeDeliveryCost excluded)
    paymentType: 'paid',
    createdByUser: 'testuser',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    ...overrides,
  };
};

export const createMockDeliveryRequest = (overrides: any = {}) => {
  return {
    senderName: 'John Doe',
    senderPhone: '1234567890',
    receiverName: 'Jane Doe',
    receiverPhone: '0987654321',
    fromRouteId: 'route-id-1',
    toRouteId: 'route-id-2',
    name: 'Test Package',
    cost: 50000,
    homeDelivery: 'Test Home Address',
    homeDeliveryCost: 10000,
    itemValue: 100000,
    itemCost: 5000,
    collectCost: 2000,
    collectForCustomer: 50000,
    collectForCustomerCost: 3000,
    collectForCustomerNote: 'Test note',
    notes: 'Test delivery notes',
    paymentType: 'paid',
    ...overrides,
  };
};

export const createMockDeliveryRequestWithoutHome = (overrides: any = {}) => {
  return {
    senderName: 'John Doe',
    senderPhone: '+1234567890',
    receiverName: 'Jane Doe',
    receiverPhone: '+1987654321',
    fromRouteId: '507f1f77bcf86cd799439011',
    toRouteId: '507f1f77bcf86cd799439012',
    name: 'Test Package',
    cost: 50000,
    // homeDeliveryCost omitted to use default value of 0
    itemValue: 100000,
    itemCost: 5000,
    collectCost: 2000,
    collectForCustomer: 50000,
    collectForCustomerCost: 3000,
    notes: 'Test delivery notes',
    paymentType: 'paid',
    ...overrides,
  };
};

export const createMockDeliveryList = (count: number = 3): IDeliveryResponse[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockDelivery({
      id: `delivery-id-${index + 1}`,
      code: `240125000${index + 1}`,
      name: `Test Package ${index + 1}`,
      cost: 30000 + index * 10000,
    })
  );
};

// ===== INTEGRATION TEST MOCKS =====
// These are specific mock objects used in integration tests

/**
 * Mock next code response for delivery integration tests
 */
export const mockNextCodeResponseForIntegration = {
  nextCode: '2401250001',
  fullCode: '2401250001T1T2',
  subCode: '17031750001',
  toRoute: {
    id: '507f1f77bcf86cd799439012',
    code: 'T2',
    name: 'Ha Noi',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  fromRoute: {
    id: '507f1f77bcf86cd799439011',
    code: 'T1',
    name: 'Ho Chi Minh',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

/**
 * Mock cost report response for delivery integration tests
 */
export const mockCostReportForIntegration = {
  summary: {
    totalDeliveries: 5,
    totalCost: 250000,
    totalHomeDeliveryCost: 20000,
    totalItemCost: 25000,
    totalItemValue: 500000,
    totalCollectCost: 10000,
    totalCollectForCustomer: 250000,
    totalCollectForCustomerCost: 15000,
    totalRevenue: 290000,
    averageCostPerDelivery: 50000,
    averageItemValue: 100000,
    debtPaymentCount: 2,
    debtPaymentAmount: 150000,
    freePaymentCount: 1,
    normalPaymentCount: 2,
    normalPaymentAmount: 140000,
  },
  deliveries: [
    {
      id: 'delivery-1',
      code: '2401250001',
      date: new Date('2024-01-15'),
      sender: {
        name: 'John Doe',
        phone: '1234567890',
      },
      receiver: {
        name: 'Jane Doe',
        phone: '0987654321',
      },
      toRoute: {
        id: 'route-2',
        code: 'T2',
        name: 'Ha Noi',
      },
      cost: 50000,
      homeDeliveryCost: 10000,
      itemCost: 5000,
      itemValue: 100000,
      collectCost: 2000,
      collectForCustomerCost: 3000,
      collectForCustomer: 50000,
      totalCost: 58000,
      paymentType: 'debt' as const,
      notes: 'Test delivery 1',
    },
    {
      id: 'delivery-2',
      code: '2401250002',
      date: new Date('2024-01-16'),
      sender: {
        name: 'Alice Smith',
        phone: '1111111111',
      },
      receiver: {
        name: 'Bob Johnson',
        phone: '2222222222',
      },
      toRoute: {
        id: 'route-3',
        code: 'T3',
        name: 'Ho Chi Minh',
      },
      cost: 60000,
      homeDeliveryCost: 10000,
      itemCost: 6000,
      itemValue: 120000,
      collectCost: 2500,
      collectForCustomerCost: 4000,
      collectForCustomer: 60000,
      totalCost: 70000,
      paymentType: 'paid' as const,
      notes: 'Test delivery 2',
    },
  ],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 2,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  },
  filter: {
    dateRange: {
      from: new Date('2024-01-01'),
      to: new Date('2024-01-31'),
    },
    fromRoute: {
      id: 'route-1',
      code: 'T1',
      name: 'Test Route',
    },
  },
};
