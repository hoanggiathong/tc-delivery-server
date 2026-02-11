import { IDeliveryResponse } from './delivery.type';
import { IMoneyDeliveryResponse } from './money-delivery.type';

export interface IReportReturnMoneyDeliveryAndReturnDeliveryRequest {
  startDate: string;
  endDate: string;
  routeId?: string;
}

export interface IAccountingReportRequest {
  startDate: string;
  endDate: string;
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
  totalCostPaid: number; // cước thực thu
  totalCostNotHomeDeliveryCostAndCollectForCustomerCost: number;
  totalCollectForCustomerCostWithPaymentTypeDebtDelivery: number; //Phụ phí về (nợ)
  totalCostWithPaymentTypePaidInTodayOfReturnDelivery: number; //Hàng nợ cước đã trả trong ngày
}

// Accounting Report Types
export interface IAccountingRouteRow {
  transferMoney: number; // CHUYỂN TIỀN
  shippingFee: number; // CƯỚC PHÍ
  surcharge: number; // PHỤ PHÍ
}

export interface IAccountingRouteData {
  routeId: string;
  routeCode: string;
  routeName: string;
  normalDelivery: IAccountingRouteRow; // Row 1: HÀNG CHUYỂN THƯỜNG
  homeDelivery: IAccountingRouteRow & { homeDeliveryCostTotal: number }; // Row 2: HÀNG GIAO TẬN NƠI
  normalMoneyTransfer: IAccountingRouteRow; // Row 3: TIỀN CHUYỂN THƯỜNG
  expressMoneyTransfer: IAccountingRouteRow; // Row 4: TIỀN CHUYỂN NHANH
  collectHoldMoney: IAccountingRouteRow; // Row 5: TIỀN THU HỘ GIỮ
  debtCost: IAccountingRouteRow; // Row 6: NỢ CƯỚC
  totalActualCollected: IAccountingRouteRow; // Row 7: TỔNG CỘNG TIỀN THỰC THU
}

export interface IAccountingReportTotal {
  totalSendMoneyToStations: number; // TỔNG TIỀN GỬI CÁC TRẠM
  totalCollectHoldMoney: number; // TỔNG TIỀN THU HỘ GIỮ
  totalShippingCostDebt: number; // TỔNG CƯỚC GỬI NỢ CƯỚC
  totalHomeDeliveryCostDebt: number; // TỔNG TIỀN GTN NỢ CƯỚC
  totalActualRevenue: number; // TỔNG THỰC THU
  cashInSafe: number; // TIỀN TRONG TỦ
  revenue: number; // Doanh Thu (Có GTN đi + Phụ phí đi)
  totalOutgoingHomeDeliveryCost: number; // TỔNG CƯỚC GTN đi
  totalOutgoingSurcharge: number; // TỔNG PHỤ PHÍ đi
  totalRevenueFundSubmission: number; // Tổng Doanh Thu Nộp Quỹ (BCTC)
}

export interface IAccountingReportResponse {
  routes: IAccountingRouteData[];
  total: IAccountingReportTotal;
}
