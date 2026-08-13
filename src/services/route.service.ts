import { FilterQuery, Types } from 'mongoose';
import { Route, IRoute } from '@/models/route.model';
import { IRouteResponse, IRouteLean, RouteType } from '@/types/route.type';
import { CreateRouteRequest, UpdateRouteRequest } from '@/schemas/route.schema';
import { omitBy, isUndefined } from 'lodash';

const ACTIVE_ROUTE_FILTER: FilterQuery<IRoute> = {
  isDeleted: { $ne: true },
};

export class RouteService {
  /**
   * Transform IRoute to IRouteResponse
   */
  private transformRouteToResponse(route: IRoute): IRouteResponse {
    return {
      id: route._id.toString(),
      code: route.code,
      name: route.name,
      address: route.address,
      lat: route.lat ?? null,
      lon: route.lon ?? null,
      distance: route.distance,
      surcharge: route.surcharge,
      surchargeUnit: route.surchargeUnit,
      phone: route.phone,
      createdAt: route.createdAt,
      updatedAt: route.updatedAt,
      type: route.type ?? RouteType.OWNED,
    };
  }

  /**
   * Transform IRouteLean to IRouteResponse (for lean documents)
   */
  private transformRouteLeanToResponse(route: IRouteLean): IRouteResponse {
    return {
      id: route._id.toString(),
      code: route.code,
      name: route.name,
      address: route.address,
      distance: route.distance,
      lat: route.lat ?? null,
      lon: route.lon ?? null,
      surcharge: route.surcharge,
      surchargeUnit: route.surchargeUnit,
      phone: route.phone,
      createdAt: route.createdAt,
      updatedAt: route.updatedAt,
      type: route.type ?? RouteType.OWNED,
      parentRouteId: route.parentRouteId ? route.parentRouteId.toString() : null,
    };
  }

  /**
   * Create a new route
   */
  async createRoute(data: CreateRouteRequest): Promise<IRouteResponse> {
    try {
      // Check if route with code already exists
      const existingRoute = await Route.findOne({ code: data.code.toUpperCase() });
      if (existingRoute) {
        throw new Error('Route with this code already exists');
      }

      // A new route must never be attached to a parent that has been soft-deleted.
      if (data.parentRouteId) {
        const parentRoute = await Route.findOne({
          _id: data.parentRouteId,
          ...ACTIVE_ROUTE_FILTER,
        }).select('_id');

        if (!parentRoute) {
          throw new Error('Parent route not found or has been deleted');
        }
      }

      const newRoute = new Route({
        code: data.code.toUpperCase(),
        name: data.name,
        address: data.address,
        distance: data.distance,
        surcharge: data.surcharge,
        surchargeUnit: data.surchargeUnit,
        phone: data.phone,
        type: data.type ?? RouteType.OWNED,
        parentRouteId: data.parentRouteId ?? null,
      });

      await newRoute.save();
      return this.transformRouteToResponse(newRoute);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create route');
    }
  }

  /**
   * Get route by ID
   */
  async getRouteById(id: string): Promise<IRouteResponse | null> {
    try {
      const route = await Route.findOne({
        _id: id,
        ...ACTIVE_ROUTE_FILTER,
      }).lean<IRouteLean>();
      if (!route) {
        return null;
      }

      return this.transformRouteLeanToResponse(route);
    } catch (error) {
      console.error('Error getting route by ID:', error);
      throw new Error('Failed to get route by ID');
    }
  }

  /**
   * Get route by ID including soft-deleted records.
   *
   * IMPORTANT:
   * Use only for historical/reference flows (old deliveries, old money deliveries,
   * accounting display, etc.). Operational flows must use getRouteById().
   */
  async getRouteByIdIncludingDeleted(id: string): Promise<IRouteResponse | null> {
    try {
      const route = await Route.findById(id).lean<IRouteLean>();
      if (!route) {
        return null;
      }

      return this.transformRouteLeanToResponse(route);
    } catch (error) {
      console.error('Error getting route by ID including deleted:', error);
      throw new Error('Failed to get route by ID');
    }
  }

  /**
   * Get all routes
   */
  async getAllRoutes(type?: RouteType): Promise<IRouteResponse[]> {
    try {
      const filter: FilterQuery<IRoute> = {
        ...ACTIVE_ROUTE_FILTER,
      };

      if (type) {
        filter.type = type;
      }

      const routes = await Route.find(filter).sort({ createdAt: -1 }).lean();

      return routes.map(route => this.transformRouteLeanToResponse(route as IRouteLean));
    } catch (error) {
      console.error('Error getting all routes:', error);
      throw new Error('Failed to fetch routes');
    }
  }

  /**
   * Get route by code
   */
  async getRouteByCode(code: string): Promise<IRouteResponse | null> {
    try {
      const route = await Route.findOne({
        code: code.toUpperCase(),
        ...ACTIVE_ROUTE_FILTER,
      }).lean();
      if (!route) {
        return null;
      }
      return this.transformRouteLeanToResponse(route as IRouteLean);
    } catch (error) {
      console.error('Error getting route by code:', error);
      throw new Error('Failed to get route by code');
    }
  }

  /**
   * Update route by ID
   */
  async updateRoute(id: string, data: UpdateRouteRequest): Promise<IRouteResponse> {
    try {
      const route = await Route.findOne({
        _id: id,
        ...ACTIVE_ROUTE_FILTER,
      });
      if (!route) {
        throw new Error('Route not found');
      }

      // Check if another route with the same code exists
      if (data.code) {
        const existingRoute = await Route.findOne({
          code: data.code.toUpperCase(),
          _id: { $ne: id },
        });
        if (existingRoute) {
          throw new Error('Route with this code already exists');
        }
      }

      // Update fields - Use lodash omitBy to filter out undefined values
      const fieldsToUpdate = omitBy(
        {
          code: data.code?.toUpperCase(),
          name: data.name,
          address: data.address,
          distance: data.distance,
          surcharge: data.surcharge,
          surchargeUnit: data.surchargeUnit,
          phone: data.phone,
          type: data.type,
        },
        isUndefined
      );

      Object.assign(route, fieldsToUpdate);

      await route.save();
      return this.transformRouteToResponse(route);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update route');
    }
  }

  /**
   * Soft-delete route by ID.
   *
   * We intentionally keep the Route document because deliveries, money deliveries,
   * debts and reports may still reference this _id historically.
   */
  async deleteRoute(id: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new Error('Route not found');
      }

      const route = await Route.findOne({
        _id: id,
        ...ACTIVE_ROUTE_FILTER,
      }).select('_id');

      if (!route) {
        throw new Error('Route not found');
      }

      // Do not orphan an active route tree. Historical deleted children are allowed.
      const hasActiveChildren = await Route.exists({
        parentRouteId: route._id,
        ...ACTIVE_ROUTE_FILTER,
      });

      if (hasActiveChildren) {
        throw new Error('Không thể xóa trạm đang có trạm con hoạt động');
      }

      const result = await Route.updateOne(
        {
          _id: route._id,
          ...ACTIVE_ROUTE_FILTER,
        },
        {
          $set: {
            isDeleted: true,
          },
        }
      );

      if (result.modifiedCount === 0) {
        throw new Error('Route not found');
      }

      // Keep User.selectedRouteId unchanged. Operational services reject this
      // deleted route, while a later restore can reactivate the same selection.
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete route');
    }
  }

  async updateRouteCoordinates(id: string, payload: { lat: number; lon: number }) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Trạm không hợp lệ');
    }

    const lat = Number(payload.lat);
    const lon = Number(payload.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error('Tọa độ không hợp lệ');
    }

    const route = await Route.findOneAndUpdate(
      {
        _id: id,
        ...ACTIVE_ROUTE_FILTER,
      },
      {
        $set: {
          lat,
          lon,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!route) {
      throw new Error('Không tìm thấy trạm');
    }

    return route;
  }
}
