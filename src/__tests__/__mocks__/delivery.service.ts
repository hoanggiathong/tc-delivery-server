export const mockDeliveryService = {
  createDelivery: jest.fn(),
  updateDelivery: jest.fn(),
  getDeliveryById: jest.fn(),
  getAllDeliveries: jest.fn(),
};

export class DeliveryService {
  createDelivery = mockDeliveryService.createDelivery;
  updateDelivery = mockDeliveryService.updateDelivery;
  getDeliveryById = mockDeliveryService.getDeliveryById;
  getAllDeliveries = mockDeliveryService.getAllDeliveries;
}