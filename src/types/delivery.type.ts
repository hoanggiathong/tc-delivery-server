import { Types } from 'mongoose';
import { BaseEntity, PaymentType } from '.';
import { ICustomerResponse } from './customer.type';
import { IRouteResponse } from './route.type';
import { ICustomer } from '@/models/customer.model';
import { IDelivery, VehicleType } from '@/models/delivery.model';
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
  homeDeliveryCost?: number;
  carryCost?: number;
  homeDeliveryCostTotal?: number;
  vehicleType?: VehicleType | null;
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
    goodsType?: string;
  };
  notes?: string;
  totalCost: number;
  actualRevenue: number;
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
  homeDeliveryCost?: number;
  carryCost?: number;
  vehicleType?: VehicleType | null;
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
    goodsType?: string;
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
  nameProductAndAdditionalInformation?: string;
  quantity?: number;
  cost?: number;
  homeDelivery?: string;
  homeDeliveryCost?: number;
  carryCost?: number;
  vehicleType?: VehicleType | null;
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
    goodsType?: string;
  };
  notes?: string;
  paymentType?: PaymentType;
  isFree?: boolean;
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
  homeDeliveryCost?: number;
  carryCost?: number;
  homeDeliveryCostTotal?: number;
  vehicleType?: VehicleType | null;
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
    goodsType?: string;
  };
  notes?: string;
  totalCost: number;
  actualRevenue: number;
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
  senderName: string;
  receiverName: string;
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
    phone: string;
    routeId: Types.ObjectId;
    bankId?: ICustomerBankLean;
    createdAt?: Date;
    updatedAt?: Date;
  };
  receiver: {
    _id: string;
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
    phone?: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
  toRoute: {
    _id: string;
    code: string;
    name: string;
    address: string;
    phone?: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
  name: string;
  nameProductAndAdditionalInformation?: string;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost?: number;
  carryCost?: number;
  homeDeliveryCostTotal?: number;
  vehicleType?: VehicleType | null;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  notes?: string;
  totalCost: number;
  actualRevenue: number;
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
// Today Report Interfaces (used for both today-report and cost-report)
export interface ITodayDeliverySummary {
  totalDeliveries: number; // Total number of deliveries (count by delivery count)
  totalQuantity: number; // Total quantity (sum of all delivery quantities)
  totalCost: number; // Total shipping cost (sum of all totalCost)
  totalActualRevenue: number; // Total actual revenue (sum of all actualRevenue)
  totalItemCost: number;
  totalCollectCost: number; // Total collect cost
  totalCollectForCustomer: number; // Total collect for customer amount
  totalCollectForCustomerCost: number; // Total collect for customer cost (thu dùm)
  date: string; // YYYY-MM-DD format

  // Optional fields for cost report (with date range)
  totalHomeDeliveryCost?: number;
  totalItemValue?: number;
  totalRevenue?: number; // Backward compatibility - same as totalCost

  // Payment type breakdowns (optional for cost report)
  normalPaymentCount?: number;
  normalPaymentAmount?: number;
  debtPaymentCount?: number;
  debtPaymentAmount?: number;
  freePaymentCount?: number;

  // Averages (optional for cost report)
  averageCostPerDelivery?: number;
  averageItemValue?: number;
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
    address?: string;
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
  actualRevenue: number;
  paymentType?: PaymentType;
  upItems?: string;
  downItems?: string;
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

export interface IGetListReportReturnDeliveryResponse {
  quantityReturnIsToday: number;
  quantityReturnIsOld: number;
  quantityReturnTotalToday: number;
}
