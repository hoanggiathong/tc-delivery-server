export const mockCustomerService = {
  createCustomer: jest.fn(),
  updateCustomer: jest.fn(),
  getCustomerById: jest.fn(),
  getAllCustomers: jest.fn(),
  findOrCreateCustomer: jest.fn(),
  findCustomersByName: jest.fn(),
};

export class CustomerService {
  createCustomer = mockCustomerService.createCustomer;
  updateCustomer = mockCustomerService.updateCustomer;
  getCustomerById = mockCustomerService.getCustomerById;
  getAllCustomers = mockCustomerService.getAllCustomers;
  findOrCreateCustomer = mockCustomerService.findOrCreateCustomer;
  findCustomersByName = mockCustomerService.findCustomersByName;
}