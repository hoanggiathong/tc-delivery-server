import { TYPE_DELIVERY_CUSTOMER } from '@/const/customer.const';
import { SORT_BY_RETURN_DELIVERIES } from '@/const/return-deliveries.const';
import { ICustomer } from '@/models/customer.model';
import { Delivery } from '@/models/delivery.model';
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

  async updateStatusReturnDelivery(
    userId: string,
    updateData: IReturnDeliveryUpdateRequest,
    uploadedFiles?: Express.Multer.File[]
  ): Promise<void> {
    try {
      const { arrayListReturnDelivery } = updateData;

      // Check array return delivery
      if (!arrayListReturnDelivery || arrayListReturnDelivery.length === 0) {
        throw new Error('Array list return delivery is empty');
      }

      const now = new Date();
      const returnDateString = `Đã trả hàng ${now.toLocaleDateString('vi-VN')}`;

      if (arrayListReturnDelivery.length === 1) {
        // Handle single return delivery
        const singleItem = arrayListReturnDelivery[0];

        // Get delivery by ID
        const delivery = await Delivery.findById(singleItem.deliveryId).populate([
          'sender',
          'receiver',
          'fromRoute',
          'toRoute',
        ]);
        if (!delivery) {
          throw new Error(`Delivery with ID ${singleItem.deliveryId} not found`);
        }

        // Get customer by ID
        const customer = await this.customerService.getCustomerById(singleItem.customerId);
        if (!customer) {
          throw new Error(`Customer with ID ${singleItem.customerId} not found`);
        }

        // Handle file images to save in folder (only for single delivery)
        if (
          singleItem.imagesDeliveries &&
          singleItem.imagesDeliveries.length > 0 &&
          uploadedFiles
        ) {
          const returnDeliveryImages = [];
          const customerImagesStartIndex = singleItem.images ? singleItem.images.length : 0;

          for (let j = 0; j < singleItem.imagesDeliveries.length; j++) {
            const imageInfo = singleItem.imagesDeliveries[j];
            const fileIndex = customerImagesStartIndex + j;

            if (uploadedFiles[fileIndex]) {
              const file = uploadedFiles[fileIndex];

              // Create delivery folder if not exists
              const deliveryFolder = path.join('public/uploads/deliveries', singleItem.deliveryId);
              if (!fs.existsSync(deliveryFolder)) {
                fs.mkdirSync(deliveryFolder, { recursive: true });
              }

              // Save delivery image
              const ext = path.extname(file.originalname);
              const filename = `delivery_${j + 1}${ext}`;
              const filePath = path.join(deliveryFolder, filename);
              fs.writeFileSync(filePath, file.buffer);

              const baseUrl = `/uploads/deliveries/${singleItem.deliveryId}/${filename}`;
              returnDeliveryImages.push({
                url: baseUrl,
                rotate: imageInfo.rotate || 0,
              });
            }
          }

          // Handle to and save value and url for field returnDeliveryImages
          delivery.returnDeliveryImages = returnDeliveryImages;
        }

        // Handle field images of customer to update images and info
        if (singleItem.images && singleItem.images.length > 0 && uploadedFiles) {
          for (let j = 0; j < singleItem.images.length; j++) {
            const imageInfo = singleItem.images[j];
            const fileIndex = j;

            if (uploadedFiles[fileIndex]) {
              const file = uploadedFiles[fileIndex];
              await this.customerService.uploadImageById(
                singleItem.customerId,
                j + 1, // Image index starts from 1
                file.buffer,
                file.originalname,
                imageInfo.rotate || 0
              );
            }
          }
        }

        // Update customer information if provided
        if (
          singleItem.address ||
          singleItem.identityCardIssuedDate ||
          singleItem.identityCardNumber
        ) {
          const updateCustomerData: Record<string, unknown> = {};

          if (singleItem.address) {
            updateCustomerData.address = singleItem.address;
          }
          if (singleItem.identityCardIssuedDate) {
            updateCustomerData.identityCardIssuedDate = singleItem.identityCardIssuedDate;
          }
          if (singleItem.identityCardNumber) {
            updateCustomerData.identityCardNumber = singleItem.identityCardNumber;
          }

          await this.customerService.updateCustomer(singleItem.customerId, updateCustomerData);
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
              sendCost: 0,
              transferType: 'regular',
              isFree: false,
              notes: `Thu dùm từ giao hàng ${delivery.fullCode}`,
            },
            userId
          );
        }

        // Check field collectForCustomerCost > 0
        if (delivery.collectForCustomerCost > 0) {
          // Then update status with field isCollectForCustomerCost = true
          delivery.isCollectForCustomerCost = true;
        }

        // Then update status return delivery with field isReturn = true
        delivery.isReturn = true;
        // Update field note with string 'Đã trả hàng + now date' + old value of note
        delivery.notes = `${returnDateString}, ${delivery.notes}`;
        delivery.updatedAt = now;
        delivery.dateReturn = now;
        await delivery.save();
      } else {
        // Handle multiple return deliveries (array > 1)
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

          // Get customer by ID
          const customer = await this.customerService.getCustomerById(item.customerId);
          if (!customer) {
            throw new Error(`Customer with ID ${item.customerId} not found`);
          }

          // Don't handle field returnDeliveryImages for multiple deliveries

          // Update customer information if provided
          if (item.address || item.identityCardIssuedDate || item.identityCardNumber) {
            const updateCustomerData: Record<string, unknown> = {};

            if (item.address) {
              updateCustomerData.address = item.address;
            }
            if (item.identityCardIssuedDate) {
              updateCustomerData.identityCardIssuedDate = item.identityCardIssuedDate;
            }
            if (item.identityCardNumber) {
              updateCustomerData.identityCardNumber = item.identityCardNumber;
            }

            await this.customerService.updateCustomer(item.customerId, updateCustomerData);
          }

          // Check field collectForCustomer > 0
          if (delivery.collectForCustomer > 0) {
            // Call service money delivery to handle data and create new money delivery
            await this.moneyDeliveryService.createMoneyDelivery(
              {
                senderName: (delivery.sender as unknown as Record<string, unknown>).name as string,
                senderPhone: (delivery.sender as unknown as Record<string, unknown>)
                  .phone as string,
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
          }

          // Check field collectForCustomerCost > 0
          if (delivery.collectForCustomerCost > 0) {
            // Then update status with field isCollectForCustomerCost = true
            delivery.isCollectForCustomerCost = true;
          }

          // Then update status return delivery with field isReturn = true
          delivery.isReturn = true;
          // Update field note with string 'Đã trả hàng + now date' + old value of note
          delivery.notes = `${returnDateString}, ${delivery.notes}`;
          delivery.updatedAt = now;
          delivery.dateReturn = now;
          await delivery.save();
        }
      }

      Logger.info('Return delivery status updated successfully', {
        deliveryCount: arrayListReturnDelivery.length,
        timestamp: now,
      });
    } catch (error) {
      Logger.error('Failed to update return delivery status', {
        error: error instanceof Error ? error.message : error,
      });
      throw new Error('update status return delivery failed');
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
      isCollectForCustomerCost: { $ne: true },
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
}
