/**
 * Mock Models - Centralized Mock Model Exports
 *
 * This module provides all mock model classes and functions for testing
 */

// Export all mock models
export * from './delivery.model';
export * from './user.model';
export * from './customer.model';
export * from './route.model';
export * from './user-route.model';

// Convenience exports for commonly used items
export {
  // Delivery Model
  mockDeliveryModel,
  MockDelivery,
  resetDeliveryMocks
} from './delivery.model';

export {
  // User Model
  mockUserModel,
  MockUser,
  resetUserMocks
} from './user.model';

export {
  // Customer Model
  mockCustomerModel,
  MockCustomer,
  resetCustomerMocks
} from './customer.model';

export {
  // Route Model
  mockRouteModel,
  MockRoute,
  resetRouteMocks
} from './route.model';

export {
  // User Route Model
  mockUserRouteModel,
  MockUserRoute,
  resetUserRouteMocks
} from './user-route.model';

// Mock helper functions
export const createMockQuery = (resolvedValue: any) => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(resolvedValue),
  populate: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(resolvedValue)
});

export const createMockFindOneQuery = (resolvedValue: any) => ({
  lean: jest.fn().mockResolvedValue(resolvedValue),
  populate: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(resolvedValue)
});

export const createMockErrorQuery = () => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockRejectedValue(new Error('Database error')),
  populate: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn().mockRejectedValue(new Error('Database error'))
});

// Global reset function for all model mocks
export const resetAllModelMocks = () => {
  // Import at function level to avoid circular dependencies
  const { resetDeliveryMocks } = require('./delivery.model');
  const { resetUserMocks } = require('./user.model');
  const { resetCustomerMocks } = require('./customer.model');
  const { resetRouteMocks } = require('./route.model');
  const { resetUserRouteMocks } = require('./user-route.model');

  resetDeliveryMocks();
  resetUserMocks();
  resetCustomerMocks();
  resetRouteMocks();
  resetUserRouteMocks();
};