# Test Directory Structure

The test directory structure has been reorganized for better management and categorization:

## 📁 Directory Structure

```
tests/
├── unit/                           # Unit Tests
│   ├── auth.service.test.ts
│   └── customer.service.test.ts
├── integration/                    # Integration Tests
│   ├── auth.test.ts
│   ├── customer.test.ts
│   └── delivery.test.ts
├── mocks/                          # Mock Services
│   ├── auth.service.ts
│   ├── customer.service.ts
│   └── delivery.service.ts
├── helpers/                        # Test Utilities
│   └── test-helpers.ts
├── setup.ts                        # Test Setup
└── README.md                       # Documentation
```

## 🧪 Test Types

### Unit Tests (`tests/unit/`)
- Test individual service functions
- Fully mock dependencies
- Fast execution, independent
- **Run**: `npm run test:unit`

### Integration Tests (`tests/integration/`)
- Test API endpoints with controllers
- Test complete request/response flow
- Mock services but test middleware, validation
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

Contains mock services used in integration tests:
- `auth.service.ts` - Mock AuthService
- `customer.service.ts` - Mock CustomerService
- `delivery.service.ts` - Mock DeliveryService

## 🛠️ Helpers (`tests/helpers/`)

Contains utility functions to create mock data:
- `createMockUser()` - Create mock user object
- `createMockCustomer()` - Create mock customer object
- `createMockDelivery()` - Create mock delivery object

## ⚙️ Setup (`tests/setup.ts`)

Common setup file for all tests:
- Initialize MongoDB Memory Server
- Cleanup after each test
- Configure Jest environment

## 🚀 Migration from `__tests__`

The old `src/__tests__/` structure has been moved to:

```
src/__tests__/          →  tests/
├── __mocks__/          →  mocks/
├── helpers/            →  helpers/
├── *.service.test.ts   →  unit/
├── *.test.ts           →  integration/
└── setup.ts            →  setup.ts
```

## 📝 Naming Conventions

- **Unit tests**: `*.service.test.ts`
- **Integration tests**: `*.test.ts`
- **Mocks**: `*.service.ts` (in mocks/ directory)
- **Helpers**: `*-helpers.ts`

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