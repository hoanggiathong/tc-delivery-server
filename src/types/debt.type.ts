import { Types } from 'mongoose';
import { IDebtManagement } from './debt-management.type';

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
  dateDebt?: Date;
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
  dateDebt?: Date;
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
  surchargeToRouteList: IDebtDetailItem[]; // PHỤ PHÍ VỀ
  costToRouteList: IDebtDetailItem[]; // TIỀN VỀ (from MoneyDelivery)
  receivableManagementList: IDebtDetailExpense[]; // TIỀN thu khác (from DebtManagement RECEIPT)

  // Chiều ngược = chiều đi (toRoute -> fromRoute)
  feeCODFromRouteList: IDebtDetailItem[]; // NỢ CƯỚC ĐI
  homeDeliveryFromRouteList: IDebtDetailItem[]; // GIAO TẬN NƠI ĐI
  surchargeFromRouteList: IDebtDetailItem[]; // PHỤ PHÍ ĐI
  costFromRouteList: IDebtDetailItem[]; // TIỀN ĐI (from MoneyDelivery)
  paymentManagementList: IDebtDetailExpense[]; // TIỀN chi khác (from DebtManagement PAYMENT)
}

export interface IDebtReportDetailWithListValues {
  data: IDebtRow;
  debtDetailWithListValues: IDebtDetailWithListValues;
}

export interface IExportTotalDebtRow {
  fromRoute: IRouteInfo;
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

export interface IExportTotalDebtResponse {
  data: IExportTotalDebtRow[];
  total: IDebtTotal;
}

export interface IExportReportTotalDebtResponse {
  data: IExportTotalDebtRow[];
  total: IDebtTotal;
  dataListReceiptDebtManagement: IDebtManagement[];
  dataListPaymentDebtManagement: IDebtManagement[];
}
