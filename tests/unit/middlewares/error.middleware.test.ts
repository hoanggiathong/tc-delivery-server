import { Request, Response, NextFunction } from 'express';
import { AppError, globalErrorHandler } from '@/middlewares/error.middleware';
import Logger from '@/utils/logger';

// Mock Logger
jest.mock('@/utils/logger', () => ({
  error: jest.fn(),
}));

const mockedLogger = Logger as jest.Mocked<typeof Logger>;

describe('Error Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('AppError Class', () => {
    it('should create AppError with correct properties', () => {
      const message = 'Test error message';
      const statusCode = 400;

      const error = new AppError(message, statusCode);

      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(statusCode);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });

    it('should set status to "fail" for 4xx status codes', () => {
      const error400 = new AppError('Bad Request', 400);
      const error404 = new AppError('Not Found', 404);

      expect(error400.status).toBe('fail');
      expect(error404.status).toBe('fail');
    });

    it('should set status to "error" for 5xx status codes', () => {
      const error500 = new AppError('Internal Server Error', 500);
      const error503 = new AppError('Service Unavailable', 503);

      expect(error500.status).toBe('error');
      expect(error503.status).toBe('error');
    });
  });

  describe('globalErrorHandler', () => {
    describe('Development Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should send detailed error in development', () => {
        const error = new AppError('Test error', 400);

        globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockedLogger.error).toHaveBeenCalledWith(`Error: ${error.message}`);
        expect(mockedLogger.error).toHaveBeenCalledWith(`Stack: ${error.stack}`);
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: error.message,
          errors: [
            {
              error: error,
              message: error.message,
              stack: error.stack,
            },
          ],
        });
      });

      it('should use default status code 500 if not provided', () => {
        const error = new Error('Test error without status code');

        globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });

    describe('Production Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      afterEach(() => {
        process.env.NODE_ENV = 'test'; // Reset to test environment
      });

      it('should send operational error details in production', () => {
        const error = new AppError('User not found', 404);

        globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: error.message,
        });
      });

      it('should hide non-operational error details in production', () => {
        const error = new Error('Database connection failed');
        (error as any).statusCode = 500;

        globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockedLogger.error).toHaveBeenCalledWith('ERROR:', expect.any(Object));
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Something went wrong!',
        });
      });

      it('should handle CastError', () => {
        const error = {
          name: 'CastError',
          path: 'id',
          value: 'invalid-id',
          message: 'Cast to ObjectId failed',
        };

        globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Invalid id: invalid-id.',
        });
      });

      it('should handle duplicate field error', () => {
        const error = {
          code: 11000,
          errmsg:
            'E11000 duplicate key error collection: test.users index: email_1 dup key: { email: "test@example.com" }',
          message: 'Duplicate field value',
        };

        globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: expect.stringContaining('Duplicate field value'),
        });
      });

      it('should handle ValidationError', () => {
        const error = {
          name: 'ValidationError',
          errors: {
            name: { message: 'Name is required' },
            email: { message: 'Email is invalid' },
          },
          message: 'Validation failed',
        };

        globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Invalid input data. Name is required. Email is invalid',
        });
      });

      it('should handle JsonWebTokenError', () => {
        const error = {
          name: 'JsonWebTokenError',
          message: 'invalid token',
        };

        globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Invalid token. Please log in again!',
        });
      });

      it('should handle TokenExpiredError', () => {
        const error = {
          name: 'TokenExpiredError',
          message: 'jwt expired',
        };

        globalErrorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Your token has expired! Please log in again.',
        });
      });
    });
  });
});
