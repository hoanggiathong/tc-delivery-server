import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '@/config/swagger';
import routes from '@/routes';
import { debugMiddleware } from '@/middlewares/debug.middleware';
import { globalErrorHandler } from '@/middlewares/error.middleware';
import Logger from '@/utils/logger';

const app = express();

// Security middleware
app.use(cors());

// Debug middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(debugMiddleware);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
} else {
  app.use(helmet());
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestHeaders: true,
      url: '/swagger.json',
      persistAuthorization: true,
    },
  })
);

// Debug endpoint for Swagger spec
app.get('/swagger.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Serve uploaded images with 90-day immutable cache
// Use process.cwd() to ensure correct path in both dev and production
// When compiled, __dirname points to dist/src/, but files are in public/uploads at project root
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'public/uploads'), {
    etag: true,
    lastModified: true,
    maxAge: '90d', // Cache for 90 days
    setHeaders: res => {
      // 90 days = 90 * 24 * 60 * 60 = 7776000 seconds
      res.setHeader('Cache-Control', 'public, max-age=7776000, immutable');
    },
  })
);

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
