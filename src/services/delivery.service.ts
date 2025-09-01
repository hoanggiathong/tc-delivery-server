import { Delivery, IDelivery } from '@/models/delivery.model';
import { Customer } from '@/models/customer.model';
import { Route } from '@/models/route.model';
import { User } from '@/models/user.model';
import { Types, PipelineStage } from 'mongoose';
import { CustomerService } from '@/services/customer.service';
import { CodeGeneratorService } from '@/services/code-generator.service';
import { SettingsService } from '@/services/settings.service';
import {
  IDeliveryCreateRequest,
  IDeliveryUpdateRequest,
  IDeliveryResponse,
  IDeliveryWithPopulatedRefs,
  IDeliveryLeanPopulated,
  INextCodeResponse,
  IFrequentCustomersResponse,
  IFrequentCustomer,
  IDeliveryCostReport,
  IDeliveryReportItem,
  IDeliveryCostReportSummary,
  ITodayDeliveryReport,
  ITodayDeliverySummary,
  ITodayDeliveryItem,
} from '@/types/delivery.type';
import { PopulatedDelivery } from '@/services/delivery-receipt.service';
import { ICustomerResponse } from '@/types/customer.type';
import Logger from '@/utils/logger';

interface IAggregationResultItem {
  _id: {
    receiverName: string;
    receiverPhone: string;
    toRouteId: Types.ObjectId;
    toRouteCode: string;
    toRouteName: string;
  };
  deliveryCount: number;
  senderInfo: {
    name: string;
    phone: string;
  };
}

export class DeliveryService {
  private customerService: CustomerService;
  private settingsService: SettingsService;

  constructor() {
    this.customerService = new CustomerService();
    this.settingsService = new SettingsService();
  }

  /**
   * Type assertion helper for populated delivery objects
   */
  private toPopulatedDelivery(delivery: unknown): IDeliveryWithPopulatedRefs {
    return delivery as IDeliveryWithPopulatedRefs;
  }

  /**
   * Type assertion helper for lean populated delivery objects
   */
  private toPopulatedDeliveryLean(delivery: unknown): IDeliveryLeanPopulated {
    return delivery as IDeliveryLeanPopulated;
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
      { path: 'createdByUser', select: '_id username' },
    ]);

    const populated = this.toPopulatedDelivery(populatedDelivery);

    return {
      id: populated._id,
      code: populated.code,
      fullCode: populated.fullCode,
      subCode: populated.subCode,
      sender: {
        id: populated.sender._id,
        name: populated.sender.name,
        phone: populated.sender.phone,
        createdAt: populated.sender.createdAt,
        updatedAt: populated.sender.updatedAt,
      },
      receiver: {
        id: populated.receiver._id,
        name: populated.receiver.name,
        phone: populated.receiver.phone,
        createdAt: populated.receiver.createdAt,
        updatedAt: populated.receiver.updatedAt,
      },
      fromRoute: {
        id: populated.fromRoute._id,
        code: populated.fromRoute.code,
        name: populated.fromRoute.name,
        createdAt: populated.fromRoute.createdAt,
        updatedAt: populated.fromRoute.updatedAt,
      },
      toRoute: {
        id: populated.toRoute._id,
        code: populated.toRoute.code,
        name: populated.toRoute.name,
        createdAt: populated.toRoute.createdAt,
        updatedAt: populated.toRoute.updatedAt,
      },
      name: populated.name,
      quantity: populated.quantity,
      cost: populated.cost,
      homeDelivery: populated.homeDelivery,
      homeDeliveryCost: populated.homeDeliveryCost,
      itemValue: populated.itemValue,
      itemCost: populated.itemCost,
      collectCost: populated.collectCost,
      collectForCustomer: populated.collectForCustomer,
      collectForCustomerCost: populated.collectForCustomerCost,
      collectForCustomerNote: populated.collectForCustomerNote,
      details: populated.details,
      notes: populated.notes,
      totalCost: populated.totalCost,
      paymentType: populated.paymentType,
      createdByUser: populated.createdByUser.username,
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
    };
  }

  /**
   * Transform pre-populated lean delivery to IDeliveryResponse (optimized)
   */
  private transformDeliveryToResponseOptimized(
    delivery: IDeliveryLeanPopulated
  ): IDeliveryResponse {
    return {
      id: delivery._id,
      code: delivery.code,
      fullCode: delivery.fullCode,
      subCode: delivery.subCode,
      sender: {
        id: delivery.sender._id,
        name: delivery.sender.name,
        phone: delivery.sender.phone,
        createdAt: delivery.sender.createdAt,
        updatedAt: delivery.sender.updatedAt,
      },
      receiver: {
        id: delivery.receiver._id,
        name: delivery.receiver.name,
        phone: delivery.receiver.phone,
        createdAt: delivery.receiver.createdAt,
        updatedAt: delivery.receiver.updatedAt,
      },
      fromRoute: {
        id: delivery.fromRoute._id,
        code: delivery.fromRoute.code,
        name: delivery.fromRoute.name,
        createdAt: delivery.fromRoute.createdAt,
        updatedAt: delivery.fromRoute.updatedAt,
      },
      toRoute: {
        id: delivery.toRoute._id,
        code: delivery.toRoute.code,
        name: delivery.toRoute.name,
        createdAt: delivery.toRoute.createdAt,
        updatedAt: delivery.toRoute.updatedAt,
      },
      name: delivery.name,
      quantity: delivery.quantity,
      cost: delivery.cost,
      homeDelivery: delivery.homeDelivery,
      homeDeliveryCost: delivery.homeDeliveryCost,
      itemValue: delivery.itemValue,
      itemCost: delivery.itemCost,
      collectCost: delivery.collectCost,
      collectForCustomer: delivery.collectForCustomer,
      collectForCustomerCost: delivery.collectForCustomerCost,
      collectForCustomerNote: delivery.collectForCustomerNote,
      details: delivery.details,
      notes: delivery.notes,
      totalCost: delivery.totalCost,
      paymentType: delivery.paymentType,
      createdByUser: delivery.createdByUser.username,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
    };
  }

  /**
   * Create a new delivery
   */
  async createDelivery(data: IDeliveryCreateRequest, userId: string): Promise<IDeliveryResponse> {
    // Find or create sender and receiver
    const sender = await this.customerService.findOrCreateCustomer(
      data.senderName,
      data.senderPhone
    );
    const receiver = await this.customerService.findOrCreateCustomer(
      data.receiverName,
      data.receiverPhone
    );

    // Get user's selected route as fromRoute
    const user = await User.findById(userId).select('selectedRouteId');
    if (!user || !user.selectedRouteId) {
      throw new Error('User must have a selected route to create deliveries');
    }

    // Validate fromRoute and toRoute exist
    const [fromRoute, toRoute] = await Promise.all([
      Route.findById(user.selectedRouteId),
      Route.findById(data.toRouteId),
    ]);

    if (!fromRoute) {
      throw new Error('User selected route not found');
    }
    if (!toRoute) {
      throw new Error('To route not found');
    }

    // Generate delivery code with new system
    const codeData = await CodeGeneratorService.generateNextCode(
      data.toRouteId,
      user.selectedRouteId.toString()
    );

    // Create delivery
    const delivery = new Delivery({
      code: codeData.code,
      fullCode: codeData.fullCode,
      subCode: codeData.subCode,
      sender: sender.id,
      receiver: receiver.id,
      fromRoute: user.selectedRouteId,
      toRoute: data.toRouteId,
      name: data.name,
      quantity: data.quantity || 1,
      cost: data.cost,
      homeDelivery: data.homeDelivery,
      homeDeliveryCost: data.homeDeliveryCost,
      itemValue: data.itemValue,
      itemCost: data.itemCost,
      collectCost: data.collectCost,
      collectForCustomer: data.collectForCustomer,
      collectForCustomerCost: data.collectForCustomerCost,
      collectForCustomerNote: data.collectForCustomerNote,
      details: data.details,
      notes: data.notes,
      paymentType: data.paymentType,
      createdByUser: userId,
    });

    await delivery.save();
    return this.transformDeliveryToResponse(delivery);
  }

  /**
   * Update delivery by ID
   */
  async updateDelivery(id: string, data: IDeliveryUpdateRequest): Promise<IDeliveryResponse> {
    const delivery = await Delivery.findById(id);
    if (!delivery) {
      throw new Error('Delivery not found');
    }

    const updateData: Record<string, unknown> = {};

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
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.cost !== undefined) {
      updateData.cost = data.cost;
    }
    if (data.homeDelivery !== undefined) {
      updateData.homeDelivery = data.homeDelivery;
    }
    if (data.homeDeliveryCost !== undefined) {
      updateData.homeDeliveryCost = data.homeDeliveryCost;
    }
    if (data.itemValue !== undefined) {
      updateData.itemValue = data.itemValue;
    }
    if (data.itemCost !== undefined) {
      updateData.itemCost = data.itemCost;
    }
    if (data.collectCost !== undefined) {
      updateData.collectCost = data.collectCost;
    }
    if (data.collectForCustomer !== undefined) {
      updateData.collectForCustomer = data.collectForCustomer;
    }
    if (data.collectForCustomerCost !== undefined) {
      updateData.collectForCustomerCost = data.collectForCustomerCost;
    }
    if (data.collectForCustomerNote !== undefined) {
      updateData.collectForCustomerNote = data.collectForCustomerNote;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.paymentType !== undefined) {
      updateData.paymentType = data.paymentType;
    }

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
          { path: 'createdByUser', select: '_id username' },
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
   * Get delivery by ID with full population for PDF generation
   */
  async getDeliveryByIdWithPopulation(id: string): Promise<PopulatedDelivery | null> {
    try {
      const delivery = await Delivery.findById(id).populate([
        { path: 'sender', model: 'Customer' },
        { path: 'receiver', model: 'Customer' },
        { path: 'fromRoute', model: 'Route' },
        { path: 'toRoute', model: 'Route' },
      ]);

      if (!delivery) {
        return null;
      }

      return delivery as unknown as PopulatedDelivery;
    } catch (error) {
      Logger.error('Failed to get delivery with population', {
        error: error instanceof Error ? error.message : error,
        deliveryId: id,
      });
      return null;
    }
  }

  /**
   * Get delivery by code with full population for PDF generation
   */
  async getDeliveryByCodeWithPopulation(code: string): Promise<PopulatedDelivery | null> {
    try {
      const delivery = await Delivery.findOne({ code })
        .populate([
          { path: 'sender', model: 'Customer' },
          { path: 'receiver', model: 'Customer' },
          { path: 'fromRoute', model: 'Route' },
          { path: 'toRoute', model: 'Route' },
        ])
        .lean();

      if (!delivery) {
        return null;
      }

      return delivery as unknown as PopulatedDelivery;
    } catch (error) {
      Logger.error('Failed to get delivery by code with population', {
        error: error instanceof Error ? error.message : error,
        deliveryCode: code,
      });
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
          { path: 'createdByUser', select: '_id username' },
        ])
        .sort({ createdAt: -1 })
        .lean();

      return deliveries.map(delivery =>
        this.transformDeliveryToResponseOptimized(this.toPopulatedDeliveryLean(delivery))
      );
    } catch (error) {
      throw new Error('Failed to fetch deliveries');
    }
  }

  async deleteDelivery(id: string): Promise<void> {
    const delivery = await Delivery.findById(id);
    if (!delivery) {
      throw new Error('Delivery not found');
    }

    await Delivery.findByIdAndDelete(id);
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
        sender: { $in: senderIds },
      })
        .populate([
          { path: 'sender', select: '_id name phone createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' },
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
      throw new Error(
        `Failed to fetch related deliveries: ${error instanceof Error ? error.message : 'Unexpected error occurred'}`
      );
    }
  }

  /**
   * Get next delivery code for a specific route
   * fromRouteId is taken from user's selectedRouteId
   */
  async getNextCode(toRouteId: string, userId: string): Promise<INextCodeResponse> {
    // Get user's selected route as fromRoute
    const user = await User.findById(userId).select('selectedRouteId');
    if (!user || !user.selectedRouteId) {
      throw new Error('User must have a selected route to get next code');
    }

    // Validate routes exist
    const [toRoute, fromRoute] = await Promise.all([
      Route.findById(toRouteId),
      Route.findById(user.selectedRouteId),
    ]);

    if (!toRoute) {
      throw new Error('To route not found');
    }
    if (!fromRoute) {
      throw new Error('User selected route not found');
    }

    // Get next code preview
    const codeData = await CodeGeneratorService.getNextCodePreview(
      toRouteId,
      user.selectedRouteId.toString()
    );

    return {
      nextCode: codeData.code,
      fullCode: codeData.fullCode,
      subCode: codeData.subCode,
      toRoute: {
        id: toRoute._id,
        code: toRoute.code,
        name: toRoute.name,
        createdAt: toRoute.createdAt,
        updatedAt: toRoute.updatedAt,
      },
      fromRoute: {
        id: fromRoute._id,
        code: fromRoute.code,
        name: fromRoute.name,
        createdAt: fromRoute.createdAt,
        updatedAt: fromRoute.updatedAt,
      },
    };
  }

  /**
   * Get delivery by code and route combination
   * @param deliveryIdentifier - Format: codeFromRouteToRoute (e.g., 2401250001T1T2)
   */
  async getDeliveryByCode(deliveryIdentifier: string): Promise<IDeliveryResponse | null> {
    // Parse delivery identifier
    const parsed = this.parseDeliveryIdentifier(deliveryIdentifier);
    if (!parsed) {
      throw new Error(
        'Invalid delivery identifier format. Expected: codeFromRouteToRoute (e.g., 2401250001T1T2)'
      );
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
      toRoute: toRoute._id,
    })
      .populate([
        { path: 'sender', select: '_id name phone createdAt updatedAt' },
        { path: 'receiver', select: '_id name phone createdAt updatedAt' },
        { path: 'fromRoute', select: '_id code name createdAt updatedAt' },
        { path: 'toRoute', select: '_id code name createdAt updatedAt' },
        { path: 'createdByUser', select: '_id username' },
      ])
      .lean();

    if (!delivery) {
      return null;
    }

    return this.transformDeliveryToResponseOptimized(this.toPopulatedDeliveryLean(delivery));
  }

  /**
   * Get delivery by fullCode using user's selected route as fromRoute
   * @param fullCode - The delivery full code (e.g., 2401250001T1T2)
   * @param userId - The user ID to get selectedRouteId from
   */
  async getDeliveryByFullCodeFromUserRoute(
    fullCode: string,
    userId: string
  ): Promise<IDeliveryResponse | null> {
    // Parse fullCode to get code and route codes
    const parsed = this.parseDeliveryIdentifier(fullCode);
    if (!parsed) {
      throw new Error(
        'Invalid delivery identifier format. Expected: codeFromRouteToRoute (e.g., 2401250001T1T2)'
      );
    }

    const { fromRouteCode } = parsed;

    // Get user's selected route as fromRoute
    const user = await User.findById(userId).select('selectedRouteId');
    if (!user || !user.selectedRouteId) {
      throw new Error('User must have a selected route to search for deliveries');
    }

    // Get user's selected route to compare with parsed fromRouteCode
    const userSelectedRoute = await Route.findById(user.selectedRouteId).select('code');
    if (!userSelectedRoute) {
      throw new Error('User selected route not found');
    }

    // Verify that the fromRoute in fullCode matches user's selected route
    if (userSelectedRoute.code !== fromRouteCode) {
      return null; // User can only access deliveries from their selected route
    }

    // Find delivery by fullCode
    const delivery = await Delivery.findOne({
      fullCode: fullCode,
      fromRoute: user.selectedRouteId,
    })
      .populate([
        { path: 'sender', select: '_id name phone createdAt updatedAt' },
        { path: 'receiver', select: '_id name phone createdAt updatedAt' },
        { path: 'fromRoute', select: '_id code name createdAt updatedAt' },
        { path: 'toRoute', select: '_id code name createdAt updatedAt' },
        { path: 'createdByUser', select: '_id username' },
      ])
      .lean();

    if (!delivery) {
      return null;
    }

    return this.transformDeliveryToResponseOptimized(this.toPopulatedDeliveryLean(delivery));
  }

  /**
   * Parse delivery identifier to extract code and route codes
   * @param deliveryIdentifier - Format: codeFromRouteToRoute (e.g., 2401250001T1T2)
   */
  private parseDeliveryIdentifier(
    deliveryIdentifier: string
  ): { code: string; fromRouteCode: string; toRouteCode: string } | null {
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
      toRouteCode,
    };
  }

  /**
   * Get frequent customers for a sender with pagination
   * Groups by receiver name, phone, and route to avoid duplicates
   */
  async getFrequentCustomers(
    senderIdentifier: string,
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<IFrequentCustomersResponse> {
    try {
      const skip = (page - 1) * limit;

      // Get user's selectedRouteId to filter by fromRoute
      const user = await User.findById(userId).select('selectedRouteId').lean();
      if (!user || !user.selectedRouteId) {
        return {
          senderIdentifier,
          senderInfo: null,
          frequentCustomers: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalRecords: 0,
            limit,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }

      // Find sender IDs first to reduce pipeline load
      // Use optimized queries with indexes
      let senders;
      try {
        let senderQuery;
        if (/^\+?[1-9]\d{1,14}$/.test(senderIdentifier)) {
          // If it looks like a phone number, search phone first (exact match with index)
          senderQuery = { phone: senderIdentifier };
        } else {
          // Use text search for name (leverages text index)
          senderQuery = {
            $or: [
              { $text: { $search: senderIdentifier } },
              { phone: senderIdentifier }, // Still check phone as fallback
            ],
          };
        }

        senders = await Customer.find(senderQuery).select('_id').lean();
      } catch (error) {
        // Fallback to regex search if text index is not available (e.g., in tests)
        senders = await Customer.find({
          $or: [{ name: { $regex: senderIdentifier, $options: 'i' } }, { phone: senderIdentifier }],
        })
          .select('_id')
          .lean();
      }

      const senderIds = senders.map(sender => sender._id);

      // If no senders found, return empty result early
      if (senderIds.length === 0) {
        return {
          senderIdentifier,
          senderInfo: null,
          frequentCustomers: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalRecords: 0,
            limit,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }

      // Optimized aggregation pipeline - filter first, then join
      const pipeline: PipelineStage[] = [
        // Match deliveries by sender IDs and fromRoute (uses index)
        {
          $match: {
            sender: { $in: senderIds },
            fromRoute: new Types.ObjectId(user.selectedRouteId),
          },
        },

        // Lookup only needed collections for filtered records
        {
          $lookup: {
            from: 'customers',
            localField: 'sender',
            foreignField: '_id',
            as: 'sender',
          },
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'receiver',
            foreignField: '_id',
            as: 'receiver',
          },
        },
        {
          $lookup: {
            from: 'routes',
            localField: 'toRoute',
            foreignField: '_id',
            as: 'toRoute',
          },
        },
        // Unwind arrays
        { $unwind: '$sender' },
        { $unwind: '$receiver' },
        { $unwind: '$toRoute' },
        // Group by receiver name, phone, and route to avoid duplicates
        {
          $group: {
            _id: {
              receiverName: '$receiver.name',
              receiverPhone: '$receiver.phone',
              toRouteId: '$toRoute._id',
              toRouteCode: '$toRoute.code',
              toRouteName: '$toRoute.name',
            },
            deliveryCount: { $sum: 1 },
            senderInfo: { $first: '$sender' },
          },
        },
        // Sort by delivery count (most frequent first)
        {
          $sort: {
            deliveryCount: -1,
          },
        },
        // Add pagination fields
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            totalCount: [{ $count: 'count' }],
          },
        },
      ];

      const result = await Delivery.aggregate(pipeline);
      const data = result[0]?.data || [];
      const total = result[0]?.totalCount[0]?.count || 0;

      // Transform the data to match the response interface
      const frequentCustomers: IFrequentCustomer[] = data.map((item: IAggregationResultItem) => ({
        receiverName: item._id.receiverName,
        receiverPhone: item._id.receiverPhone,
        toRoute: {
          id: item._id.toRouteId.toString(),
          code: item._id.toRouteCode,
          name: item._id.toRouteName,
        },
        deliveryCount: item.deliveryCount,
      }));

      // Get sender info from the first record if available
      const senderInfo = data.length > 0 ? data[0].senderInfo : null;

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        senderIdentifier,
        senderInfo: senderInfo
          ? {
              name: senderInfo.name,
              phone: senderInfo.phone,
            }
          : null,
        frequentCustomers,
        pagination: {
          currentPage: page,
          totalPages,
          totalRecords: total,
          limit,
          hasNextPage,
          hasPrevPage,
        },
      };
    } catch (error) {
      Logger.error('Failed to get frequent customers', {
        error: error instanceof Error ? error.message : error,
        senderIdentifier,
        page,
        limit,
      });
      throw new Error('Failed to get frequent customers');
    }
  }

  /**
   * Get cost report for deliveries with filtering and pagination
   */
  async getCostReport(
    userId: string,
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 20
  ): Promise<IDeliveryCostReport> {
    try {
      // Get user with selectedRouteId
      const user = await User.findById(userId).select('selectedRouteId').lean();
      if (!user || !user.selectedRouteId) {
        throw new Error('User does not have a selected route');
      }

      // Get the selected route information
      const fromRoute = await Route.findById(user.selectedRouteId).lean();
      if (!fromRoute) {
        throw new Error('Selected route not found');
      }

      // Use provided date range
      const dateRange = {
        from: startDate,
        to: endDate,
      };

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Build aggregation pipeline for deliveries
      const pipeline: PipelineStage[] = [
        // Match by fromRoute and date range
        {
          $match: {
            fromRoute: new Types.ObjectId(user.selectedRouteId),
            createdAt: {
              $gte: dateRange.from,
              $lte: dateRange.to,
            },
          },
        },
        // Lookup related collections
        {
          $lookup: {
            from: 'customers',
            localField: 'sender',
            foreignField: '_id',
            as: 'senderData',
          },
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'receiver',
            foreignField: '_id',
            as: 'receiverData',
          },
        },
        {
          $lookup: {
            from: 'routes',
            localField: 'toRoute',
            foreignField: '_id',
            as: 'toRouteData',
          },
        },
        // Unwind arrays
        { $unwind: '$senderData' },
        { $unwind: '$receiverData' },
        { $unwind: '$toRouteData' },
        // Project required fields
        {
          $project: {
            _id: 1,
            code: 1,
            createdAt: 1,
            sender: {
              name: '$senderData.name',
              phone: '$senderData.phone',
            },
            receiver: {
              name: '$receiverData.name',
              phone: '$receiverData.phone',
            },
            toRoute: {
              id: '$toRouteData._id',
              code: '$toRouteData.code',
              name: '$toRouteData.name',
            },
            cost: 1,
            homeDeliveryCost: 1,
            itemCost: 1,
            itemValue: 1,
            collectCost: 1,
            collectForCustomer: 1,
            collectForCustomerCost: 1,
            totalCost: 1,
            paymentType: 1,
            notes: 1,
          },
        },
        // Facet for pagination and data
        {
          $facet: {
            // Get paginated data
            data: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }],
            // Get total count
            totalCount: [{ $count: 'count' }],
            // Get summary statistics
            summary: [
              {
                $group: {
                  _id: null,
                  totalDeliveries: { $sum: 1 },
                  totalCost: { $sum: '$totalCost' },
                  totalHomeDeliveryCost: { $sum: '$homeDeliveryCost' },
                  totalItemCost: { $sum: '$itemCost' },
                  totalItemValue: { $sum: '$itemValue' },
                  totalCollectCost: { $sum: '$collectCost' },
                  totalCollectForCustomer: { $sum: '$collectForCustomer' },
                  totalCollectForCustomerCost: { $sum: '$collectForCustomerCost' },

                  // Payment type counts
                  normalPaymentCount: {
                    $sum: {
                      $cond: [
                        {
                          $or: [
                            { $eq: ['$paymentType', null] },
                            { $eq: [{ $type: '$paymentType' }, 'missing'] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  normalPaymentAmount: {
                    $sum: {
                      $cond: [
                        {
                          $or: [
                            { $eq: ['$paymentType', null] },
                            { $eq: [{ $type: '$paymentType' }, 'missing'] },
                          ],
                        },
                        '$totalCost',
                        0,
                      ],
                    },
                  },
                  debtPaymentCount: {
                    $sum: {
                      $cond: [{ $eq: ['$paymentType', 'debt'] }, 1, 0],
                    },
                  },
                  debtPaymentAmount: {
                    $sum: {
                      $cond: [{ $eq: ['$paymentType', 'debt'] }, '$totalCost', 0],
                    },
                  },
                  freePaymentCount: {
                    $sum: {
                      $cond: [{ $eq: ['$paymentType', 'free'] }, 1, 0],
                    },
                  },
                },
              },
            ],
          },
        },
      ];

      // Execute aggregation
      const result = await Delivery.aggregate(pipeline);

      // Extract results
      const deliveries = result[0]?.data || [];
      const totalRecords = result[0]?.totalCount[0]?.count || 0;
      const summaryData = result[0]?.summary[0] || {};

      // Calculate pagination info
      const totalPages = Math.ceil(totalRecords / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      // Transform deliveries to report items
      const deliveryItems: IDeliveryReportItem[] = deliveries.map(
        (d: {
          _id: Types.ObjectId;
          code: string;
          createdAt: Date;
          sender: { name: string; phone: string };
          receiver: { name: string; phone: string };
          toRoute: { id: Types.ObjectId; code: string; name: string };
          cost: number;
          homeDeliveryCost: number;
          itemCost: number;
          itemValue: number;
          collectCost: number;
          collectForCustomer: number;
          collectForCustomerCost: number;
          totalCost: number;
          paymentType: 'debt' | 'free' | null;
          notes?: string;
        }) => ({
          id: d._id.toString(),
          code: d.code,
          date: d.createdAt,
          sender: d.sender,
          receiver: d.receiver,
          toRoute: {
            id: d.toRoute.id.toString(),
            code: d.toRoute.code,
            name: d.toRoute.name,
          },
          cost: d.cost,
          homeDeliveryCost: d.homeDeliveryCost,
          itemCost: d.itemCost,
          itemValue: d.itemValue,
          collectCost: d.collectCost,
          collectForCustomer: d.collectForCustomer,
          collectForCustomerCost: d.collectForCustomerCost,
          totalCost: d.totalCost,
          paymentType: d.paymentType,
          notes: d.notes,
        })
      );

      // Build summary with calculated averages
      const summary: IDeliveryCostReportSummary = {
        totalDeliveries: summaryData.totalDeliveries || 0,
        totalCost: summaryData.totalCost || 0,
        totalHomeDeliveryCost: summaryData.totalHomeDeliveryCost || 0,
        totalItemCost: summaryData.totalItemCost || 0,
        totalItemValue: summaryData.totalItemValue || 0,
        totalCollectCost: summaryData.totalCollectCost || 0,
        totalCollectForCustomer: summaryData.totalCollectForCustomer || 0,
        totalCollectForCustomerCost: summaryData.totalCollectForCustomerCost || 0,
        totalRevenue: summaryData.totalCost || 0,

        normalPaymentCount: summaryData.normalPaymentCount || 0,
        normalPaymentAmount: summaryData.normalPaymentAmount || 0,
        debtPaymentCount: summaryData.debtPaymentCount || 0,
        debtPaymentAmount: summaryData.debtPaymentAmount || 0,
        freePaymentCount: summaryData.freePaymentCount || 0,

        averageCostPerDelivery:
          summaryData.totalDeliveries > 0
            ? (summaryData.totalCost || 0) / summaryData.totalDeliveries
            : 0,
        averageItemValue:
          summaryData.totalDeliveries > 0
            ? (summaryData.totalItemValue || 0) / summaryData.totalDeliveries
            : 0,
      };

      // Build final response
      const report: IDeliveryCostReport = {
        summary,
        deliveries: deliveryItems,
        pagination: {
          currentPage: page,
          totalPages,
          totalRecords,
          limit,
          hasNextPage,
          hasPrevPage,
        },
      };

      return report;
    } catch (error) {
      Logger.error('Failed to generate cost report', {
        error: error instanceof Error ? error.message : error,
        userId,
        startDate,
        endDate,
        page,
        limit,
      });
      throw error;
    }
  }

  /**
   * Get today's delivery report (no pagination)
   */
  async getTodayReport(userId: string): Promise<ITodayDeliveryReport> {
    try {
      // Get user with selectedRouteId
      const user = await User.findById(userId).select('selectedRouteId').lean();
      if (!user || !user.selectedRouteId) {
        throw new Error('User does not have a selected route');
      }

      // Get the selected route information
      const fromRoute = await Route.findById(user.selectedRouteId).lean();
      if (!fromRoute) {
        throw new Error('Selected route not found');
      }

      // Set today's date range (from start of day to end of day)
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        0,
        0,
        0,
        0
      );
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999
      );

      // Build aggregation pipeline for today's deliveries
      const pipeline: PipelineStage[] = [
        // Match by fromRoute and today's date
        {
          $match: {
            fromRoute: new Types.ObjectId(user.selectedRouteId),
            createdAt: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
          },
        },
        // Lookup related collections
        {
          $lookup: {
            from: 'customers',
            localField: 'sender',
            foreignField: '_id',
            as: 'senderData',
          },
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'receiver',
            foreignField: '_id',
            as: 'receiverData',
          },
        },
        {
          $lookup: {
            from: 'routes',
            localField: 'toRoute',
            foreignField: '_id',
            as: 'toRouteData',
          },
        },
        // Unwind arrays
        { $unwind: '$senderData' },
        { $unwind: '$receiverData' },
        { $unwind: '$toRouteData' },
        // Project required fields
        {
          $project: {
            _id: 1,
            code: 1,
            fullCode: 1,
            subCode: 1,
            name: 1,
            quantity: 1,
            createdAt: 1,
            updatedAt: 1,
            sender: {
              name: '$senderData.name',
              phone: '$senderData.phone',
            },
            receiver: {
              name: '$receiverData.name',
              phone: '$receiverData.phone',
            },
            toRoute: {
              id: '$toRouteData._id',
              code: '$toRouteData.code',
              name: '$toRouteData.name',
            },
            cost: 1,
            homeDelivery: 1,
            homeDeliveryCost: 1,
            itemValue: 1,
            itemCost: 1,
            collectCost: 1,
            collectForCustomer: 1,
            collectForCustomerCost: 1,
            collectForCustomerNote: 1,
            totalCost: 1,
            paymentType: 1,
            notes: 1,
            details: 1,
          },
        },
        // Facet for data and summary (no pagination needed)
        {
          $facet: {
            // Get all data sorted by creation time (newest first)
            data: [{ $sort: { createdAt: -1 } }],
            // Get summary statistics
            summary: [
              {
                $group: {
                  _id: null,
                  totalDeliveries: { $sum: 1 },
                  totalQuantity: { $sum: '$quantity' },
                  totalCost: { $sum: '$totalCost' },
                  totalItemCost: { $sum: '$itemCost' },
                  totalCollectCost: { $sum: '$collectCost' },
                  totalCollectForCustomer: { $sum: '$collectForCustomer' },
                  totalCollectForCustomerCost: { $sum: '$collectForCustomerCost' },
                },
              },
            ],
          },
        },
      ];

      // Execute aggregation
      const result = await Delivery.aggregate(pipeline);

      // Extract results
      const deliveries = result[0]?.data || [];
      const summaryData = result[0]?.summary[0] || {};

      // Transform deliveries to simplified items
      const deliveryItems: ITodayDeliveryItem[] = deliveries.map(
        (d: {
          _id: Types.ObjectId;
          code: string;
          fullCode?: string;
          subCode?: string;
          name: string;
          quantity?: number;
          createdAt: Date;
          updatedAt?: Date;
          sender: { name: string; phone: string };
          receiver: { name: string; phone: string };
          toRoute: { id: Types.ObjectId; code: string; name: string };
          cost: number;
          homeDelivery?: string;
          homeDeliveryCost?: number;
          itemValue: number;
          itemCost: number;
          collectCost?: number;
          collectForCustomer?: number;
          collectForCustomerCost?: number;
          collectForCustomerNote?: string;
          totalCost: number;
          paymentType: 'debt' | 'free' | null;
          notes?: string;
          details?: {
            weight?: number;
            length?: number;
            width?: number;
            height?: number;
            isOverweight?: boolean;
            convertedWeight?: number;
          };
        }) => ({
          id: d._id.toString(),
          code: d.code,
          fullCode: d.fullCode,
          subCode: d.subCode,
          name: d.name,
          quantity: d.quantity,
          sender: d.sender,
          receiver: d.receiver,
          toRoute: {
            id: d.toRoute.id.toString(),
            code: d.toRoute.code,
            name: d.toRoute.name,
          },
          cost: d.cost,
          homeDelivery: d.homeDelivery,
          homeDeliveryCost: d.homeDeliveryCost,
          itemValue: d.itemValue,
          itemCost: d.itemCost,
          collectCost: d.collectCost,
          collectForCustomer: d.collectForCustomer,
          collectForCustomerCost: d.collectForCustomerCost,
          collectForCustomerNote: d.collectForCustomerNote,
          totalCost: d.totalCost,
          paymentType: d.paymentType,
          notes: d.notes,
          details: d.details,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        })
      );

      // Build summary
      const summary: ITodayDeliverySummary = {
        totalDeliveries: summaryData.totalDeliveries || 0,
        totalQuantity: summaryData.totalQuantity || 0,
        totalCost: summaryData.totalCost || 0,
        totalItemCost: summaryData.totalItemCost || 0,
        totalCollectCost: summaryData.totalCollectCost || 0,
        totalCollectForCustomer: summaryData.totalCollectForCustomer || 0,
        totalCollectForCustomerCost: summaryData.totalCollectForCustomerCost || 0,
        date: today.toISOString().split('T')[0], // Format as YYYY-MM-DD
      };

      // Build route info
      const routeInfo = {
        route: {
          id: fromRoute._id.toString(),
          code: fromRoute.code,
          name: fromRoute.name,
        },
        routeCode: fromRoute.code,
        routeName: fromRoute.name,
      };

      // Build final response
      const report: ITodayDeliveryReport = {
        summary,
        deliveries: deliveryItems,
        routeInfo,
      };

      return report;
    } catch (error) {
      Logger.error("Failed to generate today's delivery report", {
        error: error instanceof Error ? error.message : error,
        userId,
      });
      throw error;
    }
  }
}
