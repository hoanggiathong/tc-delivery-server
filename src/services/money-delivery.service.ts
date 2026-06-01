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
import { Customer } from '@/models/customer.model';
import { MONEY_DELIVERY_IDENTIFIER_PARSE_PATTERN } from '@/utils/validation-patterns';
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
} from '@/types/money-delivery.type';
import { RouteType } from '@/types';

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
        name: populated.senderName,
        phone: populated.sender.phone,
      },
      receiver: {
        id: populated.receiver._id,
        name: populated.receiverName,
        phone: populated.receiver.phone,
      },
      fromRoute: {
        id: String(populated.fromRoute._id),
        code: populated.fromRoute.code,
        name: populated.fromRoute.name,
        address: populated.fromRoute.address,
        phone: populated.fromRoute.phone,
        createdAt: populated.fromRoute.createdAt,
        updatedAt: populated.fromRoute.updatedAt,
        type: populated.fromRoute.type ?? RouteType.OWNED,
      },
      toRoute: {
        id: String(populated.toRoute._id),
        code: populated.toRoute.code,
        name: populated.toRoute.name,
        address: populated.toRoute.address,
        phone: populated.toRoute.phone,
        createdAt: populated.toRoute.createdAt,
        updatedAt: populated.toRoute.updatedAt,
        type: populated.toRoute.type ?? RouteType.OWNED,
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
      createdByUser: populated.createdByUser?.username || '',
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
      },
      receiver: {
        id: moneyDelivery.receiver._id,
        name: moneyDelivery.receiverName,
        phone: moneyDelivery.receiver.phone,
      },
      fromRoute: {
        id: moneyDelivery.fromRoute._id,
        code: moneyDelivery.fromRoute.code,
        name: moneyDelivery.fromRoute.name,
        address: moneyDelivery.fromRoute.address,
        phone: moneyDelivery.fromRoute.phone,
        createdAt: moneyDelivery.fromRoute.createdAt,
        updatedAt: moneyDelivery.fromRoute.updatedAt,
        type: moneyDelivery.fromRoute.type ?? RouteType.OWNED,
      },
      toRoute: {
        id: moneyDelivery.toRoute._id,
        code: moneyDelivery.toRoute.code,
        name: moneyDelivery.toRoute.name,
        address: moneyDelivery.toRoute.address,
        phone: moneyDelivery.toRoute.phone,
        createdAt: moneyDelivery.toRoute.createdAt,
        updatedAt: moneyDelivery.toRoute.updatedAt,
        type: moneyDelivery.toRoute.type ?? RouteType.OWNED,
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
      createdByUser: moneyDelivery.createdByUser?.username || '',
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

    // Find or create sender and receiver
    const sender = await this.customerService.findOrCreateCustomer(
      data.senderPhone,
      data.senderName,
      fromRouteId
    );
    const receiver = await this.customerService.findOrCreateCustomer(
      data.receiverPhone,
      data.receiverName,
      data.toRouteId
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

    let codeData: { code: string; fullCode: string; subCode: string };
    if (data.fullCode && data.code && data.subCode) {
      codeData = {
        code: data.code,
        fullCode: data.fullCode,
        subCode: data.subCode,
      };
    } else {
      codeData = await CodeGeneratorService.generateNextMoneyDeliveryCode(
        data.toRouteId,
        fromRouteId
      );
    }

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
        userSelectedRouteId
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
        data.toRouteId || moneyDelivery.toRoute.toString()
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
        id: String(toRoute._id),
        code: toRoute.code,
        name: toRoute.name,
        address: toRoute.address,
        createdAt: toRoute.createdAt,
        updatedAt: toRoute.updatedAt,
        type: toRoute.type ?? RouteType.OWNED,
      },
      fromRoute: {
        id: String(fromRoute._id),
        code: fromRoute.code,
        name: fromRoute.name,
        address: fromRoute.address,
        createdAt: fromRoute.createdAt,
        updatedAt: fromRoute.updatedAt,
        type: fromRoute.type ?? RouteType.OWNED,
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
    const match = deliveryIdentifier.match(MONEY_DELIVERY_IDENTIFIER_PARSE_PATTERN);
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

      // Find sender by phone only
      const sender = await Customer.findOne({
        phone: senderIdentifier,
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
            fromRoute: new Types.ObjectId(userSelectedRouteId),
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
              type: '$toRouteData.type?? RouteType.OWNED',
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
            // Only apply for Collect and collect for customer (Flow trả hàng)
            $or: [
              { type: MoneyDeliveryType.NORMAL },
              { type: MoneyDeliveryType.COLLECT_FOR_CUSTOMER },
            ], // Không lấy thu hộ
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
          $project: {
            _id: 1,
            code: 1,
            subCode: 1,
            sender: {
              name: '$senderName',
              phone: '$sender.phone',
            },
            receiver: {
              name: '$receiverName',
              phone: '$receiver.phone',
            },
            toRoute: {
              id: { $toString: '$toRoute._id' },
              code: '$toRoute.code',
              name: '$toRoute.name',
              address: '$toRoute.address',
              phone: '$toRoute.phone',
              type: '$toRoute.type?? RouteType.OWNED',
            },
            sendMoneyAmount: 1,
            sendCost: 1,
            totalCost: 1,
            transferType: 1,
            isFree: 1,
            status: 1,
            type: 1,
            deliveryId: 1,
            notes: 1,
            fullCode: 1,
            createdAt: 1,
          },
        },
        { $sort: { createdAt: -1 } },
      ];

      const deliveriesData = await MoneyDelivery.aggregate(pipeline);

      // Format money deliveries
      const moneyDeliveries: ITodayMoneyDeliveryItem[] = deliveriesData.map((item: any) => ({
        id: item._id.toString(),
        code: item.code,
        subCode: item.subCode,
        sender: item.sender,
        receiver: item.receiver,
        toRoute: item.toRoute,
        sendMoneyAmount: item.sendMoneyAmount,
        sendCost: item.sendCost,
        totalCost: item.totalCost,
        transferType: item.transferType,
        isFree: item.isFree,
        notes: item.notes,
        fullCode: item.fullCode,
        status: item.status,
        type: item.type,
        deliveryId: item.deliveryId?.toString(),
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
            // Only apply for Collect and collect for customer (Flow trả hàng)
            $or: [
              { type: MoneyDeliveryType.NORMAL },
              { type: MoneyDeliveryType.COLLECT_FOR_CUSTOMER },
            ], // Không lấy thu hộ
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
                    type: '$toRoute.type?? RouteType.OWNED',
                  },
                  sendMoneyAmount: 1,
                  sendCost: 1,
                  totalCost: 1,
                  transferType: 1,
                  isFree: 1,
                  status: 1,
                  type: 1,
                  deliveryId: 1,
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
        fullCode: item.fullCode,
        date: item.createdAt,
        sender: item.sender,
        receiver: item.receiver,
        toRoute: item.toRoute,
        sendMoneyAmount: item.sendMoneyAmount,
        sendCost: item.sendCost,
        totalCost: item.totalCost,
        transferType: item.transferType,
        isFree: item.isFree,
        notes: item.notes,
        status: item.status,
        type: item.type,
        deliveryId: item.deliveryId?.toString(),
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
            type: route.type ?? RouteType.OWNED,
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
  private async resolveEditableCustomer(
    currentCustomerId: string,
    name?: string,
    phone?: string,
    routeId?: string
  ): Promise<Types.ObjectId> {
    const currentCustomer = await Customer.findById(currentCustomerId);

    if (!currentCustomer) {
      throw new Error('Customer not found');
    }

    const nextName = name?.trim();
    const nextPhone = phone?.trim();

    if (nextPhone && nextPhone !== currentCustomer.phone) {
      const existedCustomer = await Customer.findOne({
        phone: nextPhone,
        _id: { $ne: currentCustomer._id },
      });

      if (existedCustomer) {
        if (nextName !== undefined) {
          existedCustomer.name = nextName;
        }

        if (routeId) {
          existedCustomer.routeId = new Types.ObjectId(routeId);
        }

        await existedCustomer.save();
        return new Types.ObjectId(existedCustomer._id);
      }
    }

    if (nextName !== undefined) {
      currentCustomer.name = nextName;
    }

    if (nextPhone !== undefined) {
      currentCustomer.phone = nextPhone;
    }

    if (routeId) {
      currentCustomer.routeId = new Types.ObjectId(routeId);
    }

    await currentCustomer.save();

    return new Types.ObjectId(currentCustomer._id);
  }

  async updateMoneyDeliveryByFullCode(
    fullCode: string,
    updateData: {
      senderName?: string;
      senderPhone?: string;
      receiverName?: string;
      receiverPhone?: string;
      toRouteId?: string;
    }
  ): Promise<IMoneyDeliveryResponse> {
    try {
      const parsed = this.parseDeliveryIdentifier(fullCode);
      if (!parsed) {
        throw new Error('Invalid fullCode format');
      }

      const { code, fromRouteCode, toRouteCode } = parsed;

      const [fromRoute, toRoute] = await Promise.all([
        Route.findOne({ code: fromRouteCode }),
        Route.findOne({ code: toRouteCode }),
      ]);

      if (!fromRoute || !toRoute) {
        throw new Error('Routes not found for the given fullCode');
      }

      const existingMoneyDelivery = await MoneyDelivery.findOne({
        fullCode: fullCode,
      });

      if (!existingMoneyDelivery) {
        throw new Error('Money delivery not found');
      }

      const updates: any = {};

      if (updateData.senderName !== undefined || updateData.senderPhone !== undefined) {
        updates.sender = await this.resolveEditableCustomer(
          existingMoneyDelivery.sender.toString(),
          updateData.senderName,
          updateData.senderPhone,
          fromRoute._id.toString()
        );

        if (updateData.senderName !== undefined) {
          updates.senderName = updateData.senderName.trim();
        }
      }

      const finalToRouteId = updateData.toRouteId ?? toRoute._id.toString();

      if (updateData.receiverName !== undefined || updateData.receiverPhone !== undefined) {
        updates.receiver = await this.resolveEditableCustomer(
          existingMoneyDelivery.receiver.toString(),
          updateData.receiverName,
          updateData.receiverPhone,
          finalToRouteId
        );
        if (updateData.receiverName !== undefined) {
          updates.receiverName = updateData.receiverName.trim();
        }
      }

      if (updateData.toRouteId !== undefined) {
        const newToRoute = await Route.findById(updateData.toRouteId);

        if (!newToRoute) {
          throw new Error('New to route not found');
        }

        updates.toRoute = newToRoute._id;
      }

      const updatedMoneyDelivery = await MoneyDelivery.findByIdAndUpdate(
        existingMoneyDelivery._id,
        { $set: updates },
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
        dateReturn: { $gte: startDate, $lte: endDate },
      })
        .populate([
          { path: 'sender', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' },
          { path: 'deliveryId', select: '_id code name createdAt updatedAt' },
        ])
        .sort({ dateReturn: -1 })
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
            },
            receiver: {
              id: moneyDelivery.receiver._id.toString(),
              name: moneyDelivery.receiverName,
              phone: moneyDelivery.receiver.phone,
            },
            fromRoute: {
              id: moneyDelivery.fromRoute._id.toString(),
              code: moneyDelivery.fromRoute.code,
              name: moneyDelivery.fromRoute.name,
              address: moneyDelivery.fromRoute.address || '',
              phone: moneyDelivery.fromRoute.phone || '',
              createdAt: moneyDelivery.fromRoute.createdAt,
              updatedAt: moneyDelivery.fromRoute.updatedAt,
              type: moneyDelivery.fromRoute.type ?? RouteType.OWNED,
            },
            toRoute: {
              id: moneyDelivery.toRoute._id.toString(),
              code: moneyDelivery.toRoute.code,
              name: moneyDelivery.toRoute.name,
              address: moneyDelivery.toRoute.address || '',
              phone: moneyDelivery.toRoute.phone || '',
              createdAt: moneyDelivery.toRoute.createdAt,
              updatedAt: moneyDelivery.toRoute.updatedAt,
              type: moneyDelivery.toRoute.type ?? RouteType.OWNED,
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
            createdByUser: moneyDelivery.createdByUser?.username || '',
            createdAt: moneyDelivery.createdAt,
            updatedAt: moneyDelivery.updatedAt,
            contentReturn: moneyDelivery.contentReturn,
            dateReturn: moneyDelivery.dateReturn,
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
        dateReturn: { $gte: startDate, $lte: endDate },
      })
        .populate([
          { path: 'sender', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' },
          { path: 'deliveryId', select: '_id code name createdAt updatedAt' },
        ])
        .sort({ dateReturn: -1 })
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
        type: {
          $in: [MoneyDeliveryType.NORMAL, MoneyDeliveryType.COLLECT_FOR_CUSTOMER],
        },
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
            },
            receiver: {
              id: moneyDelivery.receiver._id.toString(),
              name: moneyDelivery.receiverName,
              phone: moneyDelivery.receiver.phone,
            },
            fromRoute: {
              id: moneyDelivery.fromRoute._id.toString(),
              code: moneyDelivery.fromRoute.code,
              name: moneyDelivery.fromRoute.name,
              address: moneyDelivery.fromRoute.address || '',
              phone: moneyDelivery.fromRoute.phone || '',
              createdAt: moneyDelivery.fromRoute.createdAt,
              updatedAt: moneyDelivery.fromRoute.updatedAt,
              type: moneyDelivery.fromRoute.type ?? RouteType.OWNED,
            },
            toRoute: {
              id: moneyDelivery.toRoute._id.toString(),
              code: moneyDelivery.toRoute.code,
              name: moneyDelivery.toRoute.name,
              address: moneyDelivery.toRoute.address || '',
              phone: moneyDelivery.toRoute.phone || '',
              createdAt: moneyDelivery.toRoute.createdAt,
              updatedAt: moneyDelivery.toRoute.updatedAt,
              type: moneyDelivery.toRoute.type ?? RouteType.OWNED,
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

    const uploadedImages = await this.handleUploadImagesMoneyDelivery(moneyDelivery, imagesData);
    // const uploadedImages = await this.handleUploadImagesMoneyDelivery(moneyDeliveryId, imagesData);

    // Update money delivery with new images
    moneyDelivery.images = uploadedImages;
    await moneyDelivery.save();

    return uploadedImages;
  }

  async handleUploadImagesMoneyDelivery(
    moneyDelivery: IMoneyDelivery,
    imagesData?: Array<{
      index: number;
      buffer: Buffer;
      originalName: string;
      rotate: number;
    }>
  ): Promise<IMoneyDeliveryImage[]> {
    const oldImages: IMoneyDeliveryImage[] = moneyDelivery.images || [];
    const quantityNewImages = imagesData?.length || 0;
    const quantityOldImages = oldImages.length || 0;
    const totalImages = quantityNewImages + quantityOldImages;

    const id = moneyDelivery._id.toString();

    // If no images provided, just return the existing images
    if (!imagesData || imagesData.length === 0) {
      return moneyDelivery.images || [];
    }

    // Handle multiple images upload
    let uploadedImages: IMoneyDeliveryImage[] = [];

    // Upload new images first
    for (const imageData of imagesData) {
      const { index, buffer, originalName, rotate } = imageData;

      // Create directory if not exists
      const uploadDir = path.join('public', 'uploads', 'money-deliveries', id);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generate unique filename with timestamp to avoid conflicts
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

    // If total images will exceed 5, delete oldest images from oldImages
    if (totalImages > 5) {
      const deleteQuantityImages = totalImages - 5;

      // Get the oldest images to delete (first deleteQuantityImages from oldImages)
      const imagesToDelete = oldImages.slice(0, deleteQuantityImages);

      // Delete physical files for images that will be removed
      for (const image of imagesToDelete) {
        try {
          const basePath = extractBasePath(image.url);
          const imagePath = path.join('public', basePath);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        } catch (error) {
          Logger.error('Error deleting old image file', {
            error: error instanceof Error ? error.message : error,
            imageUrl: image.url,
          });
        }
      }

      // Keep only the remaining old images (after deleting the oldest ones)
      const remainingOldImages = oldImages.slice(deleteQuantityImages);

      // Combine: new images first, then remaining old images
      uploadedImages = remainingOldImages.concat(uploadedImages);
    } else {
      // Total images <= 5, just combine new images with all old images
      uploadedImages = oldImages.concat(uploadedImages);
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

  async getDetailImagesByDeliveryId(deliveryId: string): Promise<IMoneyDeliveryImage[]> {
    const moneyDelivery = await MoneyDelivery.findOne({ deliveryId }).select('images').lean();

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

  async getListMoneyDeliveryByTypeNormal(
    userId: string,
    startDate: Date,
    endDate: Date,
    routeId?: string
  ): Promise<IMoneyDeliveryResponse[]> {
    try {
      const fromRouteId = await this.userService.getUserSelectedRouteId(userId);
      const where: Record<string, unknown> = {
        type: {
          $in: [MoneyDeliveryType.NORMAL, MoneyDeliveryType.COLLECT_FOR_CUSTOMER],
        },
        fromRoute: fromRouteId,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      };

      if (routeId) {
        where.toRoute = routeId;
      } else {
        where.toRoute = {
          $ne: fromRouteId,
        };
      }

      const moneyDeliveries = await MoneyDelivery.find(where)
        .populate([
          { path: 'sender', select: '_id phone routeId createdAt updatedAt' },
          { path: 'receiver', select: '_id phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' },
        ])
        .lean();

      return moneyDeliveries.map(moneyDelivery =>
        this.transformMoneyDeliveryToResponseOptimized(
          this.toPopulatedMoneyDeliveryLean(moneyDelivery)
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get list money delivery type normal with status done');
    }
  }

  async getListMoneyDeliveryByTypeCollect(
    userId: string,
    startDate: Date,
    endDate: Date,
    routeId?: string
  ): Promise<IMoneyDeliveryResponse[]> {
    try {
      const toRouteId = await this.userService.getUserSelectedRouteId(userId);

      const where: Record<string, unknown> = {
        // status: MoneyDeliveryStatus.DONE,
        type: MoneyDeliveryType.COLLECT,
        toRoute: toRouteId,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      };

      if (routeId) {
        where.fromRoute = routeId;
      } else {
        where.fromRoute = {
          $ne: toRouteId,
        };
      }

      const moneyDeliveries = await MoneyDelivery.find(where)
        .populate([
          { path: 'sender', select: '_id phone routeId createdAt updatedAt' },
          { path: 'receiver', select: '_id phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' },
        ])
        .lean();

      return moneyDeliveries.map(moneyDelivery =>
        this.transformMoneyDeliveryToResponseOptimized(
          this.toPopulatedMoneyDeliveryLean(moneyDelivery)
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get list money delivery type collect with status done');
    }
  }

  async recoveryMoneyDeliveryWithTypeCollectByFullCodeAndStaffNameRecoveryMoney(
    fullCode: string,
    staffNameRecoveryMoney: string,
    userId: string
  ): Promise<void> {
    try {
      const moneyDelivery = await MoneyDelivery.findOne({
        fullCode,
        status: MoneyDeliveryStatus.DONE,
        type: MoneyDeliveryType.COLLECT,
      });

      if (!moneyDelivery) {
        throw new Error(`Không tìm thấy mã thu hộ ${fullCode} đã hoàn tất`);
      }

      const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

      if (moneyDelivery.toRoute.toString() !== selectedRouteId.toString()) {
        throw new Error(`Chỉ trạm nhận tiền mới được phép khôi phục mã ${fullCode}`);
      }

      if (!moneyDelivery.dateReturn) {
        throw new Error(`Mã thu hộ ${fullCode} chưa có ngày trả tiền, không thể khôi phục`);
      }

      if (!this.isSameVietnamDay(new Date(moneyDelivery.dateReturn))) {
        throw new Error(
          `Mã thu hộ ${fullCode} đã trả tiền qua ngày, không thể khôi phục vì doanh thu đã được chốt`
        );
      }

      const note = `Khôi phục: mã thu hộ ${fullCode} bởi ${staffNameRecoveryMoney}`;
      const existingNotes = typeof moneyDelivery.notes === 'string' ? moneyDelivery.notes : '';
      const newNote = existingNotes ? `${note}, ${existingNotes}` : note;

      await MoneyDelivery.updateOne(
        { _id: moneyDelivery._id },
        {
          $set: {
            status: MoneyDeliveryStatus.WAITING,
            staffNameRecoveryMoney,
            notes: newNote,
            dateReturn: null,
            contentReturn: null,
          },
        },
        { runValidators: false }
      );

      Logger.info(`Khôi phục mã thu hộ ${fullCode} bởi ${staffNameRecoveryMoney}`, {
        moneyDeliveryId: moneyDelivery._id.toString(),
        fullCode,
        staffNameRecoveryMoney,
        type: MoneyDeliveryType.COLLECT,
      });
    } catch (error) {
      Logger.error('Lỗi khôi phục mã thu hộ', {
        error: error instanceof Error ? error.message : error,
        fullCode,
        staffNameRecoveryMoney,
      });

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Khôi phục mã thu hộ thất bại');
    }
  }

  private isSameVietnamDay(date: Date): boolean {
    const now = new Date();

    const vietnamNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const vietnamDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);

    return (
      vietnamNow.getUTCFullYear() === vietnamDate.getUTCFullYear() &&
      vietnamNow.getUTCMonth() === vietnamDate.getUTCMonth() &&
      vietnamNow.getUTCDate() === vietnamDate.getUTCDate()
    );
  }

  async recoveryMoneyDeliveryWithTypeNormalByFullCodeAndStaffNameRecoveryMoney(
    fullCode: string,
    staffNameRecoveryMoney: string,
    userId: string
  ): Promise<void> {
    try {
      const moneyDelivery = await MoneyDelivery.findOne({
        fullCode,
        status: MoneyDeliveryStatus.DONE,
        type: MoneyDeliveryType.NORMAL,
      });

      if (!moneyDelivery) {
        throw new Error(`Không tìm thấy mã chuyển tiền ${fullCode} đã hoàn tất`);
      }

      const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

      if (moneyDelivery.toRoute.toString() !== selectedRouteId.toString()) {
        throw new Error(`Chỉ trạm nhận tiền mới được phép khôi phục mã ${fullCode}`);
      }

      if (!moneyDelivery.dateReturn) {
        throw new Error(`Mã chuyển tiền ${fullCode} chưa có ngày trả tiền, không thể khôi phục`);
      }

      if (!this.isSameVietnamDay(new Date(moneyDelivery.dateReturn))) {
        throw new Error(
          `Mã chuyển tiền ${fullCode} đã trả tiền qua ngày, không thể khôi phục vì doanh thu đã được chốt`
        );
      }

      const note = `Khôi phục: mã chuyển tiền ${fullCode} bởi ${staffNameRecoveryMoney}`;
      const existingNotes = typeof moneyDelivery.notes === 'string' ? moneyDelivery.notes : '';
      const newNote = existingNotes ? `${note}, ${existingNotes}` : note;

      await MoneyDelivery.updateOne(
        { _id: moneyDelivery._id },
        {
          $set: {
            status: MoneyDeliveryStatus.WAITING,
            staffNameRecoveryMoney,
            notes: newNote,
            dateReturn: null,
            contentReturn: null,
          },
        },
        { runValidators: false }
      );

      Logger.info(`Khôi phục mã chuyển tiền ${fullCode} bởi ${staffNameRecoveryMoney}`, {
        moneyDeliveryId: moneyDelivery._id.toString(),
        fullCode,
        staffNameRecoveryMoney,
        type: MoneyDeliveryType.NORMAL,
      });
    } catch (error) {
      Logger.error('Lỗi khôi phục mã chuyển tiền', {
        error: error instanceof Error ? error.message : error,
        fullCode,
        staffNameRecoveryMoney,
      });

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Khôi phục mã chuyển tiền thất bại');
    }
  }
}
