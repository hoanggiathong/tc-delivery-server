import { Request, Response, NextFunction } from 'express';
import Logger from '@/utils/logger';
import { ApiResponse } from '@/types';
import multer from 'multer';

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleCastErrorDB = (err: any) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err: any) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err: any) => {
  const errors = Object.values(err.errors).map((el: any) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err: any, res: Response) => {
  Logger.error(`Error: ${err.message}`);
  Logger.error(`Stack: ${err.stack}`);

  const response: ApiResponse = {
    success: false,
    message: err.message,
    errors: [
      {
        error: err,
        message: err.message,
        stack: err.stack,
      },
    ],
  };

  res.status(err.statusCode || 500).json(response);
};

/*const sendErrorProd = (err: any, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const response: ApiResponse = {
      success: false,
      message: err.message,
    };

    res.status(err.statusCode).json(response);
  } else {
    // Programming or other unknown error: don't leak error details
    Logger.error('ERROR:', err);

    const response: ApiResponse = {
      success: false,
      message: 'Something went wrong!',
    };

    res.status(500).json(response);
  }
};*/

const sendErrorProd = (err: any, res: Response) => {
  // multer errors
  if (err instanceof multer.MulterError) {
    let message = 'Upload error';

    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size too large';
    }

    return res.status(400).json({
      success: false,
      message,
    });
  }

  // body too large
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Payload too large',
    });
  }

  // trusted error
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }

  Logger.error('ERROR:', err);

  return res.status(500).json({
    success: false,
    message: 'Something went wrong!',
  });
};

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') {
      error = handleCastErrorDB(error);
    }
    if (error.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    }
    if (error.name === 'ValidationError') {
      error = handleValidationErrorDB(error);
    }
    if (error.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }

    sendErrorProd(error, res);
  }
};
