import { TYPE_DELIVERY_CUSTOMER } from '@/const/customer.const';
import { SORT_BY_RETURN_DELIVERIES } from '@/const/return-deliveries.const';
import { ICustomer } from '@/models/customer.model';
import { Delivery } from '@/models/delivery.model';
import {
  IReturnDeliveryLeanPopulated,
  IReturnDeliveryListRequest,
  IReturnDeliveryResponse,
} from '@/types/return-delivery.type';
import { CustomerService } from './customer.service';
import { DeliveryService } from './delivery.service';
import { UserService } from './user.service';
import { ICustomerInformationResponse } from '@/types/customer.type';
import { IRouteResponse } from '@/types/route.type';
import { RouteService } from './route.service';
import { MoneyDeliveryService } from './money-delivery.service';

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
        })
      );
      return returnDeliveriesResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list payment debt management failed');
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
}

// async function updateStatusReturnDelivery(phoneReceiver: string): Promise<void> {
//   try {
//     // todo: check array return delivery
//     // if arrray is empty, => return error
//     // if array >1
//     // => don't handle field returnDeliveryImages
//     // => check field collectForCustomer > 0
//     // => call service money delivery to handle data and create new money delivery
//     // => update status return delivery with field isReturn = true
//     // => update field note with string 'Đã trả hàng + now date' + old value of note
//     // if array = 1
//     // => handle field returnDeliveryImages
//     // => handle field images of customer to update images and infor
//     // => check field collectForCustomer > 0
//     // => call service money delivery to handle data and create new money delivery
//     // => then update status return delivery with field isReturn = true
//     // => update field note with string 'Đã trả hàng + now date' + old value of note
//   } catch (error) {
//     throw new Error('update status return delivery failed');
//   }
// }
