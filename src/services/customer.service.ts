import { Customer, ICustomer, ICustomerImage } from '@/models/customer.model';
import { CreateCustomerRequest, UpdateCustomerRequest } from '@/schemas/customer.schema';
import { BankCreateData, CustomerBankService } from '@/services/customer-bank.service';
import { UserService } from '@/services/user.service';
import { ICustomerFullInformationResponse } from '@/types/customer.type';
import { generateVersionedUrl } from '@/utils/image-url.utils';
import Logger from '@/utils/logger';
import { omitBy, isUndefined } from 'lodash';
import fs from 'fs';
import { Types } from 'mongoose';
import path from 'path';
import QRCode from 'qrcode';
import { CustomerBankRemovedService } from './customer-bank-removed.service';

export class CustomerService {
  private userService: UserService;
  private customerBankService: CustomerBankService;
  private customerBankRemovedService: CustomerBankRemovedService;

  constructor() {
    this.userService = new UserService();
    this.customerBankService = new CustomerBankService();
    this.customerBankRemovedService = new CustomerBankRemovedService();
  }

  /**
   * Generate QR code image from bank info and save to file
   */
  private async generateBankQRCode(customerId: string, bankData: BankCreateData): Promise<string> {
    try {
      // Create QR code data string in format: BankName|AccountNumber|AccountName
      const qrData = `${bankData.bankName}|${bankData.bankAccount}|${bankData.name}`;

      // Create customer directory if not exists
      const customerDir = path.join('public', 'uploads', 'customers', customerId);
      if (!fs.existsSync(customerDir)) {
        fs.mkdirSync(customerDir, { recursive: true });
      }

      // Generate QR code file path
      const qrFileName = 'bank-qrcode.png';
      const qrFilePath = path.join(customerDir, qrFileName);
      const qrBaseUrl = `/uploads/customers/${customerId}/${qrFileName}`;
      const qrUrl = generateVersionedUrl(qrBaseUrl);

      // Remove existing QR code if exists
      if (fs.existsSync(qrFilePath)) {
        fs.unlinkSync(qrFilePath);
      }

      // Generate QR code image and save to file
      await QRCode.toFile(qrFilePath, qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      Logger.debug('QR code generated for bank info', {
        customerId,
        qrFilePath,
        qrUrl,
        bankAccount: bankData.bankAccount,
      });

      return qrUrl;
    } catch (error) {
      Logger.error('Failed to generate bank QR code', {
        error: error instanceof Error ? error.message : error,
        customerId,
        bankData,
      });
      throw new Error(
        `Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Find or create a customer by phone
   * IMPORTANT: Only updates name for NEW customers, NOT for existing ones
   */
  async findOrCreateCustomer(phone: string, name: string, routeId: string): Promise<ICustomer> {
    try {
      // Try to find existing customer by phone only
      let customer = await Customer.findOne({ phone });

      if (customer) {
        // Customer exists - keep as is, don't update anything
        Logger.debug('Existing customer found, keeping as is', {
          phone,
          existingName: customer.name,
          requestedName: name,
          customerId: customer._id,
        });
      } else {
        // Customer doesn't exist - create new with provided name and routeId
        customer = new Customer({
          phone,
          name,
          routeId: new Types.ObjectId(routeId),
        });
        await customer.save();
        Logger.debug('New customer created', {
          phone,
          name,
          routeId,
          customerId: customer._id,
        });
      }

      return customer;
    } catch (error) {
      Logger.error('Failed to find or create customer', {
        error: error instanceof Error ? error.message : error,
        phone,
      });
      throw new Error(
        `Failed to find or create customer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get customer by phone
   */
  async getCustomerByPhone(phone: string): Promise<ICustomer | null> {
    try {
      const customer = await Customer.findOne({ phone });

      Logger.debug('Customer retrieved by phone', {
        phone,
        found: !!customer,
        customerId: customer?._id,
      });

      return customer;
    } catch (error) {
      Logger.error('Failed to get customer by phone', {
        error: error instanceof Error ? error.message : error,
        phone,
      });
      throw new Error(
        `Failed to get customer by phone: ${error instanceof Error ? error.message : 'Unknown error'}`
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
        relativeReceiver: data.relativeReceiver
          ? data.relativeReceiver.map(id => new Types.ObjectId(id))
          : [],
      });

      const savedCustomer = await customer.save();

      Logger.debug('Customer created', {
        customerId: savedCustomer._id,
        phone: savedCustomer.phone,
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
      const customer = await Customer.findById(id);

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
          // Use lodash omitBy to filter out undefined values
          const updateData: any = omitBy(
            {
              name: name,
              phone: phone,
              routeId: fromRouteId ? new Types.ObjectId(fromRouteId) : undefined,
            },
            isUndefined
          );

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
        relativeReceiver: [],
      });

      const savedCustomer = await customer.save();

      Logger.debug('Customer updated or created', {
        customerId: savedCustomer._id,
        phone: savedCustomer.phone,
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

  /**
   * Find or create customer and upload image with rotation
   */
  async findOrCreateAndUploadImage(
    phone: string,
    name: string,
    routeId: string,
    imageIndex: number,
    imageBuffer: Buffer,
    originalName: string,
    rotate: number = 0,
    userId?: string
  ): Promise<ICustomer> {
    try {
      // Find or create customer using existing method
      const customer = await this.findOrCreateCustomer(phone, name, routeId);

      // Create customer folder if not exists
      const customerFolder = path.join('public/uploads/customers', customer._id.toString());
      if (!fs.existsSync(customerFolder)) {
        fs.mkdirSync(customerFolder, { recursive: true });
      }

      // Check and delete old image if exists
      if (customer.images && customer.images[imageIndex - 1]) {
        const oldImagePath = path.join('public', customer.images[imageIndex - 1].url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Save new image
      const ext = path.extname(originalName);
      const filename = `${customer._id}_${imageIndex}${ext}`;
      const filePath = path.join(customerFolder, filename);
      fs.writeFileSync(filePath, imageBuffer);

      // Update customer images array with url and rotate
      const images: ICustomerImage[] = [...(customer.images || [])];
      const baseUrl = `/uploads/customers/${customer._id}/${filename}`;
      images[imageIndex - 1] = {
        url: generateVersionedUrl(baseUrl),
        rotate: rotate,
      };

      // Save updated customer
      customer.images = images.filter(img => img && img.url).slice(0, 5);

      // Set createdBy if userId is provided
      if (userId) {
        customer.createdBy = new Types.ObjectId(userId);
      }

      await customer.save();

      Logger.debug('Image uploaded for customer', {
        customerId: customer._id,
        phone,
        imageIndex,
        filename,
        rotate,
      });

      return customer;
    } catch (error) {
      Logger.error('Failed to upload image', {
        error: error instanceof Error ? error.message : error,
        phone,
        imageIndex,
      });
      throw error;
    }
  }

  /**
   * Upload image for existing customer by ID
   */
  async uploadImageById(
    customerId: string,
    imageIndex: number,
    imageBuffer: Buffer,
    originalName: string,
    rotate: number = 0,
    userId?: string
  ): Promise<ICustomer> {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Create customer folder if not exists
    const customerFolder = path.join('public/uploads/customers', customerId);
    if (!fs.existsSync(customerFolder)) {
      fs.mkdirSync(customerFolder, { recursive: true });
    }

    // Check and delete old image if exists
    if (customer.images && customer.images[imageIndex - 1]) {
      const oldImagePath = path.join('public', customer.images[imageIndex - 1].url);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Save new image
    const ext = path.extname(originalName);
    const filename = `${customerId}_${imageIndex}${ext}`;
    const filePath = path.join(customerFolder, filename);
    fs.writeFileSync(filePath, imageBuffer);

    // Update images array
    const images: ICustomerImage[] = [...(customer.images || [])];
    const baseUrl = `/uploads/customers/${customerId}/${filename}`;
    images[imageIndex - 1] = {
      url: generateVersionedUrl(baseUrl),
      rotate: rotate,
    };
    customer.images = images.filter(img => img && img.url).slice(0, 5);

    // Set createdBy if userId is provided
    if (userId) {
      customer.createdBy = new Types.ObjectId(userId);
    }

    return await customer.save();
  }

  /**
   * Update image rotation
   */
  async updateImageRotation(
    customerId: string,
    imageIndex: number,
    rotate: number,
    userId?: string
  ): Promise<ICustomer> {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    if (!customer.images || !customer.images[imageIndex - 1]) {
      throw new Error(`No image found at index ${imageIndex}`);
    }

    // Update rotation
    customer.images[imageIndex - 1].rotate = rotate;

    // Set createdBy if userId is provided
    if (userId) {
      customer.createdBy = new Types.ObjectId(userId);
    }

    return await customer.save();
  }

  /**
   * Delete customer image
   */
  async deleteCustomerImage(customerId: string, imageIndex: number): Promise<ICustomer> {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    if (!customer.images || !customer.images[imageIndex - 1]) {
      throw new Error(`No image found at index ${imageIndex}`);
    }

    // Delete physical file
    const imagePath = path.join('public', customer.images[imageIndex - 1].url);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Remove from array
    customer.images.splice(imageIndex - 1, 1);

    return await customer.save();
  }

  /**
   * Get customer by sender phone with bank info populated
   */
  async getCustomerBySenderPhone(phone: string): Promise<ICustomer | null> {
    try {
      const customer = await Customer.findOne({ phone }).populate('bankId');

      Logger.debug('Customer retrieved by sender phone with bank info', {
        phone,
        found: !!customer,
        customerId: customer?._id,
        hasBankInfo: !!(customer && customer.bankId),
      });

      return customer;
    } catch (error) {
      Logger.error('Failed to get customer by sender phone', {
        error: error instanceof Error ? error.message : error,
        phone,
      });
      throw new Error(
        `Failed to get customer by sender phone: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update customer with bank info and/or image(s)
   */
  async updateCustomerBankInfo(
    phone: string,
    routeId: string,
    userId: string,
    name?: string,
    bankInfo?: BankCreateData,
    imagesData?: Array<{
      index: number;
      buffer: Buffer;
      originalName: string;
      rotate: number;
    }>,
    deleteIndexes?: number[]
  ): Promise<ICustomer> {
    try {
      // Try to find existing customer
      let customer = await Customer.findOne({ phone });

      if (!customer) {
        // Customer not found - need name to create new
        if (!name) {
          throw new Error('Name is required when creating new customer');
        }
        const newCustomer = await this.findOrCreateCustomer(phone, name, routeId);
        customer = await Customer.findById(newCustomer._id);
        if (!customer) {
          throw new Error('Failed to retrieve newly created customer');
        }
        Logger.debug('New customer created for bank update', {
          customerId: customer._id,
          phone,
        });
      } else {
        Logger.debug('Existing customer found for bank update', {
          customerId: customer._id,
          phone,
        });
      }

      // Ensure customer is not null at this point
      if (!customer) {
        throw new Error('Failed to create or find customer');
      }

      // Handle bank info if provided
      if (bankInfo) {
        // Generate QR code first
        const qrCodeUrl = await this.generateBankQRCode(customer._id.toString(), bankInfo);

        // Add QR code URL to bank data
        const bankDataWithQR = { ...bankInfo, qrCodeUrl };

        const bankId = customer.bankId;

        if (bankId) {
          try {
            await this.customerBankService.updateBank(bankId.toString(), bankDataWithQR);
          } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            if (
              error?.code === 11000 ||
              (typeof errorMessage === 'string' &&
                errorMessage.includes('E11000 duplicate key error') &&
                errorMessage.includes('bankAccount'))
            ) {
              throw new Error('Số tài khoản này đã được sử dụng. Vui lòng đăng ký stk khác.');
            }

            Logger.error('BankId found but update failed, fallback create');
            Logger.error(error);

            try {
              const newBank = await this.customerBankService.createBank(bankDataWithQR);
              customer.bankId = new Types.ObjectId(newBank._id);
              await customer.save();
            } catch (error: any) {
              const errorMessage = error instanceof Error ? error.message : String(error);

              if (
                error?.code === 11000 ||
                (typeof errorMessage === 'string' &&
                  errorMessage.includes('E11000 duplicate key error') &&
                  errorMessage.includes('bankAccount'))
              ) {
                throw new Error('Số tài khoản này đã được sử dụng. Vui lòng đăng ký stk khác.');
              }

              Logger.error('Create bank after update failed');
              throw error;
            }
          }
        } else {
          try {
            const newBank = await this.customerBankService.createBank(bankDataWithQR);
            customer.bankId = new Types.ObjectId(newBank._id);
            await customer.save();
          } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            if (
              error?.code === 11000 ||
              (typeof errorMessage === 'string' &&
                errorMessage.includes('E11000 duplicate key error') &&
                errorMessage.includes('bankAccount'))
            ) {
              throw new Error('Số tài khoản này đã được sử dụng. Vui lòng đăng ký stk khác.');
            }

            throw error;
          }
        }
      }

      // Handle deleting images at specified indexes (1-based)
      if (deleteIndexes && deleteIndexes.length > 0 && customer.images) {
        for (const index of deleteIndexes) {
          const arrayIndex = index - 1; // Convert 1-based to 0-based
          if (customer.images[arrayIndex]) {
            // Delete physical file
            const oldImageUrl = customer.images[arrayIndex].url;
            // Remove version query string if present
            const cleanUrl = oldImageUrl.split('?')[0];
            const oldImagePath = path.join('public', cleanUrl);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
              Logger.debug('Image deleted at index', {
                customerId: customer._id,
                imageIndex: index,
                path: oldImagePath,
              });
            }
            // Set to null to mark for removal
            (customer.images as (ICustomerImage | null)[])[arrayIndex] = null;
          }
        }
        // Filter out null values
        customer.images = customer.images.filter((img): img is ICustomerImage => img !== null);
      }

      // Handle multiple images upload if provided
      if (imagesData && imagesData.length > 0) {
        // Create customer folder if not exists
        const customerFolder = path.join('public/uploads/customers', customer._id.toString());
        if (!fs.existsSync(customerFolder)) {
          fs.mkdirSync(customerFolder, { recursive: true });
        }

        // Initialize images array from existing customer images
        const images: ICustomerImage[] = [...(customer.images || [])];

        // Process each image
        for (const imageData of imagesData) {
          // Check and delete old image if exists at this index
          if (customer.images && customer.images[imageData.index - 1]) {
            const oldImagePath = path.join('public', customer.images[imageData.index - 1].url);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
            }
          }

          // Save new image
          const ext = path.extname(imageData.originalName);
          const filename = `${customer._id}_${imageData.index}${ext}`;
          const filePath = path.join(customerFolder, filename);
          fs.writeFileSync(filePath, imageData.buffer);

          // Update images array at specific index with versioned URL
          const baseUrl = `/uploads/customers/${customer._id}/${filename}`;
          images[imageData.index - 1] = {
            url: generateVersionedUrl(baseUrl),
            rotate: imageData.rotate,
          };

          Logger.debug('Image uploaded for customer bank update', {
            customerId: customer._id,
            imageIndex: imageData.index,
            filename,
            rotate: imageData.rotate,
          });
        }

        // Update customer with processed images
        customer.images = images.filter(img => img && img.url).slice(0, 5);
      }

      // Set createdBy to track who updated the customer
      customer.createdBy = new Types.ObjectId(userId);

      // Save and return updated customer
      const updatedCustomer = await customer.save();

      Logger.debug('Customer bank info update completed', {
        customerId: updatedCustomer._id,
        hasBankInfo: !!bankInfo,
        hasImages: !!(imagesData && imagesData.length > 0),
        imagesCount: imagesData?.length || 0,
        deletedIndexes: deleteIndexes || [],
      });

      return updatedCustomer;
    } catch (error) {
      Logger.error('Failed to update customer bank info', {
        error: error instanceof Error ? error.message : error,
        phone,
        routeId,
        userId,
      });
      throw error;
    }
  }

  /**
   * delete images of customer and bank info
   */
  async deleteImagesAndBankInfo(userId: string, customerId: string): Promise<boolean> {
    try {
      const customer = await Customer.findOne({ _id: customerId });
      if (!customer) {
        throw new Error('Customer not found');
      }

      if (customer.bankId) {
        // move customer bank to customer bank removed
        await this.customerBankRemovedService.moveCustomerBankToCustomerBankRemoved(
          userId,
          customerId,
          customer.bankId.toString()
        );

        // delete images
        const listImages = customer.images;
        for (const image of listImages) {
          // Delete physical file
          const imagePath = path.join('public', image.url);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }

          // update customer images
          await Customer.findByIdAndUpdate(customerId, { images: [], bankId: null });
        }
      }

      return true;
    } catch (error) {
      Logger.error('Failed to delete images and bank info', {
        error: error instanceof Error ? error.message : error,
        userId,
        customerId,
      });
      throw error;
    }
  }

  async getListCustomer(userId: string): Promise<ICustomerFullInformationResponse[]> {
    const routeId = await this.userService.getUserSelectedRouteId(userId);

    try {
      const customers = await Customer.find({
        routeId,
        bankId: { $exists: true, $ne: null },
      })
        .populate([
          { path: 'bankId', select: '_id bankName bankAccount name' },
          { path: 'createdBy', select: '_id username name createdAt updatedAt' },
          { path: 'routeId', select: '_id code name address' },
        ])
        .lean();

      return (
        customers
          // không lấy những customer chưa có thông tin bank
          .filter(c => c.bankId)
          .map(
            (c: any): ICustomerFullInformationResponse => ({
              id: c._id.toString(),
              name: c.name,
              phone: c.phone,

              route: c.routeId && {
                id: c.routeId._id.toString(),
                code: c.routeId.code,
                name: c.routeId.name,
                address: c.routeId.address,
              },

              bank: {
                id: c.bankId._id.toString(),
                name: c.bankId.name,
                bankName: c.bankId.bankName,
                bankAccount: c.bankId.bankAccount,
              },

              createdBy: c.createdBy && {
                id: c.createdBy._id.toString(),
                username: c.createdBy.username,
                name: c.createdBy.name,
                createdAt: c.createdBy.createdAt,
                updatedAt: c.createdBy.updatedAt,
              },

              images: c.images,
              address: c.address,
              identityCardName: c.identityCardName,
              identityCardIssuedDate: c.identityCardIssuedDate,
              identityCardNumber: c.identityCardNumber,
              isRoute: !!c.isRoute,
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
            })
          )
      );
    } catch (error) {
      Logger.error('Failed to get list customer', {
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw new Error('Failed to get list customer');
    }
  }

  async updateDataImageCustomer(
    customerId: string,
    images: ICustomerImage[]
  ): Promise<ICustomerImage[]> {
    const customer = await Customer.findById(customerId);

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Update images data
    customer.images = images;
    await customer.save();

    return customer.images;
  }

  async getInformationRouteCustomer(routeId: string): Promise<ICustomer | null> {
    const customer = await Customer.findOne({
      routeId: routeId,
    });

    if (!customer) {
      return null;
    }

    return customer;
  }
}
