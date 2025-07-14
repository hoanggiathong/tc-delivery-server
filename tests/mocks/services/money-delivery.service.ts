/**
 * Mock Money Delivery Service
 * Provides mock implementations for MoneyDeliveryService testing
 */

// Mock Money Delivery Service functions
export const mockMoneyDeliveryService = {
  createMoneyDelivery: jest.fn(),
  getAllMoneyDeliveries: jest.fn(),
  getMoneyDeliveryById: jest.fn(),
  updateMoneyDelivery: jest.fn(),
  deleteMoneyDelivery: jest.fn(),
  getNextCode: jest.fn(),
  getMoneyDeliveryByCode: jest.fn(),
  getFrequentCustomers: jest.fn(),
};

// Mock Money Delivery Service class
export class MockMoneyDeliveryService {
  createMoneyDelivery = mockMoneyDeliveryService.createMoneyDelivery;
  getAllMoneyDeliveries = mockMoneyDeliveryService.getAllMoneyDeliveries;
  getMoneyDeliveryById = mockMoneyDeliveryService.getMoneyDeliveryById;
  updateMoneyDelivery = mockMoneyDeliveryService.updateMoneyDelivery;
  deleteMoneyDelivery = mockMoneyDeliveryService.deleteMoneyDelivery;
  getNextCode = mockMoneyDeliveryService.getNextCode;
  getMoneyDeliveryByCode = mockMoneyDeliveryService.getMoneyDeliveryByCode;
  getFrequentCustomers = mockMoneyDeliveryService.getFrequentCustomers;
}

// Reset function for money delivery service mocks
export const resetMoneyDeliveryServiceMocks = () => {
  Object.values(mockMoneyDeliveryService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};
