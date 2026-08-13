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
   * Resolve the user's persisted selectedRouteId only when that Route is ACTIVE.
   *
   * Important production behavior:
   * - Never auto-switch to another route here.
   * - Never clear User.selectedRouteId when its Route is soft-deleted.
   * - Keeping the old selectedRouteId allows the same route to become usable again
   *   after a future restore, provided the user has not explicitly selected another route.
   * - Legacy Route documents without isDeleted remain active via $ne: true.
   */
  async resolveActiveSelectedRoute(userId: string): Promise<IUserSelectedRouteInfo | null> {
    const user = await User.findById(userId).select('selectedRouteId');
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.selectedRouteId) {
      return null;
    }

    const selectedRoute = await Route.findOne({
      _id: user.selectedRouteId,
      isDeleted: { $ne: true },
    }).select('_id code name');

    if (!selectedRoute) {
      return null;
    }

    return {
      userId,
      selectedRouteId: selectedRoute._id.toString(),
      selectedRoute: {
        _id: selectedRoute._id.toString(),
        code: selectedRoute.code,
        name: selectedRoute.name,
      },
    };
  }

  /**
   * Get user's selected route information for operational flows.
   * A soft-deleted selected route remains persisted on User but is not operationally usable.
   */
  async getUserSelectedRoute(userId: string): Promise<IUserSelectedRouteInfo> {
    const resolved = await this.resolveActiveSelectedRoute(userId);

    if (!resolved) {
      throw new Error('User must have an active selected route');
    }

    return resolved;
  }

  /**
   * Get user's ACTIVE selected route ID as string.
   */
  async getUserSelectedRouteId(userId: string): Promise<string> {
    const resolved = await this.resolveActiveSelectedRoute(userId);

    if (!resolved) {
      throw new Error('User must have an active selected route');
    }

    return resolved.selectedRouteId;
  }

  /**
   * Check whether the persisted selected route is currently active.
   */
  async hasSelectedRoute(userId: string): Promise<boolean> {
    try {
      return Boolean(await this.resolveActiveSelectedRoute(userId));
    } catch {
      return false;
    }
  }

  /**
   * Get user's ACTIVE selected route as ObjectId.
   */
  async getUserSelectedRouteObjectId(userId: string): Promise<Types.ObjectId> {
    const resolved = await this.resolveActiveSelectedRoute(userId);

    if (!resolved) {
      throw new Error('User must have an active selected route');
    }

    return new Types.ObjectId(resolved.selectedRouteId);
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
