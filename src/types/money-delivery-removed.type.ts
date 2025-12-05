import { IRemovedMoneyDelivery } from '@/models/money-delivery-removed.model';
import { ICustomer } from '@/models/customer.model';
import { IRoute } from '@/models/route.model';
import { IUser } from '@/models/user.model';
import {
  MoneyDeliveryStatus,
  MoneyDeliveryType,
  TransferType,
} from '@/models/money-delivery.model';

/**
 * Request interface for deleting money delivery by full code
 */
export interface IDeleteMoneyDeliveryByFullCodeRequest {
  password: string;
  reason: string;
}

/**
 * Response interface for removed money delivery operations
 */
export interface IRemovedMoneyDeliveryResponse {
  id: string;
  originalMoneyDeliveryId: string;
  code: string;
  fullCode: string;
  subCode: string;
  sender: {
    id: string;
    name: string;
    phone: string;
    fromRouteId: string;
    toRouteId: string;
    createdAt: Date;
    updatedAt: Date;
  };
  receiver: {
    id: string;
    name: string;
    phone: string;
    fromRouteId: string;
    toRouteId: string;
    createdAt: Date;
    updatedAt: Date;
  };
  fromRoute: {
    id: string;
    code: string;
    name: string;
    address: string;
    createdAt: Date;
    updatedAt: Date;
  };
  toRoute: {
    id: string;
    code: string;
    name: string;
    address: string;
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
  images?: {
    url: string;
    rotate: number;
  }[];
  createdByUser: {
    id: string;
    username: string;
  };
  originalCreatedAt: Date;
  originalUpdatedAt: Date;
  dateReturn?: Date;
  contentReturn?: string;
  deletedBy: {
    id: string;
    username: string;
  };
  reason: string;
  deletedAt: Date;
  expiredAt: Date;
}

/**
 * Populated removed money delivery interface with all references
 */
export interface IRemovedMoneyDeliveryWithPopulatedRefs
  extends Omit<
    IRemovedMoneyDelivery,
    'sender' | 'receiver' | 'fromRoute' | 'toRoute' | 'createdByUser' | 'deletedBy'
  > {
  sender: ICustomer;
  receiver: ICustomer;
  fromRoute: IRoute;
  toRoute: IRoute;
  createdByUser: IUser;
  deletedBy: IUser;
}

/**
 * Interface for deletion confirmation response
 */
export interface IDeleteMoneyDeliveryResponse {
  success: boolean;
  message: string;
  data?: {
    deletedMoneyDelivery: {
      id: string;
      fullCode: string;
      deletedAt: Date;
      reason: string;
    };
  };
}

/**
 * Query parameters for getting removed money deliveries
 */
export interface IRemovedMoneyDeliveryQuery {
  deletedBy?: string;
  fromDate?: string;
  toDate?: string;
  fullCode?: string;
  reason?: string;
}

/**
 * Response interface for removed money deliveries list
 */
export interface IRemovedMoneyDeliveriesResponse {
  success: boolean;
  message: string;
  data: {
    moneyDeliveries: IRemovedMoneyDeliveryResponse[];
    total: number;
  };
}
