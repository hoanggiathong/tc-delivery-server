import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '@/config/database';
import Logger from '@/utils/logger';

// Mock mongoose
jest.mock('mongoose', () => {
  const mockSchema = jest.fn().mockImplementation(() => ({
    pre: jest.fn(),
    index: jest.fn(),
    virtual: jest.fn(),
    methods: {},
  }));
  mockSchema.Types = {
    ObjectId: jest.fn(),
  };
  
  return {
    connect: jest.fn(),
    disconnect: jest.fn(),
    set: jest.fn(),
    connection: {
      host: 'localhost',
      on: jest.fn(),
    },
    Schema: mockSchema,
    model: jest.fn(),
  };
});

// Mock Logger
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const mockedMongoose = mongoose as jest.Mocked<typeof mongoose>;
const mockedLogger = Logger as jest.Mocked<typeof Logger>;

describe('Database Config', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockExit: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env;
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit() was called.');
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    mockExit.mockRestore();
  });

  describe('connectDB', () => {
    it('should connect to MongoDB successfully', async () => {
      // Setup
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
      process.env.NODE_ENV = 'production';

      const mockConnection = {
        connection: {
          host: 'localhost:27017',
        },
      };

      mockedMongoose.connect.mockResolvedValue(mockConnection as any);

      // Execute
      await connectDB();

      // Verify
      expect(mockedMongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/test');
      expect(mockedLogger.info).toHaveBeenCalledWith('MongoDB Connected: localhost:27017');
      expect(mockedMongoose.connection.on).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(mockedMongoose.connection.on).toHaveBeenCalledWith(
        'disconnected',
        expect.any(Function)
      );
      expect(mockedMongoose.connection.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should enable debug mode in development', async () => {
      // Setup
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
      process.env.NODE_ENV = 'development';

      const mockConnection = {
        connection: {
          host: 'localhost:27017',
        },
      };

      mockedMongoose.connect.mockResolvedValue(mockConnection as any);

      // Execute
      await connectDB();

      // Verify
      expect(mockedMongoose.set).toHaveBeenCalledWith('debug', true);
      expect(mockedMongoose.connection.on).toHaveBeenCalledWith('query', expect.any(Function));
    });

    it('should not enable debug mode in production', async () => {
      // Setup
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
      process.env.NODE_ENV = 'production';

      const mockConnection = {
        connection: {
          host: 'localhost:27017',
        },
      };

      mockedMongoose.connect.mockResolvedValue(mockConnection as any);

      // Execute
      await connectDB();

      // Verify
      expect(mockedMongoose.set).not.toHaveBeenCalledWith('debug', true);
    });

    it('should throw error when MONGODB_URI is not defined', async () => {
      // Setup
      delete process.env.MONGODB_URI;

      // Execute & Verify
      await expect(async () => {
        await connectDB();
      }).rejects.toThrow('process.exit() was called.');

      expect(mockedLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('MONGODB_URI is not defined in environment variables')
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle connection error', async () => {
      // Setup
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
      const connectionError = new Error('Connection failed');
      mockedMongoose.connect.mockRejectedValue(connectionError);

      // Execute & Verify
      await expect(async () => {
        await connectDB();
      }).rejects.toThrow('process.exit() was called.');

      expect(mockedLogger.error).toHaveBeenCalledWith(
        `Error connecting to MongoDB: ${connectionError}`
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should setup connection event handlers', async () => {
      // Setup
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
      const mockConnection = {
        connection: { host: 'localhost:27017' },
      };
      mockedMongoose.connect.mockResolvedValue(mockConnection as any);

      // Execute
      await connectDB();

      // Verify event handlers are set up
      expect(mockedMongoose.connection.on).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(mockedMongoose.connection.on).toHaveBeenCalledWith(
        'disconnected',
        expect.any(Function)
      );
      expect(mockedMongoose.connection.on).toHaveBeenCalledWith('error', expect.any(Function));

      // Test event handlers
      const mockOn = mockedMongoose.connection.on as jest.MockedFunction<any>;
      const connectedHandler = mockOn.mock.calls.find((call: any) => call[0] === 'connected')?.[1];
      const disconnectedHandler = mockOn.mock.calls.find(
        (call: any) => call[0] === 'disconnected'
      )?.[1];
      const errorHandler = mockOn.mock.calls.find((call: any) => call[0] === 'error')?.[1];

      // Execute handlers
      connectedHandler?.();
      disconnectedHandler?.();
      errorHandler?.(new Error('Test error'));

      // Verify handler calls
      expect(mockedLogger.info).toHaveBeenCalledWith('MongoDB connected');
      expect(mockedLogger.warn).toHaveBeenCalledWith('MongoDB disconnected');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'MongoDB connection error: Error: Test error'
      );
    });
  });

  describe('disconnectDB', () => {
    it('should disconnect from MongoDB successfully', async () => {
      // Setup
      mockedMongoose.disconnect.mockResolvedValue(undefined);

      // Execute
      await disconnectDB();

      // Verify
      expect(mockedMongoose.disconnect).toHaveBeenCalled();
      expect(mockedLogger.info).toHaveBeenCalledWith('MongoDB disconnected successfully');
    });

    it('should handle disconnection error', async () => {
      // Setup
      const disconnectionError = new Error('Disconnection failed');
      mockedMongoose.disconnect.mockRejectedValue(disconnectionError);

      // Execute
      await disconnectDB();

      // Verify
      expect(mockedMongoose.disconnect).toHaveBeenCalled();
      expect(mockedLogger.error).toHaveBeenCalledWith(
        `Error disconnecting from MongoDB: ${disconnectionError}`
      );
    });
  });
});
