import { UserRoute, IUserRoute } from '@/models/user-route.model';
import { User } from '@/models/user.model';
import { Route } from '@/models/route.model';
import { UserRole } from '@/types/user.type';
import { Types } from 'mongoose';

describe('UserRoute Model', () => {
  let userId: string;
  let routeId: string;
  let assignedByUserId: string;

  beforeEach(async () => {
    // Clean up collections
    await UserRoute.deleteMany({});
    await User.deleteMany({});
    await Route.deleteMany({});

    // Create test user
    const user = await User.create({
      username: 'testuser',
      password: 'Password123',
      role: UserRole.USER
    });
    userId = user._id.toString();

    // Create test route
    const route = await Route.create({
      code: 'T1',
      name: 'TP.HCM'
    });
    routeId = route._id.toString();

    // Create test manager
    const manager = await User.create({
      username: 'manager',
      password: 'Password123',
      role: UserRole.MANAGER
    });
    assignedByUserId = manager._id.toString();
  });

  afterEach(async () => {
    await UserRoute.deleteMany({});
    await User.deleteMany({});
    await Route.deleteMany({});
  });

  describe('UserRoute Creation', () => {
    it('should create a user route successfully with valid data', async () => {
      const userRouteData = {
        userId: new Types.ObjectId(userId),
        routeId: new Types.ObjectId(routeId),
        assignedBy: new Types.ObjectId(assignedByUserId)
      };

      const userRoute = new UserRoute(userRouteData);
      const savedUserRoute = await userRoute.save();

      expect(savedUserRoute).toBeDefined();
      expect(savedUserRoute.userId.toString()).toBe(userId);
      expect(savedUserRoute.routeId.toString()).toBe(routeId);
      expect(savedUserRoute.assignedBy.toString()).toBe(assignedByUserId);
      expect(savedUserRoute.createdAt).toBeDefined();
      expect(savedUserRoute.updatedAt).toBeDefined();
    });

    it('should fail to create user route without userId', async () => {
      const userRouteData = {
        routeId: new Types.ObjectId(routeId),
        assignedBy: new Types.ObjectId(assignedByUserId)
      };

      const userRoute = new UserRoute(userRouteData);

      await expect(userRoute.save()).rejects.toThrow();
    });

    it('should fail to create user route without routeId', async () => {
      const userRouteData = {
        userId: new Types.ObjectId(userId),
        assignedBy: new Types.ObjectId(assignedByUserId)
      };

      const userRoute = new UserRoute(userRouteData);

      await expect(userRoute.save()).rejects.toThrow();
    });

    it('should fail to create user route without assignedBy', async () => {
      const userRouteData = {
        userId: new Types.ObjectId(userId),
        routeId: new Types.ObjectId(routeId)
      };

      const userRoute = new UserRoute(userRouteData);

      await expect(userRoute.save()).rejects.toThrow();
    });

    it('should fail to create duplicate user route assignment', async () => {
      const userRouteData = {
        userId: new Types.ObjectId(userId),
        routeId: new Types.ObjectId(routeId),
        assignedBy: new Types.ObjectId(assignedByUserId)
      };

      // Create first user route
      const userRoute1 = new UserRoute(userRouteData);
      await userRoute1.save();

      // Try to create duplicate
      const userRoute2 = new UserRoute(userRouteData);

      await expect(userRoute2.save()).rejects.toThrow();
    });
  });

  describe('UserRoute Transformation', () => {
    it('should transform document correctly using toJSON', async () => {
      const userRouteData = {
        userId: new Types.ObjectId(userId),
        routeId: new Types.ObjectId(routeId),
        assignedBy: new Types.ObjectId(assignedByUserId)
      };

      const userRoute = new UserRoute(userRouteData);
      const savedUserRoute = await userRoute.save();

      const jsonUserRoute = savedUserRoute.toJSON();

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
        userId: new Types.ObjectId(userId),
        routeId: new Types.ObjectId(routeId),
        assignedBy: new Types.ObjectId(assignedByUserId)
      };

      // Create first user route
      const userRoute1 = new UserRoute(userRouteData);
      await userRoute1.save();

      // Try to create duplicate with same userId and routeId but different assignedBy
      const duplicateData = {
        ...userRouteData,
        assignedBy: new Types.ObjectId() // Different assignedBy
      };
      const userRoute2 = new UserRoute(duplicateData);

      await expect(userRoute2.save()).rejects.toThrow();
    });

    it('should allow same userId with different routeId', async () => {
      // Create second route
      const route2 = await Route.create({
        code: 'T2',
        name: 'Long An'
      });

      const userRouteData1 = {
        userId: new Types.ObjectId(userId),
        routeId: new Types.ObjectId(routeId),
        assignedBy: new Types.ObjectId(assignedByUserId)
      };

      const userRouteData2 = {
        userId: new Types.ObjectId(userId),
        routeId: route2._id,
        assignedBy: new Types.ObjectId(assignedByUserId)
      };

      const userRoute1 = new UserRoute(userRouteData1);
      const userRoute2 = new UserRoute(userRouteData2);

      await expect(userRoute1.save()).resolves.toBeDefined();
      await expect(userRoute2.save()).resolves.toBeDefined();
    });

    it('should allow same routeId with different userId', async () => {
      // Create second user
      const user2 = await User.create({
        username: 'testuser2',
        password: 'Password123',
        role: UserRole.USER
      });

      const userRouteData1 = {
        userId: new Types.ObjectId(userId),
        routeId: new Types.ObjectId(routeId),
        assignedBy: new Types.ObjectId(assignedByUserId)
      };

      const userRouteData2 = {
        userId: user2._id,
        routeId: new Types.ObjectId(routeId),
        assignedBy: new Types.ObjectId(assignedByUserId)
      };

      const userRoute1 = new UserRoute(userRouteData1);
      const userRoute2 = new UserRoute(userRouteData2);

      await expect(userRoute1.save()).resolves.toBeDefined();
      await expect(userRoute2.save()).resolves.toBeDefined();
    });
  });

  describe('UserRoute Population', () => {
    it('should populate user, route, and assignedBy fields correctly', async () => {
      const userRouteData = {
        userId: new Types.ObjectId(userId),
        routeId: new Types.ObjectId(routeId),
        assignedBy: new Types.ObjectId(assignedByUserId)
      };

      const userRoute = new UserRoute(userRouteData);
      const savedUserRoute = await userRoute.save();

      const populatedUserRoute = await UserRoute
        .findById(savedUserRoute._id)
        .populate('userId', 'username role')
        .populate('routeId', 'code name')
        .populate('assignedBy', 'username role');

      expect(populatedUserRoute).toBeDefined();
      expect((populatedUserRoute!.userId as any).username).toBe('testuser');
      expect((populatedUserRoute!.routeId as any).code).toBe('T1');
      expect((populatedUserRoute!.assignedBy as any).username).toBe('manager');
    });
  });

  describe('UserRoute Queries', () => {
    beforeEach(async () => {
      // Create multiple user routes for testing
      const userRoute1 = new UserRoute({
        userId: new Types.ObjectId(userId),
        routeId: new Types.ObjectId(routeId),
        assignedBy: new Types.ObjectId(assignedByUserId)
      });
      await userRoute1.save();

      // Create second route and assignment
      const route2 = await Route.create({
        code: 'T2',
        name: 'Long An'
      });

      const userRoute2 = new UserRoute({
        userId: new Types.ObjectId(userId),
        routeId: route2._id,
        assignedBy: new Types.ObjectId(assignedByUserId)
      });
      await userRoute2.save();
    });

    it('should find user routes by userId', async () => {
      const userRoutes = await UserRoute.find({ userId });

      expect(userRoutes).toHaveLength(2);
      expect(userRoutes[0].userId.toString()).toBe(userId);
      expect(userRoutes[1].userId.toString()).toBe(userId);
    });

    it('should find user routes by routeId', async () => {
      const userRoutes = await UserRoute.find({ routeId });

      expect(userRoutes).toHaveLength(1);
      expect(userRoutes[0].routeId.toString()).toBe(routeId);
    });

    it('should find user routes by assignedBy', async () => {
      const userRoutes = await UserRoute.find({ assignedBy: assignedByUserId });

      expect(userRoutes).toHaveLength(2);
      expect(userRoutes[0].assignedBy.toString()).toBe(assignedByUserId);
      expect(userRoutes[1].assignedBy.toString()).toBe(assignedByUserId);
    });

    it('should count user routes correctly', async () => {
      const count = await UserRoute.countDocuments({ userId });

      expect(count).toBe(2);
    });

    it('should delete user routes correctly', async () => {
      const deleteResult = await UserRoute.deleteMany({ userId });

      expect(deleteResult.deletedCount).toBe(2);

      const remainingCount = await UserRoute.countDocuments();
      expect(remainingCount).toBe(0);
    });
  });

  describe('UserRoute Timestamps', () => {
    it('should automatically set createdAt and updatedAt on creation', async () => {
      const userRouteData = {
        userId: new Types.ObjectId(userId),
        routeId: new Types.ObjectId(routeId),
        assignedBy: new Types.ObjectId(assignedByUserId)
      };

      const userRoute = new UserRoute(userRouteData);
      const savedUserRoute = await userRoute.save();

      expect(savedUserRoute.createdAt).toBeDefined();
      expect(savedUserRoute.updatedAt).toBeDefined();
      expect(savedUserRoute.createdAt).toEqual(savedUserRoute.updatedAt);
    });

    it('should update updatedAt on modification', async () => {
      const userRouteData = {
        userId: new Types.ObjectId(userId),
        routeId: new Types.ObjectId(routeId),
        assignedBy: new Types.ObjectId(assignedByUserId)
      };

      const userRoute = new UserRoute(userRouteData);
      const savedUserRoute = await userRoute.save();

      const originalUpdatedAt = savedUserRoute.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Create a new assignedBy user for update
      const newManager = await User.create({
        username: 'newmanager',
        password: 'Password123',
        role: UserRole.MANAGER
      });

      savedUserRoute.assignedBy = new Types.ObjectId(newManager._id.toString());
      const updatedUserRoute = await savedUserRoute.save();

      expect(updatedUserRoute.updatedAt).not.toEqual(originalUpdatedAt);
      expect(updatedUserRoute.createdAt).toEqual(savedUserRoute.createdAt);
    });
  });
});