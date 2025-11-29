import { IDeliveryResponse } from '@/types/delivery.type';
import { IMoneyDeliveryResponse } from '@/types/money-delivery.type';
import {
  IReportReturnMoneyDeliveryAndReturnDeliveryRequest,
  IReportReturnMoneyDeliveryAndReturnDeliveryResponse,
} from '@/types/report.type';
import { DeliveryService } from './delivery.service';
import { MoneyDeliveryService } from './money-delivery.service';

export class ReportService {
  private moneyDeliveryService: MoneyDeliveryService;
  private deliveryService: DeliveryService;
  constructor() {
    this.moneyDeliveryService = new MoneyDeliveryService();
    this.deliveryService = new DeliveryService();
  }

  // report for return money delivery and return delivery
  async getReportReturnMoneyDeliveryAndReturnDelivery(
    query: IReportReturnMoneyDeliveryAndReturnDeliveryRequest
  ): Promise<IReportReturnMoneyDeliveryAndReturnDeliveryResponse> {
    const { startDate, endDate, routeId } = query;

    const start = new Date(String(startDate));
    start.setHours(0, 0, 0, 0);

    const end = new Date(String(endDate));
    end.setHours(23, 59, 59, 999);

    try {
      let moneyDeliveriesTypeNormal: IMoneyDeliveryResponse[] = [];
      let moneyDeliveriesTypeCollect: IMoneyDeliveryResponse[] = [];
      let returnDeliveries: IDeliveryResponse[] = [];
      if (routeId) {
        moneyDeliveriesTypeNormal =
          await this.moneyDeliveryService.getListMoneyDeliveryByTypeNormalAndStatusDone(
            start,
            end,
            routeId
          );

        moneyDeliveriesTypeCollect =
          await this.moneyDeliveryService.getListMoneyDeliveryByTypeCollectAndStatusDone(
            start,
            end,
            routeId
          );

        returnDeliveries = await this.deliveryService.getListReturnDeliveriesByToRouteId(
          start,
          end,
          routeId
        );
      } else {
        moneyDeliveriesTypeNormal =
          await this.moneyDeliveryService.getListMoneyDeliveryByTypeNormalAndStatusDone(start, end);

        moneyDeliveriesTypeCollect =
          await this.moneyDeliveryService.getListMoneyDeliveryByTypeCollectAndStatusDone(
            start,
            end
          );

        returnDeliveries = await this.deliveryService.getListReturnDeliveriesByToRouteId(
          start,
          end
        );
      }

      const data: IReportReturnMoneyDeliveryAndReturnDeliveryResponse = {
        deliveries: returnDeliveries,
        moneyDeliveriesTypeNormal: moneyDeliveriesTypeNormal,
        moneyDeliveriesTypeCollect: moneyDeliveriesTypeCollect,
      };

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get report return money delivery and return delivery');
    }
  }
}
