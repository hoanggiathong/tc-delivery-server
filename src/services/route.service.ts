import { Route, IRoute } from '@/models/route.model';
import { IRouteResponse, IRouteLean } from '@/types/route.type';
import { CreateRouteRequest, UpdateRouteRequest } from '@/schemas/route.schema';

export class RouteService {
  /**
   * Transform IRoute to IRouteResponse
   */
  private transformRouteToResponse(route: IRoute): IRouteResponse {
    return {
      id: route._id.toString(),
      code: route.code,
      name: route.name,
      createdAt: route.createdAt,
      updatedAt: route.updatedAt
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
      createdAt: route.createdAt,
      updatedAt: route.updatedAt
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
        name: data.name
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
   * Update route by ID
   */
  async updateRoute(id: string, data: UpdateRouteRequest): Promise<IRouteResponse> {
    try {
      const route = await Route.findById(id);
      if (!route) {
        throw new Error('Route not found');
      }

      // Check if updating will create a duplicate code
      if (data.code) {
        const existingRoute = await Route.findOne({
          _id: { $ne: id },
          code: data.code.toUpperCase()
        });

        if (existingRoute) {
          throw new Error('Route with this code already exists');
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (data.code) updateData.code = data.code.toUpperCase();
      if (data.name) updateData.name = data.name;

      const updatedRoute = await Route.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedRoute) {
        throw new Error('Failed to update route');
      }

      return this.transformRouteToResponse(updatedRoute);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update route');
    }
  }

  /**
   * Get route by ID
   */
  async getRouteById(id: string): Promise<IRouteResponse | null> {
    try {
      const route = await Route.findById(id).lean();
      if (!route) return null;

      return this.transformRouteLeanToResponse(route as IRouteLean);
    } catch (error) {
      console.error('Error getting route by ID:', error);
      return null;
    }
  }

  /**
   * Get all routes
   */
  async getAllRoutes(): Promise<IRouteResponse[]> {
    try {
      const routes = await Route.find({}).sort({ code: 1 }).lean();
      return routes.map(route => this.transformRouteLeanToResponse(route as IRouteLean));
    } catch (error) {
      console.error('Error getting all routes:', error);
      throw new Error('Failed to fetch routes');
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

  /**
   * Get route by code
   */
  async getRouteByCode(code: string): Promise<IRouteResponse | null> {
    try {
      const route = await Route.findOne({ code: code.toUpperCase() }).lean();
      if (!route) return null;

      return this.transformRouteLeanToResponse(route as IRouteLean);
    } catch (error) {
      console.error('Error getting route by code:', error);
      return null;
    }
  }
}