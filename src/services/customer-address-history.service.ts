import {
  CustomerAddressHistory,
  ICustomerAddressHistory,
} from '@/models/customer-address-history.model';
import { IDelivery } from '@/models/delivery.model';
import { Customer } from '@/models/customer.model';
import {
  IAddressHistoryResponse,
  IAddressHistoryCreateRequest,
} from '@/types/customer-address-history.type';
import Logger from '@/utils/logger';

export class CustomerAddressHistoryService {
  /**
   * Get customerId from phone number
   */
  private async getCustomerIdByPhone(phone: string): Promise<string> {
    try {
      const customer = await Customer.findOne({ phone });
      if (!customer) {
        throw new Error('Customer not found');
      }
      return customer._id.toString();
    } catch (error) {
      Logger.error('Failed to find customer by phone', {
        phone,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Get all address history for a customer by phone (sorted by createdAt DESC, newest first)
   */
  async getAddressHistory(phone: string): Promise<IAddressHistoryResponse[]> {
    try {
      Logger.debug('Getting address history', { phone });

      // Find customer by phone
      const customerId = await this.getCustomerIdByPhone(phone);

      const addressHistory: ICustomerAddressHistory[] = await CustomerAddressHistory.find({
        customerId,
      })
        .sort({ createdAt: -1 }) // Newest first
        .lean();

      Logger.info('Address history retrieved successfully', {
        phone,
        customerId,
        count: addressHistory.length,
      });

      return addressHistory.map(history => ({
        id: history._id.toString(),
        customerId: history.customerId.toString(),
        address: history.address,
        homeDeliveryCost: history.homeDeliveryCost,
        carryCost: history.carryCost,
        homeDeliveryTotalCost: history.homeDeliveryTotalCost,
        vehicleType: history.vehicleType,
        createdAt: history.createdAt,
        updatedAt: history.updatedAt,
      }));
    } catch (error) {
      Logger.error('Failed to get address history', {
        phone,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Create new address history manually by phone
   */
  async createAddressHistory(
    phone: string,
    data: IAddressHistoryCreateRequest
  ): Promise<IAddressHistoryResponse> {
    try {
      Logger.debug('Creating address history', { phone, data });

      // Find customer by phone
      const customerId = await this.getCustomerIdByPhone(phone);

      // Enforce 20-record limit before creating new one
      await this.enforceRecordLimit(customerId);

      // Calculate total cost
      const homeDeliveryTotalCost = data.carryCost + data.homeDeliveryCost;

      // Create new address history
      const addressHistory = await CustomerAddressHistory.create({
        customerId,
        address: data.address,
        homeDeliveryCost: data.homeDeliveryCost,
        carryCost: data.carryCost,
        homeDeliveryTotalCost,
        vehicleType: data.vehicleType,
      });

      Logger.info('Address history created successfully', {
        phone,
        customerId,
        addressHistoryId: addressHistory._id,
      });

      return {
        id: addressHistory._id.toString(),
        customerId: addressHistory.customerId.toString(),
        address: addressHistory.address,
        homeDeliveryCost: addressHistory.homeDeliveryCost,
        carryCost: addressHistory.carryCost,
        homeDeliveryTotalCost: addressHistory.homeDeliveryTotalCost,
        vehicleType: addressHistory.vehicleType,
        createdAt: addressHistory.createdAt,
        updatedAt: addressHistory.updatedAt,
      };
    } catch (error) {
      Logger.error('Failed to create address history', {
        phone,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Delete address history by ID with phone verification (ownership verification)
   */
  async deleteAddressHistory(phone: string, addressHistoryId: string): Promise<void> {
    try {
      Logger.debug('Deleting address history', { phone, addressHistoryId });

      // Find customer by phone
      const customerId = await this.getCustomerIdByPhone(phone);

      // Find address history
      const addressHistory = await CustomerAddressHistory.findById(addressHistoryId);

      if (!addressHistory) {
        throw new Error('Address history not found');
      }

      // Verify ownership
      if (addressHistory.customerId.toString() !== customerId) {
        throw new Error('This address history does not belong to the specified customer');
      }

      // Delete address history
      await CustomerAddressHistory.deleteOne({ _id: addressHistoryId });

      Logger.info('Address history deleted successfully', {
        phone,
        customerId,
        addressHistoryId,
      });
    } catch (error) {
      Logger.error('Failed to delete address history', {
        phone,
        addressHistoryId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Create address history from delivery (auto-create trigger)
   * This is called by DeliveryService after successful delivery creation
   */
  async createFromDelivery(delivery: IDelivery): Promise<void> {
    try {
      // Extract customerId from sender
      const customerId = delivery.sender.toString();

      Logger.debug('Creating address history from delivery', {
        deliveryId: delivery._id,
        customerId,
        homeDelivery: delivery.homeDelivery,
      });

      // Enforce 20-record limit before creating new one
      await this.enforceRecordLimit(customerId);

      // Calculate total cost
      const homeDeliveryTotalCost = delivery.carryCost + delivery.homeDeliveryCost;

      // Create new address history
      await CustomerAddressHistory.create({
        customerId,
        address: delivery.homeDelivery,
        homeDeliveryCost: delivery.homeDeliveryCost,
        carryCost: delivery.carryCost,
        homeDeliveryTotalCost,
        vehicleType: delivery.vehicleType,
      });

      Logger.info('Address history created from delivery', {
        deliveryId: delivery._id,
        customerId,
      });
    } catch (error) {
      Logger.error('Failed to create address history from delivery', {
        deliveryId: delivery._id,
        error: error instanceof Error ? error.message : error,
      });
      // Don't throw error - log only, so delivery creation doesn't fail
      throw error;
    }
  }

  /**
   * Enforce 20-record limit per customer
   * Delete oldest record if count >= 20
   */
  private async enforceRecordLimit(customerId: string): Promise<void> {
    try {
      const count = await CustomerAddressHistory.countDocuments({ customerId });

      if (count >= 20) {
        // Find oldest record
        const oldest = await CustomerAddressHistory.findOne({ customerId })
          .sort({ createdAt: 1 })
          .limit(1);

        if (oldest) {
          await CustomerAddressHistory.deleteOne({ _id: oldest._id });
          Logger.info('Deleted oldest address history to enforce 20-record limit', {
            customerId,
            deletedId: oldest._id,
          });
        }
      }
    } catch (error) {
      Logger.error('Failed to enforce record limit', {
        customerId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }
}
