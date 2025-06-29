import { Request, Response, NextFunction } from 'express';
import { debugMiddleware } from '@/middlewares/debug.middleware';
import Logger from '@/utils/logger';

// Mock Logger
jest.mock('@/utils/logger', () => ({
  http: jest.fn(),
  debug: jest.fn()
}));

const mockedLogger = Logger as jest.Mocked<typeof Logger>;

describe('Debug Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let originalEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env.NODE_ENV;

    mockRequest = {
      method: 'GET',
      path: '/api/test',
      body: { test: 'data' },
      query: { page: '1' }
    };

    mockResponse = {
      send: jest.fn(),
      statusCode: 200
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should log incoming request and response', (done) => {
    // Setup
    const mockData = JSON.stringify({ result: 'success' });
    const originalSend = mockResponse.send;

    mockResponse.send = jest.fn().mockImplementation(function(this: Response, data?: any) {
      // Verify response logging
      expect(mockedLogger.http).toHaveBeenCalledWith(
        expect.stringMatching(/GET \/api\/test - 200 - \d+ms/)
      );

      // Call original send to maintain function behavior
      return originalSend?.call(this, data);
    });

    // Execute
    debugMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Verify request logging
    expect(mockedLogger.http).toHaveBeenCalledWith(
      'GET /api/test - Body: {"test":"data"} - Query: {"page":"1"}'
    );
    expect(mockNext).toHaveBeenCalled();

    // Trigger response
    mockResponse.send!(mockData);

    done();
  });

  it('should skip logging for webpack HMR requests', () => {
    // Setup
    const hmrRequest = {
      ...mockRequest,
      path: '/__webpack_hmr'
    };

    // Execute
    debugMiddleware(
      hmrRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Verify
    expect(mockedLogger.http).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should skip logging for hot-update requests', () => {
    // Setup
    const hotUpdateRequest = {
      ...mockRequest,
      path: '/hot-update.json'
    };

    // Execute
    debugMiddleware(
      hotUpdateRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Verify
    expect(mockedLogger.http).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should log response data in development mode', (done) => {
    // Setup
    process.env.NODE_ENV = 'development';
    const mockData = JSON.stringify({ result: 'success' });

    mockResponse.send = jest.fn().mockImplementation(function(this: Response, data?: any) {
      // Verify debug logging in development
      expect(mockedLogger.debug).toHaveBeenCalledWith(`Response: ${data}`);
      done();
      return data;
    });

    // Execute
    debugMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Trigger response
    mockResponse.send!(mockData);
  });

  it('should not log response data in production mode', (done) => {
    // Setup
    process.env.NODE_ENV = 'production';
    const mockData = JSON.stringify({ result: 'success' });

    mockResponse.send = jest.fn().mockImplementation(function(this: Response, data?: any) {
      // Verify no debug logging in production
      expect(mockedLogger.debug).not.toHaveBeenCalled();
      done();
      return data;
    });

    // Execute
    debugMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Trigger response
    mockResponse.send!(mockData);
  });

  it('should handle POST request with different status code', (done) => {
    // Setup
    const postRequest = {
      method: 'POST',
      path: '/api/users',
      body: { name: 'John', email: 'john@test.com' },
      query: {}
    };
    mockResponse.statusCode = 201;

    mockResponse.send = jest.fn().mockImplementation(function(this: Response, data?: any) {
      // Verify POST request logging
      expect(mockedLogger.http).toHaveBeenCalledWith(
        expect.stringMatching(/POST \/api\/users - 201 - \d+ms/)
      );
      done();
      return data;
    });

    // Execute
    debugMiddleware(
      postRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Verify request logging
    expect(mockedLogger.http).toHaveBeenCalledWith(
      'POST /api/users - Body: {"name":"John","email":"john@test.com"} - Query: {}'
    );

    // Trigger response
    mockResponse.send!('Created');
  });

  it('should handle requests with empty body and query', (done) => {
    // Setup
    mockRequest.body = {};
    mockRequest.query = {};

    mockResponse.send = jest.fn().mockImplementation(function(this: Response, data?: any) {
      done();
      return data;
    });

    // Execute
    debugMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Verify request logging
    expect(mockedLogger.http).toHaveBeenCalledWith(
      'GET /api/test - Body: {} - Query: {}'
    );

    // Trigger response
    mockResponse.send!('OK');
  });

  it('should measure response time accurately', (done) => {
    // Setup
    const startTime = Date.now();
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(startTime)
      .mockReturnValueOnce(startTime + 150);

    mockResponse.send = jest.fn().mockImplementation(function(this: Response, data?: any) {
      // Verify response time is measured
      expect(mockedLogger.http).toHaveBeenCalledWith(
        'GET /api/test - 200 - 150ms'
      );
      done();
      return data;
    });

    // Execute
    debugMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    // Trigger response
    mockResponse.send!('OK');
  });
});