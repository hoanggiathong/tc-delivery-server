import { User } from '@/models/user.model';
import { Route } from '@/models/route.model';
import { Types } from 'mongoose';

export interface IUserSelectedRouteInfo {
  userId: string;
  selectedRouteId: string;
  selectedRoute: {
    _id: string;
    code: string;
    name: string;
  };
}

export class UserService {
  /**
   * Get user's selected route information
   * @param userId - The user ID
   * @returns User's selected route information
   * @throws Error if user not found or has no selected route
   */
  async getUserSelectedRoute(userId: string): Promise<IUserSelectedRouteInfo> {
    const user = await User.findById(userId).select('selectedRouteId');
    if (!user || !user.selectedRouteId) {
      throw new Error('User must have a selected route');
    }

    const selectedRoute = await Route.findById(user.selectedRouteId).select('_id code name');
    if (!selectedRoute) {
      throw new Error('Selected route not found');
    }

    return {
      userId,
      selectedRouteId: user.selectedRouteId.toString(),
      selectedRoute: {
        _id: selectedRoute._id.toString(),
        code: selectedRoute.code,
        name: selectedRoute.name,
      },
    };
  }

  /**
   * Get user's selected route ID as string
   * @param userId - The user ID
   * @returns Selected route ID as string
   * @throws Error if user not found or has no selected route
   */
  async getUserSelectedRouteId(userId: string): Promise<string> {
    const user = await User.findById(userId).select('selectedRouteId');
    if (!user || !user.selectedRouteId) {
      throw new Error('User must have a selected route');
    }

    return user.selectedRouteId.toString();
  }

  /**
   * Check if user has a selected route
   * @param userId - The user ID
   * @returns True if user has selected route, false otherwise
   */
  async hasSelectedRoute(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId).select('selectedRouteId');
      return !!(user && user.selectedRouteId);
    } catch {
      return false;
    }
  }

  /**
   * Get user's selected route as ObjectId
   * @param userId - The user ID
   * @returns Selected route ID as ObjectId
   * @throws Error if user not found or has no selected route
   */
  async getUserSelectedRouteObjectId(userId: string): Promise<Types.ObjectId> {
    const user = await User.findById(userId).select('selectedRouteId');
    if (!user || !user.selectedRouteId) {
      throw new Error('User must have a selected route');
    }

    return user.selectedRouteId;
  }
}
