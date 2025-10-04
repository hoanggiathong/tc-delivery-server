import { ICustomer } from '@/models/customer.model';
import { ICustomerBank } from '@/models/customer-bank.model';
import { ICustomerResponse } from '@/types/customer.type';
import { Types } from 'mongoose';

export const createMockCustomer = (overrides: Partial<ICustomer> = {}): ICustomer => {
  return {
    _id: 'customer-id-1',
    name: 'John Doe',
    phone: '1234567890',
    routeId: new Types.ObjectId('507f1f77bcf86cd799439011'),
    relativeReceiver: [],
    type: 'delivery',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    ...overrides,
  } as ICustomer;
};

export const createMockCustomerResponse = (
  overrides: Partial<ICustomerResponse> = {}
): ICustomerResponse => {
  return {
    id: 'customer-id-1',
    name: 'John Doe',
    phone: '1234567890',
    fromRouteId: '507f1f77bcf86cd799439011',
    toRouteId: '507f1f77bcf86cd799439012',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    ...overrides,
  };
};

export const createMockCustomerRequest = (overrides: any = {}) => {
  return {
    name: 'John Doe',
    phone: '1234567890',
    fromRouteId: '507f1f77bcf86cd799439011',
    toRouteId: '507f1f77bcf86cd799439012',
    ...overrides,
  };
};

// Utility to convert ICustomer to ICustomerResponse for delivery tests
export const createMockCustomerBank = (overrides: Partial<ICustomerBank> = {}): ICustomerBank => {
  return {
    _id: 'bank-id-1',
    name: 'Nguyễn Văn A',
    bankName: 'Vietcombank',
    bankAccount: '0071000123456',
    bankBranch: 'Chi nhánh Tân Bình',
    bankAddress: '285 Cách Mạng Tháng 8',
    qrCodeUrl: '/uploads/customers/customer-id-1/bank-qrcode.png?v=123456',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    ...overrides,
  } as ICustomerBank;
};

export const createMockCustomerWithBank = (
  customerOverrides: Partial<ICustomer> = {},
  bankOverrides: Partial<ICustomerBank> = {}
): ICustomer => {
  const mockBank = createMockCustomerBank(bankOverrides);
  return createMockCustomer({
    phone: '+84912345678',
    bankId: mockBank as any, // Populated bank data
    ...customerOverrides,
  });
};

export const customerToResponse = (customer: ICustomer): ICustomerResponse => {
  return {
    id: customer._id,
    name: customer.name,
    phone: customer.phone,
    fromRouteId: customer.routeId.toString(),
    toRouteId: customer.routeId.toString(),
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
};

export const createMockCustomerList = (count: number = 3): ICustomer[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockCustomer({
      _id: `customer-id-${index + 1}`,
      name: `Customer ${index + 1}`,
      phone: `123456789${index}`,
    })
  );
};

// ===== INTEGRATION TEST MOCKS =====
// These are specific mock objects used in integration tests

/**
 * Mock customers for integration tests - different scenarios
 */
export const mockCustomersForIntegration = {
  updated: {
    id: 'customer123',
    name: 'Jane Doe',
    phone: '+1987654321',
    fromRouteId: '507f1f77bcf86cd799439011',
    toRouteId: '507f1f77bcf86cd799439012',
    createdAt: new Date('2025-06-27T07:51:17.342Z'),
    updatedAt: new Date('2025-06-27T07:51:17.342Z'),
  },
  forDeletion: {
    id: 'customer123',
    name: 'John Doe',
    phone: '+1234567890',
    fromRouteId: '507f1f77bcf86cd799439011',
    toRouteId: '507f1f77bcf86cd799439012',
    createdAt: new Date('2025-06-27T07:51:17.342Z'),
    updatedAt: new Date('2025-06-27T07:51:17.342Z'),
  },
};
