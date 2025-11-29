import { IDeliveryResponse } from './delivery.type';
import { IMoneyDeliveryResponse } from './money-delivery.type';

export interface IReportReturnMoneyDeliveryAndReturnDeliveryRequest {
  startDate: string;
  endDate: string;
  routeId?: string;
}

export interface IReportReturnMoneyDeliveryAndReturnDeliveryResponse {
  deliveries: IDeliveryResponse[];
  moneyDeliveriesTypeNormal: IMoneyDeliveryResponse[];
  moneyDeliveriesTypeCollect: IMoneyDeliveryResponse[];
}
