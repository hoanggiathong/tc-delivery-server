import { DeliveryService } from "@/services/delivery.service";
import { Delivery } from "@/models/delivery.model";
import { Route } from "@/models/route.model";
import { CodeGeneratorService } from "@/services/code-generator.service";
import { IDeliveryResponse } from "@/types/delivery.type";
import { CustomerService } from "@/services/customer.service";

// Mock the Delivery and Route models
jest.mock("@/models/delivery.model");
jest.mock("@/models/route.model");
jest.mock("@/services/customer.service");

const MockedCustomerService = CustomerService as jest.MockedClass<typeof CustomerService>;
jest.mock("@/services/code-generator.service", () => ({
  CodeGeneratorService: {
    generateNextCode: jest.fn(),
    getNextCodePreview: jest.fn(),
    validateCodeFormat: jest.fn(),
  }
}));

const MockedDelivery = Delivery as jest.MockedClass<typeof Delivery>;
const MockedRoute = Route as jest.MockedClass<typeof Route>;
const MockedCodeGeneratorService = CodeGeneratorService as jest.Mocked<typeof CodeGeneratorService>;

describe("DeliveryService", () => {
  let deliveryService: DeliveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    deliveryService = new DeliveryService();
  });

  describe("createDelivery", () => {
    const mockDeliveryData = {
      senderName: "John Sender",
      senderPhone: "+1234567890",
      receiverName: "Jane Receiver",
      receiverPhone: "+1987654321",
      fromRouteId: "fromRoute123",
      toRouteId: "toRoute123",
      name: "Package Item",
      cost: 100,
      homeDelivery: "123 Main St",
      homeDeliveryCost: 20,
      itemValue: 500,
      itemCost: 50,
      collectCost: 30,
      collectForCustomer: 25000,
      collectForCustomerCost: 40,
      collectForCustomerNote: "Test note",
    };

    const mockSender = {
      id: "sender123",
      name: "John Sender",
      phone: "+1234567890",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    const mockReceiver = {
      id: "receiver123",
      name: "Jane Receiver",
      phone: "+1987654321",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    const mockFromRoute = {
      _id: "fromRoute123",
      code: "T1",
      name: "Ho Chi Minh",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    const mockToRoute = {
      _id: "toRoute123",
      code: "T2",
      name: "Long An",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    const mockDelivery = {
      _id: "delivery123",
      code: "2401250001",
      sender: "sender123",
      receiver: "receiver123",
      fromRoute: "fromRoute123",
      toRoute: "toRoute123",
      name: "Package Item",
      cost: 100,
      homeDelivery: "123 Main St",
      homeDeliveryCost: 20,
      itemValue: 500,
      itemCost: 50,
      collectCost: 30,
      collectForCustomer: 25000,
      collectForCustomerCost: 40,
      collectForCustomerNote: "Test note",
      createdByUser: "user123",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
      save: jest.fn().mockResolvedValue(true),
    };

    const mockExpectedResponse: IDeliveryResponse = {
      id: "delivery123",
      code: "2401250001",
      sender: mockSender,
      receiver: mockReceiver,
      fromRoute: {
        id: "fromRoute123",
        code: "T1",
        name: "Ho Chi Minh",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      toRoute: {
        id: "toRoute123",
        code: "T2",
        name: "Long An",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      name: "Package Item",
      cost: 100,
      homeDelivery: "123 Main St",
      homeDeliveryCost: 20,
      itemValue: 500,
      itemCost: 50,
      collectCost: 30,
      collectForCustomer: 25000,
      collectForCustomerCost: 40,
      collectForCustomerNote: "Test note",
      createdByUser: "testuser",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    it("should create a delivery successfully", async () => {
      // Mock customer service methods
      MockedCustomerService.prototype.findOrCreateCustomer
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(mockReceiver);

      // Mock Route.findById calls
      MockedRoute.findById = jest.fn()
        .mockResolvedValueOnce(mockFromRoute)
        .mockResolvedValueOnce(mockToRoute);

      // Mock CodeGeneratorService
      MockedCodeGeneratorService.generateNextCode.mockResolvedValue("2401250001");

      // Mock Delivery constructor and save
      MockedDelivery.mockImplementation(() => mockDelivery as any);

      // Mock the transformDeliveryToResponse method
      jest
        .spyOn(deliveryService as any, "transformDeliveryToResponse")
        .mockResolvedValue(mockExpectedResponse);

      const result = await deliveryService.createDelivery(
        mockDeliveryData,
        "user123"
      );

      expect(MockedCustomerService.prototype.findOrCreateCustomer).toHaveBeenCalledWith(
        "John Sender",
        "+1234567890"
      );
      expect(MockedCustomerService.prototype.findOrCreateCustomer).toHaveBeenCalledWith(
        "Jane Receiver",
        "+1987654321"
      );
      expect(MockedRoute.findById).toHaveBeenCalledWith("fromRoute123");
      expect(MockedRoute.findById).toHaveBeenCalledWith("toRoute123");
      expect(MockedCodeGeneratorService.generateNextCode).toHaveBeenCalled();
      expect(MockedDelivery).toHaveBeenCalledWith({
        code: "2401250001",
        sender: "sender123",
        receiver: "receiver123",
        fromRoute: "fromRoute123",
        toRoute: "toRoute123",
        name: "Package Item",
        cost: 100,
        homeDelivery: "123 Main St",
        homeDeliveryCost: 20,
        itemValue: 500,
        itemCost: 50,
        collectCost: 30,
        collectForCustomer: 25000,
        collectForCustomerCost: 40,
        collectForCustomerNote: "Test note",
        createdByUser: "user123",
      });
      expect(mockDelivery.save).toHaveBeenCalled();
      expect(result).toEqual(mockExpectedResponse);
    });

    it("should throw error when from route not found", async () => {
      MockedCustomerService.prototype.findOrCreateCustomer
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(mockReceiver);

      MockedRoute.findById = jest.fn()
        .mockResolvedValueOnce(null); // From route not found

      await expect(
        deliveryService.createDelivery(mockDeliveryData, "user123")
      ).rejects.toThrow("From route not found");
    });

    it("should throw error when to route not found", async () => {
      MockedCustomerService.prototype.findOrCreateCustomer
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(mockReceiver);

      MockedRoute.findById = jest.fn()
        .mockResolvedValueOnce(mockFromRoute) // From route found
        .mockResolvedValueOnce(null); // To route not found

      await expect(
        deliveryService.createDelivery(mockDeliveryData, "user123")
      ).rejects.toThrow("To route not found");
    });

    it("should throw error when sender creation fails", async () => {
      MockedCustomerService.prototype.findOrCreateCustomer.mockRejectedValue(
        new Error("Failed to create sender")
      );

      await expect(
        deliveryService.createDelivery(mockDeliveryData, "user123")
      ).rejects.toThrow("Failed to create sender");
    });

    it("should throw error when receiver creation fails", async () => {
      MockedCustomerService.prototype.findOrCreateCustomer
        .mockResolvedValueOnce(mockSender)
        .mockRejectedValue(new Error("Failed to create receiver"));

      await expect(
        deliveryService.createDelivery(mockDeliveryData, "user123")
      ).rejects.toThrow("Failed to create receiver");
    });

    it("should throw error when delivery save fails", async () => {
      MockedCustomerService.prototype.findOrCreateCustomer
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(mockReceiver);

      MockedRoute.findById = jest.fn()
        .mockResolvedValueOnce(mockFromRoute)
        .mockResolvedValueOnce(mockToRoute);

      const mockFailingDelivery = {
        ...mockDelivery,
        save: jest.fn().mockRejectedValue(new Error("Database error")),
      };
      MockedDelivery.mockImplementation(() => mockFailingDelivery as any);

      await expect(
        deliveryService.createDelivery(mockDeliveryData, "user123")
      ).rejects.toThrow("Database error");
    });
  });

  describe("updateDelivery", () => {
    const mockUpdateData = {
      senderName: "Updated Sender",
      senderPhone: "+1111111111",
      fromRouteId: "newFromRoute123",
      toRouteId: "newToRoute123",
      cost: 150,
    };

    const mockExistingDelivery = {
      _id: "delivery123",
      sender: "sender123",
      receiver: "receiver123",
      fromRoute: "fromRoute123",
      toRoute: "toRoute123",
      name: "Package Item",
      cost: 100,
    };

    const mockUpdatedSender = {
      id: "updatedSender123",
      name: "Updated Sender",
      phone: "+1111111111",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    const mockNewFromRoute = {
      _id: "newFromRoute123",
      code: "T3",
      name: "Can Tho",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    const mockNewToRoute = {
      _id: "newToRoute123",
      code: "T4",
      name: "An Giang",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    const mockUpdatedDelivery = {
      _id: "delivery123",
      sender: "updatedSender123",
      receiver: "receiver123",
      fromRoute: "newFromRoute123",
      toRoute: "newToRoute123",
      name: "Package Item",
      cost: 150,
      homeDelivery: "123 Main St",
      homeDeliveryCost: 20,
      itemValue: 500,
      itemCost: 50,
      collectCost: 30,
      collectForCustomer: 25000,
      collectForCustomerCost: 40,
      collectForCustomerNote: "Test note",
      createdByUser: "user123",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    const mockExpectedResponse: IDeliveryResponse = {
      id: "delivery123",
      code: "2401250001",
      sender: mockUpdatedSender,
      receiver: {
        id: "receiver123",
        name: "Jane Receiver",
        phone: "+1987654321",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      fromRoute: {
        id: "newFromRoute123",
        code: "T3",
        name: "Can Tho",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      toRoute: {
        id: "newToRoute123",
        code: "T4",
        name: "An Giang",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      name: "Package Item",
      cost: 150,
      homeDelivery: "123 Main St",
      homeDeliveryCost: 20,
      itemValue: 500,
      itemCost: 50,
      collectCost: 30,
      collectForCustomer: 25000,
      collectForCustomerCost: 40,
      collectForCustomerNote: "Test note",
      createdByUser: "testuser",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    it("should update a delivery successfully", async () => {
      // Mock Delivery.findById
      MockedDelivery.findById = jest.fn().mockResolvedValue(mockExistingDelivery);

      // Mock customer service
      MockedCustomerService.prototype.findOrCreateCustomer.mockResolvedValue(mockUpdatedSender);

      // Mock Route.findById
      MockedRoute.findById = jest.fn()
        .mockResolvedValueOnce(mockNewFromRoute)
        .mockResolvedValueOnce(mockNewToRoute);

      // Mock Delivery.findByIdAndUpdate
      MockedDelivery.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedDelivery);

      // Mock the transformDeliveryToResponse method
      jest
        .spyOn(deliveryService as any, "transformDeliveryToResponse")
        .mockResolvedValue(mockExpectedResponse);

      const result = await deliveryService.updateDelivery("delivery123", mockUpdateData);

      expect(MockedDelivery.findById).toHaveBeenCalledWith("delivery123");
      expect(MockedCustomerService.prototype.findOrCreateCustomer).toHaveBeenCalledWith(
        "Updated Sender",
        "+1111111111"
      );
      expect(MockedRoute.findById).toHaveBeenCalledWith("newFromRoute123");
      expect(MockedRoute.findById).toHaveBeenCalledWith("newToRoute123");
      expect(MockedDelivery.findByIdAndUpdate).toHaveBeenCalledWith(
        "delivery123",
        {
          $set: {
            sender: "updatedSender123",
            receiver: "receiver123",
            fromRoute: "newFromRoute123",
            toRoute: "newToRoute123",
            cost: 150,
          }
        },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockExpectedResponse);
    });

    it("should throw error when delivery not found", async () => {
      MockedDelivery.findById = jest.fn().mockResolvedValue(null);

      await expect(
        deliveryService.updateDelivery("delivery123", mockUpdateData)
      ).rejects.toThrow("Delivery not found");
    });

    it("should throw error when from route not found during update", async () => {
      MockedDelivery.findById = jest.fn().mockResolvedValue(mockExistingDelivery);

      MockedRoute.findById = jest.fn()
        .mockResolvedValueOnce(null); // From route not found

      await expect(
        deliveryService.updateDelivery("delivery123", mockUpdateData)
      ).rejects.toThrow("From route not found");
    });

    it("should throw error when to route not found during update", async () => {
      MockedDelivery.findById = jest.fn().mockResolvedValue(mockExistingDelivery);

      MockedRoute.findById = jest.fn()
        .mockResolvedValueOnce(mockNewFromRoute) // From route found
        .mockResolvedValueOnce(null); // To route not found

      await expect(
        deliveryService.updateDelivery("delivery123", mockUpdateData)
      ).rejects.toThrow("To route not found");
    });

    it("should throw error when update fails", async () => {
      MockedDelivery.findById = jest.fn().mockResolvedValue(mockExistingDelivery);
      MockedCustomerService.prototype.findOrCreateCustomer.mockResolvedValue(mockUpdatedSender);
      MockedRoute.findById = jest.fn()
        .mockResolvedValueOnce(mockNewFromRoute)
        .mockResolvedValueOnce(mockNewToRoute);
      MockedDelivery.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      await expect(
        deliveryService.updateDelivery("delivery123", mockUpdateData)
      ).rejects.toThrow("Failed to update delivery");
    });
  });

  describe("getDeliveryById", () => {
    const mockDeliveryId = "delivery123";

    const mockPopulatedDelivery = {
      _id: "delivery123",
      sender: {
        _id: "sender123",
        name: "John Sender",
        phone: "+1234567890",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      receiver: {
        _id: "receiver123",
        name: "Jane Receiver",
        phone: "+1987654321",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      fromRoute: {
        _id: "fromRoute123",
        code: "T1",
        name: "Ho Chi Minh",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      toRoute: {
        _id: "toRoute123",
        code: "T2",
        name: "Long An",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      name: "Package Item",
      cost: 100,
      homeDelivery: "123 Main St",
      homeDeliveryCost: 20,
      itemValue: 500,
      itemCost: 50,
      collectCost: 30,
      collectForCustomer: 25000,
      collectForCustomerCost: 40,
      collectForCustomerNote: "Test note",
      createdByUser: {
        _id: "user123",
        username: "testuser",
      },
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    const mockExpectedResponse: IDeliveryResponse = {
      id: "delivery123",
      code: "2401250001",
      sender: {
        id: "sender123",
        name: "John Sender",
        phone: "+1234567890",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      receiver: {
        id: "receiver123",
        name: "Jane Receiver",
        phone: "+1987654321",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      fromRoute: {
        id: "fromRoute123",
        code: "T1",
        name: "Ho Chi Minh",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      toRoute: {
        id: "toRoute123",
        code: "T2",
        name: "Long An",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      name: "Package Item",
      cost: 100,
      homeDelivery: "123 Main St",
      homeDeliveryCost: 20,
      itemValue: 500,
      itemCost: 50,
      collectCost: 30,
      collectForCustomer: 25000,
      collectForCustomerCost: 40,
      collectForCustomerNote: "Test note",
      createdByUser: "testuser",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    it("should return delivery by id successfully", async () => {
      // Mock Delivery.findById with populate and lean
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPopulatedDelivery),
      };
      MockedDelivery.findById = jest.fn().mockReturnValue(mockQuery);

      // Mock the transformDeliveryToResponseOptimized method
      jest
        .spyOn(deliveryService as any, "transformDeliveryToResponseOptimized")
        .mockReturnValue(mockExpectedResponse);

      const result = await deliveryService.getDeliveryById(mockDeliveryId);

      expect(MockedDelivery.findById).toHaveBeenCalledWith(mockDeliveryId);
      expect(mockQuery.populate).toHaveBeenCalledWith([
        { path: 'sender', select: '_id name phone createdAt updatedAt' },
        { path: 'receiver', select: '_id name phone createdAt updatedAt' },
        { path: 'fromRoute', select: '_id code name createdAt updatedAt' },
        { path: 'toRoute', select: '_id code name createdAt updatedAt' },
        { path: 'createdByUser', select: '_id username' }
      ]);
      expect(result).toEqual(mockExpectedResponse);
    });

    it("should return null when delivery not found", async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      MockedDelivery.findById = jest.fn().mockReturnValue(mockQuery);

      const result = await deliveryService.getDeliveryById(mockDeliveryId);

      expect(result).toBeNull();
    });

    it("should return null when error occurs", async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error("Database error")),
      };
      MockedDelivery.findById = jest.fn().mockReturnValue(mockQuery);

      const result = await deliveryService.getDeliveryById(mockDeliveryId);

      expect(result).toBeNull();
    });
  });

  describe("getAllDeliveries", () => {
    const mockDeliveries = [
      {
        _id: "delivery123",
        sender: {
          _id: "sender123",
          name: "John Sender",
          phone: "+1234567890",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
        receiver: {
          _id: "receiver123",
          name: "Jane Receiver",
          phone: "+1987654321",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
        fromRoute: {
          _id: "fromRoute123",
          code: "T1",
          name: "Ho Chi Minh",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
        toRoute: {
          _id: "toRoute123",
          code: "T2",
          name: "Long An",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
        name: "Package Item",
        cost: 100,
        homeDelivery: "123 Main St",
        homeDeliveryCost: 20,
        itemValue: 500,
        itemCost: 50,
        collectCost: 30,
        collectForCustomer: 25000,
        collectForCustomerCost: 40,
        collectForCustomerNote: "Test note",
        createdByUser: {
          _id: "user123",
          username: "testuser",
        },
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
    ];

    const mockExpectedResponse: IDeliveryResponse[] = [
      {
        id: "delivery123",
        code: "2401250001",
        sender: {
          id: "sender123",
          name: "John Sender",
          phone: "+1234567890",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
        receiver: {
          id: "receiver123",
          name: "Jane Receiver",
          phone: "+1987654321",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
        fromRoute: {
          id: "fromRoute123",
          code: "T1",
          name: "Ho Chi Minh",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
        toRoute: {
          id: "toRoute123",
          code: "T2",
          name: "Long An",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
        name: "Package Item",
        cost: 100,
        homeDelivery: "123 Main St",
        homeDeliveryCost: 20,
        itemValue: 500,
        itemCost: 50,
        collectCost: 30,
        collectForCustomer: 25000,
        collectForCustomerCost: 40,
        collectForCustomerNote: "Test note",
        createdByUser: "testuser",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
    ];

    it("should return all deliveries successfully", async () => {
      // Mock Delivery.find with populate, sort, and lean
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDeliveries),
      };
      MockedDelivery.find = jest.fn().mockReturnValue(mockQuery);

      // Mock the transformDeliveryToResponseOptimized method
      jest
        .spyOn(deliveryService as any, "transformDeliveryToResponseOptimized")
        .mockReturnValue(mockExpectedResponse[0]);

      const result = await deliveryService.getAllDeliveries();

      expect(MockedDelivery.find).toHaveBeenCalledWith({});
      expect(mockQuery.populate).toHaveBeenCalledWith([
        { path: 'sender', select: '_id name phone createdAt updatedAt' },
        { path: 'receiver', select: '_id name phone createdAt updatedAt' },
        { path: 'fromRoute', select: '_id code name createdAt updatedAt' },
        { path: 'toRoute', select: '_id code name createdAt updatedAt' },
        { path: 'createdByUser', select: '_id username' }
      ]);
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockExpectedResponse);
    });

    it("should throw error when database fails", async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error("Database error")),
      };
      MockedDelivery.find = jest.fn().mockReturnValue(mockQuery);

      await expect(deliveryService.getAllDeliveries()).rejects.toThrow(
        "Failed to fetch deliveries"
      );
    });
  });

  describe("deleteDelivery", () => {
    const mockDeliveryId = "delivery123";

    it("should delete delivery successfully", async () => {
      const mockDelivery = { _id: mockDeliveryId };
      MockedDelivery.findById = jest.fn().mockResolvedValue(mockDelivery);
      MockedDelivery.findByIdAndDelete = jest.fn().mockResolvedValue(mockDelivery);

      await deliveryService.deleteDelivery(mockDeliveryId);

      expect(MockedDelivery.findById).toHaveBeenCalledWith(mockDeliveryId);
      expect(MockedDelivery.findByIdAndDelete).toHaveBeenCalledWith(mockDeliveryId);
    });

    it("should throw error when delivery not found", async () => {
      MockedDelivery.findById = jest.fn().mockResolvedValue(null);

      await expect(deliveryService.deleteDelivery(mockDeliveryId)).rejects.toThrow(
        "Delivery not found"
      );
    });

    it("should throw error when delete fails", async () => {
      const mockDelivery = { _id: mockDeliveryId };
      MockedDelivery.findById = jest.fn().mockResolvedValue(mockDelivery);
      MockedDelivery.findByIdAndDelete = jest.fn().mockRejectedValue(new Error("Delete error"));

      await expect(deliveryService.deleteDelivery(mockDeliveryId)).rejects.toThrow(
        "Delete error"
      );
    });
  });

  describe("getNextCode", () => {
    const mockToRoute = {
      _id: "toRoute123",
      code: "T2",
      name: "Long An",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    it("should get next code successfully", async () => {
      // Mock Route.findById
      MockedRoute.findById = jest.fn().mockResolvedValue(mockToRoute);

      // Mock CodeGeneratorService
      MockedCodeGeneratorService.getNextCodePreview.mockResolvedValue("2401250001");

      const result = await deliveryService.getNextCode("toRoute123");

      expect(MockedRoute.findById).toHaveBeenCalledWith("toRoute123");
      expect(MockedCodeGeneratorService.getNextCodePreview).toHaveBeenCalled();
      expect(result).toEqual({
        nextCode: "2401250001",
        toRoute: {
          id: "toRoute123",
          code: "T2",
          name: "Long An",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        }
      });
    });

    it("should throw error when to route not found", async () => {
      MockedRoute.findById = jest.fn().mockResolvedValue(null);

      await expect(
        deliveryService.getNextCode("toRoute123")
      ).rejects.toThrow("To route not found");
    });
  });

  describe("getDeliveryByCode", () => {
    const mockFromRoute = {
      _id: "fromRoute123",
      code: "T1",
      name: "Ho Chi Minh",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    const mockToRoute = {
      _id: "toRoute123",
      code: "T2",
      name: "Long An",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    const mockPopulatedDelivery = {
      _id: "delivery123",
      code: "2401250001",
      sender: {
        _id: "sender123",
        name: "John Sender",
        phone: "+1234567890",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      receiver: {
        _id: "receiver123",
        name: "Jane Receiver",
        phone: "+1987654321",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      fromRoute: {
        _id: "fromRoute123",
        code: "T1",
        name: "Ho Chi Minh",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      toRoute: {
        _id: "toRoute123",
        code: "T2",
        name: "Long An",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      name: "Package Item",
      cost: 100,
      homeDelivery: "123 Main St",
      homeDeliveryCost: 20,
      itemValue: 500,
      itemCost: 50,
      collectCost: 30,
      collectForCustomer: 25000,
      collectForCustomerCost: 40,
      collectForCustomerNote: "Test note",
      createdByUser: {
        _id: "user123",
        username: "testuser",
      },
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    const mockExpectedResponse: IDeliveryResponse = {
      id: "delivery123",
      code: "2401250001",
      sender: {
        id: "sender123",
        name: "John Sender",
        phone: "+1234567890",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      receiver: {
        id: "receiver123",
        name: "Jane Receiver",
        phone: "+1987654321",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      fromRoute: {
        id: "fromRoute123",
        code: "T1",
        name: "Ho Chi Minh",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      toRoute: {
        id: "toRoute123",
        code: "T2",
        name: "Long An",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      },
      name: "Package Item",
      cost: 100,
      homeDelivery: "123 Main St",
      homeDeliveryCost: 20,
      itemValue: 500,
      itemCost: 50,
      collectCost: 30,
      collectForCustomer: 25000,
      collectForCustomerCost: 40,
      collectForCustomerNote: "Test note",
      createdByUser: "testuser",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    it("should get delivery by code successfully", async () => {
      // Mock CodeGeneratorService.validateCodeFormat
      MockedCodeGeneratorService.validateCodeFormat.mockReturnValue(true);

      // Mock Route.findOne calls
      MockedRoute.findOne = jest.fn()
        .mockResolvedValueOnce(mockFromRoute)
        .mockResolvedValueOnce(mockToRoute);

      // Mock Delivery.findOne with populate and lean
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPopulatedDelivery),
      };
      MockedDelivery.findOne = jest.fn().mockReturnValue(mockQuery);

      // Mock the transformDeliveryToResponseOptimized method
      jest
        .spyOn(deliveryService as any, "transformDeliveryToResponseOptimized")
        .mockReturnValue(mockExpectedResponse);

      const result = await deliveryService.getDeliveryByCode("2401250001T1T2");

      expect(MockedRoute.findOne).toHaveBeenCalledWith({ code: "T1" });
      expect(MockedRoute.findOne).toHaveBeenCalledWith({ code: "T2" });
      expect(MockedDelivery.findOne).toHaveBeenCalledWith({
        code: "2401250001",
        fromRoute: "fromRoute123",
        toRoute: "toRoute123",
      });
      expect(result).toEqual(mockExpectedResponse);
    });

    it("should throw error for invalid delivery identifier format", async () => {
      await expect(
        deliveryService.getDeliveryByCode("invalid")
      ).rejects.toThrow("Invalid delivery identifier format");
    });

    it("should throw error when from route not found", async () => {
      // Mock CodeGeneratorService.validateCodeFormat
      MockedCodeGeneratorService.validateCodeFormat.mockReturnValue(true);

      // Mock Route.findOne calls
      MockedRoute.findOne = jest.fn()
        .mockResolvedValueOnce(null); // From route not found

      await expect(
        deliveryService.getDeliveryByCode("2401250001T1T2")
      ).rejects.toThrow("From route with code T1 not found");
    });

    it("should throw error when to route not found", async () => {
      // Mock CodeGeneratorService.validateCodeFormat
      MockedCodeGeneratorService.validateCodeFormat.mockReturnValue(true);

      // Mock Route.findOne calls
      MockedRoute.findOne = jest.fn()
        .mockResolvedValueOnce(mockFromRoute)
        .mockResolvedValueOnce(null); // To route not found

      await expect(
        deliveryService.getDeliveryByCode("2401250001T1T2")
      ).rejects.toThrow("To route with code T2 not found");
    });

    it("should return null when delivery not found", async () => {
      // Mock CodeGeneratorService.validateCodeFormat
      MockedCodeGeneratorService.validateCodeFormat.mockReturnValue(true);

      // Mock Route.findOne calls
      MockedRoute.findOne = jest.fn()
        .mockResolvedValueOnce(mockFromRoute)
        .mockResolvedValueOnce(mockToRoute);

      // Mock Delivery.findOne with populate and lean
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      MockedDelivery.findOne = jest.fn().mockReturnValue(mockQuery);

      const result = await deliveryService.getDeliveryByCode("2401250001T1T2");

      expect(result).toBeNull();
    });
  });

  describe('getFrequentCustomers', () => {
    it('should return frequent customers for a sender', async () => {
      // Mock data
      const mockAggregationResult = [{
        data: [{
          _id: {
            receiverName: 'John Doe',
            receiverPhone: '1234567890',
            toRouteId: 'route1',
            toRouteCode: 'T1',
            toRouteName: 'Route 1'
          },
          deliveryCount: 5,
          totalCost: 1000,
          totalItemValue: 2000,
          lastDeliveryDate: new Date('2024-01-15'),
          firstDeliveryDate: new Date('2024-01-01'),
          senderInfo: {
            name: 'Sender Name',
            phone: '0987654321'
          }
        }],
        totalCount: [{ count: 1 }]
      }];

      // Mock the aggregate method
      const mockAggregate = jest.fn().mockReturnValue({
        aggregate: jest.fn().mockResolvedValue(mockAggregationResult)
      });

      // Mock the Delivery model
      jest.spyOn(Delivery, 'aggregate').mockResolvedValue(mockAggregationResult as any);

      const result = await deliveryService.getFrequentCustomers('Sender Name', 1, 10);

      expect(result).toEqual({
        senderIdentifier: 'Sender Name',
        senderInfo: {
          name: 'Sender Name',
          phone: '0987654321'
        },
        frequentCustomers: [{
          receiverName: 'John Doe',
          receiverPhone: '1234567890',
          toRoute: {
            id: 'route1',
            code: 'T1',
            name: 'Route 1'
          },
          deliveryCount: 5,
          totalCost: 1000,
          totalItemValue: 2000,
          lastDeliveryDate: new Date('2024-01-15'),
          firstDeliveryDate: new Date('2024-01-01')
        }],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalRecords: 1,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false
        }
      });

      expect(Delivery.aggregate).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      const mockAggregationResult = [{
        data: [],
        totalCount: [{ count: 0 }]
      }];

      jest.spyOn(Delivery, 'aggregate').mockResolvedValue(mockAggregationResult as any);

      const result = await deliveryService.getFrequentCustomers('NonExistentSender', 1, 10);

      expect(result).toEqual({
        senderIdentifier: 'NonExistentSender',
        senderInfo: null,
        frequentCustomers: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalRecords: 0,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    });

    it('should handle aggregation errors', async () => {
      jest.spyOn(Delivery, 'aggregate').mockRejectedValue(new Error('Database error'));

      await expect(deliveryService.getFrequentCustomers('Sender Name', 1, 10))
        .rejects.toThrow('Failed to get frequent customers');
    });
  });
});
