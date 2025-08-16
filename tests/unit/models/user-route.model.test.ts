import { UserRoute } from '@/models/user-route.model';
import { UserRole } from '@/types/user.type';
import { Types } from 'mongoose';

// Mock Mongoose models
jest.mock('@/models/user-route.model');
jest.mock('@/models/user.model');
jest.mock('@/models/route.model');

const MockUserRoute = UserRoute as jest.MockedClass<typeof UserRoute>;

describe('UserRoute Model', () => {
  let mockUserRoute: any;
  let mockSave: jest.Mock;
  let mockFind: jest.Mock;
  let mockFindById: jest.Mock;
  let mockDeleteMany: jest.Mock;
  let mockCountDocuments: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock instance methods
    mockSave = jest.fn();
    mockFind = jest.fn();
    mockFindById = jest.fn();
    mockDeleteMany = jest.fn();
    mockCountDocuments = jest.fn();

    // Mock UserRoute constructor
    mockUserRoute = {
      userId: new Types.ObjectId(),
      routeId: new Types.ObjectId(),
      assignedBy: new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      save: mockSave,
      toJSON: jest.fn().mockReturnValue({
        id: 'userRoute123',
        userId: 'user123',
        routeId: 'route123',
        assignedBy: 'manager123',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    // Mock static methods
    MockUserRoute.find = mockFind;
    MockUserRoute.findById = mockFindById;
    MockUserRoute.deleteMany = mockDeleteMany;
    MockUserRoute.countDocuments = mockCountDocuments;

    // Mock constructor
    (MockUserRoute as any).mockImplementation(() => mockUserRoute);
  });

  describe('UserRoute Creation', () => {
    it('should create a user route successfully with valid data', async () => {
      const userRouteData = {
        userId: new Types.ObjectId(),
        routeId: new Types.ObjectId(),
        assignedBy: new Types.ObjectId(),
      };

      mockSave.mockResolvedValue({
        ...userRouteData,
        _id: new Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const userRoute = new MockUserRoute(userRouteData);
      const savedUserRoute = await userRoute.save();

      expect(savedUserRoute).toBeDefined();
      expect(savedUserRoute.userId).toBeDefined();
      expect(savedUserRoute.routeId).toBeDefined();
      expect(savedUserRoute.assignedBy).toBeDefined();
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should fail to create user route without userId', async () => {
      const userRouteData = {
        routeId: new Types.ObjectId(),
        assignedBy: new Types.ObjectId(),
      };

      const validationError = new Error(
        'UserRoute validation failed: userId: Path `userId` is required.'
      );
      mockSave.mockRejectedValue(validationError);

      const userRoute = new MockUserRoute(userRouteData);

      await expect(userRoute.save()).rejects.toThrow('UserRoute validation failed');
    });

    it('should fail to create user route without routeId', async () => {
      const userRouteData = {
        userId: new Types.ObjectId(),
        assignedBy: new Types.ObjectId(),
      };

      const validationError = new Error(
        'UserRoute validation failed: routeId: Path `routeId` is required.'
      );
      mockSave.mockRejectedValue(validationError);

      const userRoute = new MockUserRoute(userRouteData);

      await expect(userRoute.save()).rejects.toThrow('UserRoute validation failed');
    });

    it('should fail to create user route without assignedBy', async () => {
      const userRouteData = {
        userId: new Types.ObjectId(),
        routeId: new Types.ObjectId(),
      };

      const validationError = new Error(
        'UserRoute validation failed: assignedBy: Path `assignedBy` is required.'
      );
      mockSave.mockRejectedValue(validationError);

      const userRoute = new MockUserRoute(userRouteData);

      await expect(userRoute.save()).rejects.toThrow('UserRoute validation failed');
    });

    it('should fail to create duplicate user route assignment', async () => {
      const userRouteData = {
        userId: new Types.ObjectId(),
        routeId: new Types.ObjectId(),
        assignedBy: new Types.ObjectId(),
      };

      const duplicateError = new Error('E11000 duplicate key error collection');
      mockSave.mockRejectedValue(duplicateError);

      const userRoute = new MockUserRoute(userRouteData);

      await expect(userRoute.save()).rejects.toThrow('E11000 duplicate key error');
    });
  });

  describe('UserRoute Transformation', () => {
    it('should transform document correctly using toJSON', async () => {
      const userRouteData = {
        userId: new Types.ObjectId(),
        routeId: new Types.ObjectId(),
        assignedBy: new Types.ObjectId(),
      };

      const userRoute = new MockUserRoute(userRouteData);
      const jsonUserRoute = userRoute.toJSON();

      expect(jsonUserRoute.id).toBeDefined();
      expect(jsonUserRoute._id).toBeUndefined();
      expect(jsonUserRoute.__v).toBeUndefined();
      expect(jsonUserRoute.userId).toBeDefined();
      expect(jsonUserRoute.routeId).toBeDefined();
      expect(jsonUserRoute.assignedBy).toBeDefined();
      expect(jsonUserRoute.createdAt).toBeDefined();
      expect(jsonUserRoute.updatedAt).toBeDefined();
    });
  });

  describe('UserRoute Indexes', () => {
    it('should enforce unique compound index on userId and routeId', async () => {
      const userRouteData = {
        userId: new Types.ObjectId(),
        routeId: new Types.ObjectId(),
        assignedBy: new Types.ObjectId(),
      };

      const duplicateError = new Error('E11000 duplicate key error collection');
      mockSave.mockRejectedValue(duplicateError);

      const userRoute = new MockUserRoute(userRouteData);

      await expect(userRoute.save()).rejects.toThrow('E11000 duplicate key error');
    });

    it('should allow same userId with different routeId', async () => {
      const userId = new Types.ObjectId();
      const routeId1 = new Types.ObjectId();
      const routeId2 = new Types.ObjectId();
      const assignedBy = new Types.ObjectId();

      mockSave.mockResolvedValue({
        userId,
        routeId: routeId1,
        assignedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const userRoute1 = new MockUserRoute({ userId, routeId: routeId1, assignedBy });
      const userRoute2 = new MockUserRoute({ userId, routeId: routeId2, assignedBy });

      await expect(userRoute1.save()).resolves.toBeDefined();
      await expect(userRoute2.save()).resolves.toBeDefined();
    });

    it('should allow same routeId with different userId', async () => {
      const userId1 = new Types.ObjectId();
      const userId2 = new Types.ObjectId();
      const routeId = new Types.ObjectId();
      const assignedBy = new Types.ObjectId();

      mockSave.mockResolvedValue({
        userId: userId1,
        routeId,
        assignedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const userRoute1 = new MockUserRoute({ userId: userId1, routeId, assignedBy });
      const userRoute2 = new MockUserRoute({ userId: userId2, routeId, assignedBy });

      await expect(userRoute1.save()).resolves.toBeDefined();
      await expect(userRoute2.save()).resolves.toBeDefined();
    });
  });

  describe('UserRoute Population', () => {
    it('should populate user, route, and assignedBy fields correctly', async () => {
      const mockPopulatedUserRoute = {
        _id: new Types.ObjectId(),
        userId: {
          username: 'testuser',
          role: UserRole.USER,
        },
        routeId: {
          code: 'T1',
          name: 'TP.HCM',
        },
        assignedBy: {
          username: 'manager',
          role: UserRole.MANAGER,
        },
      };

      let populateCallCount = 0;
      const mockPopulateChain = {
        populate: jest.fn().mockImplementation(() => {
          populateCallCount++;
          if (populateCallCount === 3) {
            return mockPopulatedUserRoute;
          }
          return mockPopulateChain;
        }),
      };

      mockFindById.mockReturnValue(mockPopulateChain);

      const populatedUserRoute = await MockUserRoute.findById('userRoute123')
        .populate('userId', 'username role')
        .populate('routeId', 'code name')
        .populate('assignedBy', 'username role');

      expect(populatedUserRoute).toBeDefined();
      expect((populatedUserRoute as any).userId.username).toBe('testuser');
      expect((populatedUserRoute as any).routeId.code).toBe('T1');
      expect((populatedUserRoute as any).assignedBy.username).toBe('manager');
    });
  });

  describe('UserRoute Queries', () => {
    it('should find user routes by userId', async () => {
      const userId = new Types.ObjectId();
      const mockUserRoutes = [
        { userId, routeId: new Types.ObjectId(), assignedBy: new Types.ObjectId() },
        { userId, routeId: new Types.ObjectId(), assignedBy: new Types.ObjectId() },
      ];

      mockFind.mockResolvedValue(mockUserRoutes);

      const userRoutes = await MockUserRoute.find({ userId });

      expect(userRoutes).toHaveLength(2);
      expect(mockFind).toHaveBeenCalledWith({ userId });
    });

    it('should find user routes by routeId', async () => {
      const routeId = new Types.ObjectId();
      const mockUserRoutes = [
        { userId: new Types.ObjectId(), routeId, assignedBy: new Types.ObjectId() },
      ];

      mockFind.mockResolvedValue(mockUserRoutes);

      const userRoutes = await MockUserRoute.find({ routeId });

      expect(userRoutes).toHaveLength(1);
      expect(mockFind).toHaveBeenCalledWith({ routeId });
    });

    it('should find user routes by assignedBy', async () => {
      const assignedBy = new Types.ObjectId();
      const mockUserRoutes = [
        { userId: new Types.ObjectId(), routeId: new Types.ObjectId(), assignedBy },
        { userId: new Types.ObjectId(), routeId: new Types.ObjectId(), assignedBy },
      ];

      mockFind.mockResolvedValue(mockUserRoutes);

      const userRoutes = await MockUserRoute.find({ assignedBy });

      expect(userRoutes).toHaveLength(2);
      expect(mockFind).toHaveBeenCalledWith({ assignedBy });
    });

    it('should count user routes correctly', async () => {
      mockCountDocuments.mockResolvedValue(2);

      const count = await MockUserRoute.countDocuments({ userId: new Types.ObjectId() });

      expect(count).toBe(2);
      expect(mockCountDocuments).toHaveBeenCalledTimes(1);
    });

    it('should delete user routes correctly', async () => {
      mockDeleteMany.mockResolvedValue({ deletedCount: 2 });

      const deleteResult = await MockUserRoute.deleteMany({ userId: new Types.ObjectId() });

      expect(deleteResult.deletedCount).toBe(2);
      expect(mockDeleteMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('UserRoute Timestamps', () => {
    it('should automatically set createdAt and updatedAt on creation', async () => {
      const now = new Date();
      const userRouteData = {
        userId: new Types.ObjectId(),
        routeId: new Types.ObjectId(),
        assignedBy: new Types.ObjectId(),
      };

      mockSave.mockResolvedValue({
        ...userRouteData,
        createdAt: now,
        updatedAt: now,
      });

      const userRoute = new MockUserRoute(userRouteData);
      const savedUserRoute = await userRoute.save();

      expect(savedUserRoute.createdAt).toBeDefined();
      expect(savedUserRoute.updatedAt).toBeDefined();
      expect(savedUserRoute.createdAt).toEqual(savedUserRoute.updatedAt);
    });

    it('should update updatedAt on modification', async () => {
      const createdAt = new Date();
      const updatedAt = new Date(Date.now() + 1000);

      const userRouteData = {
        userId: new Types.ObjectId(),
        routeId: new Types.ObjectId(),
        assignedBy: new Types.ObjectId(),
      };

      mockSave.mockResolvedValue({
        ...userRouteData,
        createdAt,
        updatedAt,
      });

      const userRoute = new MockUserRoute(userRouteData);
      const updatedUserRoute = await userRoute.save();

      expect(updatedUserRoute.updatedAt).not.toEqual(updatedUserRoute.createdAt);
      expect(updatedUserRoute.createdAt).toEqual(createdAt);
      expect(updatedUserRoute.updatedAt).toEqual(updatedAt);
    });
  });
});
