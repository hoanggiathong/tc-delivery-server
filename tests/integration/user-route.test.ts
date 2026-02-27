import request from 'supertest';
import app from '@/app';
import { UserRouteService } from '@/services/user-route.service';
import { UserRole } from '@/types/user.type';
import jwt from 'jsonwebtoken';
import { RouteType } from '@/types/route.type';
// Mock all models and services
jest.mock('@/models/user.model');
jest.mock('@/models/route.model');
jest.mock('@/models/user-route.model');
jest.mock('@/services/user-route.service');

const MockedUserRouteService = UserRouteService as jest.MockedClass<typeof UserRouteService>;

describe('User Route Integration Tests', () => {
  let managerToken: string;
  let adminToken: string;
  let userToken: string;
  let managerId: string;
  let adminId: string;
  let regularUserId: string;
  let routeId1: string;
  let routeId2: string;

  // Mock data
  const mockUserRoute = {
    id: '507f1f77bcf86cd799439016',
    userId: '507f1f77bcf86cd799439013',
    routeId: '507f1f77bcf86cd799439014',
    assignedBy: '507f1f77bcf86cd799439011',
    user: {
      id: '507f1f77bcf86cd799439013',
      username: 'testuser',
      name: 'Test User',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    route: {
      id: '507f1f77bcf86cd799439014',
      code: 'T1',
      name: 'Test Route',
      createdAt: new Date(),
      updatedAt: new Date(),
      type: RouteType.OWNED,
    },
    assignedByUser: {
      id: '507f1f77bcf86cd799439011',
      username: 'manager',
      name: 'Manager User',
      role: UserRole.MANAGER,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRoutes = [
    {
      id: '507f1f77bcf86cd799439014',
      code: 'T1',
      name: 'TP.HCM',
      createdAt: new Date(),
      updatedAt: new Date(),
      type: RouteType.OWNED,
    },
    {
      id: '507f1f77bcf86cd799439015',
      code: 'T2',
      name: 'Long An',
      createdAt: new Date(),
      updatedAt: new Date(),
      type: RouteType.OWNED,
    },
  ];

  beforeAll(() => {
    // Setup mock IDs (using valid ObjectID format)
    managerId = '507f1f77bcf86cd799439011';
    adminId = '507f1f77bcf86cd799439012';
    regularUserId = '507f1f77bcf86cd799439013';
    routeId1 = '507f1f77bcf86cd799439014';
    routeId2 = '507f1f77bcf86cd799439015';

    // Generate JWT tokens
    managerToken = jwt.sign(
      { userId: managerId, username: 'manager', role: UserRole.MANAGER },
      'test-jwt-secret-key-for-testing-only',
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { userId: adminId, username: 'admin', role: UserRole.ADMIN },
      'test-jwt-secret-key-for-testing-only',
      { expiresIn: '1h' }
    );

    userToken = jwt.sign(
      { userId: regularUserId, username: 'user', role: UserRole.USER },
      'test-jwt-secret-key-for-testing-only',
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/user-route/assign', () => {
    const assignData = {
      userId: '',
      routeId: '',
    };

    beforeEach(() => {
      assignData.userId = regularUserId;
      assignData.routeId = routeId1;
    });

    it('should assign route to user successfully with manager role', async () => {
      MockedUserRouteService.prototype.assignRouteToUser.mockResolvedValue(mockUserRoute);

      const response = await request(app)
        .post('/api/user-route/assign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(assignData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Route assigned to user successfully');
      expect(response.body.data.userRoute).toBeDefined();
      expect(response.body.data.userRoute.id).toBe(mockUserRoute.id);
      expect(response.body.data.userRoute.userId).toBe(mockUserRoute.userId);
      expect(response.body.data.userRoute.routeId).toBe(mockUserRoute.routeId);
    });

    it('should assign route to user successfully with admin role', async () => {
      MockedUserRouteService.prototype.assignRouteToUser.mockResolvedValue(mockUserRoute);

      const response = await request(app)
        .post('/api/user-route/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(assignData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject assignment with user role', async () => {
      const response = await request(app)
        .post('/api/user-route/assign')
        .set('Authorization', `Bearer ${userToken}`)
        .send(assignData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Insufficient permissions');
    });

    it('should reject assignment without authentication', async () => {
      const response = await request(app)
        .post('/api/user-route/assign')
        .send(assignData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 409 when route already assigned', async () => {
      MockedUserRouteService.prototype.assignRouteToUser.mockRejectedValue(
        new Error('Route is already assigned to this user')
      );

      const response = await request(app)
        .post('/api/user-route/assign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(assignData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Route is already assigned to this user');
    });

    it('should return 404 when user not found', async () => {
      MockedUserRouteService.prototype.assignRouteToUser.mockRejectedValue(
        new Error('User not found')
      );

      const invalidData = {
        userId: '507f1f77bcf86cd799439011',
        routeId: routeId1,
      };

      const response = await request(app)
        .post('/api/user-route/assign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(invalidData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 404 when route not found', async () => {
      MockedUserRouteService.prototype.assignRouteToUser.mockRejectedValue(
        new Error('Route not found')
      );

      const invalidData = {
        userId: regularUserId,
        routeId: '507f1f77bcf86cd799439011',
      };

      const response = await request(app)
        .post('/api/user-route/assign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(invalidData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Route not found');
    });

    it('should validate request body', async () => {
      const invalidData = {
        userId: 'invalid',
        routeId: 'invalid',
      };

      const response = await request(app)
        .post('/api/user-route/assign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/user-route/assign-multiple', () => {
    const assignMultipleData = {
      userId: '',
      routeIds: ['', ''],
    };

    beforeEach(() => {
      assignMultipleData.userId = regularUserId;
      assignMultipleData.routeIds = [routeId1, routeId2];
    });

    it('should assign multiple routes to user successfully', async () => {
      const mockUserRoutes = [
        mockUserRoute,
        { ...mockUserRoute, routeId: '507f1f77bcf86cd799439015' },
      ];
      MockedUserRouteService.prototype.assignMultipleRoutesToUser.mockResolvedValue(mockUserRoutes);

      const response = await request(app)
        .post('/api/user-route/assign-multiple')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(assignMultipleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('2 routes assigned to user successfully');
      expect(response.body.data.userRoutes).toHaveLength(2);
      expect(response.body.data.count).toBe(2);
    });

    it('should reject with user role', async () => {
      const response = await request(app)
        .post('/api/user-route/assign-multiple')
        .set('Authorization', `Bearer ${userToken}`)
        .send(assignMultipleData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 409 when some routes already assigned', async () => {
      MockedUserRouteService.prototype.assignMultipleRoutesToUser.mockRejectedValue(
        new Error('Routes already assigned to this user: 507f1f77bcf86cd799439014')
      );

      const response = await request(app)
        .post('/api/user-route/assign-multiple')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(assignMultipleData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Routes already assigned to this user');
    });
  });

  describe('GET /api/user-route/user/:userId', () => {
    it('should get user routes successfully', async () => {
      MockedUserRouteService.prototype.getUserRoutes.mockResolvedValue([mockUserRoute]);

      const response = await request(app)
        .get(`/api/user-route/user/${regularUserId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User route assignments retrieved successfully');
      expect(response.body.data.userRoutes).toBeDefined();
      expect(Array.isArray(response.body.data.userRoutes)).toBe(true);
      expect(response.body.data.userRoutes).toHaveLength(1);
      expect(response.body.data.count).toBe(1);
    });

    it('should reject with user role', async () => {
      const response = await request(app)
        .get(`/api/user-route/user/${regularUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate userId parameter', async () => {
      const response = await request(app)
        .get('/api/user-route/user/invalid')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/user-route/user/:userId/routes', () => {
    it('should get routes for user successfully', async () => {
      MockedUserRouteService.prototype.getRoutesForUser.mockResolvedValue(mockRoutes);

      const response = await request(app)
        .get(`/api/user-route/user/${regularUserId}/routes`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User routes retrieved successfully');
      expect(response.body.data.routes).toBeDefined();
      expect(Array.isArray(response.body.data.routes)).toBe(true);
      expect(response.body.data.routes).toHaveLength(2);
      expect(response.body.data.count).toBe(2);
      expect(response.body.data.routes[0]).toHaveProperty('code');
      expect(response.body.data.routes[0]).toHaveProperty('name');
    });
  });

  describe('GET /api/user-route/route/:routeId', () => {
    it('should get users for route successfully', async () => {
      MockedUserRouteService.prototype.getUsersForRoute.mockResolvedValue([mockUserRoute]);

      const response = await request(app)
        .get(`/api/user-route/route/${routeId1}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Users for route retrieved successfully');
      expect(response.body.data.userRoutes).toBeDefined();
      expect(Array.isArray(response.body.data.userRoutes)).toBe(true);
      expect(response.body.data.userRoutes).toHaveLength(1);
      expect(response.body.data.count).toBe(1);
    });

    it('should validate routeId parameter', async () => {
      const response = await request(app)
        .get('/api/user-route/route/invalid')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/user-route', () => {
    it('should get all user routes successfully', async () => {
      MockedUserRouteService.prototype.getAllUserRoutes.mockResolvedValue([mockUserRoute]);

      const response = await request(app)
        .get('/api/user-route')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('All user route assignments retrieved successfully');
      expect(response.body.data.userRoutes).toBeDefined();
      expect(Array.isArray(response.body.data.userRoutes)).toBe(true);
      expect(response.body.data.userRoutes).toHaveLength(1);
      expect(response.body.data.count).toBe(1);
    });
  });

  describe('DELETE /api/user-route/:id', () => {
    const userRouteId = '507f1f77bcf86cd799439016';

    it('should remove route assignment successfully', async () => {
      MockedUserRouteService.prototype.removeRouteFromUser.mockResolvedValue();

      const response = await request(app)
        .delete(`/api/user-route/${userRouteId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Route assignment removed successfully');
      expect(MockedUserRouteService.prototype.removeRouteFromUser).toHaveBeenCalledWith(
        userRouteId
      );
    });

    it('should reject with user role', async () => {
      const response = await request(app)
        .delete(`/api/user-route/${userRouteId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when user route not found', async () => {
      MockedUserRouteService.prototype.removeRouteFromUser.mockRejectedValue(
        new Error('User route assignment not found')
      );

      const response = await request(app)
        .delete('/api/user-route/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User route assignment not found');
    });
  });

  describe('DELETE /api/user-route/remove-multiple', () => {
    it('should remove multiple route assignments successfully', async () => {
      MockedUserRouteService.prototype.removeMultipleRoutesFromUser.mockResolvedValue();

      const removeData = {
        userId: regularUserId,
        routeIds: [routeId1, routeId2],
      };

      const response = await request(app)
        .delete('/api/user-route/remove-multiple')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(removeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Route assignments removed successfully');
    });

    it('should reject with user role', async () => {
      const removeData = {
        userId: regularUserId,
        routeIds: [routeId1],
      };

      const response = await request(app)
        .delete('/api/user-route/remove-multiple')
        .set('Authorization', `Bearer ${userToken}`)
        .send(removeData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when no assignments found to remove', async () => {
      MockedUserRouteService.prototype.removeMultipleRoutesFromUser.mockRejectedValue(
        new Error('No route assignments found to remove')
      );

      const removeData = {
        userId: regularUserId,
        routeIds: ['507f1f77bcf86cd799439011'],
      };

      const response = await request(app)
        .delete('/api/user-route/remove-multiple')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(removeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('route assignments');
    });

    it('should validate request body', async () => {
      const invalidData = {
        userId: 'invalid',
        routeIds: ['invalid'],
      };

      const response = await request(app)
        .delete('/api/user-route/remove-multiple')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
