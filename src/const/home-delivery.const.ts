import { HomeDeliveryVehicleType } from '@/types/home-delivery-price.type';

export interface IHomeDeliveryKmPricing {
  baseKm: number;
  basePrice: number;
  extraPricePerKm: number;
}

export const HOME_DELIVERY_KM_PRICING: Record<HomeDeliveryVehicleType, IHomeDeliveryKmPricing> = {
  MOTORBIKE: {
    baseKm: 2,
    basePrice: 40000,
    extraPricePerKm: 15000,
  },

  TRUCK_05: {
    baseKm: 3,
    basePrice: 90000,
    extraPricePerKm: 25000,
  },

  TRUCK_12: {
    baseKm: 3,
    basePrice: 130000,
    extraPricePerKm: 30000,
  },
};

export const HOME_DELIVERY_OSRM_CONFIG = {
  overview: 'full',
  geometries: 'geojson',
  alternatives: 'false',
  steps: 'false',
};

export const HOME_DELIVERY_GOONG_CONFIG = {
  baseUrl: 'https://rsapi.goong.io',
};
