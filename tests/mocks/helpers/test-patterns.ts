/**
 * Common Test Patterns and Utilities
 *
 * Reusable test patterns that can be memorized for consistent testing
 */

import { Response } from 'supertest';

// Common test constants
const _TEST_OBJECT_IDS = {
  validObjectId: '507f1f77bcf86cd799439011',
  user: 'user123',
  customer1: 'customer123',
  customer2: 'customer456',
  route1: '507f1f77bcf86cd799439011',
  route2: '507f1f77bcf86cd799439012',
} as const;

const VALIDATION_TEST_VALUES = {
  validObjectId: '507f1f77bcf86cd799439011',
  invalidObjectId: 'invalid-id',
  invalidPhone: 'invalid-phone',
} as const;

// API Response Validation Patterns
export const apiResponsePatterns = {
  /**
   * Validate successful API response structure
   */
  validateSuccessResponse: (response: Response, expectedData?: any) => {
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBeDefined();
    if (expectedData) {
      expect(response.body.data).toEqual(expectedData);
    }
  },

  /**
   * Validate error API response structure
   */
  validateErrorResponse: (response: Response, expectedMessage?: string) => {
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBeDefined();
    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage);
    }
  },

  /**
   * Validate validation error response
   */
  validateValidationError: (response: Response) => {
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Validation');
  },

  /**
   * Validate unauthorized response
   */
  validateUnauthorizedResponse: (response: Response) => {
    expect(response.body.success).toBe(false);
    expect(response.status).toBe(401);
  },

  /**
   * Validate not found response
   */
  validateNotFoundResponse: (response: Response) => {
    expect(response.body.success).toBe(false);
    expect(response.status).toBe(404);
  },
};

// Mock Service Patterns
export const mockServicePatterns = {
  /**
   * Setup successful service mock
   */
  setupSuccessMock: (mockService: any, method: string, returnValue: any) => {
    mockService.prototype[method].mockResolvedValue(returnValue);
  },

  /**
   * Setup error service mock
   */
  setupErrorMock: (mockService: any, method: string, errorMessage: string = 'Service error') => {
    mockService.prototype[method].mockRejectedValue(new Error(errorMessage));
  },

  /**
   * Verify service method was called with correct parameters
   */
  verifyServiceCall: (mockService: any, method: string, expectedParams: any[]) => {
    expect(mockService.prototype[method]).toHaveBeenCalledWith(...expectedParams);
  },
};

// Authentication Test Patterns
export const authTestPatterns = {
  /**
   * Test pattern for authenticated requests
   */
  authenticatedRequest: {
    pattern: 'should require authentication',
    test: (request: any) => request.expect(401),
  },

  /**
   * Test pattern for role-based access
   */
  roleBasedAccess: {
    pattern: 'should require specific role',
    test: (request: any, expectedStatus: number = 403) => request.expect(expectedStatus),
  },
};

// Validation Test Patterns
export const validationTestPatterns = {
  /**
   * Test pattern for required field validation
   */
  requiredField: {
    pattern: 'should return 400 for missing required field',
    testData: (fieldName: string) => ({ [fieldName]: undefined }),
  },

  /**
   * Test pattern for invalid ObjectId validation
   */
  invalidObjectId: {
    pattern: 'should return 400 for invalid ObjectId format',
    testData: (fieldName: string) => ({ [fieldName]: VALIDATION_TEST_VALUES.invalidObjectId }),
  },

  /**
   * Test pattern for invalid phone number validation
   */
  invalidPhone: {
    pattern: 'should return 400 for invalid phone format',
    testData: { phone: VALIDATION_TEST_VALUES.invalidPhone },
  },

  /**
   * Common validation test cases
   */
  commonValidationTests: [
    {
      name: 'missing required field',
      getData: (field: string) => ({ [field]: undefined }),
    },
    {
      name: 'invalid ObjectId format',
      getData: (field: string) => ({ [field]: VALIDATION_TEST_VALUES.invalidObjectId }),
    },
    {
      name: 'empty string',
      getData: (field: string) => ({ [field]: '' }),
    },
  ],
};

// Database Test Patterns
export const databaseTestPatterns = {
  /**
   * Test pattern for entity not found
   */
  entityNotFound: {
    pattern: 'should return 404 when entity not found',
    mockSetup: (mockModel: any) => mockModel.findById.mockResolvedValue(null),
  },

  /**
   * Test pattern for duplicate entity creation
   */
  duplicateEntity: {
    pattern: 'should return 400 for duplicate entity',
    mockSetup: (mockModel: any) => {
      const duplicateError = new Error('Duplicate key error');
      (duplicateError as any).code = 11000;
      mockModel.prototype.save.mockRejectedValue(duplicateError);
    },
  },
};

// Next Code API Test Patterns
export const nextCodeTestPatterns = {
  /**
   * Standard test suite for next-code endpoints
   */
  createStandardTests: (
    endpoint: string,
    mockService: any,
    validRouteId: string = VALIDATION_TEST_VALUES.validObjectId
  ) => [
    {
      name: 'should get next code successfully',
      setup: (mockResponse: any) =>
        mockService.prototype.getNextCode.mockResolvedValue(mockResponse),
      request: (request: any, token: string) =>
        request
          .get(endpoint)
          .query({ toRouteId: validRouteId })
          .set('Authorization', `Bearer ${token}`),
      expectation: 200,
    },
    {
      name: 'should return 400 for invalid toRouteId format',
      setup: () => {},
      request: (request: any, token: string) =>
        request
          .get(endpoint)
          .query({ toRouteId: VALIDATION_TEST_VALUES.invalidObjectId })
          .set('Authorization', `Bearer ${token}`),
      expectation: 400,
    },
    {
      name: 'should return 401 for unauthenticated request',
      setup: () => {},
      request: (request: any) => request.get(endpoint).query({ toRouteId: validRouteId }),
      expectation: 401,
    },
    {
      name: 'should return 400 for missing toRouteId parameter',
      setup: () => {},
      request: (request: any, token: string) =>
        request.get(endpoint).set('Authorization', `Bearer ${token}`),
      expectation: 400,
    },
  ],
};

// CRUD Test Patterns
export const crudTestPatterns = {
  /**
   * Standard CRUD test patterns
   */
  standardCrudTests: {
    create: {
      success: 'should create entity successfully',
      validation: 'should return 400 for invalid data',
      duplicate: 'should return 400 for duplicate entity',
      unauthorized: 'should return 401 for unauthenticated request',
    },
    read: {
      success: 'should get entity successfully',
      notFound: 'should return 404 for non-existent entity',
      unauthorized: 'should return 401 for unauthenticated request',
    },
    update: {
      success: 'should update entity successfully',
      notFound: 'should return 404 for non-existent entity',
      validation: 'should return 400 for invalid data',
      unauthorized: 'should return 401 for unauthenticated request',
    },
    delete: {
      success: 'should delete entity successfully',
      notFound: 'should return 404 for non-existent entity',
      unauthorized: 'should return 401 for unauthenticated request',
    },
  },
};

export default {
  apiResponsePatterns,
  mockServicePatterns,
  authTestPatterns,
  validationTestPatterns,
  databaseTestPatterns,
  nextCodeTestPatterns,
  crudTestPatterns,
};
