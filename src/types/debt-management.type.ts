import { Types } from 'mongoose';

type RouteInfo = { _id: Types.ObjectId | string; name?: string };

export interface IDebtManagement {
  _id: Types.ObjectId | string;
  fromRoute: RouteInfo;
  toRoute: RouteInfo;
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
