import { IRemovedDelivery } from '@/models/removed-delivery.model';
import { ICustomer } from '@/models/customer.model';
import { IRoute } from '@/models/route.model';
import { IUser } from '@/models/user.model';

/**
 * Request interface for deleting delivery by full code
 */
export interface IDeleteDeliveryByFullCodeRequest {
  password: string;
  reason: string;
}

/**
 * Response interface for removed delivery operations
 */
export interface IRemovedDeliveryResponse {
  id: string;
  originalDeliveryId: string;
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
  paymentType: 'paid' | 'debt';
  isFree: boolean;
  createdByUser: {
    id: string;
    username: string;
  };
  originalCreatedAt: Date;
  originalUpdatedAt: Date;
  deletedBy: {
    id: string;
    username: string;
  };
  reason: string;
  deletedAt: Date;
  expiredAt: Date;
}

/**
 * Populated removed delivery interface with all references
 */
export interface IRemovedDeliveryWithPopulatedRefs
  extends Omit<
    IRemovedDelivery,
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
export interface IDeleteDeliveryResponse {
  success: boolean;
  message: string;
  data?: {
    deletedDelivery: {
      id: string;
      fullCode: string;
      deletedAt: Date;
      reason: string;
    };
  };
}

/**
 * Query parameters for getting removed deliveries
 */
export interface IRemovedDeliveryQuery {
  page?: number;
  limit?: number;
  deletedBy?: string;
  fromDate?: string;
  toDate?: string;
  fullCode?: string;
  reason?: string;
}

/**
 * Response interface for paginated removed deliveries
 */
export interface IPaginatedRemovedDeliveriesResponse {
  success: boolean;
  message: string;
  data: {
    deliveries: IRemovedDeliveryResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}
