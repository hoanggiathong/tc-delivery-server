import { SORT_BY_RETURN_DELIVERIES } from '@/const/return-deliveries.const';
import { Delivery } from '@/models/delivery.model';
import {
  IReturnDeliveryLeanPopulated,
  IReturnDeliveryResponse,
} from '@/types/return-delivery.type';
import { Types } from 'mongoose';
import { DeliveryService } from './delivery.service';
import { UserService } from './user.service';

export class ReturnDeliveriesService {
  // private customerService: CustomerService;
  // private settingsService: SettingsService;
  private userService: UserService;
  private deliveryService: DeliveryService;

  constructor() {
    // this.customerService = new CustomerService();
    // this.settingsService = new SettingsService();
    this.userService = new UserService();
    this.deliveryService = new DeliveryService();
  }
  async getListReturnDeliveries(req: any, userId: string): Promise<IReturnDeliveryResponse[]> {
    const { startDate, endDate, keySort, phoneReceiver } = req.query;

    let { typeSort } = req.query;

    const start = new Date(String(startDate));

    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

    const toId = new Types.ObjectId(String(selectedRouteId));
    let sort = {};

    const where = {
      toRoute: toId,
      createdAt: { $gte: start, $lte: endDate },
      isReturn: false,
    };

    if (phoneReceiver) {
      (where as any)['receiver.phone'] = phoneReceiver;
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
            id: item.toRoute.id.toString(),
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
}
