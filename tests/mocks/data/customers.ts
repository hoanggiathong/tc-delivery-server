import { ICustomerResponse } from '@/types/customer.type';

export const createMockCustomer = (
  overrides: Partial<ICustomerResponse> = {}
): ICustomerResponse => {
  return {
    id: 'customer-id-1',
    name: 'John Doe',
    phone: '1234567890',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    ...overrides,
  };
};

export const createMockCustomerRequest = (overrides: any = {}) => {
  return {
    name: 'John Doe',
    phone: '1234567890',
    ...overrides,
  };
};

export const createMockCustomerList = (count: number = 3): ICustomerResponse[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockCustomer({
      id: `customer-id-${index + 1}`,
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
    createdAt: new Date('2025-06-27T07:51:17.342Z'),
    updatedAt: new Date('2025-06-27T07:51:17.342Z'),
  },
  forDeletion: {
    id: 'customer123',
    name: 'John Doe',
    phone: '+1234567890',
    createdAt: new Date('2025-06-27T07:51:17.342Z'),
    updatedAt: new Date('2025-06-27T07:51:17.342Z'),
  },
};
