export const mockDeliveryService = {
  createDelivery: jest.fn(),
  updateDelivery: jest.fn(),
  getDeliveryById: jest.fn(),
  getAllDeliveries: jest.fn(),
  deleteDelivery: jest.fn(),
  getRelatedDeliveriesBySender: jest.fn(),
  getNextCode: jest.fn(),
  getDeliveryByCode: jest.fn()
};

export class DeliveryService {
  createDelivery = mockDeliveryService.createDelivery;
  updateDelivery = mockDeliveryService.updateDelivery;
  getDeliveryById = mockDeliveryService.getDeliveryById;
  getAllDeliveries = mockDeliveryService.getAllDeliveries;
  deleteDelivery = mockDeliveryService.deleteDelivery;
  getRelatedDeliveriesBySender = mockDeliveryService.getRelatedDeliveriesBySender;
  getNextCode = mockDeliveryService.getNextCode;
  getDeliveryByCode = mockDeliveryService.getDeliveryByCode;
}