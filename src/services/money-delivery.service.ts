import {
  IMoneyDelivery,
  IMoneyDeliveryImage,
  MoneyDelivery,
  MoneyDeliveryStatus,
  MoneyDeliveryType,
} from '@/models/money-delivery.model';
import { Route } from '@/models/route.model';
import { CodeGeneratorService } from '@/services/code-generator.service';
import { CustomerService } from '@/services/customer.service';
import { SettingsService } from '@/services/settings.service';
import { UserService } from '@/services/user.service';
import Logger from '@/utils/logger';
import { isUndefined, omitBy } from 'lodash';
import { PipelineStage, Types } from 'mongoose';
import { getStartOfDayVietnam, getEndOfDayVietnam, convertVietnamToUTC } from '@/utils/date.utils';
import path from 'path';
import fs from 'fs';
import { generateVersionedUrl, extractBasePath } from '@/utils/image-url.utils';
import { TYPE_DELIVERY_CUSTOMER } from '@/const/customer.const';
import { CustomerType, Customer } from '@/models/customer.model';
import {
  IFrequentMoneyCustomer,
  IGetListReportReturnMoneyDeliveryResponse,
  IMoneyDeliveryCostReport,
  IMoneyDeliveryCostReportSummary,
  IMoneyDeliveryCreateRequest,
  IMoneyDeliveryLeanPopulated,
  IMoneyDeliveryReportItem,
  IMoneyDeliveryResponse,
  IMoneyDeliveryUpdateRequest,
  IMoneyDeliveryWithPopulatedRefs,
  INextMoneyDeliveryCodeResponse,
  ITodayMoneyDeliveryItem,
  ITodayMoneyDeliveryReport,
  ITodayMoneyDeliverySummary,
} from '@/types/money-delivery.type';

export class MoneyDeliveryService {
  private customerService: CustomerService;
  private settingsService: SettingsService;
  private userService: UserService;

  constructor() {
    this.customerService = new CustomerService();
    this.settingsService = new SettingsService();
    this.userService = new UserService();
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
      { path: 'sender', select: '_id phone routeId createdAt updatedAt' },
      { path: 'receiver', select: '_id phone routeId createdAt updatedAt' },
      { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
      { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
      { path: 'createdByUser', select: '_id username' },
      // { path: 'deliveryId', select: '_id code name note createdAt updatedAt' },
    ]);

    const populated = this.toPopulatedMoneyDelivery(populatedMoneyDelivery);

    return {
      id: populated._id,
      code: populated.code,
      fullCode: populated.fullCode,
      subCode: populated.subCode,
      sender: {
        id: populated.sender._id,
        name: populated.sender.name,
        phone: populated.sender.phone,
        fromRouteId: populated.sender.routeId.toString(),
        toRouteId: populated.receiver.routeId.toString(),
        createdAt: populated.sender.createdAt,
        updatedAt: populated.sender.updatedAt,
      },
      receiver: {
        id: populated.receiver._id,
        name: populated.receiver.name,
        phone: populated.receiver.phone,
        fromRouteId: populated.sender.routeId.toString(),
        toRouteId: populated.receiver.routeId.toString(),
        createdAt: populated.receiver.createdAt,
        updatedAt: populated.receiver.updatedAt,
      },
      fromRoute: {
        id: populated.fromRoute._id,
        code: populated.fromRoute.code,
        name: populated.fromRoute.name,
        address: populated.fromRoute.address,
        phone: populated.fromRoute.phone,
        createdAt: populated.fromRoute.createdAt,
        updatedAt: populated.fromRoute.updatedAt,
      },
      toRoute: {
        id: populated.toRoute._id,
        code: populated.toRoute.code,
        name: populated.toRoute.name,
        address: populated.toRoute.address,
        phone: populated.toRoute.phone,
        createdAt: populated.toRoute.createdAt,
        updatedAt: populated.toRoute.updatedAt,
      },
      sendMoneyAmount: populated.sendMoneyAmount,
      sendCost: populated.sendCost,
      transferType: populated.transferType,
      isFree: populated.isFree,
      totalCost: populated.totalCost,
      notes: populated.notes,
      status: populated.status,
      type: populated.type,
      deliveryId: populated.deliveryId?.toString(),
      createdByUser: populated.createdByUser.username,
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
      dateReturn: populated.dateReturn,
      contentReturn: populated.contentReturn,
      // delivery: {
      //   _id: populated.deliveryId?._id,
      //   code: populated.deliveryId?.code,
      //   name: populated.deliveryId?.name,
      //   note: populated.deliveryId?.note,
      //   createdAt: populated.deliveryId?.createdAt,
      //   updatedAt: populated.deliveryId?.updatedAt,
      // }
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
      fullCode: moneyDelivery.fullCode,
      subCode: moneyDelivery.subCode,
      sender: {
        id: moneyDelivery.sender._id,
        name: moneyDelivery.senderName,
        phone: moneyDelivery.sender.phone,
        fromRouteId: moneyDelivery.sender.routeId.toString(),
        toRouteId: moneyDelivery.receiver.routeId.toString(),
        createdAt: moneyDelivery.sender.createdAt,
        updatedAt: moneyDelivery.sender.updatedAt,
      },
      receiver: {
        id: moneyDelivery.receiver._id,
        name: moneyDelivery.receiverName,
        phone: moneyDelivery.receiver.phone,
        fromRouteId: moneyDelivery.sender.routeId.toString(),
        toRouteId: moneyDelivery.receiver.routeId.toString(),
        createdAt: moneyDelivery.receiver.createdAt,
        updatedAt: moneyDelivery.receiver.updatedAt,
      },
      fromRoute: {
        id: moneyDelivery.fromRoute._id,
        code: moneyDelivery.fromRoute.code,
        name: moneyDelivery.fromRoute.name,
        address: moneyDelivery.fromRoute.address,
        phone: moneyDelivery.fromRoute.phone,
        createdAt: moneyDelivery.fromRoute.createdAt,
        updatedAt: moneyDelivery.fromRoute.updatedAt,
      },
      toRoute: {
        id: moneyDelivery.toRoute._id,
        code: moneyDelivery.toRoute.code,
        name: moneyDelivery.toRoute.name,
        address: moneyDelivery.toRoute.address,
        phone: moneyDelivery.toRoute.phone,
        createdAt: moneyDelivery.toRoute.createdAt,
        updatedAt: moneyDelivery.toRoute.updatedAt,
      },
      sendMoneyAmount: moneyDelivery.sendMoneyAmount,
      sendCost: moneyDelivery.sendCost,
      transferType: moneyDelivery.transferType,
      isFree: moneyDelivery.isFree,
      totalCost: moneyDelivery.totalCost,
      notes: moneyDelivery.notes,
      status: moneyDelivery.status,
      type: moneyDelivery.type,
      deliveryId: moneyDelivery.deliveryId?.toString(),
      createdByUser: moneyDelivery.createdByUser.username,
      createdAt: moneyDelivery.createdAt,
      updatedAt: moneyDelivery.updatedAt,
      dateReturn: moneyDelivery.dateReturn,
      contentReturn: moneyDelivery.contentReturn,
    };
  }

  /**
   * Create a new money delivery
   */
  async createMoneyDelivery(
    data: IMoneyDeliveryCreateRequest,
    userId: string
  ): Promise<IMoneyDeliveryResponse> {
    let fromRouteId = data.fromRouteId;
    // Get user's selected route as fromRoute
    if (!fromRouteId) {
      fromRouteId = await this.userService.getUserSelectedRouteId(userId);
    }

    // Find or create sender and receiver with type 'money'
    const sender = await this.customerService.findOrCreateCustomer(
      data.senderPhone,
      data.senderName,
      fromRouteId,
      CustomerType.MONEY
    );
    const receiver = await this.customerService.findOrCreateCustomer(
      data.receiverPhone,
      data.receiverName,
      data.toRouteId,
      CustomerType.MONEY
    );

    // Validate fromRoute and toRoute exist
    const [fromRoute, toRoute] = await Promise.all([
      Route.findById(fromRouteId),
      Route.findById(data.toRouteId),
    ]);

    if (!fromRoute) {
      throw new Error('User selected route not found');
    }
    if (!toRoute) {
      throw new Error('To route not found');
    }

    // Generate money delivery code with new system
    const codeData = await CodeGeneratorService.generateNextMoneyDeliveryCode(
      data.toRouteId,
      fromRouteId
    );

    // Get transfer type (default to 'regular' if not specified)
    const transferType = data.transferType || 'regular';

    // Require sendCost to be provided
    if (data.sendCost === undefined) {
      throw new Error(
        `sendCost is required for transfer type '${transferType}' and amount ${data.sendMoneyAmount}`
      );
    }

    const sendCost = data.sendCost;

    // Create money delivery
    const moneyDelivery = new MoneyDelivery({
      code: codeData.code,
      fullCode: codeData.fullCode,
      subCode: codeData.subCode,
      sender: sender._id,
      senderName: data.senderName,
      receiver: receiver._id,
      receiverName: data.receiverName,
      fromRoute: fromRouteId,
      toRoute: data.toRouteId,
      sendMoneyAmount: data.sendMoneyAmount,
      sendCost,
      transferType,
      isFree: data.isFree,
      notes: data.notes,
      status: data.status,
      type: data.type,
      deliveryId: data.deliveryId,
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
    data: IMoneyDeliveryUpdateRequest,
    userId: string
  ): Promise<IMoneyDeliveryResponse> {
    const moneyDelivery = await MoneyDelivery.findById(id);
    if (!moneyDelivery) {
      throw new Error('Money delivery not found');
    }

    const userSelectedRouteId = await this.userService.getUserSelectedRouteId(userId);
    const updateData: Record<string, any> = {};

    // Handle sender update - always use userSelectedRouteId for sender
    if (data.senderName || data.senderPhone) {
      const senderName = data.senderName || moneyDelivery.sender.toString();
      const senderPhone = data.senderPhone || moneyDelivery.sender.toString();
      const sender = await this.customerService.findOrCreateCustomer(
        senderPhone,
        senderName,
        userSelectedRouteId,
        CustomerType.MONEY
      );
      updateData.sender = sender.id;
      if (data.senderName) {
        updateData.senderName = data.senderName;
      }
    } else {
      updateData.sender = moneyDelivery.sender;
    }

    // Always ensure fromRoute is userSelectedRouteId
    updateData.fromRoute = userSelectedRouteId;

    // Handle receiver update
    if (data.receiverName || data.receiverPhone) {
      const receiverName = data.receiverName || moneyDelivery.receiver.toString();
      const receiverPhone = data.receiverPhone || moneyDelivery.receiver.toString();
      const receiver = await this.customerService.findOrCreateCustomer(
        receiverPhone,
        receiverName,
        data.toRouteId || moneyDelivery.toRoute.toString(),
        CustomerType.MONEY
      );
      updateData.receiver = receiver.id;
      if (data.receiverName) {
        updateData.receiverName = data.receiverName;
      }
    } else {
      updateData.receiver = moneyDelivery.receiver;
    }

    if (data.toRouteId !== undefined) {
      const toRoute = await Route.findById(data.toRouteId);
      if (!toRoute) {
        throw new Error('To route not found');
      }
      updateData.toRoute = data.toRouteId;
    }

    // Use lodash omitBy to filter out undefined values for optional fields
    const optionalFieldsUpdate = omitBy(
      {
        sendMoneyAmount: data.sendMoneyAmount,
        sendCost: data.sendCost,
        notes: data.notes,
        status: data.status,
        deliveryId: data.deliveryId,
        isFree: data.isFree,
      },
      isUndefined
    );

    // Merge optional fields into updateData
    Object.assign(updateData, optionalFieldsUpdate);

    // Handle sendCost validation when transferType or sendMoneyAmount changes
    if (data.transferType !== undefined || data.sendMoneyAmount !== undefined) {
      // Require sendCost when transferType or sendMoneyAmount changes
      if (data.sendCost === undefined) {
        throw new Error(`sendCost is required when updating transferType or sendMoneyAmount`);
      }

      updateData.sendCost = data.sendCost;

      if (data.transferType !== undefined) {
        updateData.transferType = data.transferType;
      }
    } else if (data.sendCost !== undefined) {
      // If only sendCost is provided, accept it without validation
      updateData.sendCost = data.sendCost;
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
          { path: 'sender', select: '_id phone createdAt updatedAt' },
          { path: 'receiver', select: '_id phone createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
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
          { path: 'sender', select: '_id phone createdAt updatedAt' },
          { path: 'receiver', select: '_id phone createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
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
   * fromRouteId is taken from user's selectedRouteId
   */
  async getNextCode(toRouteId: string, userId: string): Promise<INextMoneyDeliveryCodeResponse> {
    // Get user's selected route as fromRoute
    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

    // Validate routes exist
    const [toRoute, fromRoute] = await Promise.all([
      Route.findById(toRouteId),
      Route.findById(selectedRouteId),
    ]);

    if (!toRoute) {
      throw new Error('To route not found');
    }
    if (!fromRoute) {
      throw new Error('User selected route not found');
    }

    // Generate next code
    const codeData = await CodeGeneratorService.generateNextMoneyDeliveryCode(
      toRouteId,
      selectedRouteId
    );

    return {
      nextCode: codeData.code,
      fullCode: codeData.fullCode,
      subCode: codeData.subCode,
      toRoute: {
        id: toRoute._id,
        code: toRoute.code,
        name: toRoute.name,
        address: toRoute.address,
        createdAt: toRoute.createdAt,
        updatedAt: toRoute.updatedAt,
      },
      fromRoute: {
        id: fromRoute._id,
        code: fromRoute.code,
        name: fromRoute.name,
        address: fromRoute.address,
        createdAt: fromRoute.createdAt,
        updatedAt: fromRoute.updatedAt,
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
          { path: 'sender', select: '_id phone createdAt updatedAt' },
          { path: 'receiver', select: '_id phone createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
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
   * Parse delivery identifier (e.g., "0907250001T4T1-T" -> { code: "2401250001", fromRouteCode: "T1", toRouteCode: "T2" })
   */
  private parseDeliveryIdentifier(
    deliveryIdentifier: string
  ): { code: string; fromRouteCode: string; toRouteCode: string } | null {
    // Expected format: 10 digits + route code + route code + -T suffix (e.g., 0907250001T4T1-T, 0907250001ABCD-T)
    const match = deliveryIdentifier.match(/^(\d{10})([A-Z]([A-Z]|\d+))([A-Z]([A-Z]|\d+))-T$/);
    if (!match) {
      return null;
    }

    const [, code, fromRouteCode, , toRouteCode] = match;
    return { code, fromRouteCode, toRouteCode };
  }

  /**
   * Get all frequent customers for a sender
   * Groups by receiver name, phone, and route to avoid duplicates
   */
  async getFrequentCustomers(
    senderIdentifier: string,
    userId: string
  ): Promise<IFrequentMoneyCustomer[]> {
    try {
      // Get user's selected route
      const userSelectedRouteId = await this.userService.getUserSelectedRouteId(userId);

      // Find sender by phone with type='money' and selected route
      const sender = await Customer.findOne({
        phone: senderIdentifier,
        type: TYPE_DELIVERY_CUSTOMER.MONEY,
        routeId: userSelectedRouteId,
      }).lean();

      if (!sender) {
        Logger.debug('Sender not found for frequent money customers', {
          senderIdentifier,
          userSelectedRouteId,
        });
        return [];
      }

      // Aggregation to get 20 unique deliveries based on (senderName, receiverName, receiver phone, toRoute)
      const pipeline: PipelineStage[] = [
        // Match deliveries from this sender and fromRoute
        {
          $match: {
            sender: sender._id,
            fromRoute: userSelectedRouteId,
          },
        },
        // Sort by most recent first
        {
          $sort: { createdAt: -1 },
        },
        // Lookup receiver to get phone
        {
          $lookup: {
            from: 'customers',
            localField: 'receiver',
            foreignField: '_id',
            as: 'receiverData',
          },
        },
        {
          $unwind: '$receiverData',
        },
        // Lookup toRoute to get route details
        {
          $lookup: {
            from: 'routes',
            localField: 'toRoute',
            foreignField: '_id',
            as: 'toRouteData',
          },
        },
        {
          $unwind: '$toRouteData',
        },
        // Group by unique combination of (senderName, receiverName, receiver phone, toRoute)
        {
          $group: {
            _id: {
              senderName: '$senderName',
              receiverName: '$receiverName',
              receiverPhone: '$receiverData.phone',
              toRoute: '$toRoute',
            },
            firstDeliveryDate: { $first: '$createdAt' },
            toRouteData: { $first: '$toRouteData' },
          },
        },
        // Sort by first delivery date (most recent combinations first)
        {
          $sort: { firstDeliveryDate: -1 },
        },
        // Limit to 20 unique combinations
        {
          $limit: 20,
        },
        // Project final structure
        {
          $project: {
            _id: 0,
            senderName: '$_id.senderName',
            receiverName: '$_id.receiverName',
            receiverPhone: '$_id.receiverPhone',
            toRoute: {
              id: { $toString: '$_id.toRoute' },
              code: '$toRouteData.code',
              name: '$toRouteData.name',
              address: '$toRouteData.address',
            },
          },
        },
      ];

      const results = await MoneyDelivery.aggregate(pipeline);

      const frequentCustomers: IFrequentMoneyCustomer[] = results.map(result => ({
        senderName: result.senderName,
        senderPhone: sender.phone,
        receiverName: result.receiverName,
        receiverPhone: result.receiverPhone,
        toRoute: result.toRoute,
      }));

      Logger.debug('Frequent money customers retrieved', {
        senderIdentifier,
        count: frequentCustomers.length,
        userSelectedRouteId,
      });

      return frequentCustomers;
    } catch (error) {
      Logger.error('Failed to get frequent money customers', {
        error: error instanceof Error ? error.message : error,
        senderIdentifier,
      });
      throw new Error('Failed to get frequent money customers');
    }
  }

  /**
   * Get today's money delivery report for a specific user
   */
  async getTodayReport(userId: string): Promise<ITodayMoneyDeliveryReport> {
    try {
      // Get user's selected route information
      const userRouteInfo = await this.userService.getUserSelectedRoute(userId);
      const selectedRouteId = userRouteInfo.selectedRouteId;

      // Get route information
      const route = await Route.findById(selectedRouteId).select('_id code name').lean();
      if (!route) {
        throw new Error('Selected route not found');
      }

      // Get today's date range (00:00:00 to 23:59:59)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Aggregation pipeline for today's money deliveries
      const pipeline: PipelineStage[] = [
        {
          $match: {
            fromRoute: new Types.ObjectId(selectedRouteId),
            createdAt: {
              $gte: today,
              $lt: tomorrow,
            },
          },
        },
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
        { $unwind: '$sender' },
        { $unwind: '$receiver' },
        { $unwind: '$toRoute' },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  totalMoneyDeliveries: { $sum: 1 },
                  totalSendMoneyAmount: { $sum: '$sendMoneyAmount' },
                  totalSendCost: { $sum: '$sendCost' },
                },
              },
            ],
            deliveries: [
              {
                $project: {
                  _id: 1,
                  code: 1,
                  sender: {
                    name: '$sender.name',
                    phone: '$sender.phone',
                  },
                  receiver: {
                    name: '$receiver.name',
                    phone: '$receiver.phone',
                  },
                  toRoute: {
                    id: { $toString: '$toRoute._id' },
                    code: '$toRoute.code',
                    name: '$toRoute.name',
                    address: '$toRoute.address',
                  },
                  sendMoneyAmount: 1,
                  sendCost: 1,
                  totalCost: 1,
                  transferType: 1,
                  notes: 1,
                  fullCode: 1,
                  createdAt: 1,
                },
              },
              { $sort: { createdAt: -1 } },
            ],
          },
        },
      ];

      const result = await MoneyDelivery.aggregate(pipeline);
      const summaryData = result[0]?.summary[0] || {
        totalMoneyDeliveries: 0,
        totalSendMoneyAmount: 0,
        totalSendCost: 0,
        totalSendFee: 0,
      };
      const deliveriesData = result[0]?.deliveries || [];

      // Format summary
      const summary: ITodayMoneyDeliverySummary = {
        totalMoneyDeliveries: summaryData.totalMoneyDeliveries,
        totalSendMoneyAmount: summaryData.totalSendMoneyAmount,
        totalSendCost: summaryData.totalSendCost,
        date: today.toISOString().split('T')[0], // YYYY-MM-DD format
      };

      // Format money deliveries
      const moneyDeliveries: ITodayMoneyDeliveryItem[] = deliveriesData.map((item: any) => ({
        id: item._id.toString(),
        code: item.code,
        sender: item.sender,
        receiver: item.receiver,
        toRoute: item.toRoute,
        sendMoneyAmount: item.sendMoneyAmount,
        sendCost: item.sendCost,
        totalCost: item.totalCost,
        transferType: item.transferType,
        notes: item.notes,
        fullCode: item.fullCode,
        createdAt: item.createdAt,
      }));

      // Format route info
      const routeInfo = {
        route: {
          id: route._id.toString(),
          code: route.code,
          name: route.name,
        },
        routeCode: route.code,
        routeName: route.name,
      };

      return {
        summary,
        moneyDeliveries,
        routeInfo,
      };
    } catch (error) {
      Logger.error('Failed to get today money delivery report', {
        error: error instanceof Error ? error.message : error,
        userId,
      });
      throw new Error('Failed to get today money delivery report');
    }
  }

  /**
   * Get money delivery cost report with date range filtering (max 30 days)
   */
  async getCostReport(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IMoneyDeliveryCostReport> {
    try {
      const userRouteInfo = await this.userService.getUserSelectedRoute(userId);
      const selectedRouteId = userRouteInfo.selectedRouteId;

      const route = await Route.findById(selectedRouteId).select('_id code name address').lean();
      if (!route) {
        throw new Error('Selected route not found');
      }

      const startOfDay = getStartOfDayVietnam(startDate);
      const endOfDay = getEndOfDayVietnam(endDate);
      const startDateUTC = convertVietnamToUTC(startOfDay);
      const endDateUTC = convertVietnamToUTC(endOfDay);

      const pipeline: PipelineStage[] = [
        {
          $match: {
            fromRoute: new Types.ObjectId(selectedRouteId),
            createdAt: {
              $gte: startDateUTC,
              $lte: endDateUTC,
            },
          },
        },
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
        { $unwind: '$sender' },
        { $unwind: '$receiver' },
        { $unwind: '$toRoute' },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  totalMoneyDeliveries: { $sum: 1 },
                  totalSendMoneyAmount: { $sum: '$sendMoneyAmount' },
                  totalSendCost: { $sum: '$sendCost' },
                  totalCost: { $sum: '$totalCost' },

                  // Transfer type breakdown
                  regularTransferCount: {
                    $sum: { $cond: [{ $eq: ['$transferType', 'regular'] }, 1, 0] },
                  },
                  regularTransferAmount: {
                    $sum: { $cond: [{ $eq: ['$transferType', 'regular'] }, '$sendMoneyAmount', 0] },
                  },
                  regularTransferFee: {
                    $sum: { $cond: [{ $eq: ['$transferType', 'regular'] }, '$sendCost', 0] },
                  },
                  expressTransferCount: {
                    $sum: { $cond: [{ $eq: ['$transferType', 'express'] }, 1, 0] },
                  },
                  expressTransferAmount: {
                    $sum: { $cond: [{ $eq: ['$transferType', 'express'] }, '$sendMoneyAmount', 0] },
                  },
                  expressTransferFee: {
                    $sum: { $cond: [{ $eq: ['$transferType', 'express'] }, '$sendCost', 0] },
                  },
                  freeTransferCount: {
                    $sum: { $cond: [{ $eq: ['$transferType', 'free'] }, 1, 0] },
                  },
                  freeTransferAmount: {
                    $sum: { $cond: [{ $eq: ['$transferType', 'free'] }, '$sendMoneyAmount', 0] },
                  },
                },
              },
              {
                $addFields: {
                  averageSendAmountPerDelivery: {
                    $cond: [
                      { $gt: ['$totalMoneyDeliveries', 0] },
                      { $divide: ['$totalSendMoneyAmount', '$totalMoneyDeliveries'] },
                      0,
                    ],
                  },
                  averageFeePerDelivery: {
                    $cond: [
                      { $gt: ['$totalMoneyDeliveries', 0] },
                      { $divide: ['$totalSendFee', '$totalMoneyDeliveries'] },
                      0,
                    ],
                  },
                },
              },
            ],
            data: [
              {
                $project: {
                  _id: 1,
                  code: 1,
                  fullCode: 1,
                  subCode: 1,
                  sender: {
                    name: '$sender.name',
                    phone: '$sender.phone',
                  },
                  receiver: {
                    name: '$receiver.name',
                    phone: '$receiver.phone',
                  },
                  toRoute: {
                    id: { $toString: '$toRoute._id' },
                    code: '$toRoute.code',
                    name: '$toRoute.name',
                    address: '$toRoute.address',
                  },
                  sendMoneyAmount: 1,
                  sendCost: 1,
                  totalCost: 1,
                  transferType: 1,
                  notes: 1,
                  createdAt: 1,
                },
              },
              { $sort: { createdAt: -1 } },
            ],
          },
        },
      ];

      const result = await MoneyDelivery.aggregate(pipeline);
      const summaryData = result[0]?.summary[0] || {
        totalMoneyDeliveries: 0,
        totalSendMoneyAmount: 0,
        totalSendCost: 0,
        totalSendFee: 0,
        totalCost: 0,
        regularTransferCount: 0,
        regularTransferAmount: 0,
        regularTransferFee: 0,
        expressTransferCount: 0,
        expressTransferAmount: 0,
        expressTransferFee: 0,
        freeTransferCount: 0,
        freeTransferAmount: 0,
        averageSendAmountPerDelivery: 0,
        averageFeePerDelivery: 0,
      };
      const dataItems = result[0]?.data || [];

      // Format summary
      const summary: IMoneyDeliveryCostReportSummary = {
        totalMoneyDeliveries: summaryData.totalMoneyDeliveries,
        totalSendMoneyAmount: summaryData.totalSendMoneyAmount,
        totalSendCost: summaryData.totalSendCost,
        totalCost: summaryData.totalCost,
        regularTransferCount: summaryData.regularTransferCount,
        regularTransferAmount: summaryData.regularTransferAmount,
        expressTransferCount: summaryData.expressTransferCount,
        expressTransferAmount: summaryData.expressTransferAmount,
        freeTransferCount: summaryData.freeTransferCount,
        freeTransferAmount: summaryData.freeTransferAmount,
        averageSendAmountPerDelivery:
          Math.round(summaryData.averageSendAmountPerDelivery * 100) / 100,
        averageCostPerDelivery: Math.round(summaryData.averageCostPerDelivery * 100) / 100,
      };

      // Format money deliveries
      const moneyDeliveries: IMoneyDeliveryReportItem[] = dataItems.map((item: any) => ({
        id: item._id.toString(),
        code: item.code,
        date: item.createdAt,
        sender: item.sender,
        receiver: item.receiver,
        toRoute: item.toRoute,
        sendMoneyAmount: item.sendMoneyAmount,
        sendCost: item.sendCost,
        totalCost: item.totalCost,
        transferType: item.transferType,
        fullCode: item.fullCode,
        subCode: item.subCode,
        notes: item.notes,
      }));

      return {
        summary,
        moneyDeliveries,
        filter: {
          dateRange: {
            from: startDate,
            to: endDate,
          },
          fromRoute: {
            id: route._id.toString(),
            code: route.code,
            name: route.name,
            address: route.address || '',
          },
        },
      };
    } catch (error) {
      Logger.error('Failed to generate cost report', {
        error: error instanceof Error ? error.message : error,
        userId,
        startDate,
        endDate,
      });
      throw new Error('Failed to generate cost report');
    }
  }

  /**
   * Update money delivery by fullCode (only sender, receiver, and route fields allowed)
   */
  async updateMoneyDeliveryByFullCode(
    fullCode: string,
    updateData: {
      senderName?: string;
      senderPhone?: string;
      receiverName?: string;
      receiverPhone?: string;
      fromRouteId?: string;
      toRouteId?: string;
    }
  ): Promise<IMoneyDeliveryResponse> {
    try {
      // Parse fullCode to get code and route information
      const parsed = this.parseDeliveryIdentifier(fullCode);
      if (!parsed) {
        throw new Error('Invalid fullCode format');
      }

      const { code, fromRouteCode, toRouteCode } = parsed;

      // Find fromRoute and toRoute by codes
      const [fromRoute, toRoute] = await Promise.all([
        Route.findOne({ code: fromRouteCode }),
        Route.findOne({ code: toRouteCode }),
      ]);

      if (!fromRoute || !toRoute) {
        throw new Error('Routes not found for the given fullCode');
      }

      // Find existing money delivery
      const existingMoneyDelivery = await MoneyDelivery.findOne({
        code,
        fromRoute: fromRoute._id,
        toRoute: toRoute._id,
      });

      if (!existingMoneyDelivery) {
        throw new Error('Money delivery not found');
      }

      // Prepare update object
      const updates: any = {};

      // Handle sender update (create if not exists)
      if (updateData.senderName || updateData.senderPhone) {
        const sender = await this.customerService.updateOrCreateCustomerWithPartialData(
          existingMoneyDelivery.sender.toString(),
          updateData.senderName,
          updateData.senderPhone,
          updateData.fromRouteId,
          updateData.toRouteId
        );
        updates.sender = sender.id;
      }

      // Handle receiver update (create if not exists)
      if (updateData.receiverName || updateData.receiverPhone) {
        const receiver = await this.customerService.updateOrCreateCustomerWithPartialData(
          existingMoneyDelivery.receiver.toString(),
          updateData.receiverName,
          updateData.receiverPhone,
          updateData.fromRouteId,
          updateData.toRouteId
        );
        updates.receiver = receiver.id;
      }

      // Handle route update
      if (updateData.toRouteId) {
        const newToRoute = await Route.findById(updateData.toRouteId);
        if (!newToRoute) {
          throw new Error('New to route not found');
        }
        updates.toRoute = newToRoute._id;
        updates.fullCode = `${code}${fromRoute.code}${newToRoute.code}-T`;
      }

      // Update the money delivery
      const updatedMoneyDelivery = await MoneyDelivery.findByIdAndUpdate(
        existingMoneyDelivery._id,
        updates,
        { new: true, runValidators: true }
      );

      if (!updatedMoneyDelivery) {
        throw new Error('Failed to update money delivery');
      }

      return this.transformMoneyDeliveryToResponse(updatedMoneyDelivery);
    } catch (error) {
      Logger.error('Error updating money delivery by fullCode:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update money delivery by fullCode');
    }
  }

  async getListMoneyDeliveryByUserIdAndTypeAndWaitingStatus(
    userId: string,
    type: MoneyDeliveryType
  ): Promise<IMoneyDelivery[]> {
    try {
      // Get user's selected route as fromRoute
      const fromRouteId = await this.userService.getUserSelectedRouteId(userId);

      const moneyDeliveries = await MoneyDelivery.find({
        fromRoute: fromRouteId,
        status: MoneyDeliveryStatus.WAITING,
        type: type,
      });
      return moneyDeliveries;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get list money delivery by list delivery id');
    }
  }

  async getListMoneyDeliveryByUserIdAndType(
    userId: string,
    type: MoneyDeliveryType,
    startDate: Date,
    endDate: Date
  ): Promise<IMoneyDelivery[]> {
    try {
      // Get user's selected route as fromRoute
      const toRouteId = await this.userService.getUserSelectedRouteId(userId);

      const moneyDeliveries = await MoneyDelivery.find({
        toRoute: toRouteId,
        type: type,
        status: MoneyDeliveryStatus.WAITING,
        createdAt: { $gte: startDate, $lte: endDate },
      });
      return moneyDeliveries;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get list money delivery by list delivery id');
    }
  }

  /**
   * danh sách tiền hàng thu hộ đã chuyển
   */
  async getListReturnMoneyDeliveriesTypeCollectStatusDone(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IMoneyDeliveryResponse[]> {
    try {
      // Get user's selected route as fromRoute
      const toRouteId = await this.userService.getUserSelectedRouteId(userId);

      const moneyDeliveries = await MoneyDelivery.find({
        toRoute: toRouteId,
        status: MoneyDeliveryStatus.DONE,
        type: MoneyDeliveryType.COLLECT,
        createdAt: { $gte: startDate, $lte: endDate },
      })
        .populate([
          { path: 'sender', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' },
          { path: 'deliveryId', select: '_id code name createdAt updatedAt' },
        ])
        .sort({ createdAt: -1 })
        .lean();

      const moneyDeliveriesResponse: IMoneyDeliveryResponse[] = moneyDeliveries.map(
        (moneyDelivery: any) => {
          const response: IMoneyDeliveryResponse = {
            id: moneyDelivery._id.toString(),
            code: moneyDelivery.code,
            fullCode: moneyDelivery.fullCode,
            subCode: moneyDelivery.subCode,
            sender: {
              id: moneyDelivery.sender._id.toString(),
              name: moneyDelivery.senderName,
              phone: moneyDelivery.sender.phone,
              createdAt: moneyDelivery.sender.createdAt,
              updatedAt: moneyDelivery.sender.updatedAt,
            },
            receiver: {
              id: moneyDelivery.receiver._id.toString(),
              name: moneyDelivery.receiverName,
              phone: moneyDelivery.receiver.phone,
              createdAt: moneyDelivery.receiver.createdAt,
              updatedAt: moneyDelivery.receiver.updatedAt,
            },
            fromRoute: {
              id: moneyDelivery.fromRoute._id.toString(),
              code: moneyDelivery.fromRoute.code,
              name: moneyDelivery.fromRoute.name,
              address: moneyDelivery.fromRoute.address || '',
              phone: moneyDelivery.fromRoute.phone || '',
              createdAt: moneyDelivery.fromRoute.createdAt,
              updatedAt: moneyDelivery.fromRoute.updatedAt,
            },
            toRoute: {
              id: moneyDelivery.toRoute._id.toString(),
              code: moneyDelivery.toRoute.code,
              name: moneyDelivery.toRoute.name,
              address: moneyDelivery.toRoute.address || '',
              phone: moneyDelivery.toRoute.phone || '',
              createdAt: moneyDelivery.toRoute.createdAt,
              updatedAt: moneyDelivery.toRoute.updatedAt,
            },
            sendMoneyAmount: moneyDelivery.sendMoneyAmount,
            sendCost: moneyDelivery.sendCost,
            transferType: moneyDelivery.transferType,
            isFree: moneyDelivery.isFree,
            totalCost: moneyDelivery.totalCost,
            notes: moneyDelivery.notes,
            status: moneyDelivery.status,
            type: moneyDelivery.type,
            deliveryId: moneyDelivery.deliveryId?._id?.toString(),
            createdByUser: moneyDelivery.createdByUser.username,
            createdAt: moneyDelivery.createdAt,
            updatedAt: moneyDelivery.updatedAt,
          };

          // Add delivery object if deliveryId is populated
          if (moneyDelivery.deliveryId) {
            response.delivery = {
              _id: moneyDelivery.deliveryId._id,
              code: moneyDelivery.deliveryId.code,
              name: moneyDelivery.deliveryId.name,
              note: moneyDelivery.deliveryId.note,
              createdAt: moneyDelivery.deliveryId.createdAt,
              updatedAt: moneyDelivery.deliveryId.updatedAt,
            };
          }

          return response;
        }
      );

      return moneyDeliveriesResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get list return money deliveries type collect status done');
    }
  }

  /**
   * danh sách tiền về cũ nhưng không lấy type thu hộ
   */
  async getListOldMoneyDeliveryNotTypeCollectCost(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IMoneyDeliveryResponse[]> {
    try {
      // Get user's selected route as toRoute
      const toRouteId = await this.userService.getUserSelectedRouteId(userId);

      const moneyDeliveries = await MoneyDelivery.find({
        toRoute: toRouteId,
        type: { $ne: MoneyDeliveryType.COLLECT },
        createdAt: { $gte: startDate, $lte: endDate },
      })
        .populate([
          { path: 'sender', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' },
          { path: 'deliveryId', select: '_id code name createdAt updatedAt' },
        ])
        .sort({ createdAt: -1 })
        .lean();

      const moneyDeliveriesResponse: IMoneyDeliveryResponse[] = moneyDeliveries.map(moneyDelivery =>
        this.transformMoneyDeliveryToResponseOptimized(
          this.toPopulatedMoneyDeliveryLean(moneyDelivery)
        )
      );

      return moneyDeliveriesResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get list old money delivery not type collect cost');
    }
  }

  /**
   * danh sách tiền về không lấy type thu hộ và status DONE
   */
  async getListMoneyDeliveryNotTypeCollectCostWithStatusDone(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IMoneyDeliveryResponse[]> {
    try {
      // Get user's selected route as toRoute
      const toRouteId = await this.userService.getUserSelectedRouteId(userId);

      const moneyDeliveries = await MoneyDelivery.find({
        toRoute: toRouteId,
        status: MoneyDeliveryStatus.DONE,
        type: { $ne: MoneyDeliveryType.COLLECT },
        createdAt: { $gte: startDate, $lte: endDate },
      })
        .populate([
          { path: 'sender', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' },
          { path: 'deliveryId', select: '_id code name createdAt updatedAt' },
        ])
        .sort({ createdAt: -1 })
        .lean();

      const moneyDeliveriesResponse: IMoneyDeliveryResponse[] = moneyDeliveries.map(moneyDelivery =>
        this.transformMoneyDeliveryToResponseOptimized(
          this.toPopulatedMoneyDeliveryLean(moneyDelivery)
        )
      );

      return moneyDeliveriesResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get list money delivery not type collect cost with status done');
    }
  }

  /**
   * danh sách tiền về type NORMAL và status WAITING
   */
  async getListMoneyDeliveryTypeNormalWithStatusWaiting(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IMoneyDeliveryResponse[]> {
    try {
      // Get user's selected route as toRoute
      const toRouteId = await this.userService.getUserSelectedRouteId(userId);

      const moneyDeliveries = await MoneyDelivery.find({
        toRoute: toRouteId,
        status: MoneyDeliveryStatus.WAITING,
        type: MoneyDeliveryType.NORMAL,
        createdAt: { $gte: startDate, $lte: endDate },
      })
        .populate([
          { path: 'sender', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' },
          { path: 'deliveryId', select: '_id code name createdAt updatedAt' },
        ])
        .sort({ createdAt: -1 })
        .lean();

      const moneyDeliveriesResponse: IMoneyDeliveryResponse[] = moneyDeliveries.map(moneyDelivery =>
        this.transformMoneyDeliveryToResponseOptimized(
          this.toPopulatedMoneyDeliveryLean(moneyDelivery)
        )
      );

      return moneyDeliveriesResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get list money delivery type normal with status waiting');
    }
  }

  /**
   * danh sách tiền về type COLLECT và status DONE
   */
  async getListMoneyDeliveryTypeCollectCostWithStatusDone(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IMoneyDeliveryResponse[]> {
    try {
      // Get user's selected route as toRoute
      const toRouteId = await this.userService.getUserSelectedRouteId(userId);

      const moneyDeliveries = await MoneyDelivery.find({
        toRoute: toRouteId,
        status: MoneyDeliveryStatus.DONE,
        type: MoneyDeliveryType.COLLECT,
        createdAt: { $gte: startDate, $lte: endDate },
      })
        .populate([
          { path: 'sender', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' },
          { path: 'deliveryId', select: '_id code name createdAt updatedAt' },
        ])
        .sort({ createdAt: -1 })
        .lean();

      const moneyDeliveriesResponse: IMoneyDeliveryResponse[] = moneyDeliveries.map(moneyDelivery =>
        this.transformMoneyDeliveryToResponseOptimized(
          this.toPopulatedMoneyDeliveryLean(moneyDelivery)
        )
      );

      return moneyDeliveriesResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get list money delivery type collect cost with status done');
    }
  }

  /**
   * danh sách tiền về type COLLECT và status WAITING
   */
  async getListReturnMoneyDeliveryTypeCollectCostWithStatusWaiting(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IMoneyDeliveryResponse[]> {
    try {
      // Get user's selected route as toRoute
      const toRouteId = await this.userService.getUserSelectedRouteId(userId);

      const moneyDeliveries = await MoneyDelivery.find({
        toRoute: toRouteId,
        status: MoneyDeliveryStatus.WAITING,
        type: MoneyDeliveryType.COLLECT,
        createdAt: { $gte: startDate, $lte: endDate },
      })
        .populate([
          { path: 'sender', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' },
          { path: 'deliveryId', select: '_id code name note createdAt updatedAt' },
        ])
        .sort({ createdAt: -1 })
        .lean();

      const moneyDeliveriesResponse: IMoneyDeliveryResponse[] = moneyDeliveries.map(
        (moneyDelivery: any) => {
          const response: IMoneyDeliveryResponse = {
            id: moneyDelivery._id.toString(),
            code: moneyDelivery.code,
            fullCode: moneyDelivery.fullCode,
            subCode: moneyDelivery.subCode,
            sender: {
              id: moneyDelivery.sender._id.toString(),
              name: moneyDelivery.senderName,
              phone: moneyDelivery.sender.phone,
              createdAt: moneyDelivery.sender.createdAt,
              updatedAt: moneyDelivery.sender.updatedAt,
            },
            receiver: {
              id: moneyDelivery.receiver._id.toString(),
              name: moneyDelivery.receiverName,
              phone: moneyDelivery.receiver.phone,
              createdAt: moneyDelivery.receiver.createdAt,
              updatedAt: moneyDelivery.receiver.updatedAt,
            },
            fromRoute: {
              id: moneyDelivery.fromRoute._id.toString(),
              code: moneyDelivery.fromRoute.code,
              name: moneyDelivery.fromRoute.name,
              address: moneyDelivery.fromRoute.address || '',
              phone: moneyDelivery.fromRoute.phone || '',
              createdAt: moneyDelivery.fromRoute.createdAt,
              updatedAt: moneyDelivery.fromRoute.updatedAt,
            },
            toRoute: {
              id: moneyDelivery.toRoute._id.toString(),
              code: moneyDelivery.toRoute.code,
              name: moneyDelivery.toRoute.name,
              address: moneyDelivery.toRoute.address || '',
              phone: moneyDelivery.toRoute.phone || '',
              createdAt: moneyDelivery.toRoute.createdAt,
              updatedAt: moneyDelivery.toRoute.updatedAt,
            },
            sendMoneyAmount: moneyDelivery.sendMoneyAmount,
            sendCost: moneyDelivery.sendCost,
            transferType: moneyDelivery.transferType,
            isFree: moneyDelivery.isFree,
            totalCost: moneyDelivery.totalCost,
            notes: moneyDelivery.notes,
            status: moneyDelivery.status,
            type: moneyDelivery.type,
            deliveryId: moneyDelivery.deliveryId?._id?.toString(),
            createdByUser: moneyDelivery.createdByUser.username,
            createdAt: moneyDelivery.createdAt,
            updatedAt: moneyDelivery.updatedAt,
            dateReturn: moneyDelivery.dateReturn,
            contentReturn: moneyDelivery.contentReturn,
          };

          // Add delivery object if deliveryId is populated
          if (moneyDelivery.deliveryId) {
            response.delivery = {
              _id: moneyDelivery.deliveryId._id,
              code: moneyDelivery.deliveryId.code,
              name: moneyDelivery.deliveryId.name,
              note: moneyDelivery.deliveryId.note,
              createdAt: moneyDelivery.deliveryId.createdAt,
              updatedAt: moneyDelivery.deliveryId.updatedAt,
            };
          }

          return response;
        }
      );

      return moneyDeliveriesResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get list money delivery type collect cost with status waiting');
    }
  }

  async uploadImagesMoneyDelivery(
    moneyDeliveryId: string,
    imagesData?: Array<{
      index: number;
      buffer: Buffer;
      originalName: string;
      rotate: number;
    }>
  ): Promise<IMoneyDeliveryImage[]> {
    // Find the money delivery
    const moneyDelivery = await MoneyDelivery.findById(moneyDeliveryId);
    if (!moneyDelivery) {
      throw new Error('Money delivery not found');
    }

    const uploadedImages = await this.handleUploadImagesMoneyDelivery(moneyDeliveryId, imagesData);

    // Update money delivery with new images
    moneyDelivery.images = uploadedImages;
    await moneyDelivery.save();

    return uploadedImages;
  }

  async handleUploadImagesMoneyDelivery(
    id: string,
    imagesData?: Array<{
      index: number;
      buffer: Buffer;
      originalName: string;
      rotate: number;
    }>
  ): Promise<IMoneyDeliveryImage[]> {
    // Find the money delivery
    const moneyDelivery = await MoneyDelivery.findById(id);
    if (!moneyDelivery) {
      throw new Error(`Money delivery with ID ${id} not found`);
    }

    // If no images provided, just return the money delivery
    if (!imagesData || imagesData.length === 0) {
      return moneyDelivery.images || [];
    }

    if (moneyDelivery.images && moneyDelivery.images.length > 0) {
      for (const image of moneyDelivery.images) {
        // Extract base path without query parameters for file system operations
        const basePath = extractBasePath(image.url);
        const imagePath = path.join('public', basePath);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    }

    // Handle multiple images upload
    const uploadedImages: IMoneyDeliveryImage[] = [];

    for (const imageData of imagesData) {
      const { index, buffer, originalName, rotate } = imageData;

      // Create directory if not exists
      const uploadDir = path.join('public', 'uploads', 'money-deliveries', id);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = path.extname(originalName);
      const fileName = `image_${index}_${timestamp}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);

      // Save file
      fs.writeFileSync(filePath, buffer);

      // Create relative path for database
      const relativePath = path.join('uploads', 'money-deliveries', id, fileName);

      uploadedImages.push({
        url: generateVersionedUrl(relativePath),
        rotate: rotate || 0,
      });
    }

    return uploadedImages;
  }

  async getDetailImagesMoneyDelivery(moneyDeliveryId: string): Promise<IMoneyDeliveryImage[]> {
    const moneyDelivery = await MoneyDelivery.findById(moneyDeliveryId).select('images').lean();

    if (!moneyDelivery) {
      return [];
    }

    return moneyDelivery.images || [];
  }

  async updateDataImagesMoneyDelivery(
    moneyDeliveryId: string,
    images: IMoneyDeliveryImage[]
  ): Promise<IMoneyDeliveryImage[]> {
    const moneyDelivery = await MoneyDelivery.findById(moneyDeliveryId);

    if (!moneyDelivery) {
      throw new Error('Money delivery not found');
    }

    // Update images data
    moneyDelivery.images = images;
    await moneyDelivery.save();

    return moneyDelivery.images;
  }

  async getListReportReturnMoneyDeliveryTypeCollectWithStatusDone(
    userId: string
  ): Promise<IGetListReportReturnMoneyDeliveryResponse> {
    try {
      const toRouteId = await this.userService.getUserSelectedRouteId(userId);

      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
      const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
      const sevenDaysAgo = new Date(todayStart);
      sevenDaysAgo.setDate(todayStart.getDate() - 7);

      // get quantity of Return created today
      const quantityReturnIsToday = await MoneyDelivery.countDocuments({
        toRoute: toRouteId,
        status: MoneyDeliveryStatus.DONE,
        type: MoneyDeliveryType.COLLECT,
        createdAt: {
          $gte: todayStart,
          $lte: todayEnd,
        },
        dateReturn: {
          $gte: todayStart,
          $lte: todayEnd,
        },
      });

      // get quantity of Return created from 7 days ago until start of today
      const quantityReturnIsOld = await MoneyDelivery.countDocuments({
        toRoute: toRouteId,
        status: MoneyDeliveryStatus.DONE,
        type: MoneyDeliveryType.COLLECT,
        createdAt: {
          $gte: sevenDaysAgo,
          $lt: todayEnd,
        },
        dateReturn: {
          $gte: todayStart,
          $lte: todayEnd,
        },
      });

      const quantityReturnTotalToday = quantityReturnIsToday + quantityReturnIsOld;

      return {
        quantityReturnIsToday: quantityReturnIsToday,
        quantityReturnIsOld: quantityReturnIsOld,
        quantityReturnTotalToday: quantityReturnTotalToday,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get list money delivery type collect cost with status done');
    }
  }

  async getListReportReturnMoneyDeliveryNotTypeCollectWithStatusDone(
    userId: string
  ): Promise<IGetListReportReturnMoneyDeliveryResponse> {
    try {
      const toRouteId = await this.userService.getUserSelectedRouteId(userId);

      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
      const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
      const sevenDaysAgo = new Date(todayStart);
      sevenDaysAgo.setDate(todayStart.getDate() - 7);

      // get quantity of Return created today
      const quantityReturnIsToday = await MoneyDelivery.countDocuments({
        toRoute: toRouteId,
        status: MoneyDeliveryStatus.DONE,
        type: {
          $ne: MoneyDeliveryType.COLLECT,
        },
        createdAt: {
          $gte: todayStart,
          $lte: todayEnd,
        },
        dateReturn: {
          $gte: todayStart,
          $lte: todayEnd,
        },
      });

      // get quantity of Return created from 7 days ago until start of today
      const quantityReturnIsOld = await MoneyDelivery.countDocuments({
        toRoute: toRouteId,
        status: MoneyDeliveryStatus.DONE,
        type: {
          $ne: MoneyDeliveryType.COLLECT,
        },
        createdAt: {
          $gte: sevenDaysAgo,
          $lt: todayEnd,
        },
        dateReturn: {
          $gte: todayStart,
          $lte: todayEnd,
        },
      });

      const quantityReturnTotalToday = quantityReturnIsToday + quantityReturnIsOld;

      return {
        quantityReturnIsToday: quantityReturnIsToday,
        quantityReturnIsOld: quantityReturnIsOld,
        quantityReturnTotalToday: quantityReturnTotalToday,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get list money delivery type collect cost with status done');
    }
  }
}
