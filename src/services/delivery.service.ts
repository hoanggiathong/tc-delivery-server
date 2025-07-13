import { Delivery, IDelivery } from '@/models/delivery.model';
import { Route } from '@/models/route.model';
import { CustomerService } from '@/services/customer.service';
import { CodeGeneratorService } from '@/services/code-generator.service';
import {
  IDeliveryCreateRequest,
  IDeliveryUpdateRequest,
  IDeliveryResponse,
  IDeliveryWithPopulatedRefs,
  IDeliveryLeanPopulated,
  INextCodeResponse
} from '@/types/delivery.type';
import { ICustomerResponse } from '@/types/customer.type';
import { IFrequentCustomersResponse, IFrequentCustomer } from '@/types/delivery.type';
import Logger from '@/utils/logger';

export class DeliveryService {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
  }

  /**
   * Type assertion helper for populated delivery objects
   */
  private toPopulatedDelivery(delivery: any): IDeliveryWithPopulatedRefs {
    return delivery;
  }

  /**
   * Type assertion helper for lean populated delivery objects
   */
  private toPopulatedDeliveryLean(delivery: any): IDeliveryLeanPopulated {
    return delivery;
  }

  /**
   * Transform IDelivery to IDeliveryResponse
   */
  private async transformDeliveryToResponse(delivery: IDelivery): Promise<IDeliveryResponse> {
    // Populate sender, receiver, fromRoute, toRoute and createdByUser
    const populatedDelivery = await delivery.populate([
      { path: 'sender', select: '_id name phone createdAt updatedAt' },
      { path: 'receiver', select: '_id name phone createdAt updatedAt' },
      { path: 'fromRoute', select: '_id code name createdAt updatedAt' },
      { path: 'toRoute', select: '_id code name createdAt updatedAt' },
      { path: 'createdByUser', select: '_id username' }
    ]);

    const populated = this.toPopulatedDelivery(populatedDelivery);

    return {
      id: populated._id,
      code: populated.code,
      sender: {
        id: populated.sender._id,
        name: populated.sender.name,
        phone: populated.sender.phone,
        createdAt: populated.sender.createdAt,
        updatedAt: populated.sender.updatedAt
      },
      receiver: {
        id: populated.receiver._id,
        name: populated.receiver.name,
        phone: populated.receiver.phone,
        createdAt: populated.receiver.createdAt,
        updatedAt: populated.receiver.updatedAt
      },
      fromRoute: {
        id: populated.fromRoute._id,
        code: populated.fromRoute.code,
        name: populated.fromRoute.name,
        createdAt: populated.fromRoute.createdAt,
        updatedAt: populated.fromRoute.updatedAt
      },
      toRoute: {
        id: populated.toRoute._id,
        code: populated.toRoute.code,
        name: populated.toRoute.name,
        createdAt: populated.toRoute.createdAt,
        updatedAt: populated.toRoute.updatedAt
      },
      name: populated.name,
      cost: populated.cost,
      homeDelivery: populated.homeDelivery,
      homeDeliveryCost: populated.homeDeliveryCost,
      itemValue: populated.itemValue,
      itemCost: populated.itemCost,
      collectCost: populated.collectCost,
      collectForCustomer: populated.collectForCustomer,
      collectForCustomerCost: populated.collectForCustomerCost,
      collectForCustomerNote: populated.collectForCustomerNote,
      notes: populated.notes,
      totalCost: populated.totalCost,
      createdByUser: populated.createdByUser.username,
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt
    };
  }

  /**
   * Transform pre-populated lean delivery to IDeliveryResponse (optimized)
   */
  private transformDeliveryToResponseOptimized(delivery: IDeliveryLeanPopulated): IDeliveryResponse {
    return {
      id: delivery._id,
      code: delivery.code,
      sender: {
        id: delivery.sender._id,
        name: delivery.sender.name,
        phone: delivery.sender.phone,
        createdAt: delivery.sender.createdAt,
        updatedAt: delivery.sender.updatedAt
      },
      receiver: {
        id: delivery.receiver._id,
        name: delivery.receiver.name,
        phone: delivery.receiver.phone,
        createdAt: delivery.receiver.createdAt,
        updatedAt: delivery.receiver.updatedAt
      },
      fromRoute: {
        id: delivery.fromRoute._id,
        code: delivery.fromRoute.code,
        name: delivery.fromRoute.name,
        createdAt: delivery.fromRoute.createdAt,
        updatedAt: delivery.fromRoute.updatedAt
      },
      toRoute: {
        id: delivery.toRoute._id,
        code: delivery.toRoute.code,
        name: delivery.toRoute.name,
        createdAt: delivery.toRoute.createdAt,
        updatedAt: delivery.toRoute.updatedAt
      },
      name: delivery.name,
      cost: delivery.cost,
      homeDelivery: delivery.homeDelivery,
      homeDeliveryCost: delivery.homeDeliveryCost,
      itemValue: delivery.itemValue,
      itemCost: delivery.itemCost,
      collectCost: delivery.collectCost,
      collectForCustomer: delivery.collectForCustomer,
      collectForCustomerCost: delivery.collectForCustomerCost,
      collectForCustomerNote: delivery.collectForCustomerNote,
      notes: delivery.notes,
      totalCost: delivery.totalCost,
      createdByUser: delivery.createdByUser.username,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt
    };
  }

  /**
   * Create a new delivery
   */
  async createDelivery(data: IDeliveryCreateRequest, userId: string): Promise<IDeliveryResponse> {
    try {
      // Find or create sender and receiver
      const sender = await this.customerService.findOrCreateCustomer(data.senderName, data.senderPhone);
      const receiver = await this.customerService.findOrCreateCustomer(data.receiverName, data.receiverPhone);

      // Validate fromRoute and toRoute exist
      const fromRoute = await Route.findById(data.fromRouteId);
      if (!fromRoute) {
        throw new Error('From route not found');
      }

      const toRoute = await Route.findById(data.toRouteId);
      if (!toRoute) {
        throw new Error('To route not found');
      }

      // Generate delivery code
      const deliveryCode = await CodeGeneratorService.generateNextCode();

      // Create delivery
      const delivery = new Delivery({
        code: deliveryCode,
        sender: sender.id,
        receiver: receiver.id,
        fromRoute: data.fromRouteId,
        toRoute: data.toRouteId,
        name: data.name,
        cost: data.cost,
        homeDelivery: data.homeDelivery,
        homeDeliveryCost: data.homeDeliveryCost,
        itemValue: data.itemValue,
        itemCost: data.itemCost,
        collectCost: data.collectCost,
        collectForCustomer: data.collectForCustomer,
        collectForCustomerCost: data.collectForCustomerCost,
        collectForCustomerNote: data.collectForCustomerNote,
        notes: data.notes,
        createdByUser: userId
      });

      await delivery.save();
      return this.transformDeliveryToResponse(delivery);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update delivery by ID
   */
  async updateDelivery(id: string, data: IDeliveryUpdateRequest): Promise<IDeliveryResponse> {
    try {
      const delivery = await Delivery.findById(id);
      if (!delivery) {
        throw new Error('Delivery not found');
      }

      const updateData: Record<string, any> = {};

      // Handle sender update
      if (data.senderName || data.senderPhone) {
        const senderName = data.senderName || delivery.sender.toString();
        const senderPhone = data.senderPhone || delivery.sender.toString();
        const sender = await this.customerService.findOrCreateCustomer(senderName, senderPhone);
        updateData.sender = sender.id;
      } else {
        updateData.sender = delivery.sender;
      }

      // Handle receiver update
      if (data.receiverName || data.receiverPhone) {
        const receiverName = data.receiverName || delivery.receiver.toString();
        const receiverPhone = data.receiverPhone || delivery.receiver.toString();
        const receiver = await this.customerService.findOrCreateCustomer(receiverName, receiverPhone);
        updateData.receiver = receiver.id;
      } else {
        updateData.receiver = delivery.receiver;
      }

      // Handle route updates
      if (data.fromRouteId !== undefined) {
        const fromRoute = await Route.findById(data.fromRouteId);
        if (!fromRoute) {
          throw new Error('From route not found');
        }
        updateData.fromRoute = data.fromRouteId;
      }

      if (data.toRouteId !== undefined) {
        const toRoute = await Route.findById(data.toRouteId);
        if (!toRoute) {
          throw new Error('To route not found');
        }
        updateData.toRoute = data.toRouteId;
      }
      if (data.name !== undefined) updateData.name = data.name;
      if (data.cost !== undefined) updateData.cost = data.cost;
      if (data.homeDelivery !== undefined) updateData.homeDelivery = data.homeDelivery;
      if (data.homeDeliveryCost !== undefined) updateData.homeDeliveryCost = data.homeDeliveryCost;
      if (data.itemValue !== undefined) updateData.itemValue = data.itemValue;
      if (data.itemCost !== undefined) updateData.itemCost = data.itemCost;
      if (data.collectCost !== undefined) updateData.collectCost = data.collectCost;
      if (data.collectForCustomer !== undefined) updateData.collectForCustomer = data.collectForCustomer;
      if (data.collectForCustomerCost !== undefined) updateData.collectForCustomerCost = data.collectForCustomerCost;
      if (data.collectForCustomerNote !== undefined) updateData.collectForCustomerNote = data.collectForCustomerNote;
      if (data.notes !== undefined) updateData.notes = data.notes;

      // Update delivery
      const updatedDelivery = await Delivery.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedDelivery) {
        throw new Error('Failed to update delivery');
      }

      return this.transformDeliveryToResponse(updatedDelivery);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get delivery by ID
   */
  async getDeliveryById(id: string): Promise<IDeliveryResponse | null> {
    try {
      const delivery = await Delivery.findById(id)
        .populate([
          { path: 'sender', select: '_id name phone createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' }
        ])
        .lean();

      if (!delivery) {
        return null;
      }

      return this.transformDeliveryToResponseOptimized(this.toPopulatedDeliveryLean(delivery));
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all deliveries
   */
  async getAllDeliveries(): Promise<IDeliveryResponse[]> {
    try {
      const deliveries = await Delivery.find({})
        .populate([
          { path: 'sender', select: '_id name phone createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' }
        ])
        .sort({ createdAt: -1 })
        .lean();

      return deliveries.map(delivery => this.transformDeliveryToResponseOptimized(this.toPopulatedDeliveryLean(delivery)));
    } catch (error) {
      throw new Error('Failed to fetch deliveries');
    }
  }

  async deleteDelivery(id: string): Promise<void> {
    try {
      const delivery = await Delivery.findById(id);
      if (!delivery) {
        throw new Error('Delivery not found');
      }

      await Delivery.findByIdAndDelete(id);
    } catch (error) {
      throw error;
    }
  }

  async getRelatedDeliveriesBySender(senderName: string): Promise<IDeliveryResponse[]> {
    try {
      // Find all customers with the given name (case-insensitive)
      const senders = await this.customerService.findCustomersByName(senderName);

      if (senders.length === 0) {
        return [];
      }

      // Get sender IDs
      const senderIds = senders.map((sender: ICustomerResponse) => sender.id);

      // Find all deliveries by these senders with populated data
      const deliveries = await Delivery.find({
        sender: { $in: senderIds }
      })
        .populate([
          { path: 'sender', select: '_id name phone createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' }
        ])
        .sort({ createdAt: -1 })
        .lean();

      if (deliveries.length === 0) {
        return [];
      }

      // Transform to response format
      const deliveryResponses = deliveries.map(delivery =>
        this.transformDeliveryToResponseOptimized(this.toPopulatedDeliveryLean(delivery))
      );

      // Filter unique combinations of receiverName, receiverPhone, fromRoute and toRoute
      const uniqueDeliveries: IDeliveryResponse[] = [];
      const seenCombinations = new Set<string>();

      for (const delivery of deliveryResponses) {
        const combination = `${delivery.receiver.name}|${delivery.receiver.phone}|${delivery.fromRoute.code}|${delivery.toRoute.code}`;

        if (!seenCombinations.has(combination)) {
          seenCombinations.add(combination);
          uniqueDeliveries.push(delivery);
        }
      }

      return uniqueDeliveries;
    } catch (error) {
      throw new Error(`Failed to fetch related deliveries: ${error instanceof Error ? error.message : 'Unexpected error occurred'}`);
    }
  }

  /**
   * Get next delivery code for a specific route
   */
  async getNextCode(toRouteId: string): Promise<INextCodeResponse> {
    try {
      // Validate toRoute exists
      const toRoute = await Route.findById(toRouteId);
      if (!toRoute) {
        throw new Error('To route not found');
      }

      // Get next code preview
      const nextCode = await CodeGeneratorService.getNextCodePreview();

      return {
        nextCode,
        toRoute: {
          id: toRoute._id,
          code: toRoute.code,
          name: toRoute.name,
          createdAt: toRoute.createdAt,
          updatedAt: toRoute.updatedAt
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get delivery by code and route combination
   * @param deliveryIdentifier - Format: codeFromRouteToRoute (e.g., 2401250001T1T2)
   */
  async getDeliveryByCode(deliveryIdentifier: string): Promise<IDeliveryResponse | null> {
    try {
      // Parse delivery identifier
      const parsed = this.parseDeliveryIdentifier(deliveryIdentifier);
      if (!parsed) {
        throw new Error('Invalid delivery identifier format. Expected: codeFromRouteToRoute (e.g., 2401250001T1T2)');
      }

      const { code, fromRouteCode, toRouteCode } = parsed;

      // Find routes by code
      const fromRoute = await Route.findOne({ code: fromRouteCode });
      if (!fromRoute) {
        throw new Error(`From route with code ${fromRouteCode} not found`);
      }

      const toRoute = await Route.findOne({ code: toRouteCode });
      if (!toRoute) {
        throw new Error(`To route with code ${toRouteCode} not found`);
      }

      // Find delivery by code and routes
      const delivery = await Delivery.findOne({
        code: code,
        fromRoute: fromRoute._id,
        toRoute: toRoute._id
      })
        .populate([
          { path: 'sender', select: '_id name phone createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' }
        ])
        .lean();

      if (!delivery) {
        return null;
      }

      return this.transformDeliveryToResponseOptimized(this.toPopulatedDeliveryLean(delivery));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Parse delivery identifier to extract code and route codes
   * @param deliveryIdentifier - Format: codeFromRouteToRoute (e.g., 2401250001T1T2)
   */
  private parseDeliveryIdentifier(deliveryIdentifier: string): { code: string; fromRouteCode: string; toRouteCode: string } | null {
    // Expected format: 10 digits + route codes (e.g., 2401250001T1T2)
    const match = deliveryIdentifier.match(/^(\d{10})([A-Z]\d+)([A-Z]\d+)$/);

    if (!match) {
      return null;
    }

    const [, code, fromRouteCode, toRouteCode] = match;

    // Validate code format
    if (!CodeGeneratorService.validateCodeFormat(code)) {
      return null;
    }

    return {
      code,
      fromRouteCode,
      toRouteCode
    };
  }

  /**
   * Get frequent customers for a sender with pagination
   * Groups by receiver name, phone, and route to avoid duplicates
   */
  async getFrequentCustomers(senderIdentifier: string, page: number = 1, limit: number = 10): Promise<IFrequentCustomersResponse> {
    try {
      const skip = (page - 1) * limit;

      // Build query to match sender by name or phone
      const senderQuery = {
        $or: [
          { 'sender.name': { $regex: senderIdentifier, $options: 'i' } },
          { 'sender.phone': senderIdentifier }
        ]
      };

      // Aggregation pipeline to group and paginate
      const pipeline = [
        // Populate references
        {
          $lookup: {
            from: 'customers',
            localField: 'sender',
            foreignField: '_id',
            as: 'sender'
          }
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'receiver',
            foreignField: '_id',
            as: 'receiver'
          }
        },
        {
          $lookup: {
            from: 'routes',
            localField: 'toRoute',
            foreignField: '_id',
            as: 'toRoute'
          }
        },
        // Unwind arrays
        { $unwind: '$sender' },
        { $unwind: '$receiver' },
        { $unwind: '$toRoute' },
        // Match sender
        { $match: senderQuery },
        // Group by receiver name, phone, and route to avoid duplicates
        {
          $group: {
            _id: {
              receiverName: '$receiver.name',
              receiverPhone: '$receiver.phone',
              toRouteId: '$toRoute._id',
              toRouteCode: '$toRoute.code',
              toRouteName: '$toRoute.name'
            },
            deliveryCount: { $sum: 1 },
            totalCost: { $sum: '$cost' },
            totalItemValue: { $sum: '$itemValue' },
            lastDeliveryDate: { $max: '$createdAt' },
            firstDeliveryDate: { $min: '$createdAt' },
            senderInfo: { $first: '$sender' }
          }
        },
        // Sort by delivery count (most frequent first) and then by last delivery date
        {
          $sort: {
            deliveryCount: -1,
            lastDeliveryDate: -1
          }
        },
        // Add pagination fields
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: limit }
            ],
            totalCount: [
              { $count: 'count' }
            ]
          }
        }
      ];

      const result = await Delivery.aggregate(pipeline as any);
      const data = result[0]?.data || [];
      const total = result[0]?.totalCount[0]?.count || 0;

      // Transform the data to match the response interface
      const frequentCustomers: IFrequentCustomer[] = data.map((item: any) => ({
        receiverName: item._id.receiverName,
        receiverPhone: item._id.receiverPhone,
        toRoute: {
          id: item._id.toRouteId.toString(),
          code: item._id.toRouteCode,
          name: item._id.toRouteName
        },
        deliveryCount: item.deliveryCount,
        totalCost: item.totalCost,
        totalItemValue: item.totalItemValue,
        lastDeliveryDate: item.lastDeliveryDate,
        firstDeliveryDate: item.firstDeliveryDate
      }));

      // Get sender info from the first record if available
      const senderInfo = data.length > 0 ? data[0].senderInfo : null;

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        senderIdentifier,
        senderInfo: senderInfo ? {
          name: senderInfo.name,
          phone: senderInfo.phone
        } : null,
        frequentCustomers,
        pagination: {
          currentPage: page,
          totalPages,
          totalRecords: total,
          limit,
          hasNextPage,
          hasPrevPage
        }
      };

    } catch (error) {
      Logger.error('Failed to get frequent customers', {
        error: error instanceof Error ? error.message : error,
        senderIdentifier,
        page,
        limit
      });
      throw new Error('Failed to get frequent customers');
    }
  }
}