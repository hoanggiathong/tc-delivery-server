import { Customer, ICustomer } from '@/models/customer.model';
import { ICustomerResponse, ICustomerLean } from '@/types/customer.type';
import { CreateCustomerRequest, UpdateCustomerRequest } from '@/schemas/customer.schema';

export class CustomerService {
  /**
   * Transform ICustomer to ICustomerResponse
   */
  private transformCustomerToResponse(customer: ICustomer): ICustomerResponse {
    return {
      id: customer._id.toString(),
      name: customer.name,
      phone: customer.phone,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  /**
   * Transform ICustomerLean to ICustomerResponse (for lean documents)
   */
  private transformCustomerLeanToResponse(customer: ICustomerLean): ICustomerResponse {
    return {
      id: customer._id.toString(),
      name: customer.name,
      phone: customer.phone,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  /**
   * Create a new customer
   */
  async createCustomer(data: CreateCustomerRequest): Promise<ICustomerResponse> {
    try {
      // Check if customer with both name and phone already exists
      const existingCustomer = await Customer.findOne({
        name: data.name,
        phone: data.phone,
      });

      if (existingCustomer) {
        throw new Error('Customer with this name and phone already exists');
      }

      const newCustomer = new Customer({
        name: data.name,
        phone: data.phone,
      });

      await newCustomer.save();
      return this.transformCustomerToResponse(newCustomer);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create customer');
    }
  }

  /**
   * Get all customers
   */
  async getAllCustomers(): Promise<ICustomerResponse[]> {
    try {
      const customers = await Customer.find({}).sort({ createdAt: -1 }).lean();
      return customers.map(customer =>
        this.transformCustomerLeanToResponse(customer as ICustomerLean)
      );
    } catch (error) {
      console.error('Error getting all customers:', error);
      throw new Error('Failed to fetch customers');
    }
  }

  /**
   * Find or create customer by name and phone
   */
  async findOrCreateCustomer(name: string, phone: string): Promise<ICustomerResponse> {
    try {
      // Try to find existing customer
      const existingCustomer = await Customer.findOne({ name, phone }).lean();

      if (existingCustomer) {
        return this.transformCustomerLeanToResponse(existingCustomer as ICustomerLean);
      }

      // Create new customer if not found
      const newCustomer = new Customer({ name, phone });
      const savedCustomer = await newCustomer.save();

      return this.transformCustomerToResponse(savedCustomer);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to find or create customer');
    }
  }

  /**
   * Find customers by name (case-insensitive)
   */
  async findCustomersByName(name: string): Promise<ICustomerResponse[]> {
    try {
      const customers = await Customer.find({
        name: { $regex: name, $options: 'i' },
      })
        .sort({ createdAt: -1 })
        .lean();

      return customers.map(customer =>
        this.transformCustomerLeanToResponse(customer as ICustomerLean)
      );
    } catch (error) {
      console.error('Error finding customers by name:', error);
      throw new Error('Failed to find customers by name');
    }
  }

  /**
   * Update customer by ID
   */
  async updateCustomer(
    customerId: string,
    data: UpdateCustomerRequest
  ): Promise<ICustomerResponse> {
    try {
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Check if another customer with the same name and phone exists
      const existingCustomer = await Customer.findOne({
        name: data.name,
        phone: data.phone,
        _id: { $ne: customerId },
      });

      if (existingCustomer) {
        throw new Error('Customer with this name and phone already exists');
      }

      if (data.name !== undefined) {
        customer.name = data.name;
      }
      if (data.phone !== undefined) {
        customer.phone = data.phone;
      }
      await customer.save();

      return this.transformCustomerToResponse(customer);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update customer');
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId: string): Promise<ICustomerResponse | null> {
    try {
      const customer = await Customer.findById(customerId).lean();
      return customer ? this.transformCustomerLeanToResponse(customer as ICustomerLean) : null;
    } catch (error) {
      console.error('Error getting customer by ID:', error);
      throw new Error('Failed to get customer by ID');
    }
  }
}
