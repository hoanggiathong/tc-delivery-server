import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { getSwaggerSpec } from '@/config/swagger';
import routes from '@/routes';
import { debugMiddleware } from '@/middlewares/debug.middleware';
import { globalErrorHandler } from '@/middlewares/error.middleware';
import Logger from '@/utils/logger';

const app = express();

// CORS configuration
const allowedOrigins = [
  'https://uat.giaphuocexpress.vn',
  'https://vantai.giaphuocexpress.vn',

  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'https://localhost',

  // Dev FE
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://vantai.localhost:8080',
  'http://thuchi.localhost:8080',
];

app.use(
  cors({
    origin: (origin, callback) => {
      Logger.info(`[CORS ORIGIN] ${origin || 'NO_ORIGIN'}`);

      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Debug middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(debugMiddleware);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Swagger documentation - setup with dynamic spec to avoid cache
app.use('/api-docs', swaggerUi.serve);
app.get(
  '/api-docs',
  (_req, res, next) => {
    // Set no-cache headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  },
  swaggerUi.setup(getSwaggerSpec(), {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestHeaders: true,
      url: '/swagger.json?v=' + Date.now(), // Add timestamp to force reload
      persistAuthorization: true,
    },
  })
);

// Debug endpoint for Swagger spec - no cache
app.get('/swagger.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(getSwaggerSpec());
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
