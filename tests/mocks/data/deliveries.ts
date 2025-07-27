import { IDeliveryResponse } from '@/types/delivery.type';

export const createMockDelivery = (
  overrides: Partial<IDeliveryResponse> = {}
): IDeliveryResponse => {
  return {
    id: 'delivery-id-1',
    code: '2401250001',
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
    totalCost: 68000, // 50000 + 10000 + 5000 + 3000 (excluding collectCost)
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
  toRoute: {
    id: '507f1f77bcf86cd799439012',
    code: 'T2',
    name: 'Ha Noi',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};
