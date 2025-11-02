import { BaseEntity } from '.';
import { VehicleType } from '@/models/delivery.model';

// Customer Address History response interface
export interface IAddressHistoryResponse extends BaseEntity {
  customerId: string;
  address: string;
  homeDeliveryCost: number;
  carryCost: number;
  homeDeliveryTotalCost: number;
  vehicleType?: VehicleType | null;
}

// Address History creation request interface
export interface IAddressHistoryCreateRequest {
  address: string;
  homeDeliveryCost: number;
  carryCost: number;
  vehicleType?: VehicleType | null;
}

// Address History list response interface
export interface IAddressHistoryListResponse {
  addressHistory: IAddressHistoryResponse[];
  total: number;
}
