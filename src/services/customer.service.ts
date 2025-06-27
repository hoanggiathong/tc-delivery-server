import { Customer, ICustomer } from '@/models/customer.model';
import { ICustomerResponse } from '@/types/customer.type';
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
      updatedAt: customer.updatedAt
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
        phone: data.phone
      });

      if (existingCustomer) {
        throw new Error('Customer with this name and phone already exists');
      }

      const newCustomer = new Customer({
        name: data.name,
        phone: data.phone
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
   * Update customer by ID
   */
  async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<ICustomerResponse> {
    try {
      const customer = await Customer.findById(id);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Check if updating will create a duplicate name+phone combination
      if (data.name || data.phone) {
        const newName = data.name || customer.name;
        const newPhone = data.phone || customer.phone;

        const existingCustomer = await Customer.findOne({
          _id: { $ne: id },
          name: newName,
          phone: newPhone
        });

        if (existingCustomer) {
          throw new Error('Customer with this name and phone already exists');
        }
      }

      const updatedCustomer = await Customer.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      );

      if (!updatedCustomer) {
        throw new Error('Failed to update customer');
      }

      return this.transformCustomerToResponse(updatedCustomer);
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
  async getCustomerById(id: string): Promise<ICustomerResponse | null> {
    try {
      const customer = await Customer.findById(id);
      if (!customer) return null;

      return this.transformCustomerToResponse(customer);
    } catch (error) {
      console.error('Error getting customer by ID:', error);
      return null;
    }
  }

  /**
   * Get all customers
   */
  async getAllCustomers(): Promise<ICustomerResponse[]> {
    try {
      const customers = await Customer.find({}).sort({ createdAt: -1 });
      return customers.map(customer => this.transformCustomerToResponse(customer));
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
      let customer = await Customer.findOne({ name, phone });

      if (!customer) {
        // Create new customer if not found
        customer = new Customer({ name, phone });
        await customer.save();
      }

      return this.transformCustomerToResponse(customer);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to find or create customer');
    }
  }
}