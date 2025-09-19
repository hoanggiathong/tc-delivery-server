import mongoose from 'mongoose';
import Logger from '@/utils/logger';
import { Delivery } from '@/models/delivery.model';
import { MoneyDelivery } from '@/models/money-delivery.model';
import { DraftDelivery } from '@/models/draft-delivery.model';
import { Customer } from '@/models/customer.model';
import { Route } from '@/models/route.model';
import { User } from '@/models/user.model';
import { UserRoute } from '@/models/user-route.model';
import { Settings } from '@/models/settings.model';
import { Debt } from '@/models/debt.model';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // Enable mongoose debugging in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', true);
    }

    const conn = await mongoose.connect(mongoURI);

    Logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Sync indexes in development mode
    if (process.env.NODE_ENV === 'development') {
      await syncIndexes();
    }

    // Handle connection events
    mongoose.connection.on('connected', () => {
      Logger.info('MongoDB connected');
    });

    mongoose.connection.on('disconnected', () => {
      Logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('error', err => {
      Logger.error(`MongoDB connection error: ${err}`);
    });

    // Debug queries in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.connection.on('query', query => {
        Logger.debug(`MongoDB Query: ${JSON.stringify(query)}`);
      });
    }
  } catch (error) {
    Logger.error(`Error connecting to MongoDB: ${error}`);
    process.exit(1);
  }
};

export const syncIndexes = async (): Promise<void> => {
  try {
    Logger.info('Syncing database indexes...');

    const models = [
      { name: 'Delivery', model: Delivery },
      { name: 'MoneyDelivery', model: MoneyDelivery },
      { name: 'DraftDelivery', model: DraftDelivery },
      { name: 'Customer', model: Customer },
      { name: 'Route', model: Route },
      { name: 'User', model: User },
      { name: 'UserRoute', model: UserRoute },
      { name: 'Settings', model: Settings },
      { name: 'Debt', model: Debt },
    ];

    for (const { name, model } of models) {
      try {
        const result = await model.syncIndexes();
        Logger.info(`${name} indexes synced: ${JSON.stringify(result)}`);
      } catch (error) {
        Logger.error(`Error syncing ${name} indexes: ${error}`);
      }
    }

    Logger.info('All indexes synced successfully!');
  } catch (error) {
    Logger.error(`Error syncing indexes: ${error}`);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    Logger.info('MongoDB disconnected successfully');
  } catch (error) {
    Logger.error(`Error disconnecting from MongoDB: ${error}`);
  }
};
