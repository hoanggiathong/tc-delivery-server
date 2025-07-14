/**
 * Mock Auth Service
 * Provides mock implementations for AuthService testing
 */

// Mock Auth Service functions
export const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  createUser: jest.fn(),
  getUserById: jest.fn(),
  getAllUsers: jest.fn(),
  getUsersByRoles: jest.fn(),
};

// Mock Auth Service class
export class MockAuthService {
  register = mockAuthService.register;
  login = mockAuthService.login;
  createUser = mockAuthService.createUser;
  getUserById = mockAuthService.getUserById;
  getAllUsers = mockAuthService.getAllUsers;
  getUsersByRoles = mockAuthService.getUsersByRoles;
}

// Reset function for auth service mocks
export const resetAuthServiceMocks = () => {
  Object.values(mockAuthService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};
