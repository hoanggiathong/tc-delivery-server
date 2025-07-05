# Test Utils Documentation

## Overview

The `tests/utils/` directory contains centralized testing utilities for the tc-delivery-server project. This provides a single entry point for all mock data, mock models, and mock services used across unit and integration tests.

## Structure

```
tests/utils/
├── index.ts          # Main entry point - exports everything
├── mock-data.ts      # Mock data creators and factory functions
├── mock-models.ts    # Mock model classes and database utilities
├── mock-services.ts  # Mock service classes and methods
└── README.md         # This documentation
```

## Usage

### Import everything from the main entry point:

```typescript
import {
  createMockDelivery,
  createMockCustomer,
  mockDeliveryService,
  MockDelivery,
  resetAllMocks
} from '../utils';
```

### Or import specific modules:

```typescript
import { createMockDelivery } from '../utils/mock-data';
import { mockDeliveryService } from '../utils/mock-services';
import { MockDelivery } from '../utils/mock-models';
```

## Mock Data Creators

Factory functions for creating mock data with optional overrides:

```typescript
// Basic usage
const customer = createMockCustomer();

// With overrides
const customer = createMockCustomer({
  name: 'Custom Name',
  phone: '+1111111111'
});

// Available creators:
createMockCustomer(overrides?)
createMockUser(overrides?)
createMockRoute(overrides?)
createMockUserRoute(overrides?)
createMockDelivery(overrides?)
createMockDeliveryRequest(overrides?)
createMockUserRouteRequest(overrides?)
createMockDate(daysOffset?)
```

## Mock Services

Mock implementations of service classes:

```typescript
// Setup mock returns
mockDeliveryService.createDelivery.mockResolvedValue(mockDelivery);
mockCustomerService.findOrCreateCustomer.mockResolvedValue(mockCustomer);

// Available services:
mockAuthService
mockCustomerService
mockDeliveryService
mockRouteService
mockUserRouteService
mockCodeGeneratorService
```

## Mock Models

Mock implementations of Mongoose models:

```typescript
// Setup mock queries
mockDeliveryModel.find.mockReturnValue(createMockQuery(mockData));
mockDeliveryModel.findOne.mockReturnValue(createMockFindOneQuery(mockData));

// Available models:
mockDeliveryModel
mockUserModel
mockRouteModel
mockCustomerModel
mockUserRouteModel
```

## Mock Model Classes

Mock classes for unit tests:

```typescript
// Mock the model import
jest.mock('@/models/delivery.model', () => ({
  Delivery: MockDelivery
}));

// Available classes:
MockDelivery
MockUser
MockRoute
MockCustomer
MockUserRoute
```

## Query Helpers

Helper functions for creating mock database queries:

```typescript
// Success query
const query = createMockQuery(mockData);
mockDeliveryModel.find.mockReturnValue(query);

// Error query
const errorQuery = createMockErrorQuery();
mockDeliveryModel.find.mockReturnValue(errorQuery);

// Available helpers:
createMockQuery(resolvedValue)
createMockFindOneQuery(resolvedValue)
createMockErrorQuery()
setupCodeGeneratorMocks() // Special helper for code generator tests
```

## Reset Utilities

Functions to reset mocks between tests:

```typescript
// Reset everything
resetAllMocks();

// Reset specific categories
resetAllModelMocks();
resetAllServiceMocks();

// Reset specific services/models
resetDeliveryMocks();
resetUserMocks();
resetAuthServiceMocks();
resetCustomerServiceMocks();
// ... etc
```

## Test Setup Helper

Automatic setup for consistent test environment:

```typescript
describe('My Test Suite', () => {
  // This will reset all mocks before each test
  setupTestEnvironment();

  // Your tests here...
});
```

## Migration from Old Structure

### Before (old structure):
```typescript
import { createMockDelivery } from '../helpers/test-helpers';
import { mockDeliveryService } from '../mocks/delivery.service';
import { MockDelivery } from '../mocks/delivery.model';
```

### After (new structure):
```typescript
import {
  createMockDelivery,
  mockDeliveryService,
  MockDelivery
} from '../utils';
```

## Best Practices

1. **Use the main entry point** (`../utils`) for imports to get everything you need
2. **Reset mocks** between tests using `resetAllMocks()` or specific reset functions
3. **Use factory functions** with overrides for flexible test data creation
4. **Mock at the module level** for consistent behavior across test files
5. **Group related mocks** together for better organization

## Examples

### Unit Test Example:
```typescript
import {
  createMockDelivery,
  mockDeliveryService,
  resetAllMocks
} from '../utils';

describe('DeliveryController', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it('should create delivery', async () => {
    const mockDelivery = createMockDelivery();
    mockDeliveryService.createDelivery.mockResolvedValue(mockDelivery);

    // Test implementation...
  });
});
```

### Integration Test Example:
```typescript
import {
  createMockDelivery,
  createMockCustomer
} from '../utils';

describe('Delivery API', () => {
  it('should create delivery via API', async () => {
    const deliveryData = createMockDelivery({
      name: 'Test Package'
    });

    // Test API call...
  });
});
```

## File Organization

- **mock-data.ts**: Pure data creators, no Jest mocks
- **mock-models.ts**: Database model mocks and query helpers
- **mock-services.ts**: Service layer mocks
- **index.ts**: Unified exports and convenience functions

This structure provides better maintainability, reusability, and consistency across all test files.