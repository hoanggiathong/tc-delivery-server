import { Delivery } from '@/models/delivery.model';
import { Route } from '@/models/route.model';
import { MoneyDelivery, MoneyDeliveryStatus } from '@/models/money-delivery.model';
import { Types, PipelineStage } from 'mongoose';
import { omitBy, isUndefined } from 'lodash';
import { CustomerService } from '@/services/customer.service';
import { CodeGeneratorService } from '@/services/code-generator.service';
import { SettingsService } from '@/services/settings.service';
import { UserService } from '@/services/user.service';
import { CustomerAddressHistoryService } from '@/services/customer-address-history.service';
import {
  IDeliveryCreateRequest,
  IDeliveryUpdateRequest,
  IDeliveryResponse,
  IDeliveryLeanPopulated,
  INextCodeResponse,
  IFrequentCustomer,
  ITodayDeliveryReport,
  ITodayDeliveryItem,
  IDeliveryPopulated,
  IGetListReportReturnDeliveryResponse,
  IGetListDeliveryInventoryRequest,
  IGetListDeliveryInventoryAboutHomeDeliveryResponse,
} from '@/types/delivery.type';
import {
  IReturnDeliveryResponse,
  IReturnDeliveryLeanPopulated,
} from '@/types/return-delivery.type';
import { ICustomer, Customer } from '@/models/customer.model';
import Logger from '@/utils/logger';
import { PaymentType } from '@/types';
import { getStartOfDayVietnam, getEndOfDayVietnam, convertVietnamToUTC } from '@/utils/date.utils';
import { PAYMENT_TYPE } from '@/const/money-deliveries.const';

export class DeliveryService {
  private customerService: CustomerService;
  private settingsService: SettingsService;
  private userService: UserService;
  private customerAddressHistoryService: CustomerAddressHistoryService;

  constructor() {
    this.customerService = new CustomerService();
    this.settingsService = new SettingsService();
    this.userService = new UserService();
    this.customerAddressHistoryService = new CustomerAddressHistoryService();
  }

  /**
   * Validate itemCost against shipping rates
   */
  private async validateItemCost(itemValue: number, itemCost: number): Promise<void> {
    try {
      const shippingRates = await this.settingsService.getShippingRates();

      if (!shippingRates || !Array.isArray(shippingRates) || shippingRates.length === 0) {
        throw new Error('Shipping rate configuration not found. Please contact administrator.');
      }

      // Find the applicable shipping rate for the item value
      const applicableRate = shippingRates.find(
        rate => itemValue >= rate.fromAmount && itemValue <= rate.toAmount
      );

      if (!applicableRate) {
        throw new Error(
          `No shipping rate found for item value ${itemValue.toLocaleString()} VND. Please check the item value.`
        );
      }

      let expectedCost: number;
      let errorMessage: string;

      if (applicableRate.regularShippingFeeUnit === '%') {
        // Percentage-based fee
        expectedCost = Math.round(itemValue * (applicableRate.regularShippingFee / 100));
        errorMessage = `Invalid item cost. Expected: ${applicableRate.regularShippingFee}% of item value (${expectedCost.toLocaleString()} VND), but received: ${itemCost.toLocaleString()} VND. Please correct the item cost.`;
      } else {
        // Fixed fee
        expectedCost = applicableRate.regularShippingFee;
        errorMessage = `Invalid item cost. Expected: ${expectedCost.toLocaleString()} VND, but received: ${itemCost.toLocaleString()} VND. Please correct the item cost.`;
      }

      if (itemCost !== expectedCost) {
        throw new Error(errorMessage);
      }

      Logger.debug('ItemCost validation successful', {
        itemValue,
        itemCost,
        expectedCost,
        feeType: applicableRate.regularShippingFeeUnit,
      });
    } catch (error) {
      Logger.error('ItemCost validation failed', {
        error: error instanceof Error ? error.message : error,
        itemValue,
        itemCost,
      });
      throw error;
    }
  }

  /**
   * Type assertion helper for lean populated delivery objects
   */
  private toPopulatedDeliveryLean(delivery: unknown): IDeliveryLeanPopulated {
    return delivery as IDeliveryLeanPopulated;
  }

  /**
   * Type assertion helper for lean populated return delivery objects
   */
  private toPopulatedReturnDeliveryLean(returnDelivery: unknown): IReturnDeliveryLeanPopulated[] {
    return returnDelivery as IReturnDeliveryLeanPopulated[];
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
        name: delivery.senderName,
        phone: delivery.sender.phone,
        fromRouteId: delivery.sender.routeId?.toString(),
        bank: delivery.sender.bankId
          ? {
              id: delivery.sender.bankId._id,
              name: delivery.sender.bankId.name,
              bankName: delivery.sender.bankId.bankName,
              bankAccount: delivery.sender.bankId.bankAccount,
              bankBranch: delivery.sender.bankId.bankBranch,
              bankAddress: delivery.sender.bankId.bankAddress,
            }
          : undefined,
        createdAt: delivery.sender.createdAt,
        updatedAt: delivery.sender.updatedAt,
      },
      receiver: {
        id: delivery.receiver._id,
        name: delivery.receiverName,
        phone: delivery.receiver.phone,
        toRouteId: delivery.receiver.routeId?.toString(),
        createdAt: delivery.receiver.createdAt,
        updatedAt: delivery.receiver.updatedAt,
      },
      fromRoute: {
        id: delivery.fromRoute._id,
        code: delivery.fromRoute.code,
        name: delivery.fromRoute.name,
        address: delivery.fromRoute.address,
        phone: delivery.fromRoute.phone,
      },
      toRoute: {
        id: delivery.toRoute._id,
        code: delivery.toRoute.code,
        name: delivery.toRoute.name,
        address: delivery.toRoute.address,
        phone: delivery.toRoute.phone,
      },
      name: delivery.name,
      nameProductAndAdditionalInformation: delivery.nameProductAndAdditionalInformation,
      quantity: delivery.quantity,
      cost: delivery.cost,
      homeDelivery: delivery.homeDelivery,
      homeDeliveryCost: delivery.homeDeliveryCost,
      carryCost: delivery.carryCost,
      homeDeliveryCostTotal: delivery.homeDeliveryCostTotal,
      vehicleType: delivery.vehicleType,
      itemValue: delivery.itemValue,
      itemCost: delivery.itemCost,
      collectCost: delivery.collectCost,
      collectForCustomer: delivery.collectForCustomer,
      collectForCustomerCost: delivery.collectForCustomerCost,
      collectForCustomerNote: delivery.collectForCustomerNote,
      details: delivery.details,
      notes: delivery.notes,
      totalCost: delivery.totalCost,
      actualRevenue: delivery.actualRevenue,
      paymentType: delivery.paymentType,
      createdByUser: delivery.createdByUser.name,
      isFree: delivery.isFree,
      isReturn: delivery.isReturn,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
    };
  }

  /**
   * Create a new delivery
   */
  async createDelivery(data: IDeliveryCreateRequest, userId: string): Promise<IDeliveryResponse> {
    // Get user's selected route as fromRoute
    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

    // Find or create sender and receiver
    const sender = await this.customerService.findOrCreateCustomer(
      data.senderPhone,
      data.senderName,
      selectedRouteId
    );
    const receiver = await this.customerService.findOrCreateCustomer(
      data.receiverPhone,
      data.receiverName,
      data.toRouteId
    );

    // Validate fromRoute and toRoute exist
    const [fromRoute, toRoute] = await Promise.all([
      Route.findById(selectedRouteId),
      Route.findById(data.toRouteId),
    ]);

    if (!fromRoute) {
      throw new Error('User selected route not found');
    }
    if (!toRoute) {
      throw new Error('To route not found');
    }

    // Generate delivery code with new system
    const codeData = await CodeGeneratorService.generateNextCode(data.toRouteId, selectedRouteId);

    // Create delivery
    const delivery = new Delivery({
      code: codeData.code,
      fullCode: codeData.fullCode,
      subCode: codeData.subCode,
      sender: sender._id,
      senderName: data.senderName,
      receiver: receiver._id,
      receiverName: data.receiverName,
      fromRoute: selectedRouteId,
      toRoute: data.toRouteId,
      name: data.name,
      nameProductAndAdditionalInformation: data.nameProductAndAdditionalInformation,
      quantity: data.quantity || 1,
      cost: data.cost,
      homeDelivery: data.homeDelivery,
      homeDeliveryCost: data.homeDeliveryCost,
      carryCost: data.carryCost,
      vehicleType: data.vehicleType,
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

    // Auto-create address history if homeDelivery exists
    if (delivery.homeDelivery && delivery.homeDelivery.trim() !== '') {
      try {
        await this.customerAddressHistoryService.createFromDelivery(delivery);
      } catch (error) {
        // Log error but don't fail delivery creation
        Logger.warn('Failed to create address history', {
          deliveryId: delivery._id,
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    // Query the saved delivery with populate and lean
    const populatedDelivery = await Delivery.findById(delivery._id)
      .populate([
        {
          path: 'sender',
          select: '_id phone routeId createdAt updatedAt',
          populate: {
            path: 'bankId',
            select: '_id name bankName bankAccount bankBranch bankAddress',
          },
        },
        { path: 'receiver', select: '_id phone routeId createdAt updatedAt' },
        { path: 'fromRoute', select: '_id code name address phone' },
        { path: 'toRoute', select: '_id code name address phone' },
        { path: 'createdByUser', select: '_id username name' },
      ])
      .lean();

    if (!populatedDelivery) {
      throw new Error('Failed to retrieve created delivery');
    }

    return this.transformDeliveryToResponseOptimized(
      this.toPopulatedDeliveryLean(populatedDelivery)
    );
  }

  /**
   * Update delivery by ID
   */
  async updateDelivery(
    id: string,
    data: IDeliveryUpdateRequest,
    userId: string
  ): Promise<IDeliveryResponse> {
    const delivery = await Delivery.findById(id);
    if (!delivery) {
      throw new Error('Delivery not found');
    }

    const userSelectedRouteId = await this.userService.getUserSelectedRouteId(userId);
    const updateData: Record<string, unknown> = {};

    // Handle sender update - always use userSelectedRouteId for sender
    if (data.senderName || data.senderPhone) {
      const senderName = data.senderName || delivery.sender.toString();
      const senderPhone = data.senderPhone || delivery.sender.toString();
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
      updateData.sender = delivery.sender;
    }

    // Always ensure fromRoute is userSelectedRouteId
    updateData.fromRoute = userSelectedRouteId;

    // Handle receiver update
    if (data.receiverName || data.receiverPhone) {
      const receiverName = data.receiverName || delivery.receiver.toString();
      const receiverPhone = data.receiverPhone || delivery.receiver.toString();
      const receiver = await this.customerService.findOrCreateCustomer(
        receiverPhone,
        receiverName,
        data.toRouteId || delivery.toRoute.toString()
      );
      updateData.receiver = receiver.id;
      if (data.receiverName) {
        updateData.receiverName = data.receiverName;
      }
    } else {
      updateData.receiver = delivery.receiver;
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
        name: data.name,
        nameProductAndAdditionalInformation: data.nameProductAndAdditionalInformation,
        quantity: data.quantity,
        cost: data.cost,
        homeDelivery: data.homeDelivery,
        homeDeliveryCost: data.homeDeliveryCost,
        carryCost: data.carryCost,
        vehicleType: data.vehicleType,
        itemValue: data.itemValue,
        itemCost: data.itemCost,
        collectCost: data.collectCost,
        collectForCustomer: data.collectForCustomer,
        collectForCustomerCost: data.collectForCustomerCost,
        collectForCustomerNote: data.collectForCustomerNote,
        details: data.details,
        notes: data.notes,
        paymentType: data.paymentType,
        isFree: data.isFree,
      },
      isUndefined
    );

    // Merge optional fields into updateData
    Object.assign(updateData, optionalFieldsUpdate);

    // Update delivery
    await Delivery.findByIdAndUpdate(id, { $set: updateData }, { runValidators: true });

    // Query the updated delivery with populate and lean
    const populatedDelivery = await Delivery.findById(id)
      .populate([
        {
          path: 'sender',
          select: '_id phone routeId createdAt updatedAt',
          populate: {
            path: 'bankId',
            select: '_id name bankName bankAccount bankBranch bankAddress',
          },
        },
        { path: 'receiver', select: '_id phone routeId createdAt updatedAt' },
        { path: 'fromRoute', select: '_id code name address phone' },
        { path: 'toRoute', select: '_id code name address phone' },
        { path: 'createdByUser', select: '_id username name' },
      ])
      .lean();

    if (!populatedDelivery) {
      throw new Error('Failed to retrieve updated delivery');
    }

    return this.transformDeliveryToResponseOptimized(
      this.toPopulatedDeliveryLean(populatedDelivery)
    );
  }

  /**
   * Get delivery by ID
   */
  async getDeliveryById(id: string): Promise<IDeliveryResponse | null> {
    try {
      const delivery = await Delivery.findById(id)
        .populate([
          {
            path: 'sender',
            select: '_id phone routeId createdAt updatedAt',
            populate: {
              path: 'bankId',
              select: '_id name bankName bankAccount bankBranch bankAddress',
            },
          },
          { path: 'receiver', select: '_id phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username name' },
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
  async getDeliveryByIdWithPopulation(id: string): Promise<IDeliveryPopulated | null> {
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

      return delivery as unknown as IDeliveryPopulated;
    } catch (error) {
      Logger.error('Failed to get delivery with population', {
        error: error instanceof Error ? error.message : error,
        deliveryId: id,
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
          {
            path: 'sender',
            select: '_id name phone routeId createdAt updatedAt',
            populate: {
              path: 'bankId',
              select: '_id name bankName bankAccount bankBranch bankAddress',
            },
          },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username name' },
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
      const senderIds = senders.map((sender: ICustomer) => sender._id.toString());

      // Find all deliveries by these senders with populated data
      const deliveries = await Delivery.find({
        sender: { $in: senderIds },
      })
        .populate([
          {
            path: 'sender',
            select: '_id name phone routeId createdAt updatedAt',
            populate: {
              path: 'bankId',
              select: '_id name bankName bankAccount bankBranch bankAddress',
            },
          },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address phone createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username name' },
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

    // Get next code preview
    const codeData = await CodeGeneratorService.getNextCodePreview(toRouteId, selectedRouteId);

    return {
      nextCode: codeData.code,
      fullCode: codeData.fullCode,
      subCode: codeData.subCode,
      toRoute: {
        id: toRoute._id,
        code: toRoute.code,
        name: toRoute.name,
        address: toRoute.address,
      },
      fromRoute: {
        id: fromRoute._id,
        code: fromRoute.code,
        name: fromRoute.name,
        address: fromRoute.address,
      },
    };
  }

  /**
   * Get delivery by code and route combination
   * @param deliveryIdentifier - Format: codeFromRouteToRoute (e.g., 0907250001T4T1)
   */
  async getDeliveryByCode(deliveryIdentifier: string): Promise<IDeliveryResponse | null> {
    // Parse delivery identifier
    const parsed = this.parseDeliveryIdentifier(deliveryIdentifier);
    if (!parsed) {
      throw new Error(
        'Invalid delivery identifier format. Expected: codeFromRouteToRoute (e.g., 0907250001T4T1)'
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
        { path: 'sender', select: '_id name phone routeId createdAt updatedAt' },
        { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
        { path: 'fromRoute', select: '_id code name address phone' },
        { path: 'toRoute', select: '_id code name address phone' },
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
   * @param fullCode - The delivery full code (e.g., 0907250001T4T1)
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
        'Invalid delivery identifier format. Expected: codeFromRouteToRoute (e.g., 0907250001T4T1)'
      );
    }

    const { fromRouteCode } = parsed;

    // Get user's selected route information
    const userRouteInfo = await this.userService.getUserSelectedRoute(userId);

    // Get user's selected route to compare with parsed fromRouteCode
    const userSelectedRoute = await Route.findById(userRouteInfo.selectedRouteId).select('code');
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
      fromRoute: userRouteInfo.selectedRouteId,
    })
      .populate([
        {
          path: 'sender',
          select: '_id name phone bankId',
          populate: {
            path: 'bankId',
            select: '_id name bankName bankAccount bankBranch bankAddress',
          },
        },
        { path: 'receiver', select: '_id name phone' },
        { path: 'fromRoute', select: '_id code name address phone' },
        { path: 'toRoute', select: '_id code name address' },
        { path: 'createdByUser', select: '_id username name' },
      ])
      .lean();

    if (!delivery) {
      return null;
    }

    return this.transformDeliveryToResponseOptimized(this.toPopulatedDeliveryLean(delivery));
  }

  /**
   * Parse delivery identifier to extract code and route codes
   * @param deliveryIdentifier - Format: codeFromRouteToRoute (e.g., 0907250001T4T1)
   */
  private parseDeliveryIdentifier(
    deliveryIdentifier: string
  ): { code: string; fromRouteCode: string; toRouteCode: string } | null {
    // Expected format: 10 digits + route codes (e.g., 0907250001T4T1, 0907250001ABCD)
    const match = deliveryIdentifier.match(/^(\d{10})([A-Z]([A-Z]|\d+))([A-Z]([A-Z]|\d+))$/);

    if (!match) {
      return null;
    }

    const [, code, fromRouteCode, , toRouteCode] = match;

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

  async getFrequentCustomers(
    senderIdentifier: string,
    userId: string
  ): Promise<IFrequentCustomer[]> {
    try {
      // Get user's selected route
      const userSelectedRouteId = await this.userService.getUserSelectedRouteId(userId);

      // Find sender by phone and selected route
      const sender = await Customer.findOne({
        phone: senderIdentifier,
      }).lean();

      if (!sender) {
        Logger.debug('Sender not found for frequent customers', {
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
        // // Group by unique combination of (senderName, receiverName, receiver phone, toRoute)
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
            _id: 1,
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

      const results = await Delivery.aggregate(pipeline);

      const frequentCustomers: IFrequentCustomer[] = results.map(result => ({
        senderName: result.senderName,
        senderPhone: sender.phone,
        receiverName: result.receiverName,
        receiverPhone: result.receiverPhone,
        toRoute: result.toRoute,
      }));

      Logger.debug('Frequent customers retrieved for delivery', {
        senderIdentifier,
        count: frequentCustomers.length,
        userSelectedRouteId,
      });

      return frequentCustomers;
    } catch (error) {
      Logger.error('Failed to get frequent customers', {
        error: error instanceof Error ? error.message : error,
        senderIdentifier,
      });
      throw new Error('Failed to get frequent customers');
    }
  }

  /**
   * Get cost report for deliveries with date range filtering (max 30 days)
   */
  async getCostReport(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ITodayDeliveryReport> {
    try {
      const userRouteInfo = await this.userService.getUserSelectedRoute(userId);
      const selectedRouteId = userRouteInfo.selectedRouteId;

      const fromRoute = await Route.findById(selectedRouteId).lean();
      if (!fromRoute) {
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
            nameProductAndAdditionalInformation: 1,
            quantity: 1,
            createdAt: 1,
            updatedAt: 1,
            sender: {
              name: '$senderName',
              phone: '$senderData.phone',
            },
            receiver: {
              name: '$receiverName',
              phone: '$receiverData.phone',
            },
            toRoute: {
              id: '$toRouteData._id',
              code: '$toRouteData.code',
              name: '$toRouteData.name',
              address: '$toRouteData.address',
            },
            cost: 1,
            homeDelivery: 1,
            homeDeliveryCost: 1,
            carryCost: 1,
            homeDeliveryCostTotal: 1,
            vehicleType: 1,
            itemCost: 1,
            itemValue: 1,
            collectCost: 1,
            collectForCustomer: 1,
            collectForCustomerCost: 1,
            collectForCustomerNote: 1,
            totalCost: 1,
            actualRevenue: 1,
            paymentType: 1,
            upItems: 1,
            downItems: 1,
            notes: 1,
            details: 1,
          },
        },
        // Sort by creation date descending
        {
          $sort: { createdAt: -1 },
        },
      ];

      // Execute aggregation
      const result = await Delivery.aggregate(pipeline);

      // Transform deliveries to ITodayDeliveryItem format
      const deliveryItems: ITodayDeliveryItem[] = result.map((d: any) => ({
        id: d._id.toString(),
        code: d.code,
        fullCode: d.fullCode,
        subCode: d.subCode,
        name: d.name,
        nameProductAndAdditionalInformation: d.nameProductAndAdditionalInformation,
        quantity: d.quantity,
        sender: d.sender,
        receiver: d.receiver,
        toRoute: {
          id: d.toRoute.id.toString(),
          code: d.toRoute.code,
          name: d.toRoute.name,
          address: d.toRoute.address,
        },
        cost: d.cost,
        homeDelivery: d.homeDelivery,
        homeDeliveryCost: d.homeDeliveryCost,
        itemCost: d.itemCost,
        itemValue: d.itemValue,
        collectCost: d.collectCost,
        collectForCustomer: d.collectForCustomer,
        collectForCustomerCost: d.collectForCustomerCost,
        collectForCustomerNote: d.collectForCustomerNote,
        totalCost: d.totalCost,
        actualRevenue: d.actualRevenue,
        paymentType: d.paymentType,
        upItems: d.upItems || undefined,
        downItems: d.downItems || undefined,
        notes: d.notes,
        details: d.details,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));

      // Build final response with routeInfo
      const report: ITodayDeliveryReport = {
        deliveries: deliveryItems,
        routeInfo: {
          route: {
            id: fromRoute._id.toString(),
            code: fromRoute.code,
            name: fromRoute.name,
          },
          routeCode: fromRoute.code,
          routeName: fromRoute.name,
        },
      };

      return report;
    } catch (error) {
      Logger.error('Failed to generate cost report', {
        error: error instanceof Error ? error.message : error,
        userId,
        startDate,
        endDate,
      });
      throw error;
    }
  }

  /**
   * Get today's delivery report (no pagination)
   */
  async getTodayReport(userId: string): Promise<ITodayDeliveryReport> {
    try {
      // Get user's selected route information
      const userRouteInfo = await this.userService.getUserSelectedRoute(userId);
      const selectedRouteId = userRouteInfo.selectedRouteId;

      // Get the selected route information
      const fromRoute = await Route.findById(selectedRouteId).lean();
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
        // Match by fromRoute and today's date, exclude returned deliveries
        {
          $match: {
            fromRoute: new Types.ObjectId(selectedRouteId),
            createdAt: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
            isReturn: { $ne: true },
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
              name: '$senderName',
              phone: '$senderData.phone',
            },
            receiver: {
              name: '$receiverName',
              phone: '$receiverData.phone',
            },
            toRoute: {
              id: '$toRouteData._id',
              code: '$toRouteData.code',
              name: '$toRouteData.name',
              address: '$toRouteData.address',
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
            actualRevenue: 1,
            paymentType: 1,
            upItems: 1,
            downItems: 1,
            notes: 1,
            details: 1,
            nameProductAndAdditionalInformation: 1,
          },
        },
        // Sort by creation time (newest first)
        {
          $sort: { createdAt: -1 },
        },
      ];

      // Execute aggregation
      const result = await Delivery.aggregate(pipeline);

      // Transform deliveries to simplified items
      const deliveryItems: ITodayDeliveryItem[] = result.map(
        (d: {
          _id: Types.ObjectId;
          code: string;
          fullCode?: string;
          subCode?: string;
          name: string;
          nameProductAndAdditionalInformation?: string;
          quantity?: number;
          createdAt: Date;
          updatedAt?: Date;
          sender: { name: string; phone: string };
          receiver: { name: string; phone: string };
          toRoute: { id: Types.ObjectId; code: string; name: string; address: string };
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
          actualRevenue: number;
          paymentType: PaymentType;
          upItems?: string;
          downItems?: string;
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
          nameProductAndAdditionalInformation: d.nameProductAndAdditionalInformation,
          quantity: d.quantity,
          sender: d.sender,
          receiver: d.receiver,
          toRoute: {
            id: d.toRoute.id.toString(),
            code: d.toRoute.code,
            name: d.toRoute.name,
            address: d.toRoute.address,
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
          actualRevenue: d.actualRevenue,
          paymentType: d.paymentType,
          upItems: d.upItems || undefined,
          downItems: d.downItems || undefined,
          notes: d.notes,
          details: d.details,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        })
      );

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

  async getListReportReturnDeliveryWithStatusDone(
    userId: string
  ): Promise<IGetListReportReturnDeliveryResponse> {
    try {
      const toRouteId = await this.userService.getUserSelectedRouteId(userId);

      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
      const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
      const sevenDaysAgo = new Date(todayStart);
      sevenDaysAgo.setDate(todayStart.getDate() - 7);

      // get quantity of Return created today
      const quantityReturnIsToday = await Delivery.countDocuments({
        toRoute: toRouteId,
        isReturn: true,
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
      const quantityReturnIsOld = await Delivery.countDocuments({
        toRoute: toRouteId,
        isReturn: true,
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

  async getListReturnDeliveriesByToRouteId(
    userId: string,
    startDate: Date,
    endDate: Date,
    routeId?: string
  ): Promise<IDeliveryResponse[]> {
    try {
      const toRouteId = await this.userService.getUserSelectedRouteId(userId);
      const where: Record<string, unknown> = {
        isReturn: false,
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

      const returnDeliveries = await Delivery.find(where)
        .populate([
          {
            path: 'sender',
            select: '_id phone routeId createdAt updatedAt',
            populate: {
              path: 'bankId',
              select: '_id name bankName bankAccount bankBranch bankAddress',
            },
          },
          { path: 'receiver', select: '_id phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address phone' },
          { path: 'toRoute', select: '_id code name address phone' },
          { path: 'createdByUser', select: '_id username name' },
        ])
        .lean();

      return returnDeliveries.map(delivery =>
        this.transformDeliveryToResponseOptimized(this.toPopulatedDeliveryLean(delivery))
      );
    } catch (error) {
      throw new Error('Failed to get list return deliveries by to route id');
    }
  }

  async recoveryDeliveryByFullCode(fullCode: string, note: string): Promise<void> {
    try {
      const delivery = await Delivery.findOne({
        fullCode: fullCode,
        isReturn: true,
      });

      if (!delivery) {
        throw new Error(`Delivery not found with fullCode: ${fullCode} and isReturn: true`);
      }

      const moneyDelivery = await MoneyDelivery.findOne({
        deliveryId: delivery._id,
      });

      if (moneyDelivery) {
        if (moneyDelivery.status === MoneyDeliveryStatus.DONE) {
          throw new Error(
            `Cannot recover delivery ${fullCode} because associated money delivery has status DONE`
          );
        }

        if (moneyDelivery.status === MoneyDeliveryStatus.WAITING) {
          await MoneyDelivery.findByIdAndDelete(moneyDelivery._id);
        }
      }

      const existingNotes = typeof delivery.notes === 'string' ? delivery.notes : '';
      const newNote = existingNotes ? `${note}, ${existingNotes}` : note;

      await Delivery.findByIdAndUpdate(
        delivery._id,
        {
          $set: {
            isReturn: false,
            dateReturn: null,
            notes: newNote,
          },
        },
        { new: true, runValidators: true }
      );
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to recover delivery by fullCode');
    }
  }

  async getListDeliveryInventory(
    userId: string,
    query: IGetListDeliveryInventoryRequest
  ): Promise<IReturnDeliveryResponse[]> {
    try {
      const {
        toRoute,
        fromRoute,
        collectCost,
        homeDeliveryCost,
        collectForCustomer,
        paymentType,
        itemCost,
        time,
      } = query;

      const routeId = await this.userService.getUserSelectedRouteId(userId);
      const where: Record<string, unknown> = {
        isReturn: false,
      };

      if (toRoute) {
        where.toRoute = routeId;
      }

      if (fromRoute) {
        where.fromRoute = routeId;
      }

      if (collectCost === true) {
        where.collectCost = { $gt: 0 };
      }

      if (homeDeliveryCost === true) {
        where.homeDeliveryCost = { $gt: 0 };
      }

      if (collectForCustomer === true) {
        where.collectForCustomer = { $gt: 0 };
      }

      if (paymentType === true) {
        where.paymentType = PAYMENT_TYPE.DEBT;
      }

      if (itemCost === true) {
        where.itemCost = { $gt: 0 };
      }

      const daysToSubtract = time || 15;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cutoffDate = new Date(today);
      cutoffDate.setDate(cutoffDate.getDate() - daysToSubtract);
      cutoffDate.setHours(23, 59, 59, 999);
      where.createdAt = { $lte: cutoffDate };

      // Query deliveries
      const deliveries = await Delivery.find(where)
        .populate([
          { path: 'sender', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username name' },
        ])
        .sort({ createdAt: 1 })
        .lean();

      const populatedDeliveries = this.toPopulatedReturnDeliveryLean(deliveries);

      const deliveriesResponse: IReturnDeliveryResponse[] = populatedDeliveries.map(
        (item: any) => ({
          id: item._id.toString(),
          code: item.code,
          name: item.name,
          fullCode: item.fullCode,
          subCode: item.subCode,
          quantity: item.quantity,
          sender: {
            name: item.senderName,
            phone: item.sender.phone,
          },
          receiver: {
            name: item.receiverName,
            phone: item.receiver.phone,
          },
          fromRoute: {
            id: item.fromRoute._id.toString(),
            code: item.fromRoute.code,
            name: item.fromRoute.name,
          },
          toRoute: {
            id: item.toRoute._id.toString(),
            code: item.toRoute.code,
            name: item.toRoute.name,
          },
          cost: item.cost,
          homeDelivery: item.homeDelivery,
          homeDeliveryCost: item.homeDeliveryCost,
          collectForCustomer: item.collectForCustomer,
          collectForCustomerCost: item.collectForCustomerCost,
          collectForCustomerNote: item.collectForCustomerNote,
          itemValue: item.itemValue,
          itemCost: item.itemCost,
          totalCost: item.totalCost,
          actualRevenue: item.actualRevenue,
          paymentType: item.paymentType,
          notes: item.notes,
          isReturn: item.isReturn,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          upItems: item.upItems || '',
          downItems: item.downItems || '',
          inventory: item.inventory || '',
          smsType: item.smsType || '',
          timeToSendSMS: item.timeToSendSMS,
          quantityReturn: item.quantityReturn || 0,
          dateReturn: item.dateReturn,
          collectCost: item.collectCost || 0,
          createdByUser: {
            _id: item.createdByUser._id.toString(),
            username: item.createdByUser.username,
            name: item.createdByUser.name,
          },
          nameProductAndAdditionalInformation: item.nameProductAndAdditionalInformation || '',
        })
      );

      return deliveriesResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get list delivery inventory');
    }
  }

  async getListDeliveryInventoryAboutHomeDelivery(
    userId: string
  ): Promise<IGetListDeliveryInventoryAboutHomeDeliveryResponse> {
    try {
      const routeId = await this.userService.getUserSelectedRouteId(userId);

      const deliveries = await Delivery.find({
        isReturn: false,
        toRoute: routeId,
        homeDeliveryCost: { $gt: 0 },
      })
        .populate([
          { path: 'sender', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username name' },
        ])
        .sort({ createdAt: 1 })
        .lean();

      const populatedDeliveries = this.toPopulatedReturnDeliveryLean(deliveries);

      const deliveriesResponse: IReturnDeliveryResponse[] = populatedDeliveries.map(
        (item: any) => ({
          id: item._id.toString(),
          code: item.code,
          name: item.name,
          fullCode: item.fullCode,
          subCode: item.subCode,
          quantity: item.quantity,
          sender: {
            name: item.senderName,
            phone: item.sender.phone,
          },
          receiver: {
            name: item.receiverName,
            phone: item.receiver.phone,
          },
          toRoute: {
            id: item.toRoute._id.toString(),
            code: item.toRoute.code,
            name: item.toRoute.name,
          },
          fromRoute: {
            id: item.fromRoute._id.toString(),
            code: item.fromRoute.code,
            name: item.fromRoute.name,
          },
          cost: item.cost,
          homeDelivery: item.homeDelivery,
          homeDeliveryCost: item.homeDeliveryCost,
          collectForCustomer: item.collectForCustomer,
          collectForCustomerCost: item.collectForCustomerCost,
          collectForCustomerNote: item.collectForCustomerNote,
          itemValue: item.itemValue,
          itemCost: item.itemCost,
          totalCost: item.totalCost,
          actualRevenue: item.actualRevenue,
          paymentType: item.paymentType,
          notes: item.notes,
          isReturn: item.isReturn,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          upItems: item.upItems || '',
          downItems: item.downItems || '',
          inventory: item.inventory || '',
          smsType: item.smsType || '',
          timeToSendSMS: item.timeToSendSMS,
          quantityReturn: item.quantityReturn || 0,
          dateReturn: item.dateReturn,
          collectCost: item.collectCost || 0,
          createdByUser: {
            _id: item.createdByUser._id.toString(),
            username: item.createdByUser.username,
            name: item.createdByUser.name,
          },
          nameProductAndAdditionalInformation: item.nameProductAndAdditionalInformation || '',
        })
      );

      let totalAllCostWithPaymentTypePaid = 0;
      let totalCostWithPaymentTypePaid = 0; // cước phí (đã thu)
      let totalItemCostWithPaymentTypePaid = 0; // phí giá trị (đã thu)
      let totalCollectForCustomerCostWithPaymentTypePaid = 0; // phụ phí đi (đã thu)

      let totalAllCostWithPaymentTypeDebt = 0;
      let totalCostWithPaymentTypeDebt = 0; // cước phí (nợ)
      let totalItemCostWithPaymentTypeDebt = 0; // phí giá trị (nợ)
      let totalCollectForCustomerCostWithPaymentTypeDebt = 0; // phụ phí đi (nợ)

      let totalHomeDeliveryCostWithPaymentTypePaid = 0;
      let totalHomeDeliveryCostWithPaymentTypeDebt = 0;

      let totalCost = 0;
      let totalHomeDeliveryCost = 0;
      let totalCollectForCustomer = 0;
      let totalCollectCost = 0;
      let totalActualCost = 0;

      deliveriesResponse.forEach(delivery => {
        const isPaid = delivery.paymentType === PAYMENT_TYPE.PAID;
        const isDebt = delivery.paymentType === PAYMENT_TYPE.DEBT;

        totalCollectForCustomer += delivery.collectForCustomer || 0;
        totalCollectCost += delivery.collectCost || 0;

        if (isPaid) {
          totalCostWithPaymentTypePaid += delivery.cost;
          totalItemCostWithPaymentTypePaid += delivery.itemCost;
          totalCollectForCustomerCostWithPaymentTypePaid += delivery.collectForCustomerCost || 0;

          // GTN đã thu
          totalHomeDeliveryCostWithPaymentTypePaid += delivery.homeDeliveryCost || 0;
        }

        if (isDebt) {
          totalCostWithPaymentTypeDebt += delivery.cost;
          totalItemCostWithPaymentTypeDebt += delivery.itemCost;
          totalCollectForCustomerCostWithPaymentTypeDebt += delivery.collectForCustomerCost || 0;

          //GTN nợ
          totalHomeDeliveryCostWithPaymentTypeDebt += delivery.homeDeliveryCost || 0;
        }
      });

      totalAllCostWithPaymentTypePaid =
        totalCostWithPaymentTypePaid +
        totalItemCostWithPaymentTypePaid +
        totalCollectForCustomerCostWithPaymentTypePaid;

      totalAllCostWithPaymentTypeDebt =
        totalCostWithPaymentTypeDebt +
        totalItemCostWithPaymentTypeDebt +
        totalCollectForCustomerCostWithPaymentTypeDebt;

      totalCost = totalAllCostWithPaymentTypePaid + totalAllCostWithPaymentTypeDebt;

      totalHomeDeliveryCost =
        totalHomeDeliveryCostWithPaymentTypePaid + totalHomeDeliveryCostWithPaymentTypeDebt;

      totalActualCost =
        totalAllCostWithPaymentTypeDebt +
        totalHomeDeliveryCostWithPaymentTypeDebt +
        totalCollectCost +
        totalCollectForCustomer;

      const sum = {
        totalAllCostWithPaymentTypePaid,
        totalHomeDeliveryCostWithPaymentTypePaid,
        totalAllCostWithPaymentTypeDebt,
        totalHomeDeliveryCostWithPaymentTypeDebt,
        totalCost,
        totalHomeDeliveryCost,
        totalCollectForCustomer,
        totalCollectCost,
        totalActualCost,
      };

      return {
        data: deliveriesResponse,
        sum,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get list delivery inventory about home delivery');
    }
  }
}
