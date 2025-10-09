import { Types } from 'mongoose';
import { BaseEntity, PaymentType } from '.';
import { ICustomerResponse } from './customer.type';
import { IRouteResponse } from './route.type';
import { ICustomer } from '@/models/customer.model';
import { IDelivery } from '@/models/delivery.model';
import { IUser } from '@/models/user.model';
import { IRoute } from '@/models/route.model';
import { ICustomerBankLean } from '@/models/customer-bank.model';

// Delivery response interface
export interface IDeliveryResponse extends BaseEntity {
  code: string;
  fullCode: string;
  subCode: string;
  sender: ICustomerResponse;
  receiver: ICustomerResponse;
  fromRoute: IRouteResponse;
  toRoute: IRouteResponse;
  name: string;
  nameProductAndAdditionalInformation?: string;
  quantity: number;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  details?: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    isOverweight?: boolean;
    convertedWeight?: number;
  };
  notes?: string;
  totalCost: number;
  paymentType?: PaymentType;
  isFree?: boolean;
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
  nameProductAndAdditionalInformation?: string;
  quantity?: number;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  details?: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    isOverweight?: boolean;
    convertedWeight?: number;
  };
  notes?: string;
  paymentType?: PaymentType;
}

// Delivery update request interface
export interface IDeliveryUpdateRequest {
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  toRouteId?: string;
  name?: string;
  quantity?: number;
  cost?: number;
  homeDelivery?: string;
  homeDeliveryCost?: number;
  itemValue?: number;
  itemCost?: number;
  collectCost?: number;
  collectForCustomer?: number;
  collectForCustomerCost?: number;
  collectForCustomerNote?: string;
  details?: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    isOverweight?: boolean;
    convertedWeight?: number;
  };
  notes?: string;
  paymentType?: PaymentType;
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
  fullCode: string;
  subCode: string;
  sender: ICustomer;
  receiver: ICustomer;
  fromRoute: IRoute;
  toRoute: IRoute;
  name: string;
  nameProductAndAdditionalInformation?: string;
  quantity: number;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  details?: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    isOverweight?: boolean;
    convertedWeight?: number;
  };
  notes?: string;
  totalCost: number;
  paymentType?: PaymentType;
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
  fullCode: string;
  subCode: string;
  toRoute: IRouteResponse;
  fromRoute: IRouteResponse;
}

// Interface for delivery code lookup (code + fromRoute + toRoute)
export interface IDeliveryCodeRequest {
  deliveryIdentifier: string; // Format: codeT1T2 (e.g., 0907250001T4T1)
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
  fullCode: string;
  subCode: string;
  quantity: number;
  details?: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    isOverweight?: boolean;
    convertedWeight?: number;
  };
  sender: {
    _id: string;
    name: string;
    phone: string;
    routeId: Types.ObjectId;
    bankId?: ICustomerBankLean;
    createdAt?: Date;
    updatedAt?: Date;
  };
  receiver: {
    _id: string;
    name: string;
    phone: string;
    routeId: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
  };
  fromRoute: {
    _id: string;
    code: string;
    name: string;
    address: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
  toRoute: {
    _id: string;
    code: string;
    name: string;
    address: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
  name: string;
  nameProductAndAdditionalInformation?: string;
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
  paymentType?: PaymentType;
  createdByUser: {
    _id: string;
    username: string;
    name: string;
  };
  isFree?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Frequent customers interfaces
export interface IFrequentCustomer {
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  toRoute: {
    id: string;
    code: string;
    name: string;
  };
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

// Cost Report Interfaces
export interface IDeliveryCostReportSummary {
  totalDeliveries: number;
  totalCost: number;
  totalHomeDeliveryCost: number;
  totalItemCost: number;
  totalItemValue: number;
  totalCollectCost: number;
  totalCollectForCustomer: number;
  totalCollectForCustomerCost: number;
  totalRevenue: number; // Tổng thu (totalCost của tất cả deliveries)

  // Phân loại theo paymentType
  normalPaymentCount: number;
  normalPaymentAmount: number;
  debtPaymentCount: number;
  debtPaymentAmount: number;
  freePaymentCount: number;

  // Thống kê
  averageCostPerDelivery: number;
  averageItemValue: number;
}

export interface IDeliveryReportItem {
  id: string;
  code: string;
  date: Date;
  sender: {
    name: string;
    phone: string;
  };
  receiver: {
    name: string;
    phone: string;
  };
  toRoute: {
    id: string;
    code: string;
    name: string;
  };

  // Chi tiết chi phí
  cost: number;
  homeDeliveryCost: number;
  itemCost: number;
  itemValue: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  totalCost: number;
  paymentType?: PaymentType;
  notes?: string;
}

export interface IDeliveryCostReportPagination {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface IDeliveryCostReportFilter {
  dateRange: {
    from: Date;
    to: Date;
  };
  fromRoute: {
    id: string;
    code: string;
    name: string;
    address: string;
  };
}

export interface IDeliveryCostReport {
  summary: IDeliveryCostReportSummary;
  deliveries: IDeliveryReportItem[];
  pagination: IDeliveryCostReportPagination;
}

// Today Report Interfaces (simplified, no pagination)
export interface ITodayDeliverySummary {
  totalDeliveries: number; // Total number of deliveries (count by delivery count)
  totalQuantity: number; // Total quantity (sum of all delivery quantities)
  totalCost: number; // Total shipping cost (sum of all totalCost)
  totalItemCost: number;
  totalCollectCost: number; // Total collect cost
  totalCollectForCustomer: number; // Total collect for customer amount
  totalCollectForCustomerCost: number; // Total collect for customer cost (thu dùm)
  date: string; // YYYY-MM-DD format
}

export interface ITodayDeliveryItem {
  id: string;
  code: string;
  fullCode?: string;
  subCode?: string;
  name: string;
  nameProductAndAdditionalInformation?: string;
  quantity?: number;
  sender: {
    name: string;
    phone: string;
  };
  receiver: {
    name: string;
    phone: string;
  };
  toRoute: {
    id: string;
    code: string;
    name: string;
  };
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost?: number;
  itemValue: number;
  itemCost: number;
  collectCost?: number;
  collectForCustomer?: number;
  collectForCustomerCost?: number;
  collectForCustomerNote?: string;
  totalCost: number;
  paymentType?: PaymentType;
  notes?: string;
  details?: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    isOverweight?: boolean;
    convertedWeight?: number;
  };
  createdAt: Date;
  updatedAt?: Date;
}

export interface ITodayDeliveryReport {
  summary: ITodayDeliverySummary;
  deliveries: ITodayDeliveryItem[];
  routeInfo: {
    route: {
      id: string;
      code: string;
      name: string;
    };
    routeCode: string;
    routeName: string;
  };
}
