import { IReturnDeliveryImage } from '@/models/delivery.model';
import { PaymentType } from '.';
import { IReturnDeliveryAndMoneyDeliveryResponse } from './money-delivery.type';
import { SMSStatus, SMSType } from './sms-notification.type';

export interface IReturnDeliveryListRequest {
  startDate: string;
  endDate: string;
  keySort?: string;
  phoneReceiver?: string;
  typeSort?: 1 | -1;
}

export interface IReturnDeliveryListDebtOfReturnDeliveriesTodayRequest {
  startDate: string;
  endDate: string;
}

export interface IReturnDeliveryListIsReturnRequest {
  startDate: string;
  endDate: string;
}

export interface IReturnDeliveryListAllRequest {
  startDate: string;
  endDate: string;
}

export interface IReturnDeliveryListCollectCostOfReturnDeliveriesRequest {
  startDate: string;
  endDate: string;
}

export interface IReturnDeliveryResponse {
  id: string;
  code: string;
  fullCode?: string;
  subCode?: string;
  quantity?: number;
  name?: string;
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
  fromRoute: {
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
  actualRevenue: number;
  paymentType?: PaymentType;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
  upItems?: string;
  downItems?: string;
  isReturn: boolean;
  inventory: string;
  smsType?: SMSType;
  smsStatus: SMSStatus;
  timeToSendSMS?: Date;
  quantityReturn?: number;
  dateReturn?: Date;
  createdByUser: {
    _id: string;
    username: string;
    name: string;
  };
  returnedByUser?: {
    _id: string;
    username: string;
    name: string;
  };
  nameProductAndAdditionalInformation?: string;
  moneyDelivery?: IReturnDeliveryAndMoneyDeliveryResponse;
}

export interface IReturnDeliveryLeanPopulated {
  _id: string;
  code: string;
  fullCode: string;
  subCode: string;
  name: string;
  senderName: string;
  receiverName: string;
  sender: {
    name: string;
    phone: string;
  };
  receiver: {
    name: string;
    phone: string;
  };
  toRoute: {
    _id: string;
    code: string;
    name: string;
  };
  fromRoute: {
    _id: string;
    code: string;
    name: string;
  };
  cost: number;
  homeDelivery: string;
  homeDeliveryCost: number;
  collectCost?: number;
  collectForCustomer?: number;
  collectForCustomerCost?: number;
  itemValue: number;
  itemCost: number;
  totalCost: number;
  actualRevenue: number;
  paymentType?: PaymentType;
  notes: string;
  isReturn: boolean;
  createdAt: Date;
  updatedAt: Date;
  upItems?: string;
  downItems?: string;
  inventory?: string;
  smsType?: SMSType;
  smsStatus: SMSStatus;
  timeToSendSMS?: Date;
  quantityReturn?: number;
  nameProductAndAdditionalInformation?: string;
  dateReturn?: Date;
  returnDeliveryImages?: IReturnDeliveryImage[];
  createdByUser: {
    _id: string;
    username: string;
    name: string;
  };
  returnedByUser?: {
    _id: string;
    username: string;
    name: string;
  };
  quantity?: number;
  moneyDelivery?: IReturnDeliveryAndMoneyDeliveryResponse;
}

export interface IReturnDeliveryUpdateItem {
  deliveryId: string;
  customerId: string;
  expectedUpdatedAt?: string;
  expectedCollectCost?: number;
  images?: Array<{
    url: string;
    rotate?: number;
  }>;
  address?: string;
  identityCardIssuedDate?: string;
  identityCardNumber?: string;
  imagesIdentityCard?: string;
  imagesDeliveries?: Array<{
    url: string;
    rotate?: number;
  }>;
}

export interface IReturnDeliveryUpdateRequest {
  arrayListReturnDelivery: IReturnDeliveryUpdateItem[];
}
