/**
 * Mock User Route Service
 * Provides mock implementations for UserRouteService testing
 */

// Mock User Route Service functions
export const mockUserRouteService = {
  assignRouteToUser: jest.fn(),
  assignMultipleRoutesToUser: jest.fn(),
  removeRouteFromUser: jest.fn(),
  removeMultipleRoutesFromUser: jest.fn(),
  getUserRoutes: jest.fn(),
  getRoutesForUser: jest.fn(),
  getUsersForRoute: jest.fn(),
  getAllUserRoutes: jest.fn(),
  updateUserRoute: jest.fn(),
  getUserRouteById: jest.fn()
};

// Mock User Route Service class
export class MockUserRouteService {
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

// Reset function for user route service mocks
export const resetUserRouteServiceMocks = () => {
  Object.values(mockUserRouteService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};