import { BaseEntity } from '.';
import { ICustomerBankResponse } from '@/models/customer-bank.model';

// Customer response interface
export interface ICustomerResponse extends BaseEntity {
  name: string;
  phone: string;
  fromRouteId?: string;
  toRouteId?: string;
  bank?: ICustomerBankResponse;
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
