import { UserRoute, IUserRoute } from '@/models/user-route.model';
import { User } from '@/models/user.model';
import { Route } from '@/models/route.model';
import {
  IUserRouteResponse,
  IUserRouteLeanPopulated,
  IUserRouteCreateRequest,
  IAssignMultipleRoutesRequest,
  IRemoveMultipleRoutesRequest,
} from '@/types/user-route.type';
import { UserRole } from '@/types/user.type';
import { IRouteResponse } from '@/types/route.type';

export class UserRouteService {
  /**
   * Type assertion helper for populated user routes
   * Safely converts Mongoose populated result to typed interface
   */
  private toPopulatedUserRoute(userRoute: any): IUserRouteLeanPopulated {
    return userRoute;
  }

  /**
   * Type assertion helper for populated route objects
   */
  private toPopulatedRoute(route: any): {
    _id: string;
    code: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return route;
  }

  /**
   * Transform IUserRoute to IUserRouteResponse
   */
  private async transformUserRouteToResponse(userRoute: IUserRoute): Promise<IUserRouteResponse> {
    const populated = await userRoute.populate([
      { path: 'userId', select: '_id username role' },
      { path: 'routeId', select: '_id code name' },
      { path: 'assignedBy', select: '_id username role' },
    ]);

    const populatedUserRoute = populated as any;

    return {
      id: populatedUserRoute._id,
      userId: populatedUserRoute.userId._id,
      routeId: populatedUserRoute.routeId._id,
      assignedBy: populatedUserRoute.assignedBy._id,
      user: {
        id: populatedUserRoute.userId._id,
        username: populatedUserRoute.userId.username,
        role: populatedUserRoute.userId.role,
        createdAt: populatedUserRoute.userId.createdAt,
        updatedAt: populatedUserRoute.userId.updatedAt,
      },
      route: {
        id: populatedUserRoute.routeId._id,
        code: populatedUserRoute.routeId.code,
        name: populatedUserRoute.routeId.name,
        createdAt: populatedUserRoute.routeId.createdAt,
        updatedAt: populatedUserRoute.routeId.updatedAt,
      },
      assignedByUser: {
        id: populatedUserRoute.assignedBy._id,
        username: populatedUserRoute.assignedBy.username,
        role: populatedUserRoute.assignedBy.role,
        createdAt: populatedUserRoute.assignedBy.createdAt,
        updatedAt: populatedUserRoute.assignedBy.updatedAt,
      },
      createdAt: populatedUserRoute.createdAt,
      updatedAt: populatedUserRoute.updatedAt,
    };
  }

  /**
   * Transform pre-populated lean user route to response (optimized)
   */
  private transformUserRouteLeanToResponse(userRoute: IUserRouteLeanPopulated): IUserRouteResponse {
    // Add null checks for populated fields
    if (!userRoute.userId || !userRoute.routeId || !userRoute.assignedBy) {
      throw new Error('Invalid user route data: missing populated fields');
    }

    return {
      id: userRoute._id,
      userId: userRoute.userId._id,
      routeId: userRoute.routeId._id,
      assignedBy: userRoute.assignedBy._id,
      user: {
        id: userRoute.userId._id,
        username: userRoute.userId.username,
        role: userRoute.userId.role as UserRole,
        createdAt: userRoute.createdAt,
        updatedAt: userRoute.updatedAt,
      },
      route: {
        id: userRoute.routeId._id,
        code: userRoute.routeId.code,
        name: userRoute.routeId.name,
        createdAt: userRoute.createdAt,
        updatedAt: userRoute.updatedAt,
      },
      assignedByUser: {
        id: userRoute.assignedBy._id,
        username: userRoute.assignedBy.username,
        role: userRoute.assignedBy.role as UserRole,
        createdAt: userRoute.createdAt,
        updatedAt: userRoute.updatedAt,
      },
      createdAt: userRoute.createdAt,
      updatedAt: userRoute.updatedAt,
    };
  }

  /**
   * Assign a route to a user
   */
  async assignRouteToUser(
    data: IUserRouteCreateRequest,
    assignedByUserId: string
  ): Promise<IUserRouteResponse> {
    try {
      // Check if user exists
      const user = await User.findById(data.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if route exists
      const route = await Route.findById(data.routeId);
      if (!route) {
        throw new Error('Route not found');
      }

      // Check if assignment already exists
      const existingAssignment = await UserRoute.findOne({
        userId: data.userId,
        routeId: data.routeId,
      });

      if (existingAssignment) {
        throw new Error('Route is already assigned to this user');
      }

      // Create new assignment
      const userRoute = new UserRoute({
        userId: data.userId,
        routeId: data.routeId,
        assignedBy: assignedByUserId,
      });

      await userRoute.save();
      return this.transformUserRouteToResponse(userRoute);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to assign route to user');
    }
  }

  /**
   * Assign multiple routes to a user
   */
  async assignMultipleRoutesToUser(
    data: IAssignMultipleRoutesRequest,
    assignedByUserId: string
  ): Promise<IUserRouteResponse[]> {
    try {
      // Check if user exists
      const user = await User.findById(data.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if all routes exist
      const routes = await Route.find({ _id: { $in: data.routeIds } });
      if (routes.length !== data.routeIds.length) {
        throw new Error('One or more routes not found');
      }

      // Check for existing assignments
      const existingAssignments = await UserRoute.find({
        userId: data.userId,
        routeId: { $in: data.routeIds },
      });

      if (existingAssignments.length > 0) {
        const existingRouteIds = existingAssignments.map(a => a.routeId.toString());
        const existingRoutes = routes.filter(r => existingRouteIds.includes(r._id.toString()));
        const routeCodes = existingRoutes.map(r => r.code).join(', ');
        throw new Error(`Routes already assigned to this user: ${routeCodes}`);
      }

      // Create bulk assignments
      const userRoutes = data.routeIds.map(routeId => ({
        userId: data.userId,
        routeId: routeId,
        assignedBy: assignedByUserId,
      }));

      const createdUserRoutes = await UserRoute.insertMany(userRoutes);

      // Get the created user routes with proper typing
      const userRouteIds = createdUserRoutes.map(ur => ur._id);
      const populatedUserRoutes = await UserRoute.find({ _id: { $in: userRouteIds } })
        .populate([
          { path: 'userId', select: '_id username role' },
          { path: 'routeId', select: '_id code name' },
          { path: 'assignedBy', select: '_id username role' },
        ])
        .lean();

      return populatedUserRoutes.map(userRoute =>
        this.transformUserRouteLeanToResponse(this.toPopulatedUserRoute(userRoute))
      );
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to assign multiple routes to user');
    }
  }

  /**
   * Remove a route assignment from a user
   */
  async removeRouteFromUser(userRouteId: string): Promise<void> {
    try {
      const userRoute = await UserRoute.findById(userRouteId);
      if (!userRoute) {
        throw new Error('User route assignment not found');
      }

      await UserRoute.findByIdAndDelete(userRouteId);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to remove route from user');
    }
  }

  /**
   * Remove multiple route assignments from a user
   */
  async removeMultipleRoutesFromUser(data: IRemoveMultipleRoutesRequest): Promise<void> {
    try {
      const result = await UserRoute.deleteMany({
        userId: data.userId,
        routeId: { $in: data.routeIds },
      });

      if (result.deletedCount === 0) {
        throw new Error('No route assignments found to remove');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to remove multiple routes from user');
    }
  }

  /**
   * Get all route assignments for a user
   */
  async getUserRoutes(userId: string): Promise<IUserRouteResponse[]> {
    try {
      const userRoutes = await UserRoute.find({ userId })
        .populate([
          { path: 'userId', select: '_id username role' },
          { path: 'routeId', select: '_id code name' },
          { path: 'assignedBy', select: '_id username role' },
        ])
        .sort({ createdAt: -1 })
        .lean();

      return userRoutes.map(userRoute =>
        this.transformUserRouteLeanToResponse(this.toPopulatedUserRoute(userRoute))
      );
    } catch (error) {
      console.error('Error getting user routes:', error);
      throw new Error('Failed to get user routes');
    }
  }

  /**
   * Get routes assigned to a user (simplified - returns only route info)
   */
  async getRoutesForUser(userId: string): Promise<IRouteResponse[]> {
    try {
      const userRoutes = await UserRoute.find({ userId })
        .populate('routeId', '_id code name createdAt updatedAt')
        .sort({ 'routeId.code': 1 })
        .lean();

      return userRoutes.map(userRoute => {
        const route = this.toPopulatedRoute(userRoute.routeId);
        return {
          id: route._id,
          code: route.code,
          name: route.name,
          createdAt: route.createdAt,
          updatedAt: route.updatedAt,
        };
      });
    } catch (error) {
      console.error('Error getting routes for user:', error);
      throw new Error('Failed to get routes for user');
    }
  }

  /**
   * Get all user routes
   */
  async getAllUserRoutes(): Promise<IUserRouteResponse[]> {
    try {
      const userRoutes = await UserRoute.find({})
        .populate([
          { path: 'userId', select: '_id username role' },
          { path: 'routeId', select: '_id code name' },
          { path: 'assignedBy', select: '_id username' },
        ])
        .sort({ createdAt: -1 })
        .lean();

      return userRoutes.map(userRoute =>
        this.transformUserRouteLeanToResponse(this.toPopulatedUserRoute(userRoute))
      );
    } catch (error) {
      console.error('Error getting all user routes:', error);
      throw new Error('Failed to get all user routes');
    }
  }

  /**
   * Get users assigned to a specific route
   */
  async getUsersForRoute(routeId: string): Promise<IUserRouteResponse[]> {
    try {
      const userRoutes = await UserRoute.find({ routeId })
        .populate([
          { path: 'userId', select: '_id username role' },
          { path: 'routeId', select: '_id code name' },
          { path: 'assignedBy', select: '_id username role' },
        ])
        .sort({ createdAt: -1 })
        .lean();

      return userRoutes.map(userRoute =>
        this.transformUserRouteLeanToResponse(this.toPopulatedUserRoute(userRoute))
      );
    } catch (error) {
      console.error('Error getting users for route:', error);
      throw new Error('Failed to get users for route');
    }
  }
}
