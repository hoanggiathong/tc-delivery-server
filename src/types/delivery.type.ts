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
  fullCode: string;
  subCode: string;
  sender: ICustomerResponse;
  receiver: ICustomerResponse;
  fromRoute: IRouteResponse;
  toRoute: IRouteResponse;
  name: string;
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
  paymentType?: 'paid' | 'debt' | 'free';
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
  paymentType?: 'paid' | 'debt' | 'free';
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
  paymentType?: 'paid' | 'debt' | 'free';
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
  paymentType?: 'paid' | 'debt' | 'free';
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
  paymentType?: 'paid' | 'debt' | 'free';
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

  paymentType?: 'paid' | 'debt' | 'free';
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
  };
}

export interface IDeliveryCostReport {
  summary: IDeliveryCostReportSummary;
  deliveries: IDeliveryReportItem[];
  pagination: IDeliveryCostReportPagination;
}

// Today Report Interfaces (simplified, no pagination)
export interface ITodayDeliverySummary {
  totalDeliveries: number;
  totalCost: number;
  totalItemCost: number;
  totalCollectForCustomer: number;
  date: string; // YYYY-MM-DD format
}

export interface ITodayDeliveryItem {
  id: string;
  code: string;
  fullCode?: string;
  subCode?: string;
  name: string;
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
  paymentType?: 'paid' | 'debt' | 'free';
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
