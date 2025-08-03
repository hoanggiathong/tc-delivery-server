import { BaseEntity } from '.';
import { ICustomerResponse } from './customer.type';
import { IRouteResponse } from './route.type';
import { ICustomer } from '@/models/customer.model';
import { IDelivery } from '@/models/delivery.model';
import { IUser } from '@/models/user.model';
import { IRoute } from '@/models/route.model';

// Delivery response interface
export interface IDeliveryResponse extends BaseEntity {
  code: string;
  sender: ICustomerResponse;
  receiver: ICustomerResponse;
  fromRoute: IRouteResponse;
  toRoute: IRouteResponse;
  name: string;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  notes?: string;
  totalCost: number;
  createdByUser: string;
}

// Delivery creation request interface
export interface IDeliveryCreateRequest {
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  fromRouteId: string;
  toRouteId: string;
  name: string;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  notes?: string;
}

// Delivery update request interface
export interface IDeliveryUpdateRequest {
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  fromRouteId?: string;
  toRouteId?: string;
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
  notes?: string;
}

// Interface for populated delivery (when sender, receiver, fromRoute, toRoute, createdByUser are populated)
export interface IDeliveryPopulated
  extends Omit<IDelivery, 'sender' | 'receiver' | 'fromRoute' | 'toRoute' | 'createdByUser'> {
  sender: ICustomer;
  receiver: ICustomer;
  fromRoute: IRoute;
  toRoute: IRoute;
  createdByUser: IUser;
}

// Interface for delivery with populated documents
export interface IDeliveryWithPopulatedRefs {
  _id: string;
  code: string;
  sender: ICustomer;
  receiver: ICustomer;
  fromRoute: IRoute;
  toRoute: IRoute;
  name: string;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  notes?: string;
  totalCost: number;
  createdByUser: {
    _id: string;
    username: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Interface for getting next delivery code
export interface INextCodeRequest {
  toRouteId: string;
}

export interface INextCodeResponse {
  nextCode: string;
  toRoute: IRouteResponse;
}

// Interface for delivery code lookup (code + fromRoute + toRoute)
export interface IDeliveryCodeRequest {
  deliveryIdentifier: string; // Format: codeT1T2 (e.g., 2401250001T1T2)
}

// Interface for code generation
export interface ICodeGenerationData {
  date: Date;
  toRoute: IRouteResponse;
}

// Lean types for MongoDB documents (when using .lean())
export interface IDeliveryLeanPopulated {
  _id: string;
  code: string;
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
  fromRoute: {
    _id: string;
    code: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  };
  toRoute: {
    _id: string;
    code: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  };
  name: string;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  notes?: string;
  totalCost: number;
  createdByUser: {
    _id: string;
    username: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Frequent customers interfaces
export interface IFrequentCustomer {
  receiverName: string;
  receiverPhone: string;
  toRoute: {
    id: string;
    code: string;
    name: string;
  };
  deliveryCount: number;
}

export interface IFrequentCustomersPagination {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface IFrequentCustomersResponse {
  senderIdentifier: string;
  senderInfo: {
    name: string;
    phone: string;
  } | null;
  frequentCustomers: IFrequentCustomer[];
  pagination: IFrequentCustomersPagination;
}
