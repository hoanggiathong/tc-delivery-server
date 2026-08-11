// Setup dynamic module alias first
import '../config/module-alias';

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Logger from '@/utils/logger';

// Import all models to ensure schemas are registered
import { Delivery } from '@/models/delivery.model';
import { RemovedDelivery } from '@/models/delivery-removed.model';
import { MoneyDelivery } from '@/models/money-delivery.model';
import { DraftDelivery } from '@/models/draft-delivery.model';
import { Customer } from '@/models/customer.model';
import { CustomerBank } from '@/models/customer-bank.model';
import { CustomerBankRemoved } from '@/models/customer-bank-removed.model';
import { CustomerAddressHistory } from '@/models/customer-address-history.model';
import { Route } from '@/models/route.model';
import { User } from '@/models/user.model';
import { UserRoute } from '@/models/user-route.model';
import { Settings } from '@/models/settings.model';
import { Debt } from '@/models/debt.model';
import { DebtManagement } from '@/models/debt-management.model';
import { CronLogModel } from '@/models/cronjob-log.model';
import { MobilePushToken } from '@/modules/mobile-customer/mobile-push-token.model';
import { MobileNotificationRead } from '@/modules/mobile-customer/mobile-notification-read.model';

/**
 * Standalone script to sync database indexes
 *
 * This script connects to MongoDB and syncs indexes for all models.
 * It's useful when you need to manually sync indexes after schema changes.
 *
 * Usage:
 *   npm run db:sync-indexes           # Development
 *   npm run db:sync-indexes:prod      # Production
 *   npm run db:sync-indexes:uat       # UAT
 */

// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === 'uat'
    ? '.env.uat'
    : process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env';

dotenv.config({ path: envFile });

// List of all models to sync
const models = [
  { name: 'Delivery', model: Delivery },
  { name: 'RemovedDelivery', model: RemovedDelivery },
  { name: 'MoneyDelivery', model: MoneyDelivery },
  { name: 'DraftDelivery', model: DraftDelivery },
  { name: 'Customer', model: Customer },
  { name: 'CustomerBank', model: CustomerBank },
  { name: 'CustomerBankRemoved', model: CustomerBankRemoved },
  { name: 'CustomerAddressHistory', model: CustomerAddressHistory },
  { name: 'Route', model: Route },
  { name: 'User', model: User },
  { name: 'UserRoute', model: UserRoute },
  { name: 'Settings', model: Settings },
  { name: 'Debt', model: Debt },
  { name: 'DebtManagement', model: DebtManagement },
  { name: 'CronLog', model: CronLogModel },
  {
    name: 'MobilePushToken',
    model: MobilePushToken,
  },
  {
    name: 'MobileNotificationRead',
    model: MobileNotificationRead,
  },
];

/**
 * Sync indexes for all models
 */
const syncIndexes = async (): Promise<void> => {
  try {
    Logger.info('Starting database index synchronization...');
    Logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    Logger.info(`Total models to sync: ${models.length}`);

    let successCount = 0;
    let errorCount = 0;

    for (const { name, model } of models) {
      try {
        Logger.info(`Syncing indexes for ${name}...`);
        const result = await model.syncIndexes();
        Logger.info(`✓ ${name} indexes synced successfully`, { result });
        successCount++;
      } catch (error) {
        Logger.error(`✗ Error syncing ${name} indexes`, {
          error: error instanceof Error ? error.message : error,
        });
        errorCount++;
      }
    }

    Logger.info('Index synchronization completed!', {
      success: successCount,
      errors: errorCount,
      total: models.length,
    });

    if (errorCount > 0) {
      Logger.warn(`${errorCount} model(s) failed to sync indexes. Please check the errors above.`);
      process.exit(1);
    }
  } catch (error) {
    Logger.error('Fatal error during index synchronization', {
      error: error instanceof Error ? error.message : error,
    });
    process.exit(1);
  }
};

/**
 * Main function to connect, sync, and disconnect
 */
const main = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    Logger.info('Connecting to MongoDB...');
    Logger.info(`MongoDB URI: ${mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);

    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    Logger.info('MongoDB connected successfully');

    // Sync indexes
    await syncIndexes();

    // Disconnect
    Logger.info('Disconnecting from MongoDB...');
    await mongoose.disconnect();
    Logger.info('MongoDB disconnected successfully');

    Logger.info('✅ All operations completed successfully');
    process.exit(0);
  } catch (error) {
    Logger.error('❌ Script execution failed', {
      error: error instanceof Error ? error.message : error,
    });
    process.exit(1);
  }
};

// Run the script
main();
