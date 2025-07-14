import request from "supertest";
import app from "../../src/app";
import { MoneyDelivery } from "@/models/money-delivery.model";
import { Customer } from "@/models/customer.model";
import { Route } from "@/models/route.model";
import { User } from "@/models/user.model";
import jwt from "jsonwebtoken";
import { UserRole } from "@/types/user.type";
import { MoneyDeliveryService } from "../../src/services/money-delivery.service";
import {
  createMockMoneyDelivery,
  createMockFrequentCustomersResult
} from "../mocks";

// Mock MoneyDeliveryService at module level
jest.mock("@/services/money-delivery.service");

const MockedMoneyDeliveryService = MoneyDeliveryService as jest.MockedClass<typeof MoneyDeliveryService>;

// Mock all models
jest.mock("@/models/money-delivery.model");
jest.mock("@/models/customer.model");
jest.mock("@/models/route.model");
jest.mock("@/models/user.model");

const MockedMoneyDelivery = MoneyDelivery as jest.MockedClass<
  typeof MoneyDelivery
>;
const MockedCustomer = Customer as jest.MockedClass<typeof Customer>;
const MockedRoute = Route as jest.MockedClass<typeof Route>;
const MockedUser = User as jest.MockedClass<typeof User>;

describe("Money Delivery API Integration Tests", () => {
  let authToken: string;
  let testUser: any;
  let testCustomer1: any;
  let testCustomer2: any;
  let testRoute1: any;
  let testRoute2: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock test user
    testUser = {
      _id: "user123",
      username: "testuser",
      password: "password123",
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock test customers
    testCustomer1 = {
      _id: "customer123",
      name: "John Doe",
        createdAt: new Date(),
        updatedAt: new Date(),
      phone: "+84123456789",
    };

    testCustomer2 = {
      _id: "customer456",
      name: "Jane Doe",
        createdAt: new Date(),
        updatedAt: new Date(),
      phone: "+84987654321",
    };

    // Mock test routes
    testRoute1 = {
      _id: "route123",
      code: "T1",
      name: "Test Route 1",
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    testRoute2 = {
      _id: "route456",
      code: "T2",
      name: "Test Route 2",
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser._id, role: testUser.role },
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" }
    );

    // Mock model static methods
    (MockedUser.findById as jest.Mock).mockResolvedValue(testUser);
    (MockedCustomer.findById as jest.Mock).mockResolvedValue(testCustomer1);
    (MockedRoute.findById as jest.Mock).mockResolvedValue(testRoute1);

    // Set up default mock responses for happy path scenarios
    MockedMoneyDeliveryService.prototype.createMoneyDelivery.mockResolvedValue({
      id: "moneyDelivery123",
      code: "2401250001",
      sender: {
        id: "customer123",
        name: "John Doe",
        phone: "+84123456789",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      receiver: {
        id: "customer456",
        name: "Jane Doe",
        phone: "+84987654321",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      fromRoute: {
        id: "route123",
        code: "T1",
        name: "Test Route 1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      toRoute: {
        id: "route456",
        code: "T2",
        name: "Test Route 2",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      sendMoneyAmount: 1000000,
      sendCost: 50000,
      totalCost: 50000,
      notes: "Ghi chú chuyển tiền",
      createdByUser: "user123",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    MockedMoneyDeliveryService.prototype.getAllMoneyDeliveries.mockResolvedValue([
      {
        id: "moneyDelivery123",
        code: "2401250001",
        sender: {
          id: "customer123",
          name: "John Doe",
          phone: "+84123456789",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        receiver: {
          id: "customer456",
          name: "Jane Doe",
          phone: "+84987654321",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        fromRoute: {
          id: "route123",
          code: "T1",
          name: "Test Route 1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        toRoute: {
          id: "route456",
          code: "T2",
          name: "Test Route 2",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        totalCost: 50000,
        createdByUser: "user123",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "moneyDelivery456",
        code: "2401250002",
        sender: {
          id: "customer456",
          name: "Jane Doe",
          phone: "+84987654321",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        receiver: {
          id: "customer123",
          name: "John Doe",
          phone: "+84123456789",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        fromRoute: {
          id: "route456",
          code: "T2",
          name: "Test Route 2",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        toRoute: {
          id: "route123",
          code: "T1",
          name: "Test Route 1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        sendMoneyAmount: 2000000,
        sendCost: 75000,
        totalCost: 75000,
        createdByUser: "user123",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    MockedMoneyDeliveryService.prototype.getMoneyDeliveryById.mockResolvedValue({
      id: "moneyDelivery123",
      code: "2401250001",
      sender: {
        id: "customer123",
        name: "John Doe",
        phone: "+84123456789",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      receiver: {
        id: "customer456",
        name: "Jane Doe",
        phone: "+84987654321",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      fromRoute: {
        id: "route123",
        code: "T1",
        name: "Test Route 1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      toRoute: {
        id: "route456",
        code: "T2",
        name: "Test Route 2",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      sendMoneyAmount: 1000000,
      sendCost: 50000,
      totalCost: 50000,
      createdByUser: "user123",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    MockedMoneyDeliveryService.prototype.getFrequentCustomers.mockResolvedValue({
      senderIdentifier: "John Doe",
      senderInfo: {
        name: "John Doe",
        phone: "+84123456789"
      },
      frequentCustomers: [
        {
          receiverName: "Jane Doe",
          receiverPhone: "+84987654321",
          toRoute: {
            id: "route456",
            code: "T2",
            name: "Test Route 2",
          },
          deliveryCount: 5,
          totalSendMoneyAmount: 5000000,
          totalSendCost: 250000,
          totalCost: 5250000,
          lastDeliveryDate: new Date("2024-01-25"),
          firstDeliveryDate: new Date("2024-01-20"),
        },
      ],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalRecords: 1,
        limit: 10,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
  });

  // In each test that expects a different result, override the mock at the start of the test
  // For example:
  // MockedMoneyDeliveryService.prototype.getMoneyDeliveryById = jest.fn().mockResolvedValue(null);
  // MockedMoneyDeliveryService.prototype.getFrequentCustomers = jest.fn().mockRejectedValue(new Error("Database error"));

  describe("POST /api/money-deliveries", () => {
    it("should create a new money delivery", async () => {
      // Use valid ObjectId-like strings for route IDs
      const moneyDeliveryData = {
        senderName: "John Doe",
        senderPhone: "+84123456789",
        receiverName: "Jane Doe",
        receiverPhone: "+84987654321",
        fromRouteId: "507f1f77bcf86cd799439011",
        toRouteId: "507f1f77bcf86cd799439012",
        sendMoneyAmount: 1000000,
        sendCost: 50000,
        notes: "Ghi chú chuyển tiền",
      };

      const response = await request(app)
        .post("/api/money-deliveries")
        .set("Authorization", `Bearer ${authToken}`)
        .send(moneyDeliveryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Money delivery created successfully");
      expect(response.body.data).toBeDefined();
      expect(response.body.data.code).toMatch(/^[0-9]{10}$/);
      expect(response.body.data.sendMoneyAmount).toBe(1000000);
      expect(response.body.data.sendCost).toBe(50000);
      expect(response.body.data.sender.name).toBe("John Doe");
      expect(response.body.data.receiver.name).toBe("Jane Doe");
      expect(response.body.data.notes).toBe("Ghi chú chuyển tiền");
    });

    it("should return 401 when not authenticated", async () => {
      const moneyDeliveryData = {
        senderName: "John Doe",
        senderPhone: "+84123456789",
        receiverName: "Jane Doe",
        receiverPhone: "+84987654321",
        fromRouteId: testRoute1._id,
        toRouteId: testRoute2._id,
        sendMoneyAmount: 1000000,
        sendCost: 50000,
      };

      await request(app)
        .post("/api/money-deliveries")
        .send(moneyDeliveryData)
        .expect(401);
    });

    it("should return 400 for invalid data", async () => {
      const invalidData = {
        senderName: "John Doe",
        // Missing required fields
      };

      const response = await request(app)
        .post("/api/money-deliveries")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Validation failed");
    });

    it("should return 404 for non-existent route", async () => {
      const moneyDeliveryData = {
        senderName: "John Doe",
        senderPhone: "+84123456789",
        receiverName: "Jane Doe",
        receiverPhone: "+84987654321",
        fromRouteId: "507f1f77bcf86cd799439099",
        toRouteId: "507f1f77bcf86cd799439012",
        sendMoneyAmount: 1000000,
        sendCost: 50000,
      };

      // Mock service to throw error for non-existent route with 'not found' in message
      MockedMoneyDeliveryService.prototype.createMoneyDelivery.mockRejectedValue(new Error("From route not found"));

      const response = await request(app)
        .post("/api/money-deliveries")
        .set("Authorization", `Bearer ${authToken}`)
        .send(moneyDeliveryData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("From route not found");
    });
  });

  describe("GET /api/money-deliveries", () => {
    it("should return all money deliveries", async () => {
      const response = await request(app)
        .get("/api/money-deliveries")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "Money deliveries retrieved successfully"
      );
      expect(response.body.data.moneyDeliveries).toHaveLength(2);
      expect(response.body.data.count).toBe(2);

      // Check that both expected codes exist (order doesn't matter)
      const codes = response.body.data.moneyDeliveries.map(
        (md: any) => md.code
      );
      expect(codes).toContain("2401250001");
      expect(codes).toContain("2401250002");
    });

    it("should return 401 when not authenticated", async () => {
      await request(app).get("/api/money-deliveries").expect(401);
    });
  });

  describe("GET /api/money-deliveries/:id", () => {
    it("should return a specific money delivery", async () => {
      const response = await request(app)
        .get("/api/money-deliveries/moneyDelivery123")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "Money delivery retrieved successfully"
      );
      expect(response.body.data.code).toBe("2401250001");
      expect(response.body.data.sendMoneyAmount).toBe(1000000);
      expect(response.body.data.sender.name).toBe("John Doe");
      expect(response.body.data.receiver.name).toBe("Jane Doe");
    });

    it("should return 404 for non-existent money delivery", async () => {
      // Mock service to return null for non-existent ID
      MockedMoneyDeliveryService.prototype.getMoneyDeliveryById.mockResolvedValue(null);

      const response = await request(app)
        .get("/api/money-deliveries/nonexistent")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Money delivery not found");
    });

    it("should return 401 when not authenticated", async () => {
      await request(app)
        .get("/api/money-deliveries/moneyDelivery123")
        .expect(401);
    });
  });

  describe("GET /api/money-deliveries/frequent-customers/:senderIdentifier", () => {
    it("should get frequent customers successfully", async () => {
      // Update mock to return ISO date strings
      const mockFrequentCustomersResult = {
        senderIdentifier: "John Doe",
        senderInfo: {
          name: "John Doe",
          phone: "+84123456789"
        },
        frequentCustomers: [
          {
            receiverName: "Jane Doe",
            receiverPhone: "+84987654321",
            toRoute: {
              id: "route456",
              code: "T2",
              name: "Test Route 2",
            },
            deliveryCount: 5,
            totalSendMoneyAmount: 5000000,
            totalSendCost: 250000,
            totalCost: 250000,
            lastDeliveryDate: new Date("2024-01-25"),
            firstDeliveryDate: new Date("2024-01-20"),
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalRecords: 1,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      MockedMoneyDeliveryService.prototype.getFrequentCustomers.mockResolvedValue(mockFrequentCustomersResult);

      const response = await request(app)
        .get("/api/money-deliveries/frequent-customers/John%20Doe")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "Frequent money customers retrieved successfully"
      );
      expect(response.body.data).toEqualWithDateStrings(mockFrequentCustomersResult);
      expect(
        MockedMoneyDeliveryService.prototype.getFrequentCustomers
      ).toHaveBeenCalledWith("John Doe", 1, 10);
    });

    it("should handle unauthorized request", async () => {
      const response = await request(app)
        .get("/api/money-deliveries/frequent-customers/John%20Doe")
        .query({ page: 1, limit: 10 })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Access token is required");
    });

    it("should handle missing sender identifier", async () => {
      // Mock service to return null or throw for missing sender
      MockedMoneyDeliveryService.prototype.getFrequentCustomers.mockRejectedValue(new Error("Sender not found"));

      await request(app)
        .get("/api/money-deliveries/frequent-customers/nonexistent-sender")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(404);
    });

    it("should handle service error", async () => {
      MockedMoneyDeliveryService.prototype.getFrequentCustomers.mockRejectedValue(new Error("Database error"));

      const response = await request(app)
        .get("/api/money-deliveries/frequent-customers/John%20Doe")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Database error");
    });

    it("should use default pagination values", async () => {
      const mockFrequentCustomersResult = {
        senderIdentifier: "John Doe",
        senderInfo: null,
        frequentCustomers: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalRecords: 0,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };

      MockedMoneyDeliveryService.prototype.getFrequentCustomers.mockResolvedValue(mockFrequentCustomersResult);

      const response = await request(app)
        .get("/api/money-deliveries/frequent-customers/John%20Doe")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(
        MockedMoneyDeliveryService.prototype.getFrequentCustomers
      ).toHaveBeenCalledWith("John Doe", 1, 10);
    });

    it("should handle custom pagination values", async () => {
      const mockFrequentCustomersResult = {
        senderIdentifier: "John Doe",
        senderInfo: null,
        frequentCustomers: [],
        pagination: {
          currentPage: 2,
          totalPages: 3,
          totalRecords: 15,
          limit: 5,
          hasNextPage: true,
          hasPrevPage: true,
        },
      };

      MockedMoneyDeliveryService.prototype.getFrequentCustomers.mockResolvedValue(mockFrequentCustomersResult);

      const response = await request(app)
        .get("/api/money-deliveries/frequent-customers/John%20Doe")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ page: 2, limit: 5 })
        .expect(200);

      expect(
        MockedMoneyDeliveryService.prototype.getFrequentCustomers
      ).toHaveBeenCalledWith("John Doe", 2, 5);
    });
  });
});
