// Import mock from utils
import { mockUserRouteService } from '../utils/mock-services';

// Export class for Jest mock
export class UserRouteService {
  assignRouteToUser = mockUserRouteService.assignRouteToUser;
  assignMultipleRoutesToUser = mockUserRouteService.assignMultipleRoutesToUser;
  removeRouteFromUser = mockUserRouteService.removeRouteFromUser;
  removeMultipleRoutesFromUser = mockUserRouteService.removeMultipleRoutesFromUser;
  getUserRoutes = mockUserRouteService.getUserRoutes;
  getRoutesForUser = mockUserRouteService.getRoutesForUser;
  getUsersForRoute = mockUserRouteService.getUsersForRoute;
  getAllUserRoutes = mockUserRouteService.getAllUserRoutes;
  updateUserRoute = mockUserRouteService.updateUserRoute;
  getUserRouteById = mockUserRouteService.getUserRouteById;
}

// Export default for compatibility
export default UserRouteService;