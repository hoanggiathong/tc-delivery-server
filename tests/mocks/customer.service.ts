// Import mock from utils
import { mockCustomerService } from '../utils/mock-services';

// Export class for Jest mock
export class CustomerService {
  createCustomer = mockCustomerService.createCustomer;
  updateCustomer = mockCustomerService.updateCustomer;
  getCustomerById = mockCustomerService.getCustomerById;
  getAllCustomers = mockCustomerService.getAllCustomers;
  findOrCreateCustomer = mockCustomerService.findOrCreateCustomer;
  deleteCustomer = mockCustomerService.deleteCustomer;
}

// Export default for compatibility
export default CustomerService;