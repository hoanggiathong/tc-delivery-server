import { Delivery, IDelivery } from '@/models/delivery.model';
import { CustomerService } from '@/services/customer.service';
import {
  IDeliveryCreateRequest,
  IDeliveryUpdateRequest,
  IDeliveryResponse,
  IDeliveryWithPopulatedRefs,
  IDeliveryLeanPopulated
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
   * Transform pre-populated lean delivery to IDeliveryResponse (optimized)
   */
  private transformDeliveryToResponseOptimized(delivery: IDeliveryLeanPopulated): IDeliveryResponse {
    return {
      id: delivery._id,
      sender: {
        id: delivery.sender._id,
        name: delivery.sender.name,
        phone: delivery.sender.phone,
        createdAt: delivery.sender.createdAt,
        updatedAt: delivery.sender.updatedAt
      },
      receiver: {
        id: delivery.receiver._id,
        name: delivery.receiver.name,
        phone: delivery.receiver.phone,
        createdAt: delivery.receiver.createdAt,
        updatedAt: delivery.receiver.updatedAt
      },
      route: delivery.route,
      name: delivery.name,
      cost: delivery.cost,
      homeDelivery: delivery.homeDelivery,
      homeDeliveryCost: delivery.homeDeliveryCost,
      itemValue: delivery.itemValue,
      itemCost: delivery.itemCost,
      collectCost: delivery.collectCost,
      collectForCustomer: delivery.collectForCustomer,
      collectForCustomerCost: delivery.collectForCustomerCost,
      collectForCustomerNote: delivery.collectForCustomerNote,
      createdByUser: delivery.createdByUser.username,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt
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
      const delivery = await Delivery.findById(id);
      if (!delivery) {
        throw new Error('Delivery not found');
      }

      const updateData: any = {};

      // Handle sender update
      if (data.senderName || data.senderPhone) {
        const senderName = data.senderName || delivery.sender.toString();
        const senderPhone = data.senderPhone || delivery.sender.toString();
        const sender = await this.customerService.findOrCreateCustomer(senderName, senderPhone);
        updateData.sender = sender.id;
      } else {
        updateData.sender = delivery.sender;
      }

      // Handle receiver update
      if (data.receiverName || data.receiverPhone) {
        const receiverName = data.receiverName || delivery.receiver.toString();
        const receiverPhone = data.receiverPhone || delivery.receiver.toString();
        const receiver = await this.customerService.findOrCreateCustomer(receiverName, receiverPhone);
        updateData.receiver = receiver.id;
      } else {
        updateData.receiver = delivery.receiver;
      }

      // Handle other field updates
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
      const delivery = await Delivery.findById(id)
        .populate([
          { path: 'sender', select: '_id name phone createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' }
        ])
        .lean();

      if (!delivery) {
        return null;
      }

      return this.transformDeliveryToResponseOptimized(delivery as unknown as IDeliveryLeanPopulated);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all deliveries
   */
  async getAllDeliveries(): Promise<IDeliveryResponse[]> {
    try {
      const deliveries = await Delivery.find({})
        .populate([
          { path: 'sender', select: '_id name phone createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' }
        ])
        .sort({ createdAt: -1 })
        .lean();

      return deliveries.map(delivery => this.transformDeliveryToResponseOptimized(delivery as unknown as IDeliveryLeanPopulated));
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

      // Find all deliveries by these senders with populated data
      const deliveries = await Delivery.find({
        sender: { $in: senderIds }
      })
        .populate([
          { path: 'sender', select: '_id name phone createdAt updatedAt' },
          { path: 'receiver', select: '_id name phone createdAt updatedAt' },
          { path: 'createdByUser', select: '_id username' }
        ])
        .sort({ createdAt: -1 })
        .lean();

      if (deliveries.length === 0) {
        return [];
      }

      // Transform to response format
      const deliveryResponses = deliveries.map(delivery =>
        this.transformDeliveryToResponseOptimized(delivery as unknown as IDeliveryLeanPopulated)
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