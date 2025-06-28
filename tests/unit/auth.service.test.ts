import { AuthService } from '../../src/services/auth.service';
import { User } from '../../src/models/user.model';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../src/types/user.type';

// Mock User model
jest.mock('../../src/models/user.model');
const MockedUser = User as jest.MockedClass<typeof User>;

// Mock jwt
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserInstance: any;

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
      comparePassword: jest.fn()
    };
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        password: 'TestPass123',
        role: UserRole.USER
      };

      // Mock findOne to return null (no existing user)
      MockedUser.findOne = jest.fn().mockResolvedValue(null);

      // Mock constructor and save
      MockedUser.mockImplementation(() => mockUserInstance);
      mockUserInstance.save.mockResolvedValue(mockUserInstance);

      const result = await authService.register(userData);

      expect(MockedUser.findOne).toHaveBeenCalledWith({ username: userData.username });
      expect(MockedUser).toHaveBeenCalledWith(userData);
      expect(mockUserInstance.save).toHaveBeenCalled();
      expect(result.user).toEqual({
        id: 'user123',
        username: 'testuser',
        role: UserRole.USER,
        createdAt: mockUserInstance.createdAt,
        updatedAt: mockUserInstance.updatedAt
      });
    });

    it('should throw error when username already exists', async () => {
      const userData = {
        username: 'testuser',
        password: 'TestPass123',
        role: UserRole.USER
      };

      // Mock findOne to return existing user
      MockedUser.findOne = jest.fn().mockResolvedValue(mockUserInstance);

      await expect(authService.register(userData))
        .rejects.toThrow('Username already exists');

      expect(MockedUser.findOne).toHaveBeenCalledWith({ username: userData.username });
      expect(MockedUser).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        username: 'testuser',
        password: 'TestPass123'
      };

      const mockToken = 'valid-jwt-token';

      // Mock findOne to return user with password
      const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
      MockedUser.findOne = jest.fn().mockReturnValue({ select: mockSelect });

      // Mock password comparison
      mockUserInstance.comparePassword.mockResolvedValue(true);

      // Mock JWT sign
      mockedJwt.sign = jest.fn().mockReturnValue(mockToken);

      const result = await authService.login(loginData);

      expect(MockedUser.findOne).toHaveBeenCalledWith({ username: loginData.username });
      expect(mockSelect).toHaveBeenCalledWith('+password');
      expect(mockUserInstance.comparePassword).toHaveBeenCalledWith(loginData.password);
      expect(mockedJwt.sign).toHaveBeenCalled();
      expect(result.token).toBe(mockToken);
      expect(result.user.username).toBe('testuser');
    });

    it('should throw error when user not found', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'TestPass123'
      };

      // Mock findOne to return null
      const mockSelect = jest.fn().mockResolvedValue(null);
      MockedUser.findOne = jest.fn().mockReturnValue({ select: mockSelect });

      await expect(authService.login(loginData))
        .rejects.toThrow('Invalid credentials');
    });

    it('should throw error when password is invalid', async () => {
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      // Mock findOne to return user
      const mockSelect = jest.fn().mockResolvedValue(mockUserInstance);
      MockedUser.findOne = jest.fn().mockReturnValue({ select: mockSelect });

      // Mock password comparison to return false
      mockUserInstance.comparePassword.mockResolvedValue(false);

      await expect(authService.login(loginData))
        .rejects.toThrow('Invalid credentials');

      expect(mockUserInstance.comparePassword).toHaveBeenCalledWith(loginData.password);
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const userId = 'user123';

      MockedUser.findById = jest.fn().mockResolvedValue(mockUserInstance);

      const result = await authService.getUserById(userId);

      expect(MockedUser.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        id: 'user123',
        username: 'testuser',
        role: UserRole.USER,
        createdAt: mockUserInstance.createdAt,
        updatedAt: mockUserInstance.updatedAt
      });
    });

    it('should return null when user not found', async () => {
      const userId = 'nonexistent';

      MockedUser.findById = jest.fn().mockResolvedValue(null);

      const result = await authService.getUserById(userId);

      expect(MockedUser.findById).toHaveBeenCalledWith(userId);
      expect(result).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [mockUserInstance];
      const mockFind = {
        sort: jest.fn().mockResolvedValue(mockUsers)
      };

      MockedUser.find = jest.fn().mockReturnValue(mockFind);

      const result = await authService.getAllUsers();

      expect(MockedUser.find).toHaveBeenCalledWith({});
      expect(mockFind.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('user123');
    });
  });

  describe('getUsersByRoles', () => {
    it('should return users with specified roles', async () => {
      const roles = [UserRole.USER, UserRole.MANAGER];
      const mockUsers = [mockUserInstance];
      const mockFind = {
        sort: jest.fn().mockResolvedValue(mockUsers)
      };

      MockedUser.find = jest.fn().mockReturnValue(mockFind);

      const result = await authService.getUsersByRoles(roles);

      expect(MockedUser.find).toHaveBeenCalledWith({ role: { $in: roles } });
      expect(mockFind.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toHaveLength(1);
    });
  });
});