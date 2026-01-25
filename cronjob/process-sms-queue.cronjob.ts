import moduleAlias from 'module-alias';
import path from 'path';
moduleAlias.addAlias('@', path.resolve(__dirname, '../src'));

import { config } from 'dotenv';

// Load env file based on NODE_ENV
const envFile =
  process.env.NODE_ENV === 'uat'
    ? '.env.uat'
    : process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env';
config({ path: path.resolve(process.cwd(), envFile) });

import mongoose from 'mongoose';
import { SMSQueueService } from '../src/services/sms-queue.service';
import { SMS_QUEUE_CONFIG } from '../src/types/sms-queue.type';
import Logger from '../src/utils/logger';

let isProcessing = false;

async function processQueue() {
  if (isProcessing) {
    Logger.debug('SMS Queue: Previous batch still processing, skipping...');
    return;
  }

  isProcessing = true;

  try {
    const smsQueueService = new SMSQueueService();
    const result = await smsQueueService.processBatch();

    if (result.totalProcessed > 0) {
      Logger.info('SMS Queue batch completed', {
        processed: result.totalProcessed,
        success: result.successCount,
        failed: result.failedCount,
      });
    }
  } catch (error) {
    Logger.error('SMS Queue processing error', { error });
  } finally {
    isProcessing = false;
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('Missing MONGODB_URI');
    process.exit(2);
  }

  await mongoose.connect(uri, { dbName: process.env.MONGO_DB || undefined });
  Logger.info('SMS Queue Processor started', {
    interval: `${SMS_QUEUE_CONFIG.PROCESS_INTERVAL}ms`,
  });

  // Reset any stuck items on startup
  const smsQueueService = new SMSQueueService();
  const resetCount = await smsQueueService.resetStuckItems();
  if (resetCount > 0) {
    Logger.info('Reset stuck items on startup', { count: resetCount });
  }

  // Process queue at configured interval
  setInterval(processQueue, SMS_QUEUE_CONFIG.PROCESS_INTERVAL);

  // Initial process
  processQueue();

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    Logger.info(`SMS Queue Processor received ${signal}, shutting down...`);
    try {
      await mongoose.disconnect();
      Logger.info('SMS Queue Processor disconnected from database');
    } catch (error) {
      Logger.error('Error disconnecting from database', { error });
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(async e => {
  console.error('SMS Queue Processor failed to start:', e);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
