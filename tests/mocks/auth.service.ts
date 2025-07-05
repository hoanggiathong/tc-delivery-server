// Import mock from utils
import { mockAuthService } from '../utils/mock-services';

// Export class for Jest mock
export class AuthService {
  register = mockAuthService.register;
  login = mockAuthService.login;
  createUser = mockAuthService.createUser;
  getUserById = mockAuthService.getUserById;
  getAllUsers = mockAuthService.getAllUsers;
  getUsersByRoles = mockAuthService.getUsersByRoles;
}

// Export default for compatibility
export default AuthService;