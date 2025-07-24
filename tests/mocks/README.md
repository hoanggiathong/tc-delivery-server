# Test Mock System & Patterns

## 📁 Structure

```
tests/mocks/
├── data/                    # Mock data objects
│   ├── customers.ts         # Customer mock data
│   ├── users.ts            # User mock data  
│   ├── deliveries.ts       # Delivery mock data
│   ├── routes.ts           # Route mock data
│   ├── money-deliveries.ts # Money delivery mock data
│   └── index.ts            # Central exports
├── models/                 # Mock Mongoose models
├── services/               # Mock service classes
└── helpers/                # Test utilities & patterns
```

## 🎯 Usage Patterns

### 1. **Factory Functions** (Recommended for flexibility)
```typescript
import { createMockUser, createMockDelivery } from '@/tests/mocks';

// Create with defaults
const user = createMockUser();

// Override specific fields
const customUser = createMockUser({
  username: 'customuser',
  role: UserRole.ADMIN
});
```

### 2. **Integration Test Mocks** (Recommended for specific test scenarios)
```typescript
import { 
  mockMoneyDeliveryForIntegration,
  mockAuthUsersForIntegration,
  mockFrequentCustomersForIntegration 
} from '@/tests/mocks';

// Use predefined objects for integration tests
MockedService.prototype.method.mockResolvedValue(
  mockMoneyDeliveryForIntegration
);

// Use different user scenarios
const userWithRoute = mockAuthUsersForIntegration.userWithRoute;
const userWithNullRoute = mockAuthUsersForIntegration.userWithNullRoute;
```

## 📋 Test Case Memorization

### **Pattern 1: Next-Code API Tests**
```typescript
describe('GET /api/{entity}/next-code', () => {
  it('should get next code successfully', async () => {
    // 1. Setup mock response
    MockedService.prototype.getNextCode.mockResolvedValue(mockNextCodeResponse);
    
    // 2. Make request with valid ObjectId
    const response = await request(app)
      .get('/api/{entity}/next-code')
      .query({ toRouteId: '507f1f77bcf86cd799439011' })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    // 3. Verify response structure
    expect(response.body.success).toBe(true);
    expect(response.body.data.nextCode).toBe(mockNextCodeResponse.nextCode);
    expect(response.body.data.toRoute).toBeDefined();
    
    // 4. Verify service called correctly
    expect(MockedService.prototype.getNextCode).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });

  it('should return 400 for invalid toRouteId format', async () => {
    const response = await request(app)
      .get('/api/{entity}/next-code')
      .query({ toRouteId: 'invalid-id' })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);
    
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Validation');
  });

  it('should return 401 for unauthenticated request', async () => {
    const response = await request(app)
      .get('/api/{entity}/next-code')
      .query({ toRouteId: '507f1f77bcf86cd799439011' })
      .expect(401);
    
    expect(response.body.success).toBe(false);
  });

  it('should return 400 for missing toRouteId parameter', async () => {
    const response = await request(app)
      .get('/api/{entity}/next-code')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);
    
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Validation');
  });
});
```

### **Pattern 2: CRUD Operations**
```typescript
describe('POST /api/{entity}', () => {
  it('should create {entity} successfully', async () => {
    // 1. Setup mock
    MockedService.prototype.create.mockResolvedValue(mockEntityForIntegration);
    
    // 2. Make request with valid data
    const response = await request(app)
      .post('/api/{entity}')
      .send(validRequestData)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);
    
    // 3. Verify response
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mockEntityForIntegration);
  });

  it('should return 400 for invalid data', async () => {
    const response = await request(app)
      .post('/api/{entity}') 
      .send(invalidRequestData)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);
    
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Validation');
  });
});
```

### **Pattern 3: Service Mock Setup**
```typescript
beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Setup default successful responses
  MockedService.prototype.method.mockResolvedValue(mockData);
  
  // Setup error scenarios when needed
  MockedService.prototype.method.mockRejectedValue(new Error('Service error'));
});
```

### **Pattern 4: Authentication Testing**
```typescript
describe('Authentication Tests', () => {
  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/protected-endpoint')
      .expect(401);
    
    expect(response.body.success).toBe(false);
  });

  it('should work with valid token', async () => {
    const response = await request(app)
      .get('/api/protected-endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });
});
```

## 🔧 Common Mock Utilities

### **Response Validation Helpers**
```typescript
// Successful response
expect(response.body.success).toBe(true);
expect(response.body.message).toBeDefined();
expect(response.body.data).toBeDefined();

// Error response
expect(response.body.success).toBe(false);
expect(response.body.message).toContain('expected error text');

// Validation error
expect(response.body.message).toContain('Validation');
```

### **Common ObjectIds for Testing**
```typescript
const TEST_IDS = {
  validObjectId: '507f1f77bcf86cd799439011',
  invalidObjectId: 'invalid-id',
  user: 'user123',
  customer: 'customer123',
  route: 'route123',
};
```

### **Date Handling in Tests**
```typescript
// For deterministic tests, use fixed dates
const FIXED_DATE = new Date('2025-01-01T08:00:00.000Z');

// For date comparison in responses, check date strings
expect(response.body.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
```

## 📚 Best Practices

### **DO's:**
✅ Use factory functions for flexible mock creation  
✅ Use integration mocks for specific test scenarios  
✅ Group related tests in describe blocks  
✅ Use meaningful test descriptions  
✅ Verify both happy path and error scenarios  
✅ Clear mocks between tests  
✅ Use proper HTTP status codes in expectations  

### **DON'Ts:**
❌ Create inline mock objects repeatedly  
❌ Use real database connections in tests  
❌ Skip error scenario testing  
❌ Use hardcoded dates that change over time  
❌ Forget to clear mocks between tests  
❌ Test implementation details instead of behavior  

## 🚀 Quick Start Guide

1. **Import the right mocks:**
```typescript
import { 
  mockEntityForIntegration,  // For specific integration test scenarios
  createMockEntity,          // For flexible mock creation
} from '@/tests/mocks';
```

2. **Setup test file structure:**
```typescript
describe('Entity API Integration Tests', () => {
  let authToken: string;
  
  beforeEach(() => {
    jest.clearAllMocks();
    authToken = generateAuthToken();
  });
  
  describe('POST /api/entity', () => {
    // CRUD tests here
  });
  
  describe('GET /api/entity/next-code', () => {
    // Next-code pattern tests here
  });
});
```

3. **Follow the established patterns** documented above for consistent test structure.

This system ensures **reusable**, **maintainable**, and **memorizable** test patterns across the entire codebase.