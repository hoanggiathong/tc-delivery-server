import { AppError } from '@/middlewares/error.middleware';
import { Route } from '@/models/route.model';
import { User } from '@/models/user.model';
import {
  IAdditionalInformationProduct,
  IAdditionalInformationProductInput,
  IAdditionalInformationProductResponse,
} from '@/types/user.type';
import mongoose, { Types } from 'mongoose';

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

  async updateAdditionalInformationProductWithDefaults(
    userId: string,
    listAdditionalInformationProduct: IAdditionalInformationProductInput[]
  ): Promise<IAdditionalInformationProductResponse[]> {
    try {
      // Sort by position first
      const sortedList = listAdditionalInformationProduct.sort((a, b) => a.position - b.position);

      // Check if any item has selected = true
      const hasSelected = sortedList.some(item => item.selected === true);

      // Map items and auto-select first one if none selected
      const additionalInformationProductWithDefaults: IAdditionalInformationProduct[] =
        sortedList.map((item, index) => ({
          _id: new mongoose.Types.ObjectId(),
          content: item.content || '',
          position: item.position,
          selected: hasSelected ? item.selected === true : index === 0, // Auto-select first if none selected
        }));

      const result = await User.findOneAndUpdate(
        { _id: userId },
        {
          additionalInformationProductConfig: additionalInformationProductWithDefaults,
          updatedAt: new Date(),
        },
        { upsert: true, new: true, runValidators: true }
      );

      if (!result) {
        throw new AppError('User not found', 404);
      }

      // Return the updated list in response format
      return additionalInformationProductWithDefaults.map(item => ({
        id: item._id?.toString() || '',
        content: item.content,
        position: item.position,
        selected: item.selected === true,
      }));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update additional information product with defaults', 500);
    }
  }

  async getListAdditionalInformationProductByAccount(
    userId: string
  ): Promise<IAdditionalInformationProductResponse[]> {
    const user = await User.findById(userId);

    if (!user) {
      return [];
    }

    const additionalInformationProductList = user.additionalInformationProductConfig || [];

    // If list is empty, return empty array
    if (additionalInformationProductList.length === 0) {
      return [];
    }

    // Check if any item has selected = true
    const hasSelected = additionalInformationProductList.some(
      (item: IAdditionalInformationProduct) => item.selected === true
    );

    // Map items and ensure first one is selected if none selected
    const result = additionalInformationProductList.map(
      (item: IAdditionalInformationProduct, index: number) => ({
        id: item._id?.toString() || '',
        content: item.content,
        position: item.position,
        selected: hasSelected ? item.selected === true : index === 0, // Auto-select first if none selected
      })
    );

    return result;
  }
}
