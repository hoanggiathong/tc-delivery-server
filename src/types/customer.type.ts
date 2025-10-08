import { BaseEntity } from '.';

// Customer response interface
export interface ICustomerResponse extends BaseEntity {
  name: string;
  phone: string;
  fromRouteId?: string;
  toRouteId?: string;
}

// Customer creation request interface
export interface ICustomerCreateRequest {
  name: string;
  phone: string;
  fromRouteId: string;
  toRouteId: string;
}

// Customer update request interface
export interface ICustomerUpdateRequest {
  name?: string;
  phone?: string;
  fromRouteId?: string;
  toRouteId?: string;
}
