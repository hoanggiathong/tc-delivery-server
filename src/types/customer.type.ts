import { BaseEntity } from '.';

// Customer response interface
export interface ICustomerResponse extends BaseEntity {
  name: string;
  phone: string;
}

// Customer creation request interface
export interface ICustomerCreateRequest {
  name: string;
  phone: string;
}

// Customer update request interface
export interface ICustomerUpdateRequest {
  name?: string;
  phone?: string;
}

// Delivery response interface
export interface IDeliveryResponse extends BaseEntity {
  sender: ICustomerResponse;
  receiver: ICustomerResponse;
  route: string;
  name: string;
  cost: number;
  homeDelivery: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: boolean;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  createdByUser: string;
}

// Delivery creation request interface
export interface IDeliveryCreateRequest {
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  route: string;
  name: string;
  cost: number;
  homeDelivery: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: boolean;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
}

// Delivery update request interface
export interface IDeliveryUpdateRequest {
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  route?: string;
  name?: string;
  cost?: number;
  homeDelivery?: string;
  homeDeliveryCost?: number;
  itemValue?: number;
  itemCost?: number;
  collectCost?: number;
  collectForCustomer?: boolean;
  collectForCustomerCost?: number;
  collectForCustomerNote?: string;
}
