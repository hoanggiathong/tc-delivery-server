/**
 * Mock Data - Centralized Mock Data Exports
 *
 * This module provides all mock data creators for testing
 */

// Export all mock data creators
export * from './customers';
export * from './users';
export * from './deliveries';
export * from './routes';
export * from './money-deliveries';

// Convenience exports for commonly used items
export {
  // Customer mocks
  createMockCustomer,
  createMockCustomerRequest,
  createMockCustomerList,
} from './customers';

export {
  // User mocks
  createMockUser,
  createMockUserRequest,
  createMockUserList,
} from './users';

export {
  // Delivery mocks
  createMockDelivery,
  createMockDeliveryRequest,
  createMockDeliveryRequestWithoutHome,
  createMockDeliveryList,
} from './deliveries';

export {
  // Route mocks
  createMockRoute,
  createMockRouteRequest,
  createMockRouteList,
} from './routes';

export {
  // Money Delivery mocks
  createMockMoneyDelivery,
  createMockMoneyDeliveryRequest,
  createMockNextCodeResult,
  createMockFrequentCustomersResult,
  createMockMoneyDeliveryList,
} from './money-deliveries';
