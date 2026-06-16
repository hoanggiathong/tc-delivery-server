import { BaseEntity } from '.';
import { Types } from 'mongoose';

export enum SurchargeUnit {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export interface IRouteResponse extends BaseEntity {
  code: string;
  name: string;
  address?: string;
  lat?: number | null;
  lon?: number | null;
  distance?: number;
  surcharge?: number;
  surchargeUnit?: SurchargeUnit;
  phone?: string;
  type: RouteType;
  parentRouteId?: string | null;
}

export interface IRouteCreateRequest {
  code: string;
  name: string;
  address?: string;
  lat?: number | null;
  lon?: number | null;
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
  lat?: number | null;
  lon?: number | null;
  distance?: number;
  surcharge?: number;
  surchargeUnit?: SurchargeUnit;
  phone?: string;
  type: RouteType;
}

export interface IRouteLean {
  _id: Types.ObjectId;
  code: string;
  name: string;
  address?: string;
  lat?: number | null;
  lon?: number | null;
  distance?: number;
  surcharge?: number;
  surchargeUnit?: SurchargeUnit;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
  type: RouteType;
  parentRouteId?: Types.ObjectId | null;
}

export enum RouteType {
  OWNED = 'owned', // Trạm trực thuộc
  PARTNER = 'partner', // Trạm liên kết
}
