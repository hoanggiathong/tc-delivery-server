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
