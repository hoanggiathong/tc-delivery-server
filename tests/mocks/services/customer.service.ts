/**
 * Mock Customer Service
 * Provides mock implementations for CustomerService testing
 */

// Mock Customer Service functions
export const mockCustomerService = {
  createCustomer: jest.fn(),
  findOrCreateCustomer: jest.fn(),
  getAllCustomers: jest.fn(),
  getCustomerById: jest.fn(),
  updateCustomer: jest.fn(),
  deleteCustomer: jest.fn(),
};

// Mock Customer Service class
export class MockCustomerService {
  createCustomer = mockCustomerService.createCustomer;
  findOrCreateCustomer = mockCustomerService.findOrCreateCustomer;
  getAllCustomers = mockCustomerService.getAllCustomers;
  getCustomerById = mockCustomerService.getCustomerById;
  updateCustomer = mockCustomerService.updateCustomer;
  deleteCustomer = mockCustomerService.deleteCustomer;
}

// Reset function for customer service mocks
export const resetCustomerServiceMocks = () => {
  Object.values(mockCustomerService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};