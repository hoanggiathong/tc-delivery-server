import { Delivery } from '@/models/delivery.model';
import { Route } from '@/models/route.model';
import { Types, PipelineStage } from 'mongoose';
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
  IDeliveryCostReport,
  IDeliveryReportItem,
  IDeliveryCostReportSummary,
  ITodayDeliveryReport,
  ITodayDeliverySummary,
  ITodayDeliveryItem,
  IDeliveryPopulated,
} from '@/types/delivery.type';
import { ICustomer } from '@/models/customer.model';
import Logger from '@/utils/logger';
import { PaymentType } from '@/types';
import { TYPE_DELIVERY_CUSTOMER } from '@/const/customer.const';

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
        name: delivery.receiver.name,
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
        createdAt: delivery.fromRoute.createdAt,
        updatedAt: delivery.fromRoute.updatedAt,
      },
      toRoute: {
        id: delivery.toRoute._id,
        code: delivery.toRoute.code,
        name: delivery.toRoute.name,
        address: delivery.toRoute.address,
        createdAt: delivery.toRoute.createdAt,
        updatedAt: delivery.toRoute.updatedAt,
      },
      name: delivery.name,
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

    // Find or create sender and receiver with type 'delivery'
    const sender = await this.customerService.findOrCreateCustomer(
      data.senderPhone,
      data.senderName,
      selectedRouteId,
      'delivery'
    );
    const receiver = await this.customerService.findOrCreateCustomer(
      data.receiverPhone,
      data.receiverName,
      data.toRouteId,
      'delivery'
    );

    // Update sender's relativeReceiver array
    await this.customerService.addRelativeReceiver(sender._id.toString(), receiver._id.toString());

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
      receiver: receiver._id,
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
          select: '_id name phone routeId createdAt updatedAt',
          populate: {
            path: 'bankId',
            select: '_id name bankName bankAccount bankBranch bankAddress',
          },
        },
        { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
        { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
        { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
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
        userSelectedRouteId,
        'delivery'
      );
      updateData.sender = sender.id;
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
        data.toRouteId || delivery.toRoute.toString(),
        'delivery'
      );
      updateData.receiver = receiver.id;
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
    await Delivery.findByIdAndUpdate(id, { $set: updateData }, { runValidators: true });

    // Query the updated delivery with populate and lean
    const populatedDelivery = await Delivery.findById(id)
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
        { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
        { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
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
            select: '_id name phone routeId createdAt updatedAt',
            populate: {
              path: 'bankId',
              select: '_id name bankName bankAccount bankBranch bankAddress',
            },
          },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
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
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
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
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
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
        { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
        { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
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
      const receivers = await this.customerService.getFrequentReceivers(
        senderIdentifier,
        TYPE_DELIVERY_CUSTOMER.DELIVERY,
        userId
      );

      if (receivers.length === 0) {
        return [];
      }

      const sender = await this.customerService.getCustomerByPhoneAndType(
        senderIdentifier,
        TYPE_DELIVERY_CUSTOMER.DELIVERY
      );

      if (!sender) {
        Logger.debug('Sender not found for frequent customers', { senderIdentifier });
        return [];
      }

      const routeIds = receivers.map(receiver => receiver.routeId);
      const routes = await Route.find({ _id: { $in: routeIds } }).lean();
      const routeMap = new Map(routes.map(route => [route._id.toString(), route]));

      const frequentCustomers: IFrequentCustomer[] = receivers.map(receiver => {
        const route = routeMap.get(receiver.routeId.toString());

        if (!route) {
          Logger.warn('Route not found for receiver', {
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
            address: route?.address || 'Unknown Address',
          },
        };
      });

      Logger.debug('Frequent customers retrieved for delivery', {
        senderIdentifier,
        count: frequentCustomers.length,
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
      // Get user's selected route information
      const userRouteInfo = await this.userService.getUserSelectedRoute(userId);
      const selectedRouteId = userRouteInfo.selectedRouteId;

      // Get the selected route information
      const fromRoute = await Route.findById(selectedRouteId).lean();
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
            fromRoute: new Types.ObjectId(selectedRouteId),
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
              address: '$toRouteData.address',
            },
            cost: 1,
            homeDeliveryCost: 1,
            itemCost: 1,
            itemValue: 1,
            collectCost: 1,
            collectForCustomer: 1,
            collectForCustomerCost: 1,
            totalCost: 1,
            actualRevenue: 1,
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
                  totalActualRevenue: { $sum: '$actualRevenue' },
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
          toRoute: { id: Types.ObjectId; code: string; name: string; address: string };
          cost: number;
          homeDeliveryCost: number;
          itemCost: number;
          itemValue: number;
          collectCost: number;
          collectForCustomer: number;
          collectForCustomerCost: number;
          totalCost: number;
          actualRevenue: number;
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
            address: d.toRoute.address,
          },
          cost: d.cost,
          homeDeliveryCost: d.homeDeliveryCost,
          itemCost: d.itemCost,
          itemValue: d.itemValue,
          collectCost: d.collectCost,
          collectForCustomer: d.collectForCustomer,
          collectForCustomerCost: d.collectForCustomerCost,
          totalCost: d.totalCost,
          actualRevenue: d.actualRevenue,
          paymentType: d.paymentType,
          notes: d.notes,
        })
      );

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
        totalActualRevenue: summaryData.totalActualRevenue || 0,

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
        // Match by fromRoute and today's date
        {
          $match: {
            fromRoute: new Types.ObjectId(selectedRouteId),
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
            notes: 1,
            details: 1,
            nameProductAndAdditionalInformation: 1,
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
                  totalActualRevenue: { $sum: '$actualRevenue' },
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
          notes: d.notes,
          details: d.details,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        })
      );

      const summary: ITodayDeliverySummary = {
        totalDeliveries: summaryData.totalDeliveries || 0,
        totalQuantity: summaryData.totalQuantity || 0,
        totalCost: summaryData.totalCost || 0,
        totalActualRevenue: summaryData.totalActualRevenue || 0,
        totalItemCost: summaryData.totalItemCost || 0,
        totalCollectCost: summaryData.totalCollectCost || 0,
        totalCollectForCustomer: summaryData.totalCollectForCustomer || 0,
        totalCollectForCustomerCost: summaryData.totalCollectForCustomerCost || 0,
        date: today.toISOString().split('T')[0],
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
