import { Types } from 'mongoose';

export interface IRouteInfo {
  id: Types.ObjectId | string;
  name?: string;
}

export interface IDebtRow {
  id: Types.ObjectId | string;
  fromRoute: IRouteInfo;
  toRoute: IRouteInfo;
  openingBalance?: number;
  costFromRoute: number;
  feeCODToRoute: number;
  costToRoute: number;
  feeCODFromRoute: number;
  accountPayable: number;
  receivable: number;
  homeDeliveryFromRoute: number;
  homeDeliveryToRoute: number;
  surchargeToRoute: number;
  surchargeFromRoute: number;
  totalDebt: number;
  paymentDebt?: number;
  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
}

export interface IDebtTotal {
  openingBalance: number;
  costFromRoute: number;
  feeCODToRoute: number;
  costToRoute: number;
  feeCODFromRoute: number;
  accountPayable: number;
  receivable: number;
  homeDeliveryFromRoute: number;
  homeDeliveryToRoute: number;
  surchargeToRoute: number;
  surchargeFromRoute: number;
  totalDebt: number;
}

export interface IGetListDebtResponse {
  data: IDebtRow[];
  total: IDebtTotal;
}

export interface IDebtDetailItem {
  code: string;
  money: number;
}

export interface IDebtDetailExpense {
  content: string;
  money: number;
}

export interface IDebtDetailWithListValues extends IDebtRow {
  // Chiều thuận = chiều về (fromRoute -> toRoute)
  feeCODToRouteList: IDebtDetailItem[]; // NỢ CƯỚC VỀ
  homeDeliveryToRouteList: IDebtDetailItem[]; // GIAO TẬN NƠI VỀ
  surchargeFromRouteList: IDebtDetailItem[]; // PHỤ PHÍ VỀ
  costToRouteList: IDebtDetailItem[]; // TIỀN VỀ (from MoneyDelivery)
  receivableList: IDebtDetailExpense[]; // TIỀN VỀ (from DebtManagement RECEIPT)

  // Chiều ngược = chiều đi (toRoute -> fromRoute)
  feeCODFromRouteList: IDebtDetailItem[]; // NỢ CƯỚC ĐI
  homeDeliveryFromRouteList: IDebtDetailItem[]; // GIAO TẬN NƠI ĐI
  surchargeToRouteList: IDebtDetailItem[]; // PHỤ PHÍ ĐI
  costFromRouteList: IDebtDetailItem[]; // TIỀN ĐI (from MoneyDelivery)
  accountPayableList: IDebtDetailExpense[]; // TIỀN ĐI (from DebtManagement PAYMENT)
}

export interface IDebtReportDetailWithListValues {
  data: IDebtRow;
  debtDetailWithListValues: IDebtDetailWithListValues;
}
