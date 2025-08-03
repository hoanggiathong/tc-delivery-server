import { User } from '@/models/user.model';
import { UserRoute } from '@/models/user-route.model';
import jwt from 'jsonwebtoken';
import { UserRole } from '@/types/user.type';

// Mock User model
jest.mock('@/models/user.model');
jest.mock('@/models/user-route.model');
const MockedUser = User as jest.MockedClass<typeof User>;
const MockedUserRoute = UserRoute as jest.MockedClass<typeof UserRoute>;

// Mock jwt
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let AuthService: any;
  let authService: any;
  let mockUserInstance: any;

  beforeAll(async () => {
    // Import AuthService after mocks are set up
    const authServiceModule = await import('@/services/auth.service');
    AuthService = authServiceModule.AuthService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();

    // Mock user instance
    mockUserInstance = {
      _id: 'user123',
      username: 'testuser',
      password: 'hashedPassword',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn(),
      comparePassword: jest.fn(),
    };

    // Set up default User model mocks using jest.fn()
    (MockedUser.findOne as any) = jest.fn();
    (MockedUser.findById as any) = jest.fn();
    (MockedUser.findByIdAndUpdate as any) = jest.fn();
    (MockedUser.find as any) = jest.fn();
    MockedUser.mockImplementation(() => mockUserInstance);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        password: 'TestPass123',
        role: UserRole.USER,
      };

      // Mock findOne to return null (no existing user)
      (MockedUser.findOne as any).mockResolvedValue(null);

      // Update mockUserInstance with userData values
      mockUserInstance.username = userData.username;
      mockUserInstance.role = userData.role;

      // Mock save
      mockUserInstance.save.mockResolvedValue(mockUserInstance);

      const result = await authService.register(userData);

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        username: userData.username,
      });
      expect(MockedUser).toHaveBeenCalledWith(userData);
      expect(mockUserInstance.save).toHaveBeenCalled();
      expect(result.user).toEqual({
        id: 'user123',
        username: userData.username,
        role: userData.role,
        createdAt: mockUserInstance.createdAt,
        updatedAt: mockUserInstance.updatedAt,
      });
    });

    it('should throw error when username already exists', async () => {
      const userData = {
        username: 'testuser',
        password: 'TestPass123',
        role: UserRole.USER,
      };

      // Mock findOne to return existing user
      (MockedUser.findOne as any).mockResolvedValue(mockUserInstance);

      await expect(authService.register(userData)).rejects.toThrow('Username already exists');

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        username: userData.username,
      });
      expect(MockedUser).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        username: 'testuser',
        password: 'TestPass123',
      };

      const mockToken = 'valid-jwt-token';

      // Mock findOne to return user with password
      const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
      (MockedUser.findOne as any).mockReturnValue({ select: mockSelect });

      // Mock password comparison
      mockUserInstance.comparePassword.mockResolvedValue(true);

      // Mock UserRoute.findOne (no routes found, so no auto-assignment)
      const mockUserRouteSelect = jest.fn().mockResolvedValue(null);
      (MockedUserRoute.findOne as any).mockReturnValue({ 
        select: jest.fn().mockReturnValue({
          lean: mockUserRouteSelect
        })
      });

      // Mock JWT sign
      mockedJwt.sign = jest.fn().mockReturnValue(mockToken);

      const result = await authService.login(loginData);

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        username: loginData.username,
      });
      expect(mockSelect).toHaveBeenCalledWith('+password');
      expect(mockUserInstance.comparePassword).toHaveBeenCalledWith(loginData.password);
      expect(mockedJwt.sign).toHaveBeenCalled();
      expect(result.token).toBe(mockToken);
      expect(result.user.username).toBe('testuser');
    });

    it('should throw error when user not found', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'TestPass123',
      };

      // Mock findOne to return null
      const mockSelect = jest.fn().mockResolvedValue(null);
      (MockedUser.findOne as any).mockReturnValue({ select: mockSelect });

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error when password is invalid', async () => {
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      // Mock findOne to return user
      const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
      (MockedUser.findOne as any).mockReturnValue({ select: mockSelect });

      // Mock password comparison to return false
      mockUserInstance.comparePassword.mockResolvedValue(false);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');

      expect(mockUserInstance.comparePassword).toHaveBeenCalledWith(loginData.password);
    });

    it('should auto-assign selectedRouteId when user has no selected route', async () => {
      const loginData = {
        username: 'testuser',
        password: 'TestPass123',
      };

      // Create mock user without selectedRouteId
      const mockUserWithoutRoute = {
        ...mockUserInstance,
        selectedRouteId: null,
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      const mockToken = 'valid-jwt-token';

      // Mock findOne to return user without selectedRouteId
      const mockSelect = jest.fn().mockResolvedValue(mockUserWithoutRoute);
      (MockedUser.findOne as any).mockReturnValue({ select: mockSelect });

      // Mock UserRoute.findOne to return a route
      const mockUserRouteSelect = jest.fn().mockResolvedValue({ routeId: 'route123' });
      (MockedUserRoute.findOne as any).mockReturnValue({ 
        select: jest.fn().mockReturnValue({
          lean: mockUserRouteSelect
        })
      });

      // Mock User.findByIdAndUpdate for auto-assignment
      (MockedUser.findByIdAndUpdate as any).mockResolvedValue(mockUserWithoutRoute);

      // Mock JWT sign
      mockedJwt.sign = jest.fn().mockReturnValue(mockToken);

      const result = await authService.login(loginData);

      // Verify that UserRoute.findOne was called to find routes for user
      expect(MockedUserRoute.findOne).toHaveBeenCalledWith({ userId: mockUserWithoutRoute._id });
      
      // Verify that User.findByIdAndUpdate was called to set selectedRouteId
      expect(MockedUser.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserWithoutRoute._id, 
        { selectedRouteId: 'route123' }
      );

      expect(result.token).toBe(mockToken);
      expect(result.user.username).toBe('testuser');
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const userId = 'user123';

      // Mock findById to return a chainable object with all required methods
      (MockedUser.findById as any).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUserInstance),
        }),
      });

      const result = await authService.getUserById(userId);

      expect(MockedUser.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        id: 'user123',
        username: 'testuser',
        role: UserRole.USER,
        createdAt: mockUserInstance.createdAt,
        updatedAt: mockUserInstance.updatedAt,
      });
    });

    it('should return null when user not found', async () => {
      const userId = 'nonexistent';

      // Mock findById to return a chainable object with all required methods
      (MockedUser.findById as any).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await authService.getUserById(userId);

      expect(MockedUser.findById).toHaveBeenCalledWith(userId);
      expect(result).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [
        {
          _id: 'user1',
          username: 'user1',
          role: UserRole.USER,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: 'user2',
          username: 'user2',
          role: UserRole.ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock find to return a chainable object with all required methods
      (MockedUser.find as any).mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockUsers),
          }),
        }),
      });

      const result = await authService.getAllUsers();

      expect(MockedUser.find).toHaveBeenCalledWith({});
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('user1');
      expect(result[1].id).toBe('user2');
    });
  });

  describe('getUsersByRoles', () => {
    it('should return users with specified roles', async () => {
      const roles = [UserRole.ADMIN];
      const mockUsers = [
        {
          _id: 'admin1',
          username: 'admin1',
          role: UserRole.ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock find to return a chainable object with all required methods
      (MockedUser.find as any).mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockUsers),
          }),
        }),
      });

      const result = await authService.getUsersByRoles(roles);

      expect(MockedUser.find).toHaveBeenCalledWith({ role: { $in: roles } });
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe(UserRole.ADMIN);
    });
  });

  describe('updateSelectedRoute', () => {
    it('should update selected route successfully', async () => {
      const userId = 'user123';
      const updateData = { selectedRouteId: 'route456' };
      const updatedUser = {
        ...mockUserInstance,
        selectedRouteId: 'route456',
      };

      // Mock findByIdAndUpdate to return a chainable object with select method
      (MockedUser.findByIdAndUpdate as any).mockReturnValue({
        select: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await authService.updateSelectedRoute(userId, updateData);

      expect(MockedUser.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        { selectedRouteId: updateData.selectedRouteId },
        { new: true }
      );
      expect(result.user).toEqual({
        id: 'user123',
        username: 'testuser',
        role: UserRole.USER,
        selectedRouteId: 'route456',
        createdAt: mockUserInstance.createdAt,
        updatedAt: mockUserInstance.updatedAt,
      });
    });

    it('should throw error when user not found', async () => {
      const userId = 'nonexistent';
      const updateData = { selectedRouteId: 'route456' };

      // Mock findByIdAndUpdate to return null
      (MockedUser.findByIdAndUpdate as any).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(authService.updateSelectedRoute(userId, updateData)).rejects.toThrow(
        'User not found'
      );

      expect(MockedUser.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        { selectedRouteId: updateData.selectedRouteId },
        { new: true }
      );
    });

    it('should clear selected route when selectedRouteId is null', async () => {
      const userId = 'user123';
      const updateData = { selectedRouteId: null };
      const updatedUser = {
        ...mockUserInstance,
        selectedRouteId: null,
      };

      // Mock findByIdAndUpdate to return a chainable object with select method
      (MockedUser.findByIdAndUpdate as any).mockReturnValue({
        select: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await authService.updateSelectedRoute(userId, updateData);

      expect(MockedUser.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        { selectedRouteId: null },
        { new: true }
      );
      expect(result.user.selectedRouteId).toBeNull();
    });

    it('should handle undefined selectedRouteId', async () => {
      const userId = 'user123';
      const updateData = { selectedRouteId: undefined };
      const updatedUser = {
        ...mockUserInstance,
        selectedRouteId: undefined,
      };

      // Mock findByIdAndUpdate to return a chainable object with select method
      (MockedUser.findByIdAndUpdate as any).mockReturnValue({
        select: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await authService.updateSelectedRoute(userId, updateData);

      expect(MockedUser.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        { selectedRouteId: undefined },
        { new: true }
      );
      expect(result.user.selectedRouteId).toBeUndefined();
    });
  });
});
