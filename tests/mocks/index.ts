/**
 * Mock Exports - Centralized Mock Exports
 *
 * This module provides a single entry point for all testing mocks including:
 * - Mock data creators
 * - Mock models and database utilities
 * - Mock services
 * - Reset utilities
 */

// Import reset functions for use in resetAllMocks
import { resetAllModelMocks } from './models';
import { resetAllServiceMocks } from './services';

// Export all mock data
export * from './data';

// Export all mock services
export * from './services';

// Export all mock models
export * from './models';

// Convenience exports for commonly used items
export {
  // Mock Data
  createMockCustomer,
  createMockCustomerResponse,
  createMockUser,
  createMockRoute,
  createMockDelivery,
  createMockMoneyDelivery,
  createMockCustomerRequest,
  createMockUserRequest,
  createMockRouteRequest,
  createMockDeliveryRequest,
  createMockMoneyDeliveryRequest,
  createMockCustomerList,
  createMockUserList,
  createMockRouteList,
  createMockDeliveryList,
  createMockMoneyDeliveryList,
  createMockNextCodeResult,
  customerToResponse,
  mockCostReportForIntegration,
} from './data';

export {
  // Mock Services
  mockAuthService,
  mockCustomerService,
  mockDeliveryService,
  mockMoneyDeliveryService,
  mockRouteService,
  mockUserRouteService,
  mockCodeGeneratorService,
  MockAuthService,
  MockCustomerService,
  MockDeliveryService,
  MockMoneyDeliveryService,
  MockRouteService,
  MockUserRouteService,
  MockCodeGeneratorService,
  resetAllServiceMocks,
  resetAuthServiceMocks,
  resetCustomerServiceMocks,
  resetDeliveryServiceMocks,
  resetMoneyDeliveryServiceMocks,
  resetRouteServiceMocks,
  resetUserRouteServiceMocks,
  resetCodeGeneratorServiceMocks,
} from './services';

export {
  // Mock Models
  mockDeliveryModel,
  mockUserModel,
  mockRouteModel,
  mockCustomerModel,
  mockUserRouteModel,
  MockDelivery,
  MockUser,
  MockRoute,
  MockCustomer,
  MockUserRoute,
  createMockQuery,
  createMockFindOneQuery,
  createMockErrorQuery,
  resetAllModelMocks,
  resetDeliveryMocks,
  resetUserMocks,
  resetRouteMocks,
  resetCustomerMocks,
  resetUserRouteMocks,
} from './models';

// Global reset utility function
export const resetAllMocks = () => {
  resetAllModelMocks();
  resetAllServiceMocks();
  jest.clearAllMocks();
};

// Test setup helper
export const setupTestEnvironment = () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
};
