import { BaseEntity } from '.';

export enum SurchargeUnit {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export interface IRouteResponse extends BaseEntity {
  code: string;
  name: string;
  address?: string;
  distance?: number;
  surcharge?: number;
  surchargeUnit?: SurchargeUnit;
  phone?: string;
  type: RouteType;
}

export interface IRouteCreateRequest {
  code: string;
  name: string;
  address?: string;
  distance?: number;
  surcharge?: number;
  surchargeUnit?: SurchargeUnit;
  phone?: string;
  type: RouteType;
}

export interface IRouteUpdateRequest {
  code?: string;
  name?: string;
  address?: string;
  distance?: number;
  surcharge?: number;
  surchargeUnit?: SurchargeUnit;
  phone?: string;
  type: RouteType;
}

export interface IRouteLean {
  _id: string;
  code: string;
  name: string;
  address?: string;
  distance?: number;
  surcharge?: number;
  surchargeUnit?: SurchargeUnit;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
  type: RouteType;
}

export enum RouteType {
  OWNED = 'owned', // Trạm trực thuộc
  PARTNER = 'partner', // Trạm liên kết
}
