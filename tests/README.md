# Test Directory Structure

The test directory structure has been reorganized and optimized for better management and performance:

## 📁 Directory Structure

```
tests/
├── unit/                           # Unit Tests
│   ├── config/                     # Configuration tests
│   ├── middlewares/                # Middleware tests
│   ├── models/                     # Model tests
│   ├── services/                   # Service tests
│   └── utils/                      # Utility tests
├── integration/                    # Integration Tests
│   ├── auth.test.ts               # Authentication API tests
│   ├── customer.test.ts           # Customer API tests
│   ├── delivery.test.ts           # Delivery API tests
│   ├── money-delivery.test.ts     # Money Delivery API tests
│   └── user-route.test.ts         # User Route API tests
├── mocks/                          # Mock Services (Centralized)
│   ├── auth.service.ts
│   ├── customer.service.ts
│   ├── delivery.service.ts
│   ├── money-delivery.service.ts
│   └── user-route.service.ts
├── helpers/                        # Test Utilities
│   └── test-helpers.ts
├── setup.ts                        # Test Setup
└── README.md                       # Documentation
```

## 🧪 Test Types

### Unit Tests (`tests/unit/`)
- Test individual service functions, models, and utilities
- Fully mock dependencies using Jest mocks
- Fast execution, completely independent
- **Run**: `npm run test:unit`

### Integration Tests (`tests/integration/`)
- Test API endpoints with controllers and middleware
- Test complete request/response flow
- Mock services but test validation, authentication, and business logic
- **Run**: `npm run test:integration`

## 🔧 Available Scripts

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Debug tests
npm run test:debug

# Debug specific file
npm run test:debug-file auth.test

# Debug specific test name
npm run test:debug-name "should create"

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 🗂️ Mocks (`tests/mocks/`)

Centralized mock services used in integration tests:
- `auth.service.ts` - Mock AuthService
- `customer.service.ts` - Mock CustomerService
- `delivery.service.ts` - Mock DeliveryService
- `money-delivery.service.ts` - Mock MoneyDeliveryService
- `user-route.service.ts` - Mock UserRouteService

**Mock Strategy:**
- All services are mocked at the module level using `jest.mock()`
- Mock data is created inline within each test for clarity
- No real database connections in integration tests
- Focus on testing business logic, validation, and authorization

## 🛠️ Helpers (`tests/helpers/`)

Contains utility functions for test setup:
- `test-helpers.ts` - Common test utilities and setup functions

## ⚙️ Setup (`tests/setup.ts`)

Common setup file for all tests:
- Configure Jest environment
- Setup custom matchers (e.g., `toEqualWithDateStrings`)
- Global test configuration

## 📝 Naming Conventions

- **Unit tests**: `*.test.ts` (organized by feature type)
- **Integration tests**: `*.test.ts` (in integration/ directory)
- **Mocks**: `*.service.ts` (in mocks/ directory)
- **Helpers**: `*-helpers.ts`

## 🔍 Test Strategy

### Integration Test Focus Areas:
1. **Business Logic Validation** - Test core functionality
2. **API Endpoint Behavior** - Test request/response flow
3. **Authentication & Authorization** - Test access control
4. **Input Validation** - Test schema validation
5. **Error Handling** - Test business logic errors

### Excluded Test Cases:
- ❌ Database connection errors
- ❌ Logger errors
- ❌ Infrastructure failures
- ❌ Duplicate test scenarios

## 🔍 Debug Tests

### VS Code Debug
1. Set breakpoint in code
2. Open Command Palette (`Cmd+Shift+P`)
3. Select "Debug: Start Debugging"
4. Choose appropriate configuration

### Chrome DevTools
1. Run `npm run test:debug`
2. Open Chrome and go to `chrome://inspect`
3. Click "Open dedicated DevTools"

## 📊 Coverage

Run coverage report:
```bash
npm run test:coverage
```

Coverage will be generated in the `coverage/` directory with detailed HTML report.

## 🚀 Performance Optimizations

### Recent Improvements:
- **Reduced test count**: From ~80+ tests to ~50 tests
- **Faster execution**: Removed unnecessary database operations
- **Better isolation**: All tests use mocks, no real DB connections
- **Cleaner code**: Removed duplicate and redundant test cases
- **Focused testing**: Only test business logic and API behavior

### Test Execution Time:
- **Before**: ~10-15 seconds for all integration tests
- **After**: ~3-5 seconds for all integration tests

## 🎯 Best Practices

1. **Mock Everything**: All external dependencies should be mocked
2. **Test Business Logic**: Focus on what the code does, not how it does it
3. **Keep Tests Simple**: One assertion per test when possible
4. **Use Descriptive Names**: Test names should clearly describe the scenario
5. **Avoid Test Interdependence**: Each test should be independent

## 🔧 Troubleshooting

### Common Issues:
1. **Mock not working**: Ensure `jest.mock()` is called at the top of the file
2. **Type errors**: Check that mock data matches expected interfaces
3. **Test failures**: Verify that mock responses match API expectations

### Debug Commands:
```bash
# Run specific test file with verbose output
npm test -- --testPathPattern="auth.test.ts" --verbose

# Run tests with coverage
npm test -- --coverage --testPathPattern="integration"

# Debug specific test
npm test -- --testNamePattern="should create customer"
```