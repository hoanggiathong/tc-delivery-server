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
}

export interface IRouteCreateRequest {
  code: string;
  name: string;
  address?: string;
  distance?: number;
  surcharge?: number;
  surchargeUnit?: SurchargeUnit;
  phone?: string;
}

export interface IRouteUpdateRequest {
  code?: string;
  name?: string;
  address?: string;
  distance?: number;
  surcharge?: number;
  surchargeUnit?: SurchargeUnit;
  phone?: string;
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
}
