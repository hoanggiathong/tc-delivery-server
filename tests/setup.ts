import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

// Custom matcher for date comparison
expect.extend({
  toEqualWithDateStrings(received: any, expected: any) {
    const pass = JSON.stringify(received) === JSON.stringify(expected);

    if (pass) {
      return {
        message: () => `expected ${received} not to equal ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to equal ${JSON.stringify(expected)}`,
        pass: false,
      };
    }
  },
});

// Extend Jest matchers
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toEqualWithDateStrings(expected: any): R;
    }
  }
}

beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Close any existing connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    await mongoose.connect(mongoUri);
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
});

afterEach(async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
    }
  } catch (error) {
    console.error('Failed to cleanup collections:', error);
  }
});

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
  }
}, 10000); // 10 second timeout for cleanup
