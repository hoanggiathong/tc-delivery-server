/**
 * Test Utils - Centralized Testing Utilities
 *
 * This module provides a single entry point for all testing utilities including:
 * - Mock data creators
 * - Mock models and database utilities
 * - Mock services
 * - Reset utilities
 */

// Export all mock data creators
export * from './mock-data';

// Export all mock models and database utilities
export * from './mock-models';

// Export all mock services
export * from './mock-services';

// Convenience exports for commonly used items
export {
  // Mock Data
  createMockCustomer,
  createMockUser,
  createMockRoute,
  createMockUserRoute,
  createMockDelivery,
  createMockDeliveryRequest,
  createMockUserRouteRequest,
  createMockDate
} from './mock-data';

export {
  // Mock Models
  MockDelivery,
  MockUser,
  MockRoute,
  MockCustomer,
  MockUserRoute,
  mockDeliveryModel,
  mockUserModel,
  mockRouteModel,
  mockCustomerModel,
  mockUserRouteModel,

  // Mock Query Helpers
  createMockQuery,
  createMockFindOneQuery,
  createMockErrorQuery,
  setupCodeGeneratorMocks,

  // Reset Model Utilities
  resetAllModelMocks,
  resetDeliveryMocks,
  resetUserMocks,
  resetRouteMocks,
  resetCustomerMocks,
  resetUserRouteMocks
} from './mock-models';

export {
  // Mock Services
  mockAuthService,
  mockCustomerService,
  mockDeliveryService,
  mockRouteService,
  mockUserRouteService,
  mockCodeGeneratorService,
  MockAuthService,
  MockCustomerService,
  MockDeliveryService,
  MockRouteService,
  MockUserRouteService,
  MockCodeGeneratorService,

  // Reset Service Utilities
  resetAllServiceMocks,
  resetAuthServiceMocks,
  resetCustomerServiceMocks,
  resetDeliveryServiceMocks,
  resetRouteServiceMocks,
  resetUserRouteServiceMocks,
  resetCodeGeneratorServiceMocks
} from './mock-services';

// Global reset utility function
export const resetAllMocks = () => {
  // Import at function level to avoid circular dependencies
  const { resetAllModelMocks } = require('./mock-models');
  const { resetAllServiceMocks } = require('./mock-services');

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