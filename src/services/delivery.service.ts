import { Delivery, IDelivery } from '@/models/delivery.model';
import { CustomerService } from '@/services/customer.service';
import {
  IDeliveryCreateRequest,
  IDeliveryUpdateRequest,
  IDeliveryResponse,
  IDeliveryWithPopulatedRefs
} from '@/types/delivery.type';
import { ICustomerResponse } from '@/types/customer.type';

export class DeliveryService {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
  }

  /**
   * Transform IDelivery to IDeliveryResponse
   */
  private async transformDeliveryToResponse(delivery: IDelivery): Promise<IDeliveryResponse> {
    // Populate sender and receiver
    const populatedDelivery = await delivery.populate([
      { path: 'sender', select: '_id name phone createdAt updatedAt' },
      { path: 'receiver', select: '_id name phone createdAt updatedAt' },
      { path: 'createdByUser', select: '_id username' }
    ]);

    const populated = populatedDelivery as unknown as IDeliveryWithPopulatedRefs;

    return {
      id: populated._id,
      sender: {
        id: populated.sender._id,
        name: populated.sender.name,
        phone: populated.sender.phone,
        createdAt: populated.sender.createdAt,
        updatedAt: populated.sender.updatedAt
      },
      receiver: {
        id: populated.receiver._id,
        name: populated.receiver.name,
        phone: populated.receiver.phone,
        createdAt: populated.receiver.createdAt,
        updatedAt: populated.receiver.updatedAt
      },
      route: populated.route,
      name: populated.name,
      cost: populated.cost,
      homeDelivery: populated.homeDelivery,
      homeDeliveryCost: populated.homeDeliveryCost,
      itemValue: populated.itemValue,
      itemCost: populated.itemCost,
      collectCost: populated.collectCost,
      collectForCustomer: populated.collectForCustomer,
      collectForCustomerCost: populated.collectForCustomerCost,
      collectForCustomerNote: populated.collectForCustomerNote,
      createdByUser: populated.createdByUser.username,
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt
    };
  }

  /**
   * Create a new delivery
   */
  async createDelivery(data: IDeliveryCreateRequest, userId: string): Promise<IDeliveryResponse> {
    try {
      // Find or create sender and receiver
      const sender = await this.customerService.findOrCreateCustomer(data.senderName, data.senderPhone);
      const receiver = await this.customerService.findOrCreateCustomer(data.receiverName, data.receiverPhone);

      // Create delivery
      const delivery = new Delivery({
        sender: sender.id,
        receiver: receiver.id,
        route: data.route,
        name: data.name,
        cost: data.cost,
        homeDelivery: data.homeDelivery,
        homeDeliveryCost: data.homeDeliveryCost,
        itemValue: data.itemValue,
        itemCost: data.itemCost,
        collectCost: data.collectCost,
        collectForCustomer: data.collectForCustomer,
        collectForCustomerCost: data.collectForCustomerCost,
        collectForCustomerNote: data.collectForCustomerNote,
        createdByUser: userId
      });

      await delivery.save();
      return this.transformDeliveryToResponse(delivery);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update delivery by ID
   */
  async updateDelivery(id: string, data: IDeliveryUpdateRequest): Promise<IDeliveryResponse> {
    try {
      // Check if delivery exists
      const existingDelivery = await Delivery.findById(id);
      if (!existingDelivery) {
        throw new Error('Delivery not found');
      }

      // Prepare update object
      const updateData: any = {
        receiver: existingDelivery.receiver // Keep existing receiver by default
      };

      // Update sender if provided
      if (data.senderName && data.senderPhone) {
        const sender = await this.customerService.findOrCreateCustomer(data.senderName, data.senderPhone);
        updateData.sender = sender.id;
      } else {
        updateData.sender = existingDelivery.sender; // Keep existing sender
      }

      // Update receiver if provided
      if (data.receiverName && data.receiverPhone) {
        const receiver = await this.customerService.findOrCreateCustomer(data.receiverName, data.receiverPhone);
        updateData.receiver = receiver.id;
      }

      // Update other fields if provided
      if (data.route !== undefined) updateData.route = data.route;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.cost !== undefined) updateData.cost = data.cost;
      if (data.homeDelivery !== undefined) updateData.homeDelivery = data.homeDelivery;
      if (data.homeDeliveryCost !== undefined) updateData.homeDeliveryCost = data.homeDeliveryCost;
      if (data.itemValue !== undefined) updateData.itemValue = data.itemValue;
      if (data.itemCost !== undefined) updateData.itemCost = data.itemCost;
      if (data.collectCost !== undefined) updateData.collectCost = data.collectCost;
      if (data.collectForCustomer !== undefined) updateData.collectForCustomer = data.collectForCustomer;
      if (data.collectForCustomerCost !== undefined) updateData.collectForCustomerCost = data.collectForCustomerCost;
      if (data.collectForCustomerNote !== undefined) updateData.collectForCustomerNote = data.collectForCustomerNote;

      // Update delivery
      const updatedDelivery = await Delivery.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedDelivery) {
        throw new Error('Failed to update delivery');
      }

      return this.transformDeliveryToResponse(updatedDelivery);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get delivery by ID
   */
  async getDeliveryById(id: string): Promise<IDeliveryResponse | null> {
    try {
      const delivery = await Delivery.findById(id);
      if (!delivery) {
        return null;
      }
      return this.transformDeliveryToResponse(delivery);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all deliveries
   */
  async getAllDeliveries(): Promise<IDeliveryResponse[]> {
    try {
      const deliveries = await Delivery.find({}).sort({ createdAt: -1 });
      const responses = await Promise.all(
        deliveries.map(delivery => this.transformDeliveryToResponse(delivery))
      );
      return responses;
    } catch (error) {
      throw new Error('Failed to fetch deliveries');
    }
  }

  async deleteDelivery(id: string): Promise<void> {
    try {
      const delivery = await Delivery.findById(id);
      if (!delivery) {
        throw new Error('Delivery not found');
      }

      await Delivery.findByIdAndDelete(id);
    } catch (error) {
      throw error;
    }
  }

  async getRelatedDeliveriesBySender(senderName: string): Promise<IDeliveryResponse[]> {
    try {
      // Find all customers with the given name (case-insensitive)
      const senders = await this.customerService.findCustomersByName(senderName);

      if (senders.length === 0) {
        return [];
      }

      // Get sender IDs
      const senderIds = senders.map((sender: ICustomerResponse) => sender.id);

      // Find all deliveries by these senders
      const deliveries = await Delivery.find({
        sender: { $in: senderIds }
      }).sort({ createdAt: -1 });

      if (deliveries.length === 0) {
        return [];
      }

      // Transform to response format
      const deliveryResponses = await Promise.all(
        deliveries.map(delivery => this.transformDeliveryToResponse(delivery))
      );

      // Filter unique combinations of receiverName, receiverPhone, and route
      const uniqueDeliveries: IDeliveryResponse[] = [];
      const seenCombinations = new Set<string>();

      for (const delivery of deliveryResponses) {
        const combination = `${delivery.receiver.name}|${delivery.receiver.phone}|${delivery.route}`;

        if (!seenCombinations.has(combination)) {
          seenCombinations.add(combination);
          uniqueDeliveries.push(delivery);
        }
      }

      return uniqueDeliveries;
    } catch (error) {
      throw new Error(`Failed to fetch related deliveries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}