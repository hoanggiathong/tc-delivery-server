/**
 * Mock Delivery Service
 * Provides mock implementations for DeliveryService testing
 */

// Mock Delivery Service functions
export const mockDeliveryService = {
  createDelivery: jest.fn(),
  updateDelivery: jest.fn(),
  getDeliveryById: jest.fn(),
  getAllDeliveries: jest.fn(),
  deleteDelivery: jest.fn(),
  getRelatedDeliveriesBySender: jest.fn(),
  getNextCode: jest.fn(),
  getDeliveryByCode: jest.fn(),
};

// Mock Delivery Service class
export class MockDeliveryService {
  createDelivery = mockDeliveryService.createDelivery;
  updateDelivery = mockDeliveryService.updateDelivery;
  getDeliveryById = mockDeliveryService.getDeliveryById;
  getAllDeliveries = mockDeliveryService.getAllDeliveries;
  deleteDelivery = mockDeliveryService.deleteDelivery;
  getRelatedDeliveriesBySender = mockDeliveryService.getRelatedDeliveriesBySender;
  getNextCode = mockDeliveryService.getNextCode;
  getDeliveryByCode = mockDeliveryService.getDeliveryByCode;
}

// Reset function for delivery service mocks
export const resetDeliveryServiceMocks = () => {
  Object.values(mockDeliveryService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};
