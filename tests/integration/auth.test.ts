import request from 'supertest';
import app from '../../src/app';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../src/types/user.type';
import { mockAuthService } from '../mocks/auth.service';

// Mock AuthService
jest.mock('../../src/services/auth.service', () => require('../mocks/auth.service'));

describe('Auth Endpoints', () => {
  let adminToken: string;
  let userToken: string;

  beforeEach(() => {
    jest.clearAllMocks();

    adminToken = jwt.sign(
      { userId: 'admin123', username: 'admin', role: UserRole.ADMIN },
      process.env.JWT_SECRET || 'test-secret'
    );

    userToken = jwt.sign(
      { userId: 'user123', username: 'testuser', role: UserRole.USER },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      username: 'testuser',
      password: 'TestPass123'
    };

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        role: UserRole.USER,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockAuthService.register.mockResolvedValue({ user: mockUser });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user).toEqual(mockUser);
    });

    it('should return 409 when username already exists', async () => {
      mockAuthService.register.mockRejectedValue(
        new Error('Username already exists')
      );

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Username already exists');
    });

    it('should return 400 for other registration errors', async () => {
      mockAuthService.register.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database connection failed');
    });

    it('should return 400 with validation errors for invalid data', async () => {
      const invalidData = {
        username: 'ab', // Too short
        password: '123' // Too short and doesn't meet requirements
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      username: 'testuser',
      password: 'TestPass123'
    };

    it('should login with valid credentials', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        role: UserRole.USER,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const mockToken = 'valid-jwt-token';

      mockAuthService.login.mockResolvedValue({
        user: mockUser,
        token: mockToken
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.token).toBe(mockToken);
      expect(response.body.data.user).toEqual(mockUser);
    });

    it('should return 401 with invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(
        new Error('Invalid credentials')
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for other login errors', async () => {
      mockAuthService.login.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database error');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile successfully', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        role: UserRole.USER,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockAuthService.getUserById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile retrieved successfully');
      expect(response.body.data.user).toEqual(mockUser);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
    });

    it('should return 404 when user not found', async () => {
      mockAuthService.getUserById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 500 when service throws error', async () => {
      mockAuthService.getUserById.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database error');
    });
  });

  describe('GET /api/auth/users', () => {
    it('should get all users when authenticated as admin', async () => {
      const mockUsers = [
        {
          id: 'user1',
          username: 'user1',
          role: UserRole.USER,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'user2',
          username: 'user2',
          role: UserRole.MANAGER,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      mockAuthService.getUsersByRoles.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Users retrieved successfully');
      expect(response.body.data.users).toEqual(mockUsers);
      expect(response.body.data.total).toBe(2);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/users')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
    });

    it('should return 500 when service throws error', async () => {
      mockAuthService.getUsersByRoles.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database connection failed');
    });
  });
});