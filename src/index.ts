// Setup dynamic module alias first
import setupModuleAlias from './config/module-alias';
import dotenv from 'dotenv';

setupModuleAlias();

// Load environment variables before importing app/routes/services
const envFile =
  process.env.NODE_ENV === 'uat'
    ? '.env.uat'
    : process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env';

dotenv.config({ path: envFile });

const PORT = process.env.PORT || 3000;

// Connect to database and start server
const startServer = async () => {
  try {
    // Chỉ import sau khi environment đã được load
    const [{ default: app }, { connectDB, disconnectDB }] = await Promise.all([
      import('./app'),
      import('./config/database'),
    ]);

    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        console.log('✅ HTTP server closed');

        await disconnectDB();

        console.log('👋 Process terminated');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();