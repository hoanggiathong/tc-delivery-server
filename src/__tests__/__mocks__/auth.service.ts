export const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  createUser: jest.fn(),
  getUserById: jest.fn(),
  getAllUsers: jest.fn(),
  getUsersByRoles: jest.fn(),
};

export class AuthService {
  register = mockAuthService.register;
  login = mockAuthService.login;
  createUser = mockAuthService.createUser;
  getUserById = mockAuthService.getUserById;
  getAllUsers = mockAuthService.getAllUsers;
  getUsersByRoles = mockAuthService.getUsersByRoles;
}