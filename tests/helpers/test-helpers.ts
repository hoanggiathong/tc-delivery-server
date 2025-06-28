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

export const createMockDelivery = (overrides: any = {}) => ({
  id: 'delivery123',
  sender: createMockCustomer({ id: 'sender123', name: 'John Sender' }),
  receiver: createMockCustomer({ id: 'receiver123', name: 'Jane Receiver' }),
  route: 'Hanoi - HCMC',
  name: 'Electronics Package',
  cost: 50000,
  homeDelivery: '123 Main Street',
  homeDeliveryCost: 10000,
  itemValue: 1000000,
  itemCost: 30000,
  collectCost: 15000,
  collectForCustomer: true,
  collectForCustomerCost: 20000,
  collectForCustomerNote: 'Handle with care',
  createdByUser: 'admin',
  createdAt: '2025-06-27T07:51:17.342Z',
  updatedAt: '2025-06-27T07:51:17.342Z',
  ...overrides
});