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
  let mockUserRouteModel: jest.Mocked<typeof UserRoute>;
  let mockUserModel: jest.Mocked<typeof User>;
  let mockRouteModel: jest.Mocked<typeof Route>;

  beforeEach(() => {
    userRouteService = new UserRouteService();
    mockUserRouteModel = UserRoute as jest.Mocked<typeof UserRoute>;
    mockUserModel = User as jest.Mocked<typeof User>;
    mockRouteModel = Route as jest.Mocked<typeof Route>;

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('assignRouteToUser', () => {
    const assignData: IUserRouteCreateRequest = {
      userId: mockUserId,
      routeId: mockRouteId
    };

    it('should successfully assign a route to a user', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser as any);
      mockRouteModel.findById.mockResolvedValue(mockRoute as any);
      mockUserRouteModel.findOne.mockResolvedValue(null);
      mockUserRouteModel.prototype.save = jest.fn().mockResolvedValue(mockUserRoute);
      mockUserRouteModel.prototype.populate = jest.fn().mockResolvedValue(mockPopulatedUserRoute as any);

      const result = await userRouteService.assignRouteToUser(assignData, mockAssignedByUserId);

      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUserId);
      expect(mockRouteModel.findById).toHaveBeenCalledWith(mockRouteId);
      expect(mockUserRouteModel.findOne).toHaveBeenCalledWith({
        userId: mockUserId,
        routeId: mockRouteId
      });
      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.routeId).toBe(mockRouteId);
    });

    it('should throw error when user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(
        userRouteService.assignRouteToUser(assignData, mockAssignedByUserId)
      ).rejects.toThrow('User not found');
    });

    it('should throw error when route not found', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser as any);
      mockRouteModel.findById.mockResolvedValue(null);

      await expect(
        userRouteService.assignRouteToUser(assignData, mockAssignedByUserId)
      ).rejects.toThrow('Route not found');
    });

    it('should throw error when route already assigned', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser as any);
      mockRouteModel.findById.mockResolvedValue(mockRoute as any);
      mockUserRouteModel.findOne.mockResolvedValue(mockUserRoute as any);

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

      mockUserModel.findById.mockResolvedValue(mockUser as any);
      mockRouteModel.find.mockResolvedValue(mockRoutes as any);

      // Mock first call to find existing assignments - return empty array
      // Mock second call to find created assignments - return populated data
      mockUserRouteModel.find
        .mockResolvedValueOnce([])
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue([mockPopulatedUserRoute, mockPopulatedUserRoute])
        } as any);

      mockUserRouteModel.insertMany.mockResolvedValue([mockUserRoute, mockUserRoute] as any);

      const result = await userRouteService.assignMultipleRoutesToUser(multipleAssignData, mockAssignedByUserId);

      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUserId);
      expect(mockRouteModel.find).toHaveBeenCalledWith({ _id: { $in: multipleAssignData.routeIds } });
      expect(result).toHaveLength(2);
    });

    it('should throw error when user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(
        userRouteService.assignMultipleRoutesToUser(multipleAssignData, mockAssignedByUserId)
      ).rejects.toThrow('User not found');
    });

    it('should throw error when routes not found', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser as any);
      mockRouteModel.find.mockResolvedValue([mockRoute] as any); // Only one route found

      await expect(
        userRouteService.assignMultipleRoutesToUser(multipleAssignData, mockAssignedByUserId)
      ).rejects.toThrow('One or more routes not found');
    });

    it('should throw error when routes already assigned', async () => {
      const mockRoutes = [
        mockRoute,
        { _id: multipleAssignData.routeIds[1], code: 'T2', name: 'Long An' }
      ];

      mockUserModel.findById.mockResolvedValue(mockUser as any);
      mockRouteModel.find.mockResolvedValue(mockRoutes as any);
      mockUserRouteModel.find.mockResolvedValue([mockUserRoute] as any); // Existing assignment

      await expect(
        userRouteService.assignMultipleRoutesToUser(multipleAssignData, mockAssignedByUserId)
      ).rejects.toThrow('Routes already assigned to this user');
    });
  });

  describe('removeRouteFromUser', () => {
    it('should successfully remove a route from user', async () => {
      mockUserRouteModel.findById.mockResolvedValue(mockUserRoute as any);
      mockUserRouteModel.findByIdAndDelete.mockResolvedValue(mockUserRoute as any);

      await expect(
        userRouteService.removeRouteFromUser(mockUserRouteId)
      ).resolves.not.toThrow();

      expect(mockUserRouteModel.findById).toHaveBeenCalledWith(mockUserRouteId);
      expect(mockUserRouteModel.findByIdAndDelete).toHaveBeenCalledWith(mockUserRouteId);
    });

    it('should throw error when user route not found', async () => {
      mockUserRouteModel.findById.mockResolvedValue(null);

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
      mockUserRouteModel.deleteMany.mockResolvedValue({ deletedCount: 1 } as any);

      await expect(
        userRouteService.removeMultipleRoutesFromUser(removeData)
      ).resolves.not.toThrow();

      expect(mockUserRouteModel.deleteMany).toHaveBeenCalledWith({
        userId: mockUserId,
        routeId: { $in: removeData.routeIds }
      });
    });

    it('should throw error when no assignments found to remove', async () => {
      mockUserRouteModel.deleteMany.mockResolvedValue({ deletedCount: 0 } as any);

      await expect(
        userRouteService.removeMultipleRoutesFromUser(removeData)
      ).rejects.toThrow('No route assignments found to remove');
    });
  });

  describe('getUserRoutes', () => {
    it('should successfully get user routes', async () => {
      const mockUserRoutes = [mockPopulatedUserRoute];
      mockUserRouteModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUserRoutes)
      } as any);

      const result = await userRouteService.getUserRoutes(mockUserId);

      expect(mockUserRouteModel.find).toHaveBeenCalledWith({ userId: mockUserId });
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(mockUserId);
    });

    it('should handle error when getting user routes', async () => {
      mockUserRouteModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('Database error'))
      } as any);

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

      mockUserRouteModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUserRoutes)
      } as any);

      const result = await userRouteService.getRoutesForUser(mockUserId);

      expect(mockUserRouteModel.find).toHaveBeenCalledWith({ userId: mockUserId });
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('T1');
    });

    it('should handle error when getting routes for user', async () => {
      mockUserRouteModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('Database error'))
      } as any);

      await expect(
        userRouteService.getRoutesForUser(mockUserId)
      ).rejects.toThrow('Failed to get routes for user');
    });
  });

  describe('getUsersForRoute', () => {
    it('should successfully get users for route', async () => {
      const mockUserRoutes = [mockPopulatedUserRoute];
      mockUserRouteModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUserRoutes)
      } as any);

      const result = await userRouteService.getUsersForRoute(mockRouteId);

      expect(mockUserRouteModel.find).toHaveBeenCalledWith({ routeId: mockRouteId });
      expect(result).toHaveLength(1);
      expect(result[0].routeId).toBe(mockRouteId);
    });

    it('should handle error when getting users for route', async () => {
      mockUserRouteModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('Database error'))
      } as any);

      await expect(
        userRouteService.getUsersForRoute(mockRouteId)
      ).rejects.toThrow('Failed to get users for route');
    });
  });

  describe('getAllUserRoutes', () => {
    it('should successfully get all user routes', async () => {
      const mockUserRoutes = [mockPopulatedUserRoute];
      mockUserRouteModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUserRoutes)
      } as any);

      const result = await userRouteService.getAllUserRoutes();

      expect(mockUserRouteModel.find).toHaveBeenCalledWith({});
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(mockUserId);
    });

    it('should handle error when getting all user routes', async () => {
      mockUserRouteModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('Database error'))
      } as any);

      await expect(
        userRouteService.getAllUserRoutes()
      ).rejects.toThrow('Failed to get all user routes');
    });
  });
});