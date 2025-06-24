import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '@/config/swagger';
import routes from '@/routes';
import { debugMiddleware } from '@/middlewares/debug.middleware';
import { globalErrorHandler } from '@/middlewares/error.middleware';
import Logger from '@/utils/logger';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Debug middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(debugMiddleware);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use('*', (req, res) => {
  if (req.originalUrl.includes('__webpack_hmr')) {
    return;
  }

  Logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use(globalErrorHandler);

export default app;