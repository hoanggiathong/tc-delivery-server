import { Request, Response, NextFunction } from 'express';
import Logger from '@/utils/logger';

export const debugMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // Skip logging webpack HMR requests
  if (req.path.includes('__webpack_hmr') || req.path.includes('hot-update')) {
    return next();
  }

  // Log incoming request
  Logger.http(
    `${req.method} ${req.path} - Body: ${JSON.stringify(
      req.body
    )} - Query: ${JSON.stringify(req.query)}`
  );

  // Log response
  const oldSend = res.send;
  res.send = function (data?: any) {
    const duration = Date.now() - start;
    Logger.http(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);

    if (process.env.NODE_ENV === 'development') {
      Logger.debug(`Response: ${data}`);
    }

    return oldSend.call(this, data);
  };

  next();
};
