import { PaymentType } from './index';
import { VehicleType } from '@/models/delivery.model';

export interface IDraftDeliveryInput {
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
  carryCost?: number;
  vehicleType?: VehicleType;
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
  isFree?: boolean;
}

export interface IDraftDeliveryResponse {
  id: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  fromRoute: {
    id: string;
    code: string;
    name: string;
    address: string;
  };
  toRoute: {
    id: string;
    code: string;
    name: string;
    address: string;
  };
  name: string;
  quantity: number;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  carryCost: number;
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
  };
  notes?: string;
  totalCost: number;
  paymentType?: PaymentType;
  isFree?: boolean;
  createdByUser: {
    id: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}
