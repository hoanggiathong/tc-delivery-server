import { VehicleType } from '@/models/delivery.model';
import { IAddressHistoryResponse } from '@/types/customer-address-history.type';

// Mock customer address history data for integration tests
export const mockAddressHistoryForIntegration: IAddressHistoryResponse = {
  id: '60d5ec49f1b2c72b8c8e4a01',
  customerId: '507f1f77bcf86cd799439011',
  address: '123 Hoàng Văn Thụ, Phường 4, Quận Tân Bình, TP.HCM',
  homeDeliveryCost: 30000,
  carryCost: 20000,
  homeDeliveryTotalCost: 50000,
  vehicleType: VehicleType.MOTORBIKE,
  createdAt: new Date('2025-01-15T10:30:00.000Z'),
  updatedAt: new Date('2025-01-15T10:30:00.000Z'),
};

export const mockAddressHistoryForIntegration2: IAddressHistoryResponse = {
  id: '60d5ec49f1b2c72b8c8e4a02',
  customerId: '507f1f77bcf86cd799439011',
  address: '456 Nguyễn Thị Minh Khai, Phường 5, Quận 3, TP.HCM',
  homeDeliveryCost: 40000,
  carryCost: 15000,
  homeDeliveryTotalCost: 55000,
  vehicleType: VehicleType.SMALL_TRUCK,
  createdAt: new Date('2025-01-14T08:20:00.000Z'),
  updatedAt: new Date('2025-01-14T08:20:00.000Z'),
};

export const mockAddressHistoryListForIntegration: IAddressHistoryResponse[] = [
  mockAddressHistoryForIntegration,
  mockAddressHistoryForIntegration2,
];
