import { UserRouteService } from '@/services/user-route.service';
import { UserRoute } from '@/models/user-route.model';
import { User } from '@/models/user.model';
import { Route } from '@/models/route.model';
import { UserRole } from '@/types/user.type';
import {
  IUserRouteCreateRequest,
  IAssignMultipleRoutesRequest,
  IRemoveMultipleRoutesRequest
} from '@/types/user-route.type';
import { Types } from 'mongoose';

// Mock the models
jest.mock('@/models/user-route.model');
jest.mock('@/models/user.model');
jest.mock('@/models/route.model');

// Mock data
const mockUserId = new Types.ObjectId().toString();
const mockRouteId = new Types.ObjectId().toString();
const mockAssignedByUserId = new Types.ObjectId().toString();
const mockUserRouteId = new Types.ObjectId().toString();

const mockUser = {
  _id: mockUserId,
  username: 'testuser',
  role: UserRole.USER,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockRoute = {
  _id: mockRouteId,
  code: 'T1',
  name: 'TP.HCM',
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockUserRoute = {
  _id: mockUserRouteId,
  userId: mockUserId,
  routeId: mockRouteId,
  assignedBy: mockAssignedByUserId,
  createdAt: new Date(),
  updatedAt: new Date(),
  populate: jest.fn().mockReturnThis(),
  save: jest.fn().mockResolvedValue(true)
};

const mockPopulatedUserRoute = {
  _id: mockUserRouteId,
  userId: {
    _id: mockUserId,
    username: 'testuser',
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  routeId: {
    _id: mockRouteId,
    code: 'T1',
    name: 'TP.HCM',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  assignedBy: {
    _id: mockAssignedByUserId,
    username: 'manager',
    role: UserRole.MANAGER,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('UserRouteService', () => {
  let userRouteService: UserRouteService;

  beforeEach(() => {
    userRouteService = new UserRouteService();

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('assignRouteToUser', () => {
    const assignData: IUserRouteCreateRequest = {
      userId: mockUserId,
      routeId: mockRouteId
    };

    it('should successfully assign a route to a user', async () => {
      // Mock the static methods
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Route.findById as jest.Mock).mockResolvedValue(mockRoute);
      (UserRoute.findOne as jest.Mock).mockResolvedValue(null);

      // Mock constructor
      const mockUserRouteInstance = {
        ...mockUserRoute,
        save: jest.fn().mockResolvedValue(mockUserRoute),
        populate: jest.fn().mockResolvedValue(mockPopulatedUserRoute)
      };
      (UserRoute as unknown as jest.Mock).mockImplementation(() => mockUserRouteInstance);

      const result = await userRouteService.assignRouteToUser(assignData, mockAssignedByUserId);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Route.findById).toHaveBeenCalledWith(mockRouteId);
      expect(UserRoute.findOne).toHaveBeenCalledWith({
        userId: mockUserId,
        routeId: mockRouteId
      });
      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.routeId).toBe(mockRouteId);
    });

    it('should throw error when user not found', async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        userRouteService.assignRouteToUser(assignData, mockAssignedByUserId)
      ).rejects.toThrow('User not found');
    });

    it('should throw error when route not found', async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Route.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        userRouteService.assignRouteToUser(assignData, mockAssignedByUserId)
      ).rejects.toThrow('Route not found');
    });

    it('should throw error when route already assigned', async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Route.findById as jest.Mock).mockResolvedValue(mockRoute);
      (UserRoute.findOne as jest.Mock).mockResolvedValue(mockUserRoute);

      await expect(
        userRouteService.assignRouteToUser(assignData, mockAssignedByUserId)
      ).rejects.toThrow('Route is already assigned to this user');
    });
  });

  describe('assignMultipleRoutesToUser', () => {
    const multipleAssignData: IAssignMultipleRoutesRequest = {
      userId: mockUserId,
      routeIds: [mockRouteId, new Types.ObjectId().toString()]
    };

    it('should successfully assign multiple routes to a user', async () => {
      const mockRoutes = [
        mockRoute,
        { _id: multipleAssignData.routeIds[1], code: 'T2', name: 'Long An' }
      ];

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Route.find as jest.Mock).mockResolvedValue(mockRoutes);

      // Mock first call to find existing assignments - return empty array
      // Mock second call to find created assignments - return populated data
      (UserRoute.find as jest.Mock)
        .mockResolvedValueOnce([])
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue([mockPopulatedUserRoute, mockPopulatedUserRoute])
        });

      (UserRoute.insertMany as jest.Mock).mockResolvedValue([mockUserRoute, mockUserRoute]);

      const result = await userRouteService.assignMultipleRoutesToUser(multipleAssignData, mockAssignedByUserId);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Route.find).toHaveBeenCalledWith({ _id: { $in: multipleAssignData.routeIds } });
      expect(result).toHaveLength(2);
    });

    it('should throw error when user not found', async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        userRouteService.assignMultipleRoutesToUser(multipleAssignData, mockAssignedByUserId)
      ).rejects.toThrow('User not found');
    });

    it('should throw error when routes not found', async () => {
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Route.find as jest.Mock).mockResolvedValue([mockRoute]); // Only one route found

      await expect(
        userRouteService.assignMultipleRoutesToUser(multipleAssignData, mockAssignedByUserId)
      ).rejects.toThrow('One or more routes not found');
    });

    it('should throw error when routes already assigned', async () => {
      const mockRoutes = [
        mockRoute,
        { _id: multipleAssignData.routeIds[1], code: 'T2', name: 'Long An' }
      ];

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (Route.find as jest.Mock).mockResolvedValue(mockRoutes);
      (UserRoute.find as jest.Mock).mockResolvedValue([mockUserRoute]); // Existing assignment

      await expect(
        userRouteService.assignMultipleRoutesToUser(multipleAssignData, mockAssignedByUserId)
      ).rejects.toThrow('Routes already assigned to this user');
    });
  });

  describe('removeRouteFromUser', () => {
    it('should successfully remove a route from user', async () => {
      (UserRoute.findById as jest.Mock).mockResolvedValue(mockUserRoute);
      (UserRoute.findByIdAndDelete as jest.Mock).mockResolvedValue(mockUserRoute);

      await expect(
        userRouteService.removeRouteFromUser(mockUserRouteId)
      ).resolves.not.toThrow();

      expect(UserRoute.findById).toHaveBeenCalledWith(mockUserRouteId);
      expect(UserRoute.findByIdAndDelete).toHaveBeenCalledWith(mockUserRouteId);
    });

    it('should throw error when user route not found', async () => {
      (UserRoute.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        userRouteService.removeRouteFromUser(mockUserRouteId)
      ).rejects.toThrow('User route assignment not found');
    });
  });

  describe('removeMultipleRoutesFromUser', () => {
    const removeData: IRemoveMultipleRoutesRequest = {
      userId: mockUserId,
      routeIds: [mockRouteId]
    };

    it('should successfully remove multiple routes from user', async () => {
      (UserRoute.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      await expect(
        userRouteService.removeMultipleRoutesFromUser(removeData)
      ).resolves.not.toThrow();

      expect(UserRoute.deleteMany).toHaveBeenCalledWith({
        userId: mockUserId,
        routeId: { $in: removeData.routeIds }
      });
    });

    it('should throw error when no assignments found to remove', async () => {
      (UserRoute.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 0 });

      await expect(
        userRouteService.removeMultipleRoutesFromUser(removeData)
      ).rejects.toThrow('No route assignments found to remove');
    });
  });

  describe('getUserRoutes', () => {
    it('should successfully get user routes', async () => {
      const mockUserRoutes = [mockPopulatedUserRoute];
      (UserRoute.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUserRoutes)
      });

      const result = await userRouteService.getUserRoutes(mockUserId);

      expect(UserRoute.find).toHaveBeenCalledWith({ userId: mockUserId });
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(mockUserId);
    });

    it('should handle error when getting user routes', async () => {
      (UserRoute.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(
        userRouteService.getUserRoutes(mockUserId)
      ).rejects.toThrow('Failed to get user routes');
    });
  });

  describe('getRoutesForUser', () => {
    it('should successfully get routes for user', async () => {
      const mockUserRoutes = [{
        routeId: mockRoute
      }];

      (UserRoute.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUserRoutes)
      });

      const result = await userRouteService.getRoutesForUser(mockUserId);

      expect(UserRoute.find).toHaveBeenCalledWith({ userId: mockUserId });
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('T1');
    });

    it('should handle error when getting routes for user', async () => {
      (UserRoute.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(
        userRouteService.getRoutesForUser(mockUserId)
      ).rejects.toThrow('Failed to get routes for user');
    });
  });

  describe('getUsersForRoute', () => {
    it('should successfully get users for route', async () => {
      const mockUserRoutes = [mockPopulatedUserRoute];
      (UserRoute.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUserRoutes)
      });

      const result = await userRouteService.getUsersForRoute(mockRouteId);

      expect(UserRoute.find).toHaveBeenCalledWith({ routeId: mockRouteId });
      expect(result).toHaveLength(1);
      expect(result[0].routeId).toBe(mockRouteId);
    });

    it('should handle error when getting users for route', async () => {
      (UserRoute.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(
        userRouteService.getUsersForRoute(mockRouteId)
      ).rejects.toThrow('Failed to get users for route');
    });
  });

  describe('getAllUserRoutes', () => {
    it('should successfully get all user routes', async () => {
      const mockUserRoutes = [mockPopulatedUserRoute];
      (UserRoute.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUserRoutes)
      });

      const result = await userRouteService.getAllUserRoutes();

      expect(UserRoute.find).toHaveBeenCalledWith({});
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(mockUserId);
    });

    it('should handle error when getting all user routes', async () => {
      (UserRoute.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(
        userRouteService.getAllUserRoutes()
      ).rejects.toThrow('Failed to get all user routes');
    });
  });
});