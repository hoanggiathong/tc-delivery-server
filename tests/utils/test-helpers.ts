/**
 * Test Helpers
 * Utility functions for testing (non-mock utilities)
 */

/**
 * Create a mock date for testing
 */
export const createMockDate = (dateString: string = '2024-01-25'): Date => {
  return new Date(dateString);
};

/**
 * Create a mock error for testing
 */
export const createMockError = (message: string = 'Test error'): Error => {
  return new Error(message);
};

/**
 * Create a mock request object for testing
 */
export const createMockRequest = (overrides: any = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides,
  };
};

/**
 * Create a mock response object for testing
 */
export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Create a mock next function for testing
 */
export const createMockNext = () => {
  return jest.fn();
};

/**
 * Wait for a specified number of milliseconds
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Create a mock JWT token for testing
 */
export const createMockJWTToken = (payload: any = {}) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = 'mock-signature';

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};
