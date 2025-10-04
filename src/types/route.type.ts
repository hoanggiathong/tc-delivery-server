import { BaseEntity } from '.';

export interface IRouteResponse extends BaseEntity {
  code: string;
  name: string;
  address?: string;
  surcharge?: number;
}

export interface IRouteCreateRequest {
  code: string;
  name: string;
  address?: string;
}

export interface IRouteUpdateRequest {
  code?: string;
  name?: string;
  address?: string;
}

export interface IRouteLean {
  _id: string;
  code: string;
  name: string;
  surcharge?: number;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}
