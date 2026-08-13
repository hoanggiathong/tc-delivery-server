import { AppError } from '@/middlewares/error.middleware';
import { Route } from '@/models/route.model';
import { User } from '@/models/user.model';
import { UserRoute } from '@/models/user-route.model';
import {
  IAdditionalInformationProduct,
  IAdditionalInformationProductInput,
  IAdditionalInformationProductResponse,
  UserRole,
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
   * Resolve the user's current route to an ACTIVE route.
   *
   * Backward compatibility:
   * - Existing Route documents without `isDeleted` are active because `$ne: true`.
   * - USER falls back only to an active route already assigned in UserRoute.
   * - Other roles keep the existing behavior of being able to work with any route,
   *   so they fall back to the newest active route if their current route was deleted.
   *
   * Fallback/persistence only happens when `allowFallback` is explicitly true.
   * Normal operational getters never silently switch the user's station.
   */
  async resolveActiveSelectedRoute(
    userId: string,
    options: { allowFallback?: boolean } = {}
  ): Promise<IUserSelectedRouteInfo | null> {
    const user = await User.findById(userId).select('selectedRouteId role');
    if (!user) {
      throw new Error('User not found');
    }

    if (user.selectedRouteId) {
      const selectedRoute = await Route.findOne({
        _id: user.selectedRouteId,
        isDeleted: { $ne: true },
      }).select('_id code name');

      if (selectedRoute) {
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
    }

    /**
     * Operational getters must never silently switch station in the middle of a session.
     * Fallback is only enabled explicitly by login/recovery flows.
     */
    if (!options.allowFallback) {
      return null;
    }

    let fallbackRoute: {
      _id: Types.ObjectId;
      code: string;
      name: string;
    } | null = null;

    if (user.role === UserRole.USER) {
      /**
       * Keep the same priority as UserRouteService.getUserRoutes():
       * newest assignment first. This keeps BE fallback aligned with the FE list.
       */
      const assignments = await UserRoute.find({ userId: user._id })
        .select('routeId')
        .sort({ createdAt: -1 })
        .lean();

      const orderedRouteIds = assignments.map(item => item.routeId).filter(Boolean);

      if (orderedRouteIds.length > 0) {
        const activeRoutes = await Route.find({
          _id: { $in: orderedRouteIds },
          isDeleted: { $ne: true },
        })
          .select('_id code name')
          .lean();

        const activeRouteMap = new Map(
          activeRoutes.map(route => [route._id.toString(), route] as const)
        );

        for (const routeId of orderedRouteIds) {
          const route = activeRouteMap.get(routeId.toString());
          if (route) {
            fallbackRoute = {
              _id: route._id,
              code: route.code,
              name: route.name,
            };
            break;
          }
        }
      }
    } else {
      const route = await Route.findOne({
        isDeleted: { $ne: true },
      })
        .select('_id code name')
        .sort({ createdAt: -1 })
        .lean();

      if (route) {
        fallbackRoute = {
          _id: route._id,
          code: route.code,
          name: route.name,
        };
      }
    }

    if (!fallbackRoute) {
      if (user.selectedRouteId) {
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              selectedRouteId: null,
            },
          }
        );
      }

      return null;
    }

    if (!user.selectedRouteId || !user.selectedRouteId.equals(fallbackRoute._id)) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            selectedRouteId: fallbackRoute._id,
          },
        }
      );
    }

    return {
      userId,
      selectedRouteId: fallbackRoute._id.toString(),
      selectedRoute: {
        _id: fallbackRoute._id.toString(),
        code: fallbackRoute.code,
        name: fallbackRoute.name,
      },
    };
  }

  /**
   * Get user's selected route information.
   * Deleted routes are never returned as the current operational route.
   */
  async getUserSelectedRoute(userId: string): Promise<IUserSelectedRouteInfo> {
    const resolved = await this.resolveActiveSelectedRoute(userId);

    if (!resolved) {
      throw new Error('User must have an active selected route');
    }

    return resolved;
  }

  /**
   * Get user's active selected route ID as string.
   */
  async getUserSelectedRouteId(userId: string): Promise<string> {
    const resolved = await this.resolveActiveSelectedRoute(userId);

    if (!resolved) {
      throw new Error('User must have an active selected route');
    }

    return resolved.selectedRouteId;
  }

  /**
   * Check if user has an active selected route.
   */
  async hasSelectedRoute(userId: string): Promise<boolean> {
    try {
      return Boolean(await this.resolveActiveSelectedRoute(userId));
    } catch {
      return false;
    }
  }

  /**
   * Get user's active selected route as ObjectId.
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
