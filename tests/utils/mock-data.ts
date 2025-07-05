/**
 * Mock Data Creators
 * Centralized mock data factory functions for testing
 */

export const createMockCustomer = (overrides: any = {}) => ({
  id: 'customer123',
  name: 'John Doe',
  phone: '+1234567890',
  createdAt: '2025-06-27T07:51:17.342Z',
  updatedAt: '2025-06-27T07:51:17.342Z',
  ...overrides
});

export const createMockUser = (overrides: any = {}) => ({
  id: 'user123',
  username: 'testuser',
  role: 'user',
  createdAt: '2025-06-27T07:51:17.342Z',
  updatedAt: '2025-06-27T07:51:17.342Z',
  ...overrides
});

export const createMockRoute = (overrides: any = {}) => ({
  id: 'route123',
  code: 'T1',
  name: 'Ho Chi Minh',
  createdAt: '2025-06-27T07:51:17.342Z',
  updatedAt: '2025-06-27T07:51:17.342Z',
  ...overrides
});

export const createMockUserRoute = (overrides: any = {}) => ({
  id: 'userRoute123',
  userId: 'user123',
  routeId: 'route123',
  assignedBy: 'admin123',
  user: createMockUser(),
  route: createMockRoute(),
  assignedByUser: createMockUser({ id: 'admin123', username: 'admin', role: 'admin' }),
  createdAt: '2025-06-27T07:51:17.342Z',
  updatedAt: '2025-06-27T07:51:17.342Z',
  ...overrides
});

export const createMockDelivery = (overrides: any = {}) => ({
  id: 'delivery123',
  code: '2501270001',
  sender: createMockCustomer({ id: 'sender123', name: 'John Sender' }),
  receiver: createMockCustomer({ id: 'receiver123', name: 'Jane Receiver' }),
  fromRoute: createMockRoute({ id: 'fromRoute123', code: 'T1', name: 'Ho Chi Minh' }),
  toRoute: createMockRoute({ id: 'toRoute123', code: 'T2', name: 'Long An' }),
  name: 'Electronics Package',
  cost: 50000,
  homeDelivery: '123 Main Street',
  homeDeliveryCost: 10000,
  itemValue: 1000000,
  itemCost: 30000,
  collectCost: 15000,
  collectForCustomer: 25000,
  collectForCustomerCost: 20000,
  collectForCustomerNote: 'Handle with care',
  notes: 'Delivery notes',
  createdByUser: 'admin',
  createdAt: '2025-06-27T07:51:17.342Z',
  updatedAt: '2025-06-27T07:51:17.342Z',
  ...overrides
});

// Mock request data
export const createMockDeliveryRequest = (overrides: any = {}) => ({
  senderName: 'John Sender',
  senderPhone: '+1234567890',
  receiverName: 'Jane Receiver',
  receiverPhone: '+1987654321',
  fromRouteId: 'fromRoute123',
  toRouteId: 'toRoute123',
  name: 'Package Item',
  cost: 100,
  homeDelivery: '123 Main St',
  homeDeliveryCost: 20,
  itemValue: 500,
  itemCost: 50,
  collectCost: 30,
  collectForCustomer: 25000,
  collectForCustomerCost: 40,
  collectForCustomerNote: 'Test note',
  notes: 'Test delivery notes',
  ...overrides
});

export const createMockUserRouteRequest = (overrides: any = {}) => ({
  userId: 'user123',
  routeId: 'route123',
  ...overrides
});

// Helper for creating dates
export const createMockDate = (daysOffset: number = 0): Date => {
  const date = new Date('2025-06-27T07:51:17.342Z');
  date.setDate(date.getDate() + daysOffset);
  return date;
};