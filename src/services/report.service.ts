import { IDeliveryResponse } from '@/types/delivery.type';
import { IMoneyDeliveryResponse } from '@/types/money-delivery.type';
import {
  IReportReturnMoneyDeliveryAndReturnDeliveryRequest,
  IReportReturnMoneyDeliveryAndReturnDeliveryResponse,
} from '@/types/report.type';
import { DeliveryService } from './delivery.service';
import { MoneyDeliveryService } from './money-delivery.service';
import { MoneyDeliveryType } from '@/models/money-delivery.model';
import { PAYMENT_TYPE } from '@/const/money-deliveries.const';

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

      let totalSendMoneyAmountTypeNormalMoneyDelivery: number = 0;
      let totalSendMoneyAmountTypeCollectMoneyDelivery: number = 0;
      let totalCostWithPaymentTypeDebtDelivery: number = 0;
      let totalSendCostWithTypeNormalMoneyDelivery: number = 0;
      let totalSendCostWithTypeCollectMoneyDelivery: number = 0;
      let totalCostDelivery: number = 0;
      let homeDeliveryCostWithPaymentTypePaidDelivery: number = 0;
      let totalCollectForCustomerCostWithPaymentTypePaidDelivery: number = 0;

      const moneyDeliveryList = [...moneyDeliveriesTypeNormal, ...moneyDeliveriesTypeCollect];

      for (const moneyDelivery of moneyDeliveryList) {
        if (moneyDelivery.type === MoneyDeliveryType.NORMAL) {
          totalSendMoneyAmountTypeNormalMoneyDelivery += moneyDelivery.sendMoneyAmount || 0;
          totalSendCostWithTypeNormalMoneyDelivery += moneyDelivery.sendCost || 0;
        } else {
          totalSendMoneyAmountTypeCollectMoneyDelivery += moneyDelivery.sendMoneyAmount || 0;
          totalSendCostWithTypeCollectMoneyDelivery += moneyDelivery.sendCost || 0;
        }
      }

      for (const delivery of returnDeliveries) {
        totalCostDelivery += delivery.cost || 0;
        if (delivery.paymentType === PAYMENT_TYPE.PAID) {
          homeDeliveryCostWithPaymentTypePaidDelivery += delivery.homeDeliveryCost || 0;
          totalCollectForCustomerCostWithPaymentTypePaidDelivery +=
            delivery.collectForCustomerCost || 0;
        } else {
          totalCostWithPaymentTypeDebtDelivery += delivery.cost || 0;
        }
      }

      const totalCostWithPaymentTypePaidDelivery: number =
        totalCostDelivery - totalCostWithPaymentTypeDebtDelivery;

      const totalCostPaid: number =
        totalCostWithPaymentTypePaidDelivery +
        totalCollectForCustomerCostWithPaymentTypePaidDelivery +
        homeDeliveryCostWithPaymentTypePaidDelivery;
      const totalCostNotHomeDeliveryCostAndCollectForCustomerCost: number =
        totalCostDelivery +
        totalSendCostWithTypeCollectMoneyDelivery +
        totalSendCostWithTypeNormalMoneyDelivery;

      const sum = {
        totalSendMoneyAmountTypeNormalMoneyDelivery: totalSendMoneyAmountTypeNormalMoneyDelivery,
        totalSendMoneyAmountTypeCollectMoneyDelivery: totalSendMoneyAmountTypeCollectMoneyDelivery,
        totalCostWithPaymentTypeDebtDelivery: totalCostWithPaymentTypeDebtDelivery,
        totalSendCostWithTypeNormalMoneyDelivery: totalSendCostWithTypeNormalMoneyDelivery,
        totalSendCostWithTypeCollectMoneyDelivery: totalSendCostWithTypeCollectMoneyDelivery,
        totalCostDelivery: totalCostDelivery,
        homeDeliveryCostWithPaymentTypePaidDelivery: homeDeliveryCostWithPaymentTypePaidDelivery,
        totalCollectForCustomerCostWithPaymentTypePaidDelivery:
          totalCollectForCustomerCostWithPaymentTypePaidDelivery,
        totalCostPaid: totalCostPaid,
        totalCostNotHomeDeliveryCostAndCollectForCustomerCost:
          totalCostNotHomeDeliveryCostAndCollectForCustomerCost,
      };

      const data: IReportReturnMoneyDeliveryAndReturnDeliveryResponse = {
        deliveries: returnDeliveries,
        moneyDeliveriesTypeNormal: moneyDeliveriesTypeNormal,
        moneyDeliveriesTypeCollect: moneyDeliveriesTypeCollect,
        sum: sum,
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
