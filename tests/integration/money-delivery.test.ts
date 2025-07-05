import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app';
import { MoneyDelivery } from '@/models/money-delivery.model';
import { Customer } from '@/models/customer.model';
import { Route } from '@/models/route.model';
import { User } from '@/models/user.model';
import jwt from 'jsonwebtoken';
import { UserRole } from '@/types/user.type';

describe('Money Delivery API Integration Tests', () => {
  let authToken: string;
  let testUser: any;
  let testCustomer1: any;
  let testCustomer2: any;
  let testRoute1: any;
  let testRoute2: any;

  beforeEach(async () => {
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    // Create test user
    testUser = await User.create({
      username: 'testuser',
      password: 'password123',
      role: 'user'
    });

    // Generate auth token
    authToken = jwt.sign({
      userId: testUser._id.toString(),
      username: testUser.username,
      role: testUser.role
    }, process.env.JWT_SECRET || 'test-secret');

    // Create test customers
    testCustomer1 = await Customer.create({
      name: 'John Doe',
      phone: '+84123456789'
    });

    testCustomer2 = await Customer.create({
      name: 'Jane Doe',
      phone: '+84987654321'
    });

    // Create test routes
    testRoute1 = await Route.create({
      code: 'T1',
      name: 'Test Route 1'
    });

    testRoute2 = await Route.create({
      code: 'T2',
      name: 'Test Route 2'
    });
  });

  describe('POST /api/money-deliveries', () => {
    it('should create a new money delivery', async () => {
      const moneyDeliveryData = {
        senderName: 'John Doe',
        senderPhone: '+84123456789',
        receiverName: 'Jane Doe',
        receiverPhone: '+84987654321',
        fromRouteId: testRoute1._id.toString(),
        toRouteId: testRoute2._id.toString(),
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        notes: 'Ghi chú chuyển tiền'
      };

      const response = await request(app)
        .post('/api/money-deliveries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(moneyDeliveryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Money delivery created successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.code).toMatch(/^\d{6}\d{4}$/);
      expect(response.body.data.sendMoneyAmount).toBe(1000000);
      expect(response.body.data.sendCost).toBe(50000);
      expect(response.body.data.sender.name).toBe('John Doe');
      expect(response.body.data.receiver.name).toBe('Jane Doe');
      expect(response.body.data.notes).toBe('Ghi chú chuyển tiền');
    });

    it('should return 401 when not authenticated', async () => {
      const moneyDeliveryData = {
        senderName: 'John Doe',
        senderPhone: '+84123456789',
        receiverName: 'Jane Doe',
        receiverPhone: '+84987654321',
        fromRouteId: testRoute1._id.toString(),
        toRouteId: testRoute2._id.toString(),
        sendMoneyAmount: 1000000,
        sendCost: 50000
      };

      await request(app)
        .post('/api/money-deliveries')
        .send(moneyDeliveryData)
        .expect(401);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        senderName: 'John Doe',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/money-deliveries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 404 for non-existent route', async () => {
      const moneyDeliveryData = {
        senderName: 'John Doe',
        senderPhone: '+84123456789',
        receiverName: 'Jane Doe',
        receiverPhone: '+84987654321',
        fromRouteId: new mongoose.Types.ObjectId().toString(),
        toRouteId: testRoute2._id.toString(),
        sendMoneyAmount: 1000000,
        sendCost: 50000
      };

      const response = await request(app)
        .post('/api/money-deliveries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(moneyDeliveryData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('From route not found');
    });
  });

  describe('GET /api/money-deliveries', () => {
    beforeEach(async () => {
      // Create test money deliveries
      await MoneyDelivery.create([
        {
          code: '2401250001',
          sender: testCustomer1._id,
          receiver: testCustomer2._id,
          fromRoute: testRoute1._id,
          toRoute: testRoute2._id,
          sendMoneyAmount: 1000000,
          sendCost: 50000,
          createdByUser: testUser._id
        },
        {
          code: '2401250002',
          sender: testCustomer2._id,
          receiver: testCustomer1._id,
          fromRoute: testRoute2._id,
          toRoute: testRoute1._id,
          sendMoneyAmount: 2000000,
          sendCost: 60000,
          createdByUser: testUser._id
        }
      ]);
    });

    it('should return all money deliveries', async () => {
      const response = await request(app)
        .get('/api/money-deliveries')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Money deliveries retrieved successfully');
      expect(response.body.data.moneyDeliveries).toHaveLength(2);
      expect(response.body.data.count).toBe(2);

      // Check that both expected codes exist (order doesn't matter)
      const codes = response.body.data.moneyDeliveries.map((md: any) => md.code);
      expect(codes).toContain('2401250001');
      expect(codes).toContain('2401250002');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app)
        .get('/api/money-deliveries')
        .expect(401);
    });
  });

  describe('GET /api/money-deliveries/:id', () => {
    let testMoneyDelivery: any;

    beforeEach(async () => {
      testMoneyDelivery = await MoneyDelivery.create({
        code: '2401250001',
        sender: testCustomer1._id,
        receiver: testCustomer2._id,
        fromRoute: testRoute1._id,
        toRoute: testRoute2._id,
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: testUser._id
      });
    });

    it('should return money delivery by id', async () => {
      const response = await request(app)
        .get(`/api/money-deliveries/${testMoneyDelivery._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Money delivery retrieved successfully');
      expect(response.body.data.id).toBe(testMoneyDelivery._id.toString());
      expect(response.body.data.code).toBe('2401250001');
      expect(response.body.data.sendMoneyAmount).toBe(1000000);
    });

    it('should return 404 for non-existent money delivery', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(`/api/money-deliveries/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Money delivery not found');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app)
        .get(`/api/money-deliveries/${testMoneyDelivery._id}`)
        .expect(401);
    });
  });

  describe('PUT /api/money-deliveries/:id', () => {
    let testMoneyDelivery: any;

    beforeEach(async () => {
      testMoneyDelivery = await MoneyDelivery.create({
        code: '2401250001',
        sender: testCustomer1._id,
        receiver: testCustomer2._id,
        fromRoute: testRoute1._id,
        toRoute: testRoute2._id,
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: testUser._id
      });
    });

    it('should update money delivery', async () => {
      const updateData = {
        sendMoneyAmount: 2000000,
        sendCost: 60000
      };

      const response = await request(app)
        .put(`/api/money-deliveries/${testMoneyDelivery._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Money delivery updated successfully');
      expect(response.body.data.sendMoneyAmount).toBe(2000000);
      expect(response.body.data.sendCost).toBe(60000);
    });

    it('should return 404 for non-existent money delivery', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const updateData = { sendMoneyAmount: 2000000 };

      const response = await request(app)
        .put(`/api/money-deliveries/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Money delivery not found');
    });

    it('should return 401 when not authenticated', async () => {
      const updateData = { sendMoneyAmount: 2000000 };

      await request(app)
        .put(`/api/money-deliveries/${testMoneyDelivery._id}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('DELETE /api/money-deliveries/:id', () => {
    let testMoneyDelivery: any;

    beforeEach(async () => {
      testMoneyDelivery = await MoneyDelivery.create({
        code: '2401250001',
        sender: testCustomer1._id,
        receiver: testCustomer2._id,
        fromRoute: testRoute1._id,
        toRoute: testRoute2._id,
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: testUser._id
      });
    });

    it('should delete money delivery', async () => {
      const response = await request(app)
        .delete(`/api/money-deliveries/${testMoneyDelivery._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Money delivery deleted successfully');

      // Verify it's actually deleted
      const deletedMoneyDelivery = await MoneyDelivery.findById(testMoneyDelivery._id);
      expect(deletedMoneyDelivery).toBeNull();
    });

    it('should return 404 for non-existent money delivery', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .delete(`/api/money-deliveries/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Money delivery not found');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app)
        .delete(`/api/money-deliveries/${testMoneyDelivery._id}`)
        .expect(401);
    });
  });

  describe('POST /api/money-deliveries/next-code', () => {
    it('should return next code for route', async () => {
      const response = await request(app)
        .post('/api/money-deliveries/next-code')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ toRouteId: testRoute2._id.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Next money delivery code generated successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.nextCode).toMatch(/^\d{6}\d{4}$/);
      expect(response.body.data.toRoute.id).toBe(testRoute2._id.toString());
    });

    it('should return 404 for non-existent route', async () => {
      const nonExistentRouteId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post('/api/money-deliveries/next-code')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ toRouteId: nonExistentRouteId })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('To route not found');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app)
        .post('/api/money-deliveries/next-code')
        .send({ toRouteId: testRoute2._id.toString() })
        .expect(401);
    });
  });

  describe('GET /api/money-deliveries/code/:deliveryIdentifier', () => {
    let testMoneyDelivery: any;

    beforeEach(async () => {
      testMoneyDelivery = await MoneyDelivery.create({
        code: '2401250001',
        sender: testCustomer1._id,
        receiver: testCustomer2._id,
        fromRoute: testRoute1._id,
        toRoute: testRoute2._id,
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        createdByUser: testUser._id
      });
    });

    it('should return money delivery by code identifier', async () => {
      const deliveryIdentifier = '2401250001T1T2';

      const response = await request(app)
        .get(`/api/money-deliveries/code/${deliveryIdentifier}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Money delivery retrieved successfully');
      expect(response.body.data.id).toBe(testMoneyDelivery._id.toString());
      expect(response.body.data.code).toBe('2401250001');
    });

    it('should return 404 for non-existent money delivery', async () => {
      const nonExistentIdentifier = '9999999999T1T2';

      const response = await request(app)
        .get(`/api/money-deliveries/code/${nonExistentIdentifier}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Money delivery not found');
    });

    it('should return 400 for invalid identifier format', async () => {
      const invalidIdentifier = 'invalid-format';

      const response = await request(app)
        .get(`/api/money-deliveries/code/${invalidIdentifier}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 401 when not authenticated', async () => {
      const deliveryIdentifier = '2401250001T1T2';

      await request(app)
        .get(`/api/money-deliveries/code/${deliveryIdentifier}`)
        .expect(401);
    });
  });
});