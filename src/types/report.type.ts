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
  sum: ITotalReportReturnMoneyDeliveryAndReturnDeliveryResponse;
}

export interface ITotalReportReturnMoneyDeliveryAndReturnDeliveryResponse {
  totalSendMoneyAmountTypeNormalMoneyDelivery: number; //Tổng tiền gửi
  totalSendMoneyAmountTypeCollectMoneyDelivery: number; //Tổng TH giữ => lấy all trạng thái paymentType
  totalCostWithPaymentTypeDebtDelivery: number; //Nợ cước
  totalSendCostWithTypeNormalMoneyDelivery: number; //cước gửi tiền thường
  totalSendCostWithTypeCollectMoneyDelivery: number; //cước thu hộ
  totalCostDelivery: number; //Cước gửi hàng
  homeDeliveryCostWithPaymentTypePaidDelivery: number; //Cước GTN đi (đã thu)
  totalCollectForCustomerCostWithPaymentTypePaidDelivery: number; //Phụ phí đi (đã thu)
  totalCostPaid: number;
  totalCostNotHomeDeliveryCostAndCollectForCustomerCost: number;
  totalCollectForCustomerCostWithPaymentTypeDebtDelivery: number; //Phụ phí về (nợ)
}
