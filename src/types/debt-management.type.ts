import { Types } from 'mongoose';
//import { IUserFullInformationResponse } from './user.type';

type IDebtManagementCreatedBy = {
  id: string;
  username: string;
  name: string;
};

export interface IRouteInfo {
  id: Types.ObjectId | string;
  name?: string;
}

export interface IDebtManagement {
  id: Types.ObjectId | string;
  fromRoute: IRouteInfo;
  toRoute: IRouteInfo;
  pivotRoute?: {
    id: string;
    name: string;
  };
  content: string;
  type: string;
  cash: number; // so tien
  cashDate: Date; // ngay thu tien
  deleted: boolean;
  reason?: string; // ly do xoa
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  createdBy: IDebtManagementCreatedBy;
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

export interface ICreateDebtClearingRequest {
  fromRoute: string; // trạm đang nợ trạm hiện tại, ví dụ TM
  toRoute: string; // trạm mà trạm hiện tại đang nợ, ví dụ TP
  content: string;
  cash: number;
  cashDate: Date;
}

export interface ICreateDebtClearingResponse {
  data: IDebtManagement;
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
