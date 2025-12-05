import { Route, IRoute } from '@/models/route.model';
import { IRouteResponse, IRouteLean } from '@/types/route.type';
import { CreateRouteRequest, UpdateRouteRequest } from '@/schemas/route.schema';
import { omitBy, isUndefined } from 'lodash';

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
      distance: route.distance,
      surcharge: route.surcharge,
      surchargeUnit: route.surchargeUnit,
      phone: route.phone,
      createdAt: route.createdAt,
      updatedAt: route.updatedAt,
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
      surcharge: route.surcharge,
      surchargeUnit: route.surchargeUnit,
      phone: route.phone,
      createdAt: route.createdAt,
      updatedAt: route.updatedAt,
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

      const newRoute = new Route({
        code: data.code.toUpperCase(),
        name: data.name,
        address: data.address,
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
      const route = await Route.findById(id).lean();
      if (!route) {
        return null;
      }
      return this.transformRouteLeanToResponse(route as IRouteLean);
    } catch (error) {
      console.error('Error getting route by ID:', error);
      throw new Error('Failed to get route by ID');
    }
  }

  /**
   * Get all routes
   */
  async getAllRoutes(): Promise<IRouteResponse[]> {
    try {
      const routes = await Route.find({}).sort({ createdAt: -1 }).lean();
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
      const route = await Route.findOne({ code: code.toUpperCase() }).lean();
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
      const route = await Route.findById(id);
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
   * Delete route by ID
   */
  async deleteRoute(id: string): Promise<void> {
    try {
      const route = await Route.findById(id);
      if (!route) {
        throw new Error('Route not found');
      }

      await Route.findByIdAndDelete(id);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete route');
    }
  }
}
