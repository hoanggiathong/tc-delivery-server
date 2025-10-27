import { IDraftDeliveryResponse } from '@/types/draft-delivery.type';
import { VehicleType } from '@/models/delivery.model';

export const createMockDraftDelivery = (
  overrides: Partial<IDraftDeliveryResponse> = {}
): IDraftDeliveryResponse => {
  return {
    id: 'draft-delivery-id-1',
    senderName: 'Nguyễn Văn An',
    senderPhone: '+84901234567',
    receiverName: 'Trần Thị Bình',
    receiverPhone: '+84907654321',
    fromRoute: {
      id: '507f1f77bcf86cd799439011',
      code: 'T1',
      name: 'TP.HCM',
      address: '123 Nguyen Hue, District 1',
    },
    toRoute: {
      id: '507f1f77bcf86cd799439012',
      code: 'T2',
      name: 'Hà Nội',
      address: '456 Ba Trieu, Hoan Kiem',
    },
    name: 'Quần áo',
    quantity: 1,
    cost: 30000,
    homeDeliveryCost: 0,
    carryCost: 0,
    vehicleType: VehicleType.MOTORBIKE,
    itemValue: 500000,
    itemCost: 5000,
    collectCost: 0,
    collectForCustomer: 0,
    collectForCustomerCost: 0,
    notes: 'Test draft delivery',
    totalCost: 35000,
    paymentType: 'paid',
    isFree: false,
    createdByUser: {
      id: 'user-id-1',
      username: 'testuser',
    },
    createdAt: '2024-12-17T10:00:00.000Z',
    updatedAt: '2024-12-17T10:00:00.000Z',
    ...overrides,
  };
};

export const createMockDraftDeliveryWithHomeDelivery = (
  overrides: Partial<IDraftDeliveryResponse> = {}
): IDraftDeliveryResponse => {
  return createMockDraftDelivery({
    name: 'Điện thoại',
    quantity: 2,
    cost: 50000,
    homeDelivery: '123 Nguyễn Văn Linh, Q7',
    homeDeliveryCost: 15000,
    carryCost: 10000,
    homeDeliveryCostTotal: 25000,
    vehicleType: VehicleType.SMALL_TRUCK,
    itemValue: 15000000,
    itemCost: 150000,
    collectForCustomer: 15000000,
    collectForCustomerCost: 150000,
    collectForCustomerNote: 'Thu hộ tiền bán hàng',
    details: {
      weight: 0.8,
      length: 15,
      width: 8,
      height: 2,
      isOverweight: false,
      convertedWeight: 1.2,
    },
    notes: 'Hàng giá trị cao, cẩn thận',
    totalCost: 350000,
    ...overrides,
  });
};

export const createMockDraftDeliveryRequest = (overrides: any = {}) => {
  return {
    senderName: 'Nguyễn Văn An',
    senderPhone: '+84901234567',
    receiverName: 'Trần Thị Bình',
    receiverPhone: '+84907654321',
    fromRouteId: '507f1f77bcf86cd799439011',
    toRouteId: '507f1f77bcf86cd799439012',
    name: 'Quần áo',
    quantity: 1,
    cost: 30000,
    homeDeliveryCost: 0,
    carryCost: 0,
    vehicleType: VehicleType.MOTORBIKE,
    itemValue: 500000,
    itemCost: 5000,
    collectForCustomer: 0,
    collectForCustomerCost: 0,
    notes: 'Test draft delivery',
    paymentType: 'paid',
    isFree: false,
    ...overrides,
  };
};

export const createMockDraftDeliveryRequestWithHomeDelivery = (overrides: any = {}) => {
  return {
    senderName: 'Shop ABC',
    senderPhone: '+84908888888',
    receiverName: 'Lê Văn Cường',
    receiverPhone: '+84909999999',
    fromRouteId: '507f1f77bcf86cd799439011',
    toRouteId: '507f1f77bcf86cd799439012',
    name: 'Điện thoại',
    quantity: 2,
    cost: 50000,
    homeDelivery: '123 Nguyễn Văn Linh, Q7',
    homeDeliveryCost: 15000,
    carryCost: 10000,
    vehicleType: VehicleType.SMALL_TRUCK,
    itemValue: 15000000,
    itemCost: 150000,
    collectForCustomer: 15000000,
    collectForCustomerCost: 150000,
    collectForCustomerNote: 'Thu hộ tiền bán hàng',
    details: {
      weight: 0.8,
      length: 15,
      width: 8,
      height: 2,
      isOverweight: false,
      convertedWeight: 1.2,
    },
    notes: 'Hàng giá trị cao, cẩn thận',
    paymentType: 'paid',
    ...overrides,
  };
};

export const createMockDraftDeliveryList = (count: number = 3): IDraftDeliveryResponse[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockDraftDelivery({
      id: `draft-delivery-id-${index + 1}`,
      name: `Test Package ${index + 1}`,
      cost: 30000 + index * 10000,
      totalCost: 35000 + index * 10000,
    })
  );
};

// ===== INTEGRATION TEST MOCKS =====
// These are specific mock objects used in integration tests

/**
 * Mock draft delivery for integration tests - simple draft without home delivery
 */
export const mockDraftDeliveryForIntegration: IDraftDeliveryResponse = {
  id: '507f1f77bcf86cd799439030',
  senderName: 'Nguyễn Văn An',
  senderPhone: '+84901234567',
  receiverName: 'Trần Thị Bình',
  receiverPhone: '+84907654321',
  fromRoute: {
    id: '507f1f77bcf86cd799439011',
    code: 'T1',
    name: 'TP.HCM',
    address: '123 Nguyen Hue, District 1',
  },
  toRoute: {
    id: '507f1f77bcf86cd799439012',
    code: 'T2',
    name: 'Hà Nội',
    address: '456 Ba Trieu, Hoan Kiem',
  },
  name: 'Quần áo',
  quantity: 1,
  cost: 30000,
  homeDeliveryCost: 0,
  carryCost: 0,
  vehicleType: VehicleType.MOTORBIKE,
  itemValue: 500000,
  itemCost: 5000,
  collectCost: 0,
  collectForCustomer: 0,
  collectForCustomerCost: 0,
  notes: 'Test draft delivery',
  totalCost: 35000,
  paymentType: 'paid',
  isFree: false,
  createdByUser: {
    id: '507f1f77bcf86cd799439040',
    username: 'testuser',
  },
  createdAt: '2024-12-17T10:00:00.000Z',
  updatedAt: '2024-12-17T10:00:00.000Z',
};

/**
 * Mock draft delivery with home delivery for integration tests
 */
export const mockDraftDeliveryWithHomeDeliveryForIntegration: IDraftDeliveryResponse = {
  id: '507f1f77bcf86cd799439031',
  senderName: 'Shop ABC',
  senderPhone: '+84908888888',
  receiverName: 'Lê Văn Cường',
  receiverPhone: '+84909999999',
  fromRoute: {
    id: '507f1f77bcf86cd799439011',
    code: 'T1',
    name: 'TP.HCM',
    address: '123 Nguyen Hue, District 1',
  },
  toRoute: {
    id: '507f1f77bcf86cd799439012',
    code: 'T2',
    name: 'Hà Nội',
    address: '456 Ba Trieu, Hoan Kiem',
  },
  name: 'Điện thoại',
  quantity: 2,
  cost: 50000,
  homeDelivery: '123 Nguyễn Văn Linh, Q7',
  homeDeliveryCost: 15000,
  carryCost: 10000,
  homeDeliveryCostTotal: 25000,
  vehicleType: VehicleType.SMALL_TRUCK,
  itemValue: 15000000,
  itemCost: 150000,
  collectCost: 0,
  collectForCustomer: 15000000,
  collectForCustomerCost: 150000,
  collectForCustomerNote: 'Thu hộ tiền bán hàng',
  details: {
    weight: 0.8,
    length: 15,
    width: 8,
    height: 2,
    isOverweight: false,
    convertedWeight: 1.2,
  },
  notes: 'Hàng giá trị cao, cẩn thận',
  totalCost: 350000,
  paymentType: 'paid',
  isFree: false,
  createdByUser: {
    id: '507f1f77bcf86cd799439041',
    username: 'shopuser',
  },
  createdAt: '2024-12-17T09:00:00.000Z',
  updatedAt: '2024-12-17T09:00:00.000Z',
};

/**
 * Mock draft deliveries list for integration tests
 */
export const mockDraftDeliveriesListForIntegration = [
  mockDraftDeliveryForIntegration,
  mockDraftDeliveryWithHomeDeliveryForIntegration,
];
