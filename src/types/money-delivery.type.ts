import { Types } from 'mongoose';
import { BaseEntity } from '.';
import { ICustomerResponse } from './customer.type';
import { IRouteResponse } from './route.type';
import { ICustomer } from '@/models/customer.model';
import {
  IMoneyDelivery,
  IMoneyDeliveryImage,
  MoneyDeliveryStatus,
  MoneyDeliveryType,
  TransferType,
} from '@/models/money-delivery.model';
import { IUser } from '@/models/user.model';
import { IRoute } from '@/models/route.model';

// MoneyDelivery response interface
export interface IMoneyDeliveryResponse extends BaseEntity {
  code: string;
  fullCode: string;
  subCode: string;
  sender: ICustomerResponse;
  receiver: ICustomerResponse;
  fromRoute: IRouteResponse;
  toRoute: IRouteResponse;
  sendMoneyAmount: number;
  sendCost: number;
  transferType: TransferType;
  isFree: boolean;
  totalCost: number;
  notes?: string;
  status: MoneyDeliveryStatus;
  type: MoneyDeliveryType;
  deliveryId?: string;
  createdByUser: string;
  delivery?: {
    _id: Types.ObjectId;
    code: string;
    name: string;
    note: string;
    createdAt: Date;
    updatedAt: Date;
  };
  dateReturn?: Date;
  contentReturn?: string;
  images?: IMoneyDeliveryImage[];
}

// MoneyDelivery creation request interface
export interface IMoneyDeliveryCreateRequest {
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  toRouteId: string;
  sendMoneyAmount: number;
  sendCost: number;
  transferType?: TransferType;
  isFree?: boolean;
  notes?: string;
  status?: MoneyDeliveryStatus;
  type?: MoneyDeliveryType;
  deliveryId?: string;
  fromRouteId?: string;
}

export interface IMoneyDeliveryUpdateRequest {
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  toRouteId?: string;
  sendMoneyAmount?: number;
  sendCost?: number;
  transferType?: TransferType;
  isFree?: boolean;
  notes?: string;
  status?: MoneyDeliveryStatus;
  deliveryId?: string;
}

// Interface for populated money delivery (when sender, receiver, fromRoute, toRoute, createdByUser are populated)
export interface IMoneyDeliveryPopulated
  extends Omit<IMoneyDelivery, 'sender' | 'receiver' | 'fromRoute' | 'toRoute' | 'createdByUser'> {
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
  fullCode: string;
  subCode: string;
  sender: ICustomer;
  receiver: ICustomer;
  fromRoute: IRoute;
  toRoute: IRoute;
  sendMoneyAmount: number;
  sendCost: number;
  transferType: TransferType;
  isFree: boolean;
  totalCost: number;
  notes?: string;
  status: MoneyDeliveryStatus;
  type: MoneyDeliveryType;
  deliveryId?: Types.ObjectId;
  createdByUser: {
    _id: string;
    username: string;
  };
  createdAt: Date;
  updatedAt: Date;
  dateReturn?: Date;
  contentReturn?: string;
}

// Interface for getting next money delivery code
export interface INextMoneyDeliveryCodeRequest {
  toRouteId: string;
}

export interface INextMoneyDeliveryCodeResponse {
  nextCode: string;
  fullCode: string;
  subCode: string;
  toRoute: IRouteResponse;
  fromRoute: IRouteResponse;
}

// Interface for money delivery code lookup
export interface IMoneyDeliveryCodeRequest {
  deliveryIdentifier: string; // Format: codeT1T2-T (e.g., 0907250001T4T1-T)
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
  fullCode: string;
  subCode: string;
  senderName: string;
  receiverName: string;
  sender: {
    _id: string;
    phone: string;
    routeId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };
  receiver: {
    _id: string;
    phone: string;
    routeId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };
  fromRoute: {
    _id: string;
    code: string;
    name: string;
    address: string;
    phone?: string;
    createdAt: Date;
    updatedAt: Date;
  };
  toRoute: {
    _id: string;
    code: string;
    name: string;
    address: string;
    phone?: string;
    createdAt: Date;
    updatedAt: Date;
  };
  sendMoneyAmount: number;
  sendCost: number;
  transferType: TransferType;
  isFree: boolean;
  totalCost: number;
  notes?: string;
  status: MoneyDeliveryStatus;
  type: MoneyDeliveryType;
  deliveryId?: string;
  createdByUser: {
    _id: string;
    username: string;
  };
  createdAt: Date;
  updatedAt: Date;
  dateReturn?: Date;
  contentReturn?: string;
  images?: IMoneyDeliveryImage[];
}

// Interface for frequent money customers
export interface IFrequentMoneyCustomer {
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  toRoute: {
    id: string;
    code: string;
    name: string;
    address?: string;
  };
}

export interface CreateMoneyDeliveryRequest {
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  toRouteId: string;
  sendMoneyAmount: number;
  sendCost: number;
  transferType?: TransferType;
  isFree?: boolean;
  notes?: string;
}

export interface UpdateMoneyDeliveryRequest {
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  toRouteId?: string;
  sendMoneyAmount?: number;
  sendCost?: number;
  transferType?: TransferType;
  isFree?: boolean;
  notes?: string;
}

// Today Report Interfaces (simplified, no pagination)
export interface ITodayMoneyDeliveryItem {
  id: string;
  code: string;
  subCode: string;
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
  sendMoneyAmount: number;
  sendCost: number;
  totalCost: number;
  transferType: TransferType;
  isFree: boolean;
  notes: string;
  fullCode: string;
  status: MoneyDeliveryStatus;
  type: MoneyDeliveryType;
  deliveryId?: string;
  createdAt: Date;
}

export interface ITodayMoneyDeliveryReport {
  moneyDeliveries: ITodayMoneyDeliveryItem[];
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

// Cost Report Interfaces
export interface IMoneyDeliveryCostReportSummary {
  totalMoneyDeliveries: number;
  totalSendMoneyAmount: number;
  totalSendCost: number;
  totalCost: number; // Total revenue from money deliveries

  // Phân loại theo transferType
  regularTransferCount: number;
  regularTransferAmount: number;
  expressTransferCount: number;
  expressTransferAmount: number;
  freeTransferCount: number;
  freeTransferAmount: number;

  // Thống kê
  averageSendAmountPerDelivery: number;
  averageCostPerDelivery: number;
}

export interface IMoneyDeliveryReportItem {
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
  sendMoneyAmount: number;
  sendCost: number;
  totalCost: number;
  transferType: TransferType;
  isFree: boolean;
  notes?: string;
  status: MoneyDeliveryStatus;
  type: MoneyDeliveryType;
  deliveryId?: string;
}

export interface IMoneyDeliveryCostReportFilter {
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

export interface IMoneyDeliveryCostReport {
  summary: IMoneyDeliveryCostReportSummary;
  moneyDeliveries: IMoneyDeliveryReportItem[];
  filter: IMoneyDeliveryCostReportFilter;
}

// Interface for money delivery aggregation results
export interface IMoneyAggregationResultItem {
  _id: {
    receiverName: string;
    receiverPhone: string;
    toRouteId: Types.ObjectId;
    toRouteCode: string;
    toRouteName: string;
  };
  deliveryCount: number;
  totalSendMoneyAmount: number;
  totalSendCost: number;
  totalCost: number;
  lastDeliveryDate: Date;
  firstDeliveryDate: Date;
  senderInfo: {
    name: string;
    phone: string;
  };
}

export interface IMoneyDeliveryUpdateData {
  sender?: Types.ObjectId;
  receiver?: Types.ObjectId;
  fromRoute?: Types.ObjectId;
  toRoute?: Types.ObjectId;
  sendMoneyAmount?: number;
  sendCost?: number;
  transferType?: TransferType;
  isFree?: boolean;
  notes?: string;
  status?: MoneyDeliveryStatus;
  deliveryId?: Types.ObjectId;
  totalCost?: number;
}

export interface ITodayMoneyDeliveryRawItem {
  _id: string;
  code: string;
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
    address: string;
  };
  sendMoneyAmount: number;
  sendCost: number;
  totalCost: number;
  transferType: TransferType;
  notes?: string;
  fullCode: string;
  createdAt: Date;
  status: MoneyDeliveryStatus;
  type: MoneyDeliveryType;
  deliveryId?: string;
}

export interface IMoneyDeliveryCostReportRawItem {
  _id: string;
  code: string;
  fullCode: string;
  subCode: string;
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
    address: string;
  };
  sendMoneyAmount: number;
  sendCost: number;
  totalCost: number;
  transferType: TransferType;
  notes?: string;
  createdAt: Date;
  status: MoneyDeliveryStatus;
  type: MoneyDeliveryType;
  deliveryId?: string;
}

export interface IReturnDeliveryAndMoneyDeliveryResponse {
  _id: string;
  sendMoneyAmount: number;
  sendCost: number;
  type: MoneyDeliveryType;
  status: MoneyDeliveryStatus;
  dateReturn?: Date;
  contentReturn?: string;
}

export interface IGetListReportReturnMoneyDeliveryResponse {
  quantityReturnIsToday: number;
  quantityReturnIsOld: number;
  quantityReturnTotalToday: number;
}
