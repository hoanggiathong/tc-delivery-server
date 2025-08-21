import { BaseEntity } from '.';

export interface IRouteResponse extends BaseEntity {
  code: string;
  name: string;
}

export interface IRouteCreateRequest {
  code: string;
  name: string;
}

export interface IRouteUpdateRequest {
  code?: string;
  name?: string;
}

export interface IRouteLean {
  _id: string;
  code: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
