/**
 * Mock Services - Centralized Mock Service Exports
 *
 * This module provides all mock service classes and functions for testing
 */

// Import reset functions for use in resetAllServiceMocks
import { resetAuthServiceMocks } from './auth.service';
import { resetCustomerServiceMocks } from './customer.service';
import { resetDeliveryServiceMocks } from './delivery.service';
import { resetMoneyDeliveryServiceMocks } from './money-delivery.service';
import { resetUserRouteServiceMocks } from './user-route.service';
import { resetRouteServiceMocks } from './route.service';
import { resetCodeGeneratorServiceMocks } from './code-generator.service';

// Export all mock services
export * from './auth.service';
export * from './customer.service';
export * from './delivery.service';
export * from './money-delivery.service';
export * from './user-route.service';
export * from './route.service';
export * from './code-generator.service';

// Convenience exports for commonly used items
export {
  // Auth Service
  mockAuthService,
  MockAuthService,
  resetAuthServiceMocks,
} from './auth.service';

export {
  // Customer Service
  mockCustomerService,
  MockCustomerService,
  resetCustomerServiceMocks,
} from './customer.service';

export {
  // Delivery Service
  mockDeliveryService,
  MockDeliveryService,
  resetDeliveryServiceMocks,
} from './delivery.service';

export {
  // Money Delivery Service
  mockMoneyDeliveryService,
  MockMoneyDeliveryService,
  resetMoneyDeliveryServiceMocks,
} from './money-delivery.service';

export {
  // User Route Service
  mockUserRouteService,
  MockUserRouteService,
  resetUserRouteServiceMocks,
} from './user-route.service';

export {
  // Route Service
  mockRouteService,
  MockRouteService,
  resetRouteServiceMocks,
} from './route.service';

export {
  // Code Generator Service
  mockCodeGeneratorService,
  MockCodeGeneratorService,
  resetCodeGeneratorServiceMocks,
} from './code-generator.service';

// Global reset function for all service mocks
export const resetAllServiceMocks = () => {
  resetAuthServiceMocks();
  resetCustomerServiceMocks();
  resetDeliveryServiceMocks();
  resetMoneyDeliveryServiceMocks();
  resetUserRouteServiceMocks();
  resetRouteServiceMocks();
  resetCodeGeneratorServiceMocks();
};
