import request from 'supertest';
import app from '@/app';
import { User } from '@/models/user.model';
import { Route } from '@/models/route.model';
import { UserRoute } from '@/models/user-route.model';
import { UserRole } from '@/types/user.type';
import jwt from 'jsonwebtoken';

describe('User Route Integration Tests', () => {
  let managerToken: string;
  let adminToken: string;
  let userToken: string;
  let managerId: string;
  let adminId: string;
  let regularUserId: string;
  let routeId1: string;
  let routeId2: string;

  beforeAll(async () => {

    // Clean up existing data
    await User.deleteMany({});
    await Route.deleteMany({});
    await UserRoute.deleteMany({});

    // Create test users
    const manager = await User.create({
      username: 'manager',
      password: 'Password123',
      role: UserRole.MANAGER
    });
    managerId = manager._id.toString();

    const admin = await User.create({
      username: 'admin',
      password: 'Password123',
      role: UserRole.ADMIN
    });
    adminId = admin._id.toString();

    const regularUser = await User.create({
      username: 'user',
      password: 'Password123',
      role: UserRole.USER
    });
    regularUserId = regularUser._id.toString();

    // Create test routes
    const route1 = await Route.create({
      code: 'T1',
      name: 'TP.HCM'
    });
    routeId1 = route1._id.toString();

    const route2 = await Route.create({
      code: 'T2',
      name: 'Long An'
    });
    routeId2 = route2._id.toString();

    // Generate JWT tokens
    managerToken = jwt.sign(
      { userId: managerId, username: 'manager', role: UserRole.MANAGER },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { userId: adminId, username: 'admin', role: UserRole.ADMIN },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    userToken = jwt.sign(
      { userId: regularUserId, username: 'user', role: UserRole.USER },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Route.deleteMany({});
    await UserRoute.deleteMany({});
  });

  beforeEach(async () => {
    // Clean user routes before each test
    await UserRoute.deleteMany({});
  });

  describe('POST /api/user-route/assign', () => {
    const assignData = {
      userId: '',
      routeId: ''
    };

    beforeEach(() => {
      assignData.userId = regularUserId;
      assignData.routeId = routeId1;
    });

    it('should assign route to user successfully with manager role', async () => {
      const response = await request(app)
        .post('/api/user-route/assign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(assignData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Route assigned to user successfully');
      expect(response.body.data.userRoute).toBeDefined();
      expect(response.body.data.userRoute.userId).toBe(regularUserId);
      expect(response.body.data.userRoute.routeId).toBe(routeId1);
    });

    it('should assign route to user successfully with admin role', async () => {
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
      // First assignment
      await request(app)
        .post('/api/user-route/assign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(assignData)
        .expect(201);

      // Second assignment (should fail)
      const response = await request(app)
        .post('/api/user-route/assign')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(assignData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Route is already assigned to this user');
    });

    it('should return 404 when user not found', async () => {
      const invalidData = {
        userId: '507f1f77bcf86cd799439011',
        routeId: routeId1
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
      const invalidData = {
        userId: regularUserId,
        routeId: '507f1f77bcf86cd799439011'
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
        routeId: 'invalid'
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
      routeIds: ['', '']
    };

    beforeEach(() => {
      assignMultipleData.userId = regularUserId;
      assignMultipleData.routeIds = [routeId1, routeId2];
    });

    it('should assign multiple routes to user successfully', async () => {
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
      // Assign one route first
      await UserRoute.create({
        userId: regularUserId,
        routeId: routeId1,
        assignedBy: managerId
      });

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
    beforeEach(async () => {
      // Create test assignment
      await UserRoute.create({
        userId: regularUserId,
        routeId: routeId1,
        assignedBy: managerId
      });
    });

    it('should get user routes successfully', async () => {
      const response = await request(app)
        .get(`/api/user-route/user/${regularUserId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User route assignments retrieved successfully');
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
    beforeEach(async () => {
      // Create test assignments
      await UserRoute.create({
        userId: regularUserId,
        routeId: routeId1,
        assignedBy: managerId
      });
      await UserRoute.create({
        userId: regularUserId,
        routeId: routeId2,
        assignedBy: managerId
      });
    });

    it('should get routes for user successfully', async () => {
      const response = await request(app)
        .get(`/api/user-route/user/${regularUserId}/routes`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User routes retrieved successfully');
      expect(response.body.data.routes).toHaveLength(2);
      expect(response.body.data.count).toBe(2);
      expect(response.body.data.routes[0]).toHaveProperty('code');
      expect(response.body.data.routes[0]).toHaveProperty('name');
    });
  });

  describe('GET /api/user-route/route/:routeId', () => {
    beforeEach(async () => {
      // Create test assignment
      await UserRoute.create({
        userId: regularUserId,
        routeId: routeId1,
        assignedBy: managerId
      });
    });

    it('should get users for route successfully', async () => {
      const response = await request(app)
        .get(`/api/user-route/route/${routeId1}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Users for route retrieved successfully');
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
    beforeEach(async () => {
      // Create test assignments
      await UserRoute.create({
        userId: regularUserId,
        routeId: routeId1,
        assignedBy: managerId
      });
    });

    it('should get all user routes successfully', async () => {
      const response = await request(app)
        .get('/api/user-route')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('All user route assignments retrieved successfully');
      expect(response.body.data.userRoutes).toHaveLength(1);
      expect(response.body.data.count).toBe(1);
    });
  });

  describe('DELETE /api/user-route/:id', () => {
    let userRouteId: string;

    beforeEach(async () => {
      const userRoute = await UserRoute.create({
        userId: regularUserId,
        routeId: routeId1,
        assignedBy: managerId
      });
      userRouteId = userRoute._id.toString();
    });

    it('should remove route assignment successfully', async () => {
      const response = await request(app)
        .delete(`/api/user-route/${userRouteId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Route assignment removed successfully');

      // Verify deletion
      const userRoute = await UserRoute.findById(userRouteId);
      expect(userRoute).toBeNull();
    });

    it('should reject with user role', async () => {
      const response = await request(app)
        .delete(`/api/user-route/${userRouteId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when user route not found', async () => {
      const response = await request(app)
        .delete('/api/user-route/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User route assignment not found');
    });
  });

  describe('DELETE /api/user-route/remove-multiple', () => {
    beforeEach(async () => {
      // Create test assignments
      await UserRoute.create({
        userId: regularUserId,
        routeId: routeId1,
        assignedBy: managerId
      });
      await UserRoute.create({
        userId: regularUserId,
        routeId: routeId2,
        assignedBy: managerId
      });
    });

    it('should remove multiple route assignments successfully', async () => {
      // Clean up existing assignments and create fresh ones for this test
      await UserRoute.deleteMany({ userId: regularUserId });
      await UserRoute.create({
        userId: regularUserId,
        routeId: routeId1,
        assignedBy: managerId
      });
      await UserRoute.create({
        userId: regularUserId,
        routeId: routeId2,
        assignedBy: managerId
      });

      const removeData = {
        userId: regularUserId,
        routeIds: [routeId1, routeId2]
      };

      const response = await request(app)
        .delete('/api/user-route/remove-multiple')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(removeData);

      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Route assignments removed successfully');

      // Verify deletion
      const userRoutes = await UserRoute.find({ userId: regularUserId });
      expect(userRoutes).toHaveLength(0);
    });

    it('should reject with user role', async () => {
      const removeData = {
        userId: regularUserId,
        routeIds: [routeId1]
      };

      const response = await request(app)
        .delete('/api/user-route/remove-multiple')
        .set('Authorization', `Bearer ${userToken}`)
        .send(removeData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when no assignments found to remove', async () => {
      const removeData = {
        userId: regularUserId,
        routeIds: ['507f1f77bcf86cd799439011']
      };

      const response = await request(app)
        .delete('/api/user-route/remove-multiple')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(removeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No route assignments found to remove');
    });

    it('should validate request body', async () => {
      const invalidData = {
        userId: 'invalid',
        routeIds: ['invalid']
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