import { Types } from 'mongoose';

export interface IRouteInfo {
  id: Types.ObjectId | string;
  name?: string;
}

export interface IDebtManagement {
  id: Types.ObjectId | string;
  fromRoute: IRouteInfo;
  toRoute: IRouteInfo;
  content: string;
  type: string;
  cash: number; // so tien
  cashDate: Date; // ngay thu tien
  deleted: boolean;
  reason?: string; // ly do xoa
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  __v?: number;
}

export interface IDebtManagementResponse {
  id: Types.ObjectId | string;
  fromRoute: string;
  toRoute: string;
  content: string;
  type: string;
  cash: number; // so tien
  cashDate: Date; // ngay thu tien
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  __v?: number;
}

export interface ICreateDebtManagementRequest {
  fromRoute: string;
  content: string;
  cash: number;
  cashDate: Date;
}

export interface IGetListPaymentDebtManagementResponse {
  data: IDebtManagement[];
}

export interface IGetListReceiptDebtManagementResponse {
  data: IDebtManagement[];
}

export interface ICreateDebtManagementResponse {
  data: IDebtManagement[];
}
