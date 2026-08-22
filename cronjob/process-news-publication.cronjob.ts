// Setup dynamic module alias before loading application modules.
import setupModuleAlias from '../src/config/module-alias';
import dotenv from 'dotenv';

setupModuleAlias();

const envFile =
  process.env.NODE_ENV === 'uat'
    ? '.env.uat'
    : process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env';

dotenv.config({ path: envFile });

let shuttingDown = false;
let keepAliveTimer: NodeJS.Timeout | null = null;

const startWorker = async (): Promise<void> => {
  const [{ connectDB, disconnectDB }, newsCron] = await Promise.all([
    import('@/config/database'),
    import('./news-publication.cron'),
  ]);

  await connectDB();

  newsCron.startMobileNewsPublicationCron();

  /**
   * Các timer bên trong helper dùng unref().
   * Giữ worker sống độc lập với vòng đời Express/Mongoose socket.
   */
  keepAliveTimer = setInterval(() => {
    // Intentionally empty: PM2 owns this worker lifecycle.
  }, 24 * 60 * 60 * 1000);

  console.log(
    `[NEWS PUBLICATION] Worker started (${process.env.NODE_ENV || 'development'})`
  );

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    console.log(`[NEWS PUBLICATION] ${signal} received. Shutting down...`);

    newsCron.stopMobileNewsPublicationCron();

    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }

    try {
      await disconnectDB();
    } finally {
      console.log('[NEWS PUBLICATION] Worker stopped');
      process.exit(0);
    }
  };

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
};

startWorker().catch(error => {
  console.error(
    '[NEWS PUBLICATION] Worker failed to start:',
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
