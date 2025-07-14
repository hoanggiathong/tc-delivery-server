/**
 * Mock Route Service
 * Provides mock implementations for RouteService testing
 */

// Mock Route Service functions
export const mockRouteService = {
  createRoute: jest.fn(),
  updateRoute: jest.fn(),
  getRouteById: jest.fn(),
  getAllRoutes: jest.fn(),
  deleteRoute: jest.fn(),
  getRouteByCode: jest.fn(),
};

// Mock Route Service class
export class MockRouteService {
  createRoute = mockRouteService.createRoute;
  updateRoute = mockRouteService.updateRoute;
  getRouteById = mockRouteService.getRouteById;
  getAllRoutes = mockRouteService.getAllRoutes;
  deleteRoute = mockRouteService.deleteRoute;
  getRouteByCode = mockRouteService.getRouteByCode;
}

// Reset function for route service mocks
export const resetRouteServiceMocks = () => {
  Object.values(mockRouteService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};
