import { TYPE_DELIVERY_CUSTOMER } from '@/const/customer.const';
import { SORT_BY_RETURN_DELIVERIES } from '@/const/return-deliveries.const';
import { ICustomer } from '@/models/customer.model';
import { Delivery, IReturnDeliveryImage } from '@/models/delivery.model';
import {
  IReturnDeliveryLeanPopulated,
  IReturnDeliveryListDebtOfReturnDeliveriesTodayRequest,
  IReturnDeliveryListRequest,
  IReturnDeliveryResponse,
  IReturnDeliveryUpdateRequest,
} from '@/types/return-delivery.type';
import { CustomerService } from './customer.service';
import { DeliveryService } from './delivery.service';
import { UserService } from './user.service';
import { ICustomerInformationResponse } from '@/types/customer.type';
import { IRouteResponse } from '@/types/route.type';
import { RouteService } from './route.service';
import { MoneyDeliveryService } from './money-delivery.service';
import Logger from '@/utils/logger';
import path from 'path';
import fs from 'fs';
import { generateVersionedUrl } from '@/utils/image-url.utils';

export class ReturnDeliveriesService {
  private customerService: CustomerService;
  private routeService: RouteService;
  // private settingsService: SettingsService;
  private userService: UserService;
  private deliveryService: DeliveryService;
  private moneyDeliveryService: MoneyDeliveryService;
  constructor() {
    this.customerService = new CustomerService();
    this.routeService = new RouteService();
    // this.settingsService = new SettingsService();
    this.userService = new UserService();
    this.deliveryService = new DeliveryService();
    this.moneyDeliveryService = new MoneyDeliveryService();
  }

  async getListReturnDeliveries(
    query: IReturnDeliveryListRequest,
    userId: string
  ): Promise<IReturnDeliveryResponse[]> {
    const { startDate, endDate, keySort, phoneReceiver } = query;

    let typeSort = query.typeSort;

    const start = new Date(String(startDate));

    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

    let sort = {};

    const where = {
      toRoute: selectedRouteId,
      createdAt: { $gte: start, $lte: endDate },
      isReturn: false,
    };

    // Handle phone receiver filter by finding customer first
    if (phoneReceiver) {
      try {
        const receiverCustomer = await this.customerService.getCustomerByPhoneAndType(
          phoneReceiver,
          TYPE_DELIVERY_CUSTOMER.DELIVERY
        );

        if (receiverCustomer) {
          (where as Record<string, unknown>).receiver = receiverCustomer._id;
        } else {
          // If no customer found with this phone, return empty result
          return [];
        }
      } catch (error) {
        throw new Error('Error finding receiver by phone number');
      }
    }

    //handle sort
    if (keySort) {
      if (!typeSort) {
        typeSort = 1;
      }

      switch (keySort) {
        case SORT_BY_RETURN_DELIVERIES.CREATED_AT:
          sort = { createdAt: typeSort };
          break;
        default:
          sort = { 'toRoute.name': 1, createdAt: 1 };
          break;
      }
    } else {
      sort = { createdAt: 1 };
    }

    try {
      const returnDeliveries = await Delivery.find(where)
        .populate([
          {
            path: 'sender',
            select: '_id name phone routeId createdAt updatedAt',
            // populate: {
            //   path: 'bankId',
            //   select: '_id name bankName bankAccount bankBranch bankAddress',
            // },
          },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username name' },
        ])
        .sort(sort)
        .lean();

      const populatedReturnDeliveries = await this.toPopulatedReturnDeliveryLean(returnDeliveries);

      const returnDeliveriesResponse: IReturnDeliveryResponse[] = populatedReturnDeliveries.map(
        (item: IReturnDeliveryLeanPopulated) => ({
          id: item._id.toString(),
          code: item.code,
          name: item.name,
          fullCode: item.fullCode,
          subCode: item.subCode,
          sender: {
            name: item.sender.name,
            phone: item.sender.phone,
          },
          receiver: {
            name: item.receiver.name,
            phone: item.receiver.phone,
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
          isCollectForCustomer: item.isCollectForCustomer,
          isCollectCost: item.isCollectCost,
          createdByUser: {
            _id: item.createdByUser._id.toString(),
            username: item.createdByUser.username,
            name: item.createdByUser.name,
          },
        })
      );
      return returnDeliveriesResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list return deliveries failed');
    }
  }

  /**
   * Type assertion helper for lean populated return delivery objects
   */
  private toPopulatedReturnDeliveryLean(returnDelivery: unknown): IReturnDeliveryLeanPopulated[] {
    return returnDelivery as IReturnDeliveryLeanPopulated[];
  }

  async getInformationReceiver(phoneReceiver: string): Promise<ICustomerInformationResponse | []> {
    try {
      const receiver: ICustomer | null = await this.customerService.getCustomerByPhoneAndType(
        phoneReceiver,
        TYPE_DELIVERY_CUSTOMER.DELIVERY
      );

      if (!receiver) {
        return [];
      }

      const route: IRouteResponse | null = await this.routeService.getRouteById(
        receiver.routeId.toString()
      );

      return {
        id: receiver._id.toString(),
        name: receiver.name,
        phone: receiver.phone,
        route: {
          id: receiver.routeId.toString(),
          code: route?.code,
          name: route?.name,
        },
        type: receiver.type,
        address: receiver.address,
        identityCardIssuedDate: receiver.identityCardIssuedDate,
        identityCardNumber: receiver.identityCardNumber,
        images: receiver.images,
        createdAt: receiver.createdAt,
        updatedAt: receiver.updatedAt,
      } as ICustomerInformationResponse;
    } catch (error) {
      throw new Error('get information receiver failed');
    }
  }

  // danh sach cac don hang co no cuoc cua don da tra hang hien tai
  async getListDebtOfReturnDeliveriesToday(
    query: IReturnDeliveryListDebtOfReturnDeliveriesTodayRequest,
    userId: string
  ): Promise<IReturnDeliveryResponse[]> {
    const { startDate, endDate } = query;

    const start = new Date(String(startDate));
    start.setHours(0, 0, 0, 0);

    const end = new Date(String(endDate));
    end.setHours(23, 59, 59, 999);
    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

    const where = {
      toRoute: selectedRouteId,
      createdAt: { $gte: start, $lte: end },
      isReturn: true,
    };

    try {
      const returnDeliveries = await Delivery.find(where)
        .populate([
          {
            path: 'sender',
            select: '_id name phone routeId createdAt updatedAt',
          },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username name' },
        ])
        .sort({ createdAt: -1 })
        .lean();

      const populatedReturnDeliveries = await this.toPopulatedReturnDeliveryLean(returnDeliveries);

      const returnDeliveriesResponse: IReturnDeliveryResponse[] = populatedReturnDeliveries.map(
        (item: IReturnDeliveryLeanPopulated) => ({
          id: item._id.toString(),
          code: item.code,
          name: item.name,
          fullCode: item.fullCode,
          subCode: item.subCode,
          sender: {
            name: item.sender.name,
            phone: item.sender.phone,
          },
          receiver: {
            name: item.receiver.name,
            phone: item.receiver.phone,
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
          isCollectForCustomer: item.isCollectForCustomer,
          isCollectCost: item.isCollectCost,
          createdByUser: {
            _id: item.createdByUser._id.toString(),
            username: item.createdByUser.username,
            name: item.createdByUser.name,
          },
        })
      );
      return returnDeliveriesResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list debt of return deliveries today failed');
    }
  }

  // danh sach thu ho cua tra hang chua duoc thu ho
  async getListCollectForCustomerOfReturnDeliveriesNotCollected(
    userId: string
  ): Promise<IReturnDeliveryResponse[]> {
    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

    const where = {
      toRoute: selectedRouteId,
      isReturn: true,
      isCollectForCustomer: { $ne: true },
    };

    try {
      const returnDeliveries = await Delivery.find(where)
        .populate([
          {
            path: 'sender',
            select: '_id name phone routeId createdAt updatedAt',
          },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username name' },
        ])
        .sort({ createdAt: -1 })
        .lean();

      const populatedReturnDeliveries = await this.toPopulatedReturnDeliveryLean(returnDeliveries);

      const returnDeliveriesResponse: IReturnDeliveryResponse[] = populatedReturnDeliveries.map(
        (item: IReturnDeliveryLeanPopulated) => ({
          id: item._id.toString(),
          code: item.code,
          name: item.name,
          fullCode: item.fullCode,
          subCode: item.subCode,
          sender: {
            name: item.sender.name,
            phone: item.sender.phone,
          },
          receiver: {
            name: item.receiver.name,
            phone: item.receiver.phone,
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
          isCollectForCustomer: item.isCollectForCustomer,
          isCollectCost: item.isCollectCost,
          createdByUser: {
            _id: item.createdByUser._id.toString(),
            username: item.createdByUser.username,
            name: item.createdByUser.name,
          },
        })
      );
      return returnDeliveriesResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list collect for customer of return deliveries failed');
    }
  }

  // danh sach thu ho cua tra hang chua duoc thu ho
  async getListCollectCostOfReturnDeliveriesNotCollected(
    userId: string
  ): Promise<IReturnDeliveryResponse[]> {
    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

    const where = {
      toRoute: selectedRouteId,
      isReturn: true,
      isCollectCost: { $ne: true },
    };

    try {
      const returnDeliveries = await Delivery.find(where)
        .populate([
          {
            path: 'sender',
            select: '_id name phone routeId createdAt updatedAt',
          },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username name' },
        ])
        .sort({ createdAt: -1 })
        .lean();

      const populatedReturnDeliveries = await this.toPopulatedReturnDeliveryLean(returnDeliveries);

      const returnDeliveriesResponse: IReturnDeliveryResponse[] = populatedReturnDeliveries.map(
        (item: IReturnDeliveryLeanPopulated) => ({
          id: item._id.toString(),
          code: item.code,
          name: item.name,
          fullCode: item.fullCode,
          subCode: item.subCode,
          sender: {
            name: item.sender.name,
            phone: item.sender.phone,
          },
          receiver: {
            name: item.receiver.name,
            phone: item.receiver.phone,
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
          isCollectForCustomer: item.isCollectForCustomer,
          isCollectCost: item.isCollectCost,
          createdByUser: {
            _id: item.createdByUser._id.toString(),
            username: item.createdByUser.username,
            name: item.createdByUser.name,
          },
        })
      );
      return returnDeliveriesResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list collect for customer of return deliveries failed');
    }
  }

  // danh sach tat ca don hang cu da tra
  async getListAllReturnDeliveries(userId: string): Promise<IReturnDeliveryResponse[]> {
    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // 45 days ago
    const start = new Date(end.setDate(end.getDate() - 45));
    start.setHours(0, 0, 0, 0);

    const where = {
      toRoute: selectedRouteId,
      createdAt: { $gte: start, $lte: end },
    };

    try {
      const returnDeliveries = await Delivery.find(where)
        .populate([
          {
            path: 'sender',
            select: '_id name phone routeId createdAt updatedAt',
          },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username name' },
        ])
        .sort({ createdAt: -1 })
        .lean();

      const populatedReturnDeliveries = await this.toPopulatedReturnDeliveryLean(returnDeliveries);

      const returnDeliveriesResponse: IReturnDeliveryResponse[] = populatedReturnDeliveries.map(
        (item: IReturnDeliveryLeanPopulated) => ({
          id: item._id.toString(),
          code: item.code,
          name: item.name,
          fullCode: item.fullCode,
          subCode: item.subCode,
          sender: {
            name: item.sender.name,
            phone: item.sender.phone,
          },
          receiver: {
            name: item.receiver.name,
            phone: item.receiver.phone,
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
          isCollectForCustomer: item.isCollectForCustomer,
          isCollectCost: item.isCollectCost,
          createdByUser: {
            _id: item.createdByUser._id.toString(),
            username: item.createdByUser.username,
            name: item.createdByUser.name,
          },
        })
      );
      return returnDeliveriesResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list all return deliveries failed');
    }
  }

  // danh sach cac don hang cu da tra hang
  async getListReturnDeliveriesIsReturn(userId: string): Promise<IReturnDeliveryResponse[]> {
    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // 45 days ago
    const start = new Date(end.setDate(end.getDate() - 45));
    start.setHours(0, 0, 0, 0);

    const where = {
      toRoute: selectedRouteId,
      createdAt: { $gte: start, $lte: end },
      isReturn: true,
    };

    try {
      const returnDeliveries = await Delivery.find(where)
        .populate([
          {
            path: 'sender',
            select: '_id name phone routeId createdAt updatedAt',
          },
          { path: 'receiver', select: '_id name phone routeId createdAt updatedAt' },
          { path: 'fromRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'toRoute', select: '_id code name address createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username name' },
        ])
        .sort({ createdAt: -1 })
        .lean();

      const populatedReturnDeliveries = await this.toPopulatedReturnDeliveryLean(returnDeliveries);

      const returnDeliveriesResponse: IReturnDeliveryResponse[] = populatedReturnDeliveries.map(
        (item: IReturnDeliveryLeanPopulated) => ({
          id: item._id.toString(),
          code: item.code,
          name: item.name,
          fullCode: item.fullCode,
          subCode: item.subCode,
          sender: {
            name: item.sender.name,
            phone: item.sender.phone,
          },
          receiver: {
            name: item.receiver.name,
            phone: item.receiver.phone,
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
          isCollectForCustomer: item.isCollectForCustomer,
          isCollectCost: item.isCollectCost,
          createdByUser: {
            _id: item.createdByUser._id.toString(),
            username: item.createdByUser.username,
            name: item.createdByUser.name,
          },
        })
      );
      return returnDeliveriesResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list return deliveries is return failed');
    }
  }

  async getDetailImagesReturnDelivery(deliveryId: string): Promise<IReturnDeliveryImage[]> {
    const delivery = await Delivery.findById(deliveryId).select('returnDeliveryImages').lean();

    if (!delivery) {
      return [];
    }

    return delivery.returnDeliveryImages || [];
  }

  async updateNoteReturnDelivery(deliveryId: string, note: string): Promise<void> {
    const delivery = await Delivery.findById(deliveryId).select('notes').lean();

    if (!delivery) {
      return;
    }

    const newNote = note + delivery.notes;

    delivery.notes = newNote;
    await delivery.save();
  }

  async uploadImagesReturnDelivery(
    deliveryId: string,
    imagesData?: Array<{
      index: number;
      buffer: Buffer;
      originalName: string;
      rotate: number;
    }>
  ): Promise<IReturnDeliveryImage[]> {
    // Find the delivery
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      throw new Error('Return delivery not found');
    }

    const uploadedImages = await this.handleUploadImagesReturnDelivery(deliveryId, imagesData);

    // Update delivery with new images
    delivery.returnDeliveryImages = uploadedImages;
    await delivery.save();

    return uploadedImages;
  }

  /**
   * Update status with images (new formData format)
   */
  async updateStatusWithImages(
    userId: string,
    updateData: {
      deliveryId: string;
      customerId: string;
      address?: string;
      identityCardIssuedDate?: string;
      identityCardNumber?: string;
    },
    customerImagesData?: Array<{
      index: number;
      buffer: Buffer;
      originalName: string;
      rotate: number;
    }>,
    returnDeliveryImagesData?: Array<{
      index: number;
      buffer: Buffer;
      originalName: string;
      rotate: number;
    }>
  ): Promise<any> {
    try {
      const { deliveryId, customerId, address, identityCardIssuedDate, identityCardNumber } =
        updateData;

      // Get delivery by ID
      const delivery = await Delivery.findById(deliveryId).populate([
        'sender',
        'receiver',
        'fromRoute',
        'toRoute',
      ]);
      if (!delivery) {
        throw new Error(`Delivery with ID ${deliveryId} not found`);
      }

      // Get customer by ID
      const customer = await this.customerService.getCustomerById(customerId);
      if (!customer) {
        throw new Error(`Customer with ID ${customerId} not found`);
      }

      // Handle customer images upload if provided
      if (customerImagesData && customerImagesData.length > 0) {
        for (const imageData of customerImagesData) {
          const { index, buffer, originalName, rotate } = imageData;
          await this.customerService.uploadImageById(
            customerId,
            index,
            buffer,
            originalName,
            rotate
          );
        }
      }

      // Handle return delivery images upload if provided
      if (returnDeliveryImagesData && returnDeliveryImagesData.length > 0) {
        const uploadedImages = await this.handleUploadImagesReturnDelivery(
          deliveryId,
          returnDeliveryImagesData
        );
        delivery.returnDeliveryImages = uploadedImages;
      }

      // Update customer information if provided
      if (address || identityCardIssuedDate || identityCardNumber) {
        const updateCustomerData: Record<string, unknown> = {};

        if (address) {
          updateCustomerData.address = address;
        }
        if (identityCardIssuedDate) {
          updateCustomerData.identityCardIssuedDate = identityCardIssuedDate;
        }
        if (identityCardNumber) {
          updateCustomerData.identityCardNumber = identityCardNumber;
        }

        await this.customerService.updateCustomer(customerId, updateCustomerData);
      }

      // Check field collectForCustomer > 0
      if (delivery.collectForCustomer > 0) {
        // Call service money delivery to handle data and create new money delivery
        await this.moneyDeliveryService.createMoneyDelivery(
          {
            senderName: (delivery.sender as unknown as Record<string, unknown>).name as string,
            senderPhone: (delivery.sender as unknown as Record<string, unknown>).phone as string,
            receiverName: customer.name,
            receiverPhone: customer.phone,
            toRouteId: delivery.toRoute._id.toString(),
            sendMoneyAmount: delivery.collectForCustomer,
            sendCost: delivery.collectForCustomerCost || 0,
            transferType: 'regular',
            isFree: false,
            notes: `Thu dùm từ giao hàng ${delivery.fullCode}`,
          },
          userId
        );

        delivery.isCollectForCustomer = true;
      }

      // Check field collectCost > 0
      if (delivery.collectCost > 0) {
        // Then update status with field isCollectCost = true
        delivery.isCollectCost = true;
      }

      // Then update status return delivery with field isReturn = true
      delivery.isReturn = true;
      // Update field note with string 'Đã trả hàng + now date' + old value of note
      const now = new Date();
      const returnDateString = `Đã trả hàng ${now}`;
      delivery.notes = `${returnDateString}, ${delivery.notes}`;
      delivery.updatedAt = now;
      delivery.dateReturn = now;
      await delivery.save();

      Logger.info('Return delivery status updated with images successfully', {
        deliveryId,
        customerId,
        hasCustomerImages: customerImagesData && customerImagesData.length > 0,
        hasReturnDeliveryImages: returnDeliveryImagesData && returnDeliveryImagesData.length > 0,
        timestamp: now,
      });

      return delivery;
    } catch (error) {
      Logger.error('Failed to update return delivery status with images', {
        error: error instanceof Error ? error.message : error,
        deliveryId: updateData.deliveryId,
        customerId: updateData.customerId,
      });
      throw new Error('update status return delivery with images failed');
    }
  }

  /**
   * Update status return delivery without images (case update data only)
   */
  async updateStatusReturnDeliveryWithoutImages(
    userId: string,
    updateData: IReturnDeliveryUpdateRequest
  ): Promise<void> {
    try {
      const { arrayListReturnDelivery } = updateData;

      // Check array return delivery
      if (!arrayListReturnDelivery || arrayListReturnDelivery.length === 0) {
        throw new Error('Array list return delivery is empty');
      }

      const now = new Date();
      const returnDateString = `Đã trả hàng ${now}`;

      // Handle multiple return deliveries (without images)
      for (const item of arrayListReturnDelivery) {
        // Get delivery by ID
        const delivery = await Delivery.findById(item.deliveryId).populate([
          'sender',
          'receiver',
          'fromRoute',
          'toRoute',
        ]);
        if (!delivery) {
          throw new Error(`Delivery with ID ${item.deliveryId} not found`);
        }

        // Check field collectForCustomer > 0
        if (delivery.collectForCustomer > 0) {
          // Call service money delivery to handle data and create new money delivery
          await this.moneyDeliveryService.createMoneyDelivery(
            {
              senderName: (delivery.sender as unknown as Record<string, unknown>).name as string,
              senderPhone: (delivery.sender as unknown as Record<string, unknown>).phone as string,
              receiverName: (delivery.receiver as unknown as Record<string, unknown>)
                .name as string,
              receiverPhone: (delivery.receiver as unknown as Record<string, unknown>)
                .phone as string,
              toRouteId: delivery.toRoute._id.toString(),
              sendMoneyAmount: delivery.collectForCustomer,
              sendCost: delivery.collectForCustomerCost || 0,
              transferType: 'regular',
              isFree: false,
              notes: `Thu dùm từ giao hàng ${delivery.fullCode}`,
            },
            userId
          );
          delivery.isCollectForCustomer = true;
        }

        // Check field collectForCustomerCost > 0
        if (delivery.collectCost > 0) {
          // Then update status with field isCollectForCustomerCost = true
          delivery.isCollectCost = true;
        }

        // Then update status return delivery with field isReturn = true
        delivery.isReturn = true;
        // Update field note with string 'Đã trả hàng + now date' + old value of note
        delivery.notes = `${returnDateString}, ${delivery.notes}`;
        delivery.updatedAt = now;
        delivery.dateReturn = now;
        await delivery.save();
      }

      Logger.info('Return delivery status updated without images successfully', {
        deliveryCount: arrayListReturnDelivery.length,
        timestamp: now,
      });
    } catch (error) {
      Logger.error('Failed to update return delivery status without images', {
        error: error instanceof Error ? error.message : error,
      });
      throw new Error('update status return delivery without images failed');
    }
  }

  async handleUploadImagesReturnDelivery(
    id: string,
    imagesData?: Array<{
      index: number;
      buffer: Buffer;
      originalName: string;
      rotate: number;
    }>
  ): Promise<IReturnDeliveryImage[]> {
    // Find the delivery
    const delivery = await Delivery.findById(id);
    if (!delivery) {
      throw new Error(`Return delivery with ID ${id} not found`);
    }

    // If no images provided, just return the delivery
    if (!imagesData || imagesData.length === 0) {
      return delivery.returnDeliveryImages || [];
    }

    if (delivery.returnDeliveryImages && delivery.returnDeliveryImages.length > 0) {
      for (const image of delivery.returnDeliveryImages) {
        const imagePath = path.join('public', image.url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    }

    // Handle multiple images upload
    const uploadedImages: IReturnDeliveryImage[] = [];

    for (const imageData of imagesData) {
      const { index, buffer, originalName, rotate } = imageData;

      // Create directory if not exists
      const uploadDir = path.join('public', 'uploads', 'return-deliveries', id);
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
      const relativePath = path.join('uploads', 'return-deliveries', id, fileName);

      uploadedImages.push({
        url: generateVersionedUrl(relativePath),
        rotate: rotate || 0,
      });
    }

    return uploadedImages;
  }
}
