import { IDeliveryResponse } from '@/types/delivery.type';
import { SMSStatus } from '@/types/sms-notification.type';

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
      fromRouteId: '507f1f77bcf86cd799439011',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    receiver: {
      id: 'customer-id-2',
      name: 'Jane Doe',
      phone: '0987654321',
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
      address: 'Test Route 2 Address',
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
    totalCost: 70000,
    actualRevenue: 120000,
    paymentType: 'paid',
    isFree: false,
    isReturn: false,
    smsStatus: SMSStatus.NOT_SENT,
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
    homeDeliveryCost: 0,
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

/**
 * Create mock delivery with bank info in sender (for testing nested populate)
 */
export const createMockDeliveryWithBank = (
  overrides: Partial<IDeliveryResponse> = {}
): IDeliveryResponse => {
  return createMockDelivery({
    sender: {
      id: 'customer-id-1',
      name: 'John Doe',
      phone: '1234567890',
      fromRouteId: '507f1f77bcf86cd799439011',
      bank: {
        id: 'bank-id-1',
        name: 'John Doe',
        bankName: 'Vietcombank',
        bankAccount: '1234567890',
        bankBranch: 'Ho Chi Minh Branch',
        bankAddress: '123 Nguyen Hue, District 1, HCMC',
      },
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    ...overrides,
  });
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
  deliveries: [
    {
      id: 'delivery-1',
      code: '2401250001',
      fullCode: 'T1-T2-2401250001',
      subCode: 'A001',
      name: 'Package 1',
      nameProductAndAdditionalInformation: 'Fragile items',
      quantity: 5,
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
        address: '456 Ha Noi Street',
      },
      cost: 50000,
      homeDelivery: '123 Street, Ha Noi',
      homeDeliveryCost: 10000,
      itemCost: 5000,
      itemValue: 100000,
      collectCost: 2000,
      collectForCustomer: 50000,
      collectForCustomerCost: 3000,
      collectForCustomerNote: 'Collect on delivery',
      totalCost: 70000,
      actualRevenue: 120000,
      paymentType: 'debt' as const,
      upItems: 'Hàng lên tại HCM',
      downItems: 'Hàng xuống tại Hà Nội',
      notes: 'Test delivery 1',
      details: {
        weight: 5,
        length: 30,
        width: 20,
        height: 10,
        isOverweight: false,
      },
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 'delivery-2',
      code: '2401250002',
      fullCode: 'T1-T3-2401250002',
      subCode: 'A002',
      name: 'Package 2',
      nameProductAndAdditionalInformation: 'Electronics',
      quantity: 5,
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
        address: '789 Ho Chi Minh Street',
      },
      cost: 60000,
      homeDelivery: '456 Avenue, Ho Chi Minh',
      homeDeliveryCost: 10000,
      itemCost: 6000,
      itemValue: 120000,
      collectCost: 2500,
      collectForCustomer: 60000,
      collectForCustomerCost: 4000,
      collectForCustomerNote: 'Handle with care',
      totalCost: 82500,
      actualRevenue: 142500,
      paymentType: undefined,
      upItems: 'Hàng lên tại Đà Nẵng',
      downItems: undefined,
      notes: 'Test delivery 2',
      details: {
        weight: 8,
        length: 40,
        width: 30,
        height: 15,
        isOverweight: false,
      },
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date('2024-01-16'),
    },
  ],
  routeInfo: {
    route: {
      id: 'route-1',
      code: 'T1',
      name: 'Test Route',
    },
    routeCode: 'T1',
    routeName: 'Test Route',
  },
};
