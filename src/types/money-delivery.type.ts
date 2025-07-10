import { BaseEntity } from '.';
import { ICustomerResponse } from './customer.type';
import { IRouteResponse } from './route.type';
import { ICustomer } from '@/models/customer.model';
import { IMoneyDelivery } from '@/models/money-delivery.model';
import { IUser } from '@/models/user.model';
import { IRoute } from '@/models/route.model';

// MoneyDelivery response interface
export interface IMoneyDeliveryResponse extends BaseEntity {
  code: string;
  sender: ICustomerResponse;
  receiver: ICustomerResponse;
  fromRoute: IRouteResponse;
  toRoute: IRouteResponse;
  sendMoneyAmount: number;
  sendCost: number;
  notes?: string;
  createdByUser: string;
}

// MoneyDelivery creation request interface
export interface IMoneyDeliveryCreateRequest {
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  fromRouteId: string;
  toRouteId: string;
  sendMoneyAmount: number;
  sendCost: number;
  notes?: string;
}

// MoneyDelivery update request interface
export interface IMoneyDeliveryUpdateRequest {
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  fromRouteId?: string;
  toRouteId?: string;
  sendMoneyAmount?: number;
  sendCost?: number;
  notes?: string;
}

// Interface for populated money delivery (when sender, receiver, fromRoute, toRoute, createdByUser are populated)
export interface IMoneyDeliveryPopulated extends Omit<IMoneyDelivery, 'sender' | 'receiver' | 'fromRoute' | 'toRoute' | 'createdByUser'> {
  sender: ICustomer;
  receiver: ICustomer;
  fromRoute: IRoute;
  toRoute: IRoute;
  createdByUser: IUser;
}

// Interface for money delivery with populated documents
export interface IMoneyDeliveryWithPopulatedRefs {
  _id: string;
  code: string;
  sender: ICustomer;
  receiver: ICustomer;
  fromRoute: IRoute;
  toRoute: IRoute;
  sendMoneyAmount: number;
  sendCost: number;
  notes?: string;
  createdByUser: {
    _id: string;
    username: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Interface for getting next money delivery code
export interface INextMoneyDeliveryCodeRequest {
  toRouteId: string;
}

export interface INextMoneyDeliveryCodeResponse {
  nextCode: string;
  toRoute: IRouteResponse;
}

// Interface for money delivery code lookup
export interface IMoneyDeliveryCodeRequest {
  deliveryIdentifier: string; // Format: codeT1T2 (e.g., 2401250001T1T2)
}

// Interface for code generation
export interface IMoneyDeliveryCodeGenerationData {
  date: Date;
  toRoute: IRouteResponse;
}

// Lean types for MongoDB documents (when using .lean())
export interface IMoneyDeliveryLeanPopulated {
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
  sendMoneyAmount: number;
  sendCost: number;
  notes?: string;
  createdByUser: {
    _id: string;
    username: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Interface for frequent money customers
export interface IFrequentMoneyCustomer {
  receiverName: string;
  receiverPhone: string;
  toRoute: {
    id: string;
    code: string;
    name: string;
  };
  deliveryCount: number;
  totalSendMoneyAmount: number;
  totalSendCost: number;
  lastDeliveryDate: Date;
  firstDeliveryDate: Date;
}

// Interface for frequent money customers response
export interface IFrequentMoneyCustomersResponse {
  senderIdentifier: string;
  senderInfo: {
    name: string;
    phone: string;
  } | null;
  frequentCustomers: IFrequentMoneyCustomer[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CreateMoneyDeliveryRequest {
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  fromRouteId: string;
  toRouteId: string;
  sendMoneyAmount: number;
  sendCost: number;
  notes?: string;
}

export interface UpdateMoneyDeliveryRequest {
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  fromRouteId?: string;
  toRouteId?: string;
  sendMoneyAmount?: number;
  sendCost?: number;
  notes?: string;
}