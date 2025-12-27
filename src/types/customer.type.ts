import { ICustomerBankResponse } from '@/models/customer-bank.model';
import { ICustomerImage } from '@/models/customer.model';
import { BaseEntity, IRouteResponse, IUserFullInformationResponse } from '.';

// Customer response interface
export interface ICustomerResponse extends BaseEntity {
  name: string;
  phone: string;
  fromRouteId?: string;
  toRouteId?: string;
  bank?: ICustomerBankResponse;
  isRoute?: boolean;
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

// Customer information response interface
export interface ICustomerInformationResponse {
  id: string;
  name: string;
  phone: string;
  route: IRouteResponse;
  images: ICustomerImage[];
  address: string;
  identityCardName: string;
  identityCardIssuedDate: Date;
  identityCardNumber: string;
  isRoute: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Customer information response interface
export interface ICustomerFullInformationResponse {
  id: string;
  name: string;
  phone: string;
  route?: IRouteResponse;
  images: ICustomerImage[];
  bank: ICustomerBankResponse | null;
  createdBy: IUserFullInformationResponse | null;
  address: string;
  identityCardName: string;
  identityCardIssuedDate: Date;
  identityCardNumber: string;
  isRoute: boolean;
  createdAt: Date;
  updatedAt: Date;
}
