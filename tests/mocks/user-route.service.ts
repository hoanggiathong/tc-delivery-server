import { IUserRouteResponse, IUserRouteCreateRequest, IAssignMultipleRoutesRequest, IRemoveMultipleRoutesRequest } from '@/types/user-route.type';
import { IRouteResponse } from '@/types/route.type';
import { UserRole } from '@/types/user.type';

export class MockUserRouteService {
  private userRoutes: IUserRouteResponse[] = [];

  async assignRouteToUser(data: IUserRouteCreateRequest, assignedByUserId: string): Promise<IUserRouteResponse> {
    // Check if route already assigned
    const existingAssignment = this.userRoutes.find(
      ur => ur.userId === data.userId && ur.routeId === data.routeId
    );

    if (existingAssignment) {
      throw new Error('Route is already assigned to this user');
    }

    const userRoute: IUserRouteResponse = {
      id: `ur_${Date.now()}`,
      userId: data.userId,
      routeId: data.routeId,
      assignedBy: assignedByUserId,
      user: {
        id: data.userId,
        username: 'testuser',
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      route: {
        id: data.routeId,
        code: 'T1',
        name: 'TP.HCM',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      assignedByUser: {
        id: assignedByUserId,
        username: 'manager',
        role: UserRole.MANAGER,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.userRoutes.push(userRoute);
    return userRoute;
  }

  async assignMultipleRoutesToUser(data: IAssignMultipleRoutesRequest, assignedByUserId: string): Promise<IUserRouteResponse[]> {
    const results: IUserRouteResponse[] = [];

    for (const routeId of data.routeIds) {
      const assignData: IUserRouteCreateRequest = {
        userId: data.userId,
        routeId: routeId
      };

      const userRoute = await this.assignRouteToUser(assignData, assignedByUserId);
      results.push(userRoute);
    }

    return results;
  }

  async removeRouteFromUser(userRouteId: string): Promise<void> {
    const index = this.userRoutes.findIndex(ur => ur.id === userRouteId);
    if (index === -1) {
      throw new Error('User route assignment not found');
    }
    this.userRoutes.splice(index, 1);
  }

  async removeMultipleRoutesFromUser(data: IRemoveMultipleRoutesRequest): Promise<void> {
    const initialLength = this.userRoutes.length;

    this.userRoutes = this.userRoutes.filter(
      ur => !(ur.userId === data.userId && data.routeIds.includes(ur.routeId))
    );

    if (this.userRoutes.length === initialLength) {
      throw new Error('No route assignments found to remove');
    }
  }

  async getUserRoutes(userId: string): Promise<IUserRouteResponse[]> {
    return this.userRoutes.filter(ur => ur.userId === userId);
  }

  async getRoutesForUser(userId: string): Promise<IRouteResponse[]> {
    const userRoutes = this.userRoutes.filter(ur => ur.userId === userId);
    return userRoutes.map(ur => ur.route!);
  }

  async getUsersForRoute(routeId: string): Promise<IUserRouteResponse[]> {
    return this.userRoutes.filter(ur => ur.routeId === routeId);
  }

  async getAllUserRoutes(): Promise<IUserRouteResponse[]> {
    return this.userRoutes;
  }

  // Helper methods for testing
  clear(): void {
    this.userRoutes = [];
  }

  getCount(): number {
    return this.userRoutes.length;
  }

  findByUserAndRoute(userId: string, routeId: string): IUserRouteResponse | undefined {
    return this.userRoutes.find(ur => ur.userId === userId && ur.routeId === routeId);
  }
}