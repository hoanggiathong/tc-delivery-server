import { MoneyDelivery, IMoneyDelivery } from '@/models/money-delivery.model';
import { Customer } from '@/models/customer.model';
import { Route } from '@/models/route.model';
import { Types, PipelineStage } from 'mongoose';
import { CustomerService } from '@/services/customer.service';
import { CodeGeneratorService } from '@/services/code-generator.service';
import Logger from '@/utils/logger';

interface IMoneyAggregationResultItem {
  _id: {
    receiverName: string;
    receiverPhone: string;
    toRouteId: Types.ObjectId;
    toRouteCode: string;
    toRouteName: string;
  };
  deliveryCount: number;
  totalSendMoneyAmount: number;
  totalSendCost: number;
  totalCost: number;
  lastDeliveryDate: Date;
  firstDeliveryDate: Date;
  senderInfo: {
    name: string;
    phone: string;
  };
}

import {
  IMoneyDeliveryCreateRequest,
  IMoneyDeliveryUpdateRequest,
  IMoneyDeliveryResponse,
  IMoneyDeliveryWithPopulatedRefs,
  IMoneyDeliveryLeanPopulated,
  INextMoneyDeliveryCodeResponse,
  IFrequentMoneyCustomersResponse,
  IFrequentMoneyCustomer,
} from '@/types/money-delivery.type';

export class MoneyDeliveryService {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
  }

  /**
   * Type assertion helper for populated money delivery objects
   */
  private toPopulatedMoneyDelivery(moneyDelivery: unknown): IMoneyDeliveryWithPopulatedRefs {
    return moneyDelivery as IMoneyDeliveryWithPopulatedRefs;
  }

  /**
   * Type assertion helper for lean populated money delivery objects
   */
  private toPopulatedMoneyDeliveryLean(moneyDelivery: unknown): IMoneyDeliveryLeanPopulated {
    return moneyDelivery as IMoneyDeliveryLeanPopulated;
  }

  /**
   * Transform IMoneyDelivery to IMoneyDeliveryResponse
   */
  private async transformMoneyDeliveryToResponse(
    moneyDelivery: IMoneyDelivery
  ): Promise<IMoneyDeliveryResponse> {
    // Populate sender, receiver, fromRoute, toRoute and createdByUser
    const populatedMoneyDelivery = await moneyDelivery.populate([
      { path: 'sender', select: '_id name phone createdAt updatedAt' },
      { path: 'receiver', select: '_id name phone createdAt updatedAt' },
      { path: 'fromRoute', select: '_id code name createdAt updatedAt' },
      { path: 'toRoute', select: '_id code name createdAt updatedAt' },
      { path: 'createdByUser', select: '_id username' },
    ]);

    const populated = this.toPopulatedMoneyDelivery(populatedMoneyDelivery);

    return {
      id: populated._id,
      code: populated.code,
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
      sendMoneyAmount: populated.sendMoneyAmount,
      sendCost: populated.sendCost,
      totalCost: populated.totalCost,
      notes: populated.notes,
      createdByUser: populated.createdByUser.username,
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
    };
  }

  /**
   * Transform pre-populated lean money delivery to IMoneyDeliveryResponse (optimized)
   */
  private transformMoneyDeliveryToResponseOptimized(
    moneyDelivery: IMoneyDeliveryLeanPopulated
  ): IMoneyDeliveryResponse {
    return {
      id: moneyDelivery._id,
      code: moneyDelivery.code,
      sender: {
        id: moneyDelivery.sender._id,
        name: moneyDelivery.sender.name,
        phone: moneyDelivery.sender.phone,
        createdAt: moneyDelivery.sender.createdAt,
        updatedAt: moneyDelivery.sender.updatedAt,
      },
      receiver: {
        id: moneyDelivery.receiver._id,
        name: moneyDelivery.receiver.name,
        phone: moneyDelivery.receiver.phone,
        createdAt: moneyDelivery.receiver.createdAt,
        updatedAt: moneyDelivery.receiver.updatedAt,
      },
      fromRoute: {
        id: moneyDelivery.fromRoute._id,
        code: moneyDelivery.fromRoute.code,
        name: moneyDelivery.fromRoute.name,
        createdAt: moneyDelivery.fromRoute.createdAt,
        updatedAt: moneyDelivery.fromRoute.updatedAt,
      },
      toRoute: {
        id: moneyDelivery.toRoute._id,
        code: moneyDelivery.toRoute.code,
        name: moneyDelivery.toRoute.name,
        createdAt: moneyDelivery.toRoute.createdAt,
        updatedAt: moneyDelivery.toRoute.updatedAt,
      },
      sendMoneyAmount: moneyDelivery.sendMoneyAmount,
      sendCost: moneyDelivery.sendCost,
      totalCost: moneyDelivery.totalCost,
      notes: moneyDelivery.notes,
      createdByUser: moneyDelivery.createdByUser.username,
      createdAt: moneyDelivery.createdAt,
      updatedAt: moneyDelivery.updatedAt,
    };
  }

  /**
   * Create a new money delivery
   */
  async createMoneyDelivery(
    data: IMoneyDeliveryCreateRequest,
    userId: string
  ): Promise<IMoneyDeliveryResponse> {
    // Find or create sender and receiver
    const sender = await this.customerService.findOrCreateCustomer(
      data.senderName,
      data.senderPhone
    );
    const receiver = await this.customerService.findOrCreateCustomer(
      data.receiverName,
      data.receiverPhone
    );

    // Validate fromRoute and toRoute exist
    const fromRoute = await Route.findById(data.fromRouteId);
    if (!fromRoute) {
      throw new Error('From route not found');
    }

    const toRoute = await Route.findById(data.toRouteId);
    if (!toRoute) {
      throw new Error('To route not found');
    }

    // Generate money delivery code
    const moneyDeliveryCode = await CodeGeneratorService.generateNextMoneyDeliveryCode();

    // Create money delivery
    const moneyDelivery = new MoneyDelivery({
      code: moneyDeliveryCode,
      sender: sender.id,
      receiver: receiver.id,
      fromRoute: data.fromRouteId,
      toRoute: data.toRouteId,
      sendMoneyAmount: data.sendMoneyAmount,
      sendCost: data.sendCost,
      notes: data.notes,
      createdByUser: userId,
    });

    await moneyDelivery.save();
    return this.transformMoneyDeliveryToResponse(moneyDelivery);
  }

  /**
   * Update money delivery by ID
   */
  async updateMoneyDelivery(
    id: string,
    data: IMoneyDeliveryUpdateRequest
  ): Promise<IMoneyDeliveryResponse> {
    const moneyDelivery = await MoneyDelivery.findById(id);
    if (!moneyDelivery) {
      throw new Error('Money delivery not found');
    }

    const updateData: Record<string, any> = {};

    // Handle sender update
    if (data.senderName || data.senderPhone) {
      const senderName = data.senderName || moneyDelivery.sender.toString();
      const senderPhone = data.senderPhone || moneyDelivery.sender.toString();
      const sender = await this.customerService.findOrCreateCustomer(senderName, senderPhone);
      updateData.sender = sender.id;
    } else {
      updateData.sender = moneyDelivery.sender;
    }

    // Handle receiver update
    if (data.receiverName || data.receiverPhone) {
      const receiverName = data.receiverName || moneyDelivery.receiver.toString();
      const receiverPhone = data.receiverPhone || moneyDelivery.receiver.toString();
      const receiver = await this.customerService.findOrCreateCustomer(receiverName, receiverPhone);
      updateData.receiver = receiver.id;
    } else {
      updateData.receiver = moneyDelivery.receiver;
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

    if (data.sendMoneyAmount !== undefined) {
      updateData.sendMoneyAmount = data.sendMoneyAmount;
    }
    if (data.sendCost !== undefined) {
      updateData.sendCost = data.sendCost;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    // Update money delivery
    const updatedMoneyDelivery = await MoneyDelivery.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedMoneyDelivery) {
      throw new Error('Failed to update money delivery');
    }

    return this.transformMoneyDeliveryToResponse(updatedMoneyDelivery);
  }

  /**
   * Get money delivery by ID
   */
  async getMoneyDeliveryById(id: string): Promise<IMoneyDeliveryResponse | null> {
    try {
      const moneyDelivery = await MoneyDelivery.findById(id)
        .populate([
          { path: 'sender', select: '_id name phone createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' },
        ])
        .lean();

      if (!moneyDelivery) {
        return null;
      }

      return this.transformMoneyDeliveryToResponseOptimized(
        this.toPopulatedMoneyDeliveryLean(moneyDelivery)
      );
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all money deliveries
   */
  async getAllMoneyDeliveries(): Promise<IMoneyDeliveryResponse[]> {
    try {
      const moneyDeliveries = await MoneyDelivery.find({})
        .populate([
          { path: 'sender', select: '_id name phone createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' },
        ])
        .sort({ createdAt: -1 })
        .lean();

      return moneyDeliveries.map(moneyDelivery =>
        this.transformMoneyDeliveryToResponseOptimized(
          this.toPopulatedMoneyDeliveryLean(moneyDelivery)
        )
      );
    } catch (error) {
      throw new Error('Failed to fetch money deliveries');
    }
  }

  /**
   * Delete money delivery by ID
   */
  async deleteMoneyDelivery(id: string): Promise<void> {
    const moneyDelivery = await MoneyDelivery.findById(id);
    if (!moneyDelivery) {
      throw new Error('Money delivery not found');
    }

    await MoneyDelivery.findByIdAndDelete(id);
  }

  /**
   * Get next money delivery code for a specific route
   */
  async getNextCode(toRouteId: string): Promise<INextMoneyDeliveryCodeResponse> {
    // Validate toRoute exists
    const toRoute = await Route.findById(toRouteId);
    if (!toRoute) {
      throw new Error('To route not found');
    }

    // Generate next code
    const nextCode = await CodeGeneratorService.generateNextMoneyDeliveryCode();

    return {
      nextCode,
      toRoute: {
        id: toRoute._id,
        code: toRoute.code,
        name: toRoute.name,
        createdAt: toRoute.createdAt,
        updatedAt: toRoute.updatedAt,
      },
    };
  }

  /**
   * Get money delivery by code
   */
  async getMoneyDeliveryByCode(deliveryIdentifier: string): Promise<IMoneyDeliveryResponse | null> {
    try {
      const parsed = this.parseDeliveryIdentifier(deliveryIdentifier);
      if (!parsed) {
        return null;
      }

      const { code, fromRouteCode, toRouteCode } = parsed;

      // Find fromRoute and toRoute by codes
      const fromRoute = await Route.findOne({ code: fromRouteCode });
      const toRoute = await Route.findOne({ code: toRouteCode });

      if (!fromRoute || !toRoute) {
        return null;
      }

      // Find money delivery by code and routes
      const moneyDelivery = await MoneyDelivery.findOne({
        code,
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

      if (!moneyDelivery) {
        return null;
      }

      return this.transformMoneyDeliveryToResponseOptimized(
        this.toPopulatedMoneyDeliveryLean(moneyDelivery)
      );
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse delivery identifier (e.g., "2401250001T1T2" -> { code: "2401250001", fromRouteCode: "T1", toRouteCode: "T2" })
   */
  private parseDeliveryIdentifier(
    deliveryIdentifier: string
  ): { code: string; fromRouteCode: string; toRouteCode: string } | null {
    // Expected format: 10 digits + route code + route code (e.g., 2401250001T1T2)
    const match = deliveryIdentifier.match(/^(\d{10})([A-Z]\d+)([A-Z]\d+)$/);
    if (!match) {
      return null;
    }

    const [, code, fromRouteCode, toRouteCode] = match;
    return { code, fromRouteCode, toRouteCode };
  }

  /**
   * Get frequent customers for a sender with pagination
   * Groups by receiver name, phone, and route to avoid duplicates
   */
  async getFrequentCustomers(
    senderIdentifier: string,
    page: number = 1,
    limit: number = 10
  ): Promise<IFrequentMoneyCustomersResponse> {
    try {
      const skip = (page - 1) * limit;

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
        // Match money deliveries by sender IDs first (uses index)
        { $match: { sender: { $in: senderIds } } },

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
            totalSendMoneyAmount: { $sum: '$sendMoneyAmount' },
            totalSendCost: { $sum: '$sendCost' },
            totalCost: { $sum: '$totalCost' },
            lastDeliveryDate: { $max: '$createdAt' },
            firstDeliveryDate: { $min: '$createdAt' },
            senderInfo: { $first: '$sender' },
          },
        },
        // Sort by delivery count (most frequent first) and then by last delivery date
        {
          $sort: {
            deliveryCount: -1,
            lastDeliveryDate: -1,
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

      const result = await MoneyDelivery.aggregate(pipeline);
      const data = result[0]?.data || [];
      const total = result[0]?.totalCount[0]?.count || 0;

      // Transform the data to match the response interface
      const frequentCustomers: IFrequentMoneyCustomer[] = data.map(
        (item: IMoneyAggregationResultItem) => ({
          receiverName: item._id.receiverName,
          receiverPhone: item._id.receiverPhone,
          toRoute: {
            id: item._id.toRouteId.toString(),
            code: item._id.toRouteCode,
            name: item._id.toRouteName,
          },
          deliveryCount: item.deliveryCount,
          totalSendMoneyAmount: item.totalSendMoneyAmount,
          totalSendCost: item.totalSendCost,
          totalCost: item.totalCost,
          lastDeliveryDate: item.lastDeliveryDate,
          firstDeliveryDate: item.firstDeliveryDate,
        })
      );

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
      Logger.error('Failed to get frequent money customers', {
        error: error instanceof Error ? error.message : error,
        senderIdentifier,
        page,
        limit,
      });
      throw new Error('Failed to get frequent money customers');
    }
  }
}
