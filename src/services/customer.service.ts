import { Types } from 'mongoose';
import { Customer, ICustomer } from '@/models/customer.model';
import { CreateCustomerRequest, UpdateCustomerRequest } from '@/schemas/customer.schema';
import { UserService } from '@/services/user.service';
import Logger from '@/utils/logger';

export class CustomerService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Find or create a customer with specific type
   */
  async findOrCreateCustomer(
    phone: string,
    name: string,
    routeId: string,
    type: 'delivery' | 'money'
  ): Promise<ICustomer> {
    try {
      const customer = await Customer.findOneAndUpdate(
        { phone, type },
        {
          name,
          routeId: new Types.ObjectId(routeId),
          type,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      Logger.debug('Customer found or created', {
        phone,
        type,
        customerId: customer._id,
        isNew: !customer.createdAt || customer.createdAt === customer.updatedAt,
      });

      return customer;
    } catch (error) {
      Logger.error('Failed to find or create customer', {
        error: error instanceof Error ? error.message : error,
        phone,
        type,
      });
      throw new Error(
        `Failed to find or create customer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Add a receiver to sender's relativeReceiver array if not exists
   */
  async addRelativeReceiver(senderId: string, receiverId: string): Promise<void> {
    try {
      await Customer.findByIdAndUpdate(senderId, {
        $addToSet: { relativeReceiver: new Types.ObjectId(receiverId) },
      });

      Logger.debug('Relative receiver added', {
        senderId,
        receiverId,
      });
    } catch (error) {
      Logger.error('Failed to add relative receiver', {
        error: error instanceof Error ? error.message : error,
        senderId,
        receiverId,
      });
      throw new Error(
        `Failed to add relative receiver: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get frequent receivers for a sender by phone and type, filtered by user's selected route
   */
  async getFrequentReceivers(
    senderPhone: string,
    type: 'delivery' | 'money',
    userId: string
  ): Promise<ICustomer[]> {
    try {
      const userSelectedRouteId = await this.userService.getUserSelectedRouteId(userId);

      const sender = await Customer.findOne({
        phone: senderPhone,
        type,
        routeId: userSelectedRouteId,
      }).populate('relativeReceiver');

      if (!sender) {
        Logger.debug('Sender not found', { senderPhone, type, userSelectedRouteId });
        return [];
      }

      const frequentReceivers = sender.relativeReceiver as unknown as ICustomer[];

      Logger.debug('Frequent receivers retrieved', {
        senderPhone,
        type,
        userId,
        receiversCount: frequentReceivers.length,
        userSelectedRouteId,
      });

      return frequentReceivers;
    } catch (error) {
      Logger.error('Failed to get frequent receivers', {
        error: error instanceof Error ? error.message : error,
        senderPhone,
        type,
        userId,
      });
      throw new Error(
        `Failed to get frequent receivers: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get customer by phone and type
   */
  async getCustomerByPhoneAndType(
    phone: string,
    type: 'delivery' | 'money'
  ): Promise<ICustomer | null> {
    try {
      const customer = await Customer.findOne({ phone, type });

      Logger.debug('Customer retrieved by phone and type', {
        phone,
        type,
        found: !!customer,
        customerId: customer?._id,
      });

      return customer;
    } catch (error) {
      Logger.error('Failed to get customer by phone and type', {
        error: error instanceof Error ? error.message : error,
        phone,
        type,
      });
      throw new Error(
        `Failed to get customer by phone and type: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all customers by phone (both delivery and money types)
   */
  async getAllCustomersByPhone(phone: string): Promise<ICustomer[]> {
    try {
      const customers = await Customer.find({ phone });

      Logger.debug('All customers retrieved by phone', {
        phone,
        count: customers.length,
      });

      return customers;
    } catch (error) {
      Logger.error('Failed to get all customers by phone', {
        error: error instanceof Error ? error.message : error,
        phone,
      });
      throw new Error(
        `Failed to get all customers by phone: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find customers by name using text search (case-insensitive)
   */
  async findCustomersByName(name: string): Promise<ICustomer[]> {
    try {
      const customers = await Customer.find({
        $text: { $search: name },
      });

      Logger.debug('Customers found by name', {
        name,
        count: customers.length,
      });

      return customers;
    } catch (error) {
      Logger.error('Failed to find customers by name', {
        error: error instanceof Error ? error.message : error,
        name,
      });
      throw new Error(
        `Failed to find customers by name: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a new customer (for controller CRUD operations)
   */
  async createCustomer(data: CreateCustomerRequest): Promise<ICustomer> {
    try {
      const customer = new Customer({
        name: data.name,
        phone: data.phone,
        routeId: new Types.ObjectId(data.routeId),
        type: data.type,
        relativeReceiver: data.relativeReceiver
          ? data.relativeReceiver.map(id => new Types.ObjectId(id))
          : [],
      });

      const savedCustomer = await customer.save();

      Logger.debug('Customer created', {
        customerId: savedCustomer._id,
        phone: savedCustomer.phone,
        type: savedCustomer.type,
      });

      return savedCustomer;
    } catch (error) {
      Logger.error('Failed to create customer', {
        error: error instanceof Error ? error.message : error,
        data,
      });
      throw new Error(
        `Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update a customer by ID (for controller CRUD operations)
   */
  async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<ICustomer | null> {
    try {
      const updateData: any = { ...data };
      if (data.routeId) {
        updateData.routeId = new Types.ObjectId(data.routeId);
      }
      if (data.relativeReceiver) {
        updateData.relativeReceiver = data.relativeReceiver.map(id => new Types.ObjectId(id));
      }

      const updatedCustomer = await Customer.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (updatedCustomer) {
        Logger.debug('Customer updated', {
          customerId: updatedCustomer._id,
          phone: updatedCustomer.phone,
          type: updatedCustomer.type,
        });
      }

      return updatedCustomer;
    } catch (error) {
      Logger.error('Failed to update customer', {
        error: error instanceof Error ? error.message : error,
        id,
        data,
      });
      throw new Error(
        `Failed to update customer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a customer by ID (for controller CRUD operations)
   */
  async getCustomerById(id: string): Promise<ICustomer | null> {
    try {
      const customer = await Customer.findById(id).populate('relativeReceiver');

      Logger.debug('Customer retrieved by ID', {
        id,
        found: !!customer,
        customerId: customer?._id,
      });

      return customer;
    } catch (error) {
      Logger.error('Failed to get customer by ID', {
        error: error instanceof Error ? error.message : error,
        id,
      });
      throw new Error(
        `Failed to get customer by ID: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all customers with pagination (for controller CRUD operations)
   */
  async getAllCustomers(
    page = 1,
    limit = 10
  ): Promise<{ customers: ICustomer[]; total: number; pages: number }> {
    try {
      const skip = (page - 1) * limit;
      const [customers, total] = await Promise.all([
        Customer.find()
          .populate('relativeReceiver')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Customer.countDocuments(),
      ]);

      const pages = Math.ceil(total / limit);

      Logger.debug('All customers retrieved', {
        page,
        limit,
        total,
        pages,
        count: customers.length,
      });

      return { customers, total, pages };
    } catch (error) {
      Logger.error('Failed to get all customers', {
        error: error instanceof Error ? error.message : error,
        page,
        limit,
      });
      throw new Error(
        `Failed to get all customers: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update or create customer with partial data (for bulk update operations)
   * Note: This is a simplified implementation for compatibility
   */
  async updateOrCreateCustomerWithPartialData(
    customerId: string,
    name?: string,
    phone?: string,
    fromRouteId?: string,
    toRouteId?: string
  ): Promise<ICustomer> {
    try {
      // Try to update existing customer first
      if (customerId) {
        const existingCustomer = await Customer.findById(customerId);
        if (existingCustomer) {
          const updateData: any = {};
          if (name) {
            updateData.name = name;
          }
          if (phone) {
            updateData.phone = phone;
          }
          if (fromRouteId) {
            updateData.routeId = new Types.ObjectId(fromRouteId);
          }

          const updatedCustomer = await Customer.findByIdAndUpdate(customerId, updateData, {
            new: true,
            runValidators: true,
          });

          if (updatedCustomer) {
            return updatedCustomer;
          }
        }
      }

      // If update failed or customer doesn't exist, create new one
      // Use the provided data or fallback values
      const customer = new Customer({
        name: name || 'Unknown',
        phone: phone || '',
        routeId: fromRouteId ? new Types.ObjectId(fromRouteId) : new Types.ObjectId(),
        type: 'money', // Default for money delivery operations
        relativeReceiver: [],
      });

      const savedCustomer = await customer.save();

      Logger.debug('Customer updated or created', {
        customerId: savedCustomer._id,
        phone: savedCustomer.phone,
        type: savedCustomer.type,
      });

      return savedCustomer;
    } catch (error) {
      Logger.error('Failed to update or create customer with partial data', {
        error: error instanceof Error ? error.message : error,
        customerId,
        name,
        phone,
        fromRouteId,
        toRouteId,
      });
      throw new Error(
        `Failed to update or create customer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
