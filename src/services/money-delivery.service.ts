import {
  IMoneyDelivery,
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

import { TYPE_DELIVERY_CUSTOMER } from '@/const/customer.const';
import {
  IFrequentMoneyCustomer,
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
      { path: 'sender', select: '_id name phone routeId createdAt updatedAt' },
      { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
      { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
      { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
      { path: 'createdByUser', select: '_id username' },
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
        createdAt: populated.fromRoute.createdAt,
        updatedAt: populated.fromRoute.updatedAt,
      },
      toRoute: {
        id: populated.toRoute._id,
        code: populated.toRoute.code,
        name: populated.toRoute.name,
        address: populated.toRoute.address,
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
        name: moneyDelivery.sender.name,
        phone: moneyDelivery.sender.phone,
        fromRouteId: moneyDelivery.sender.routeId.toString(),
        toRouteId: moneyDelivery.receiver.routeId.toString(),
        createdAt: moneyDelivery.sender.createdAt,
        updatedAt: moneyDelivery.sender.updatedAt,
      },
      receiver: {
        id: moneyDelivery.receiver._id,
        name: moneyDelivery.receiver.name,
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
        createdAt: moneyDelivery.fromRoute.createdAt,
        updatedAt: moneyDelivery.fromRoute.updatedAt,
      },
      toRoute: {
        id: moneyDelivery.toRoute._id,
        code: moneyDelivery.toRoute.code,
        name: moneyDelivery.toRoute.name,
        address: moneyDelivery.toRoute.address,
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
    };
  }

  /**
   * Create a new money delivery
   */
  async createMoneyDelivery(
    data: IMoneyDeliveryCreateRequest,
    userId: string
  ): Promise<IMoneyDeliveryResponse> {
    // Get user's selected route as fromRoute
    const fromRouteId = await this.userService.getUserSelectedRouteId(userId);

    // Find or create sender and receiver with type 'money'
    const sender = await this.customerService.findOrCreateCustomer(
      data.senderPhone,
      data.senderName,
      fromRouteId,
      'money'
    );
    const receiver = await this.customerService.findOrCreateCustomer(
      data.receiverPhone,
      data.receiverName,
      data.toRouteId,
      'money'
    );

    // Update sender's relativeReceiver array
    await this.customerService.addRelativeReceiver(sender._id.toString(), receiver._id.toString());

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
      receiver: receiver._id,
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
        'money'
      );
      updateData.sender = sender.id;
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
        'money'
      );
      updateData.receiver = receiver.id;
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
          { path: 'sender', select: '_id name phone createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
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
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
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
          { path: 'sender', select: '_id name phone createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
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
      const receivers = await this.customerService.getFrequentReceivers(
        senderIdentifier,
        TYPE_DELIVERY_CUSTOMER.MONEY,
        userId
      );

      if (receivers.length === 0) {
        return [];
      }

      const sender = await this.customerService.getCustomerByPhoneAndType(
        senderIdentifier,
        TYPE_DELIVERY_CUSTOMER.MONEY
      );

      if (!sender) {
        Logger.debug('Sender not found for frequent money customers', { senderIdentifier });
        return [];
      }

      const routeIds = receivers.map(receiver => receiver.routeId);
      const routes = await Route.find({ _id: { $in: routeIds } }).lean();
      const routeMap = new Map(routes.map(route => [route._id.toString(), route]));

      const receiverIds = receivers.map(receiver => receiver._id);

      const moneyDeliveryStats = await MoneyDelivery.aggregate([
        {
          $match: {
            sender: sender._id,
            receiver: { $in: receiverIds },
          },
        },
        {
          $group: {
            _id: '$receiver',
            totalSendMoneyAmount: { $sum: '$sendMoneyAmount' },
            totalSendCost: { $sum: '$sendCost' },
            totalCost: { $sum: '$totalCost' },
            lastDeliveryDate: { $max: '$createdAt' },
          },
        },
      ]);

      const statsMap = new Map(moneyDeliveryStats.map(item => [item._id.toString(), item]));

      const frequentCustomers: IFrequentMoneyCustomer[] = receivers
        .map(receiver => {
          const route = routeMap.get(receiver.routeId.toString());
          const stats = statsMap.get(receiver._id.toString());

          if (!stats) {
            return null;
          }

          if (!route) {
            Logger.warn('Route not found for money receiver', {
              receiverId: receiver._id,
              routeId: receiver.routeId,
              senderIdentifier,
            });
          }

          return {
            senderName: sender.name,
            senderPhone: sender.phone,
            receiverName: receiver.name,
            receiverPhone: receiver.phone,
            toRoute: {
              id: receiver.routeId.toString(),
              code: route?.code || 'UNKNOWN',
              name: route?.name || 'Unknown Route',
            },
            totalSendMoneyAmount: stats.totalSendMoneyAmount,
            totalSendCost: stats.totalSendCost,
            totalCost: stats.totalCost,
            lastDeliveryDate: stats.lastDeliveryDate,
          };
        })
        .filter((customer): customer is IFrequentMoneyCustomer => customer !== null)
        .sort(
          (a, b) => new Date(b.lastDeliveryDate).getTime() - new Date(a.lastDeliveryDate).getTime()
        );

      Logger.debug('Frequent money customers retrieved (optimized)', {
        senderIdentifier,
        count: frequentCustomers.length,
        totalReceivers: receivers.length,
        totalRoutes: routes.length,
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
   * Get money delivery cost report with date range filtering and pagination
   */
  async getCostReport(
    userId: string,
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 100
  ): Promise<IMoneyDeliveryCostReport> {
    try {
      // Get user's selected route information
      const userRouteInfo = await this.userService.getUserSelectedRoute(userId);
      const selectedRouteId = userRouteInfo.selectedRouteId;

      // Get route information
      const route = await Route.findById(selectedRouteId).select('_id code name address').lean();
      if (!route) {
        throw new Error('Selected route not found');
      }

      const skip = (page - 1) * limit;

      // Set end date to end of day
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Aggregation pipeline for money deliveries cost report
      const pipeline: PipelineStage[] = [
        {
          $match: {
            fromRoute: new Types.ObjectId(selectedRouteId),
            createdAt: {
              $gte: startDate,
              $lte: endOfDay,
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
            totalCount: [{ $count: 'count' }],
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
              { $skip: skip },
              { $limit: limit },
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
      const totalCount = result[0]?.totalCount[0]?.count || 0;
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

      // Calculate pagination
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        summary,
        moneyDeliveries,
        pagination: {
          currentPage: page,
          totalPages,
          totalRecords: totalCount,
          limit,
          hasNextPage,
          hasPrevPage,
        },
        filter: {
          dateRange: {
            from: startDate,
            to: endOfDay,
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
        page,
        limit,
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

  async getListMoneyDeliveryByUserIdAndType(
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

  async getListReturnMoneyDeliveriesTypeCollectStatusDone(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IMoneyDeliveryResponse[]> {
    try {
      // Get user's selected route as fromRoute
      const fromRouteId = await this.userService.getUserSelectedRouteId(userId);

      const moneyDeliveries = await MoneyDelivery.find({
        fromRoute: fromRouteId,
        status: MoneyDeliveryStatus.DONE,
        type: MoneyDeliveryType.COLLECT,
        createdAt: { $gte: startDate, $lte: endDate },
      })
        .populate([
          { path: 'sender', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' },
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
      throw new Error('Failed to get list return money deliveries type collect status done');
    }
  }
}
