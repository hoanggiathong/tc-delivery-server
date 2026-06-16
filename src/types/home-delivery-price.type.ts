import { BaseEntity } from '.';

export type HomeDeliveryVehicleType = 'MOTORBIKE' | 'TRUCK_05' | 'TRUCK_12';
export type HomeDeliveryPriceSource = 'PRICE_TABLE' | 'DISTANCE_KM';

export interface IHomeDeliveryPriceResponse extends BaseEntity {
  routeId: string;
  address: string;
  normalizedAddress: string;
  motorbikePrice: number;
  truck05Price: number;
  truck12Price: number;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHomeDeliveryPriceCreateRequest {
  address: string;
  motorbikePrice: number;
  truck05Price: number;
  truck12Price: number;
  lat?: number | null;
  lon?: number | null;
}

export interface IHomeDeliveryPriceUpdateRequest {
  address: string;
  motorbikePrice: number;
  truck05Price: number;
  truck12Price: number;
  lat?: number | null;
  lon?: number | null;
}

export interface IHomeDeliveryCalculatorRequest {
  toRouteId: string;
  address: string;
  vehicleType: HomeDeliveryVehicleType;
  lat?: number | null;
  lon?: number | null;
}

export interface IHomeDeliveryCalculatorResponse {
  fromRouteId: string;
  fromRouteName: string;
  originAddress: string;
  destinationAddress: string;
  vehicleType: HomeDeliveryVehicleType;
  distanceMeters: number;
  distanceText: string;
  durationText: string;
  matchedPriceId: string | null;
  matchedPriceAddress: string | null;
  fee: number;
  priceSource: HomeDeliveryPriceSource;
  originLat: number;
  originLon: number;
  destinationLat: number;
  destinationLon: number;
  routeCoordinates: [number, number][];
}
