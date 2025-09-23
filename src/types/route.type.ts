import { BaseEntity } from '.';

export interface IRouteResponse extends BaseEntity {
  code: string;
  name: string;
  address?: string;
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
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}
