import mongoose from 'mongoose';
import Logger from '@/utils/logger';

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

    Logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('connected', () => {
      Logger.info('🔸 MongoDB connected');
    });

    mongoose.connection.on('disconnected', () => {
      Logger.warn('🔸 MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      Logger.error(`❌ MongoDB connection error: ${err}`);
    });

    // Debug queries in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.connection.on('query', (query) => {
        Logger.debug(`MongoDB Query: ${JSON.stringify(query)}`);
      });
    }

  } catch (error) {
    Logger.error(`❌ Error connecting to MongoDB: ${error}`);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    Logger.info('🔸 MongoDB disconnected successfully');
  } catch (error) {
    Logger.error(`❌ Error disconnecting from MongoDB: ${error}`);
  }
};