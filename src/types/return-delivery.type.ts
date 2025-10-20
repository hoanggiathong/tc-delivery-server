import { PaymentType } from '.';

export interface IReturnDeliveryListRequest {
  startDate: string;
  endDate: string;
  keySort?: string;
  phoneReceiver?: string;
  typeSort?: 1 | -1;
}

export interface IReturnDeliveryResponse {
  id: string;
  code: string;
  fullCode?: string;
  subCode?: string;
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
  actualRevenue: number;
  paymentType?: PaymentType;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
  upItems?: any;
  downItems?: any;
  isReturn: boolean;
  inventory: any;
  smsType?: string;
  timeToSendSMS?: Date;
}

export interface IReturnDeliveryLeanPopulated {
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
    _id: string;
    code: string;
    name: string;
  };
  cost: number;
  homeDelivery: string;
  homeDeliveryCost: number;
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
  smsType?: string;
  timeToSendSMS?: Date;
}
