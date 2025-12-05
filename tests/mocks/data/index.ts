/**
 * Mock Data - Centralized Mock Data Exports
 *
 * This module provides all mock data creators for testing
 */

// Convenience exports for commonly used items
export {
  // Customer mocks
  createMockCustomer,
  createMockCustomerWithBank,
  createMockCustomerBank,
  createMockCustomerResponse,
  createMockCustomerRequest,
  createMockCustomerList,
  customerToResponse,
  // Integration test mocks
  mockCustomersForIntegration,
} from './customers';

export {
  // User mocks
  createMockUser,
  createMockUserRequest,
  createMockUserList,
  // Integration test mocks
  mockAuthUsersForIntegration,
} from './users';

export {
  // Delivery mocks
  createMockDelivery,
  createMockDeliveryRequest,
  createMockDeliveryRequestWithoutHome,
  createMockDeliveryList,
  // Delivery integration test mocks
  mockNextCodeResponseForIntegration as mockDeliveryNextCodeResponseForIntegration,
  mockCostReportForIntegration,
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
  createMockMoneyDeliveryList,
} from './money-deliveries';

export {
  // Money Delivery integration test mocks
  mockMoneyDeliveryForIntegration,
  mockMoneyDeliveryNextCodeResponseForIntegration,
  mockUpdatedMoneyDeliveryForIntegration,
  mockMoneyDeliveryWithAlphaRoutes,
  mockMoneyDeliveryCostReportForIntegration,
} from './money-deliveries';

export {
  // Draft Delivery mocks
  createMockDraftDelivery,
  createMockDraftDeliveryWithHomeDelivery,
  createMockDraftDeliveryRequest,
  createMockDraftDeliveryRequestWithHomeDelivery,
  createMockDraftDeliveryList,
  // Draft Delivery integration test mocks
  mockDraftDeliveryForIntegration,
  mockDraftDeliveryWithHomeDeliveryForIntegration,
  mockDraftDeliveriesListForIntegration,
} from './draft-deliveries';
