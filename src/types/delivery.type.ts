import { BaseEntity } from '.';
import { ICustomerResponse } from './customer.type';
import { ICustomer } from '@/models/customer.model';
import { IDelivery } from '@/models/delivery.model';
import { IUser } from '@/models/user.model';

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
  collectForCustomer: number;
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
  collectForCustomer: number;
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
  collectForCustomer?: number;
  collectForCustomerCost?: number;
  collectForCustomerNote?: string;
}

// Interface for populated delivery (when sender, receiver, createdByUser are populated)
export interface IDeliveryPopulated extends Omit<IDelivery, 'sender' | 'receiver' | 'createdByUser'> {
  sender: ICustomer;
  receiver: ICustomer;
  createdByUser: IUser;
}

// Interface for delivery with populated documents
export interface IDeliveryWithPopulatedRefs {
  _id: string;
  sender: ICustomer;
  receiver: ICustomer;
  route: string;
  name: string;
  cost: number;
  homeDelivery: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  createdByUser: {
    _id: string;
    username: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Lean types for MongoDB documents (when using .lean())
export interface IDeliveryLeanPopulated {
  _id: string;
  sender: {
    _id: string;
    name: string;
    phone: string;
    createdAt: Date;
    updatedAt: Date;
  };
  receiver: {
    _id: string;
    name: string;
    phone: string;
    createdAt: Date;
    updatedAt: Date;
  };
  route: string;
  name: string;
  cost: number;
  homeDelivery: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  createdByUser: {
    _id: string;
    username: string;
  };
  createdAt: Date;
  updatedAt: Date;
}