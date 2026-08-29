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
  const [{ connectDB, disconnectDB }, accountDeletionCron] = await Promise.all([
    import('@/config/database'),
    import('./account-deletion.cron'),
  ]);

  await connectDB();

  accountDeletionCron.startMobileCustomerAccountDeletionCron();

  /**
   * Helper dùng unref() cho startTimer/interval.
   * Timer này giữ process PM2 sống độc lập; không tham gia business logic.
   */
  keepAliveTimer = setInterval(
    () => {
      // Intentionally empty: PM2 owns this worker lifecycle.
    },
    24 * 60 * 60 * 1000
  );

  console.log(`[ACCOUNT DELETION] Worker started (${process.env.NODE_ENV || 'development'})`);

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    console.log(`[ACCOUNT DELETION] ${signal} received. Shutting down...`);

    accountDeletionCron.stopMobileCustomerAccountDeletionCron();

    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }

    try {
      await disconnectDB();
    } finally {
      console.log('[ACCOUNT DELETION] Worker stopped');
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
    '[ACCOUNT DELETION] Worker failed to start:',
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
