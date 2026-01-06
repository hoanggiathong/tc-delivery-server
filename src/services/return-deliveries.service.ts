import { SORT_BY_RETURN_DELIVERIES } from '@/const/return-deliveries.const';
import { ICustomer } from '@/models/customer.model';
import { Delivery, IDelivery, IReturnDeliveryImage } from '@/models/delivery.model';
import {
  MoneyDeliveryStatus,
  MoneyDeliveryType,
  TransferType,
} from '@/models/money-delivery.model';
import {
  IReturnDeliveryLeanPopulated,
  IReturnDeliveryListDebtOfReturnDeliveriesTodayRequest,
  IReturnDeliveryListIsReturnRequest,
  IReturnDeliveryListAllRequest,
  IReturnDeliveryListRequest,
  IReturnDeliveryResponse,
  IReturnDeliveryUpdateRequest,
  IReturnDeliveryListCollectCostOfReturnDeliveriesRequest,
} from '@/types/return-delivery.type';
import {
  IDeliveryLeanPopulated,
  IGetListReportReturnDeliveryResponse,
} from '@/types/delivery.type';
import { CustomerService } from './customer.service';
import { DeliveryService } from './delivery.service';
import { UserService } from './user.service';
import { ICustomerInformationResponse } from '@/types/customer.type';
import { IRouteResponse } from '@/types/route.type';
import { RouteService } from './route.service';
import { MoneyDeliveryService } from './money-delivery.service';
import { SettingsService } from './settings.service';
import Logger from '@/utils/logger';
import path from 'path';
import fs from 'fs';
import { generateVersionedUrl, extractBasePath } from '@/utils/image-url.utils';

export class ReturnDeliveriesService {
  private customerService: CustomerService;
  private routeService: RouteService;
  private settingsService: SettingsService;
  private userService: UserService;
  private deliveryService: DeliveryService;
  private moneyDeliveryService: MoneyDeliveryService;
  constructor() {
    this.customerService = new CustomerService();
    this.routeService = new RouteService();
    this.settingsService = new SettingsService();
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
        const receiverCustomer = await this.customerService.getCustomerByPhone(phoneReceiver);

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
          smsType: item.smsType,
          smsStatus: item.smsStatus,
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
      const receiver: ICustomer | null =
        await this.customerService.getCustomerByPhone(phoneReceiver);

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
        address: receiver.address,
        identityCardName: receiver.identityCardName,
        identityCardIssuedDate: receiver.identityCardIssuedDate,
        identityCardNumber: receiver.identityCardNumber,
        images: receiver.images,
        isRoute: receiver.isRoute || false,
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
          collectCost: item.collectCost || 0,
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
          smsType: item.smsType,
          smsStatus: item.smsStatus,
          timeToSendSMS: item.timeToSendSMS,
          quantityReturn: item.quantityReturn || 0,
          dateReturn: item.dateReturn,
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

  // danh sach thu dum cua tra hang chua duoc thu ho
  async getListCollectForCustomerOfReturnDeliveriesNotCollected(
    userId: string
  ): Promise<IReturnDeliveryResponse[]> {
    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

    try {
      //get list money delivery with from route id and type collect for customer
      const moneyDeliveries =
        await this.moneyDeliveryService.getListMoneyDeliveryByUserIdAndTypeAndWaitingStatus(
          userId,
          MoneyDeliveryType.COLLECT_FOR_CUSTOMER
        );
      const returnDeliveries = await Delivery.find({
        _id: { $in: moneyDeliveries.map(item => item.deliveryId) },
        toRoute: selectedRouteId,
        isReturn: true,
        collectForCustomer: { $gt: 0 },
      })
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
        (item: IReturnDeliveryLeanPopulated) => {
          const moneyDelivery = moneyDeliveries.find(
            delivery => delivery.deliveryId?.toString() === item._id.toString()
          );

          return {
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
            collectCost: item.collectCost || 0,
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
            smsType: item.smsType,
            smsStatus: item.smsStatus,
            timeToSendSMS: item.timeToSendSMS,
            quantityReturn: item.quantityReturn || 0,
            dateReturn: item.dateReturn,
            createdByUser: {
              _id: item.createdByUser._id.toString(),
              username: item.createdByUser.username,
              name: item.createdByUser.name,
            },
            moneyDelivery: moneyDelivery
              ? {
                  _id: moneyDelivery._id.toString(),
                  sendMoneyAmount: moneyDelivery.sendMoneyAmount,
                  sendCost: moneyDelivery.sendCost,
                  type: moneyDelivery.type,
                  status: moneyDelivery.status,
                  dateReturn: moneyDelivery.dateReturn,
                }
              : undefined,
          };
        }
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

    try {
      //get list money delivery with from route id and type collect and waiting status
      const moneyDeliveries =
        await this.moneyDeliveryService.getListMoneyDeliveryByUserIdAndTypeAndWaitingStatus(
          userId,
          MoneyDeliveryType.COLLECT
        );

      const returnDeliveries = await Delivery.find({
        _id: { $in: moneyDeliveries.map(item => item.deliveryId) },
        fromRoute: selectedRouteId,
        isReturn: true,
        collectCost: { $gt: 0 },
      })
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
        (item: IReturnDeliveryLeanPopulated) => {
          const moneyDelivery = moneyDeliveries.find(
            delivery => delivery.deliveryId?.toString() === item._id.toString()
          );

          return {
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
            collectCost: item.collectCost || 0,
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
            smsType: item.smsType,
            smsStatus: item.smsStatus,
            timeToSendSMS: item.timeToSendSMS,
            quantityReturn: item.quantityReturn || 0,
            dateReturn: item.dateReturn,
            createdByUser: {
              _id: item.createdByUser._id.toString(),
              username: item.createdByUser.username,
              name: item.createdByUser.name,
            },
            moneyDelivery: moneyDelivery
              ? {
                  _id: moneyDelivery._id.toString(),
                  sendMoneyAmount: moneyDelivery.sendMoneyAmount,
                  sendCost: moneyDelivery.sendCost,
                  type: moneyDelivery.type,
                  status: moneyDelivery.status,
                  dateReturn: moneyDelivery.dateReturn,
                  contentReturn: moneyDelivery.contentReturn,
                }
              : undefined,
          };
        }
      );

      return returnDeliveriesResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list collect for customer of return deliveries failed');
    }
  }

  // hang thu ho tu chuyen (cho tram khac kiem tra thu ho)
  async getListCollectCostOfReturnDeliveries(
    query: IReturnDeliveryListCollectCostOfReturnDeliveriesRequest,
    userId: string
  ): Promise<IReturnDeliveryResponse[]> {
    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

    try {
      const { startDate, endDate } = query;

      const start = new Date(String(startDate));
      start.setHours(0, 0, 0, 0);

      const end = new Date(String(endDate));
      end.setHours(23, 59, 59, 999);

      //get list money delivery with from route id and type collect
      const moneyDeliveries = await this.moneyDeliveryService.getListMoneyDeliveryByUserIdAndType(
        userId,
        MoneyDeliveryType.COLLECT,
        start,
        end
      );

      const returnDeliveries = await Delivery.find({
        _id: { $in: moneyDeliveries.map(item => item.deliveryId) },
        toRoute: selectedRouteId,
        isReturn: true,
        collectCost: { $gt: 0 },
      })
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
        (item: IReturnDeliveryLeanPopulated) => {
          const moneyDelivery = moneyDeliveries.find(
            delivery => delivery.deliveryId?.toString() === item._id.toString()
          );

          return {
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
            collectCost: item.collectCost || 0,
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
            smsType: item.smsType,
            smsStatus: item.smsStatus,
            timeToSendSMS: item.timeToSendSMS,
            quantityReturn: item.quantityReturn || 0,
            dateReturn: item.dateReturn,
            createdByUser: {
              _id: item.createdByUser._id.toString(),
              username: item.createdByUser.username,
              name: item.createdByUser.name,
            },
            moneyDelivery: moneyDelivery
              ? {
                  _id: moneyDelivery._id.toString(),
                  sendMoneyAmount: moneyDelivery.sendMoneyAmount,
                  sendCost: moneyDelivery.sendCost,
                  type: moneyDelivery.type,
                  status: moneyDelivery.status,
                  dateReturn: moneyDelivery.dateReturn,
                  contentReturn: moneyDelivery.contentReturn,
                }
              : undefined,
          };
        }
      );
      return returnDeliveriesResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list collect for customer of return deliveries failed');
    }
  }

  // danh sach tat ca don hang cu da tra hang ve tram
  async getListAllReturnDeliveries(
    query: IReturnDeliveryListAllRequest,
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
          collectCost: item.collectCost || 0,
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
          smsType: item.smsType,
          smsStatus: item.smsStatus,
          timeToSendSMS: item.timeToSendSMS,
          quantityReturn: item.quantityReturn || 0,
          dateReturn: item.dateReturn,
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
  async getListReturnDeliveriesIsReturn(
    query: IReturnDeliveryListIsReturnRequest,
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
      // dateReturn: { $gte: start, $lte: end, $exists: true },
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
          collectCost: item.collectCost || 0,
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
          smsType: item.smsType,
          smsStatus: item.smsStatus,
          timeToSendSMS: item.timeToSendSMS,
          quantityReturn: item.quantityReturn || 0,
          dateReturn: item.dateReturn,
          createdByUser: {
            _id: item.createdByUser._id.toString(),
            username: item.createdByUser.username,
            name: item.createdByUser.name,
          },
          nameProductAndAdditionalInformation: item.nameProductAndAdditionalInformation || '',
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

  async updateNoteReturnDelivery(deliveryId: string, note: string): Promise<string> {
    const delivery = await Delivery.findById(deliveryId).select('notes');

    if (!delivery) {
      throw new Error('Delivery not found');
    }

    const existingNotes = typeof delivery.notes === 'string' ? delivery.notes : '';
    const newNote = existingNotes ? `${note}, ${existingNotes}` : note;

    await Delivery.updateOne({ _id: deliveryId }, { $set: { notes: newNote } });

    return newNote;
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

    const uploadedImages = await this.handleUploadImagesReturnDelivery(delivery, imagesData);

    // Update delivery with new images
    delivery.returnDeliveryImages = uploadedImages;
    await delivery.save();

    return uploadedImages;
  }

  async updateStatusWithImages(
    userId: string,
    updateData: {
      deliveryId: string;
      customerId: string;
      address?: string;
      identityCardName?: string;
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
  ): Promise<IDelivery> {
    try {
      const {
        deliveryId,
        customerId,
        address,
        identityCardName,
        identityCardIssuedDate,
        identityCardNumber,
      } = updateData;

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
          delivery,
          returnDeliveryImagesData
        );
        delivery.returnDeliveryImages = uploadedImages;
      }

      // Update customer information if provided
      if (address || identityCardName || identityCardIssuedDate || identityCardNumber) {
        const updateCustomerData: Record<string, unknown> = {};

        if (address) {
          updateCustomerData.address = address;
        }
        if (identityCardName) {
          updateCustomerData.identityCardName = identityCardName;
        }
        if (identityCardIssuedDate) {
          updateCustomerData.identityCardIssuedDate = identityCardIssuedDate;
        }
        if (identityCardNumber) {
          updateCustomerData.identityCardNumber = identityCardNumber;
        }

        await this.customerService.updateCustomer(customerId, updateCustomerData);
      }

      // Get populated delivery data for money delivery creation
      const populatedDeliveryData = await Delivery.findById(deliveryId)
        .populate([
          { path: 'sender', select: '_id name phone' },
          { path: 'receiver', select: '_id name phone' },
          { path: 'fromRoute', select: '_id code name' },
          { path: 'toRoute', select: '_id code name' },
        ])
        .lean<IDeliveryLeanPopulated>();

      if (populatedDeliveryData) {
        const typedDelivery = populatedDeliveryData;

        // Tạo money delivery cho thu hộ (collectCost)
        await this.createMoneyDeliveryForCollect(typedDelivery, userId);

        // Tạo money delivery cho thu dùm (collectForCustomer)
        await this.createMoneyDeliveryForCollectForCustomer(typedDelivery, userId);
      }

      // Then update status return delivery with field isReturn = true
      delivery.isReturn = true;
      // Update field note with string 'Đã trả hàng + now date' + old value of note
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const returnDateString = `Đã trả hàng ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${hours}:${minutes}`;
      const existingNotes = typeof delivery.notes === 'string' ? delivery.notes : '';
      delivery.notes = existingNotes ? `${returnDateString}, ${existingNotes}` : returnDateString;
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
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Re-throw the original error with its message for better debugging
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('update status return delivery with images failed');
    }
  }

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

      // format now with format dd/mm/yyyy hh:mm
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const returnDateString = `Đã trả hàng ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${hours}:${minutes}`;

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

        // Get populated delivery data for money delivery creation
        const populatedDeliveryData = await Delivery.findById(item.deliveryId)
          .populate([
            { path: 'sender', select: '_id name phone' },
            { path: 'receiver', select: '_id name phone' },
            { path: 'fromRoute', select: '_id code name' },
            { path: 'toRoute', select: '_id code name' },
          ])
          .lean<IDeliveryLeanPopulated>();

        if (populatedDeliveryData) {
          const typedDelivery = populatedDeliveryData;

          // Tạo money delivery cho thu hộ (collectCost)
          await this.createMoneyDeliveryForCollect(typedDelivery, userId);

          // Tạo money delivery cho thu dùm (collectForCustomer) với useRouteCustomer = true
          await this.createMoneyDeliveryForCollectForCustomer(typedDelivery, userId);
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
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Re-throw the original error with its message for better debugging
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('update status return delivery without images failed');
    }
  }

  /**
   * Tạo money delivery cho thu hộ (collectCost)
   */
  private async createMoneyDeliveryForCollect(
    typedDelivery: IDeliveryLeanPopulated,
    userId: string
  ): Promise<void> {
    if (typedDelivery.collectCost <= 0) {
      return;
    }

    const feeMoney = await this.settingsService.calculateShippingFee(
      typedDelivery.collectCost,
      false,
      false
    );

    await this.moneyDeliveryService.createMoneyDelivery(
      {
        senderName: typedDelivery.receiverName,
        senderPhone: typedDelivery.receiver.phone,
        receiverName: typedDelivery.senderName,
        receiverPhone: typedDelivery.sender.phone,
        toRouteId: typedDelivery.toRoute._id.toString(),
        sendMoneyAmount: typedDelivery.collectCost - feeMoney,
        sendCost: feeMoney,
        transferType: TransferType.REGULAR,
        isFree: false,
        notes: `Thu hộ từ giao hàng ${typedDelivery.fullCode}`,
        status: MoneyDeliveryStatus.WAITING,
        type: MoneyDeliveryType.COLLECT,
        deliveryId: typedDelivery._id.toString(),
        fromRouteId: typedDelivery.fromRoute._id.toString(),
      },
      userId
    );
  }

  /**
   * Tạo money delivery cho thu dùm (collectForCustomer)
   */
  private async createMoneyDeliveryForCollectForCustomer(
    typedDelivery: IDeliveryLeanPopulated,
    userId: string
  ): Promise<void> {
    if (typedDelivery.collectForCustomer <= 0) {
      return;
    }

    const customerToRoute = await this.customerService.getInformationRouteCustomer(
      typedDelivery.toRoute._id.toString()
    );

    if (!customerToRoute) {
      throw new Error(
        `Customer to route with ID ${typedDelivery.toRoute._id.toString()} not found`
      );
    }

    const customerFromRoute = await this.customerService.getInformationRouteCustomer(
      typedDelivery.fromRoute._id.toString()
    );

    if (!customerFromRoute) {
      throw new Error(
        `Customer from route with ID ${typedDelivery.fromRoute._id.toString()} not found`
      );
    }

    await this.moneyDeliveryService.createMoneyDelivery(
      {
        senderName: customerToRoute.name,
        senderPhone: customerToRoute.phone,
        receiverName: customerFromRoute.name,
        receiverPhone: customerFromRoute.phone,
        toRouteId: typedDelivery.fromRoute._id.toString(),
        sendMoneyAmount: typedDelivery.collectForCustomer,
        sendCost: 0,
        transferType: TransferType.REGULAR,
        isFree: false,
        notes: `Thu dùm từ giao hàng ${typedDelivery.fullCode}`,
        status: MoneyDeliveryStatus.WAITING,
        type: MoneyDeliveryType.COLLECT_FOR_CUSTOMER,
        deliveryId: typedDelivery._id.toString(),
      },
      userId
    );
  }

  async handleUploadImagesReturnDelivery(
    delivery: IDelivery,
    imagesData?: Array<{
      index: number;
      buffer: Buffer;
      originalName: string;
      rotate: number;
    }>
  ): Promise<IReturnDeliveryImage[]> {
    const oldImages: IReturnDeliveryImage[] = delivery.returnDeliveryImages || [];
    const quantityNewImages = imagesData?.length || 0;
    const quantityOldImages = oldImages.length || 0;
    const totalImages = quantityNewImages + quantityOldImages;

    const id = delivery._id.toString();

    // If no images provided, just return the existing images
    if (!imagesData || imagesData.length === 0) {
      return delivery.returnDeliveryImages || [];
    }

    // Handle multiple images upload
    let uploadedImages: IReturnDeliveryImage[] = [];

    // Upload new images first
    for (const imageData of imagesData) {
      const { index, buffer, originalName, rotate } = imageData;

      // Create directory if not exists
      const uploadDir = path.join('public', 'uploads', 'return-deliveries', id);
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
      const relativePath = path.join('uploads', 'return-deliveries', id, fileName);

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

  async getListReportReturnDeliveryWithStatusDone(
    userId: string
  ): Promise<IGetListReportReturnDeliveryResponse> {
    try {
      const report = await this.deliveryService.getListReportReturnDeliveryWithStatusDone(userId);
      return report;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list report return delivery with status done failed');
    }
  }
}
