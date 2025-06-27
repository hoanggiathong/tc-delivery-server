import { Delivery, IDelivery } from '@/models/delivery.model';
import { CustomerService } from './customer.service';
import { IDeliveryResponse } from '@/types/customer.type';
import { CreateDeliveryRequest, UpdateDeliveryRequest } from '@/schemas/delivery.schema';

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
    const populatedDelivery = await Delivery.findById(delivery._id)
      .populate('sender')
      .populate('receiver')
      .populate('createdByUser', 'username');

    if (!populatedDelivery) {
      throw new Error('Delivery not found');
    }

    return {
      id: populatedDelivery._id.toString(),
      sender: {
        id: (populatedDelivery.sender as any)._id.toString(),
        name: (populatedDelivery.sender as any).name,
        phone: (populatedDelivery.sender as any).phone,
        createdAt: (populatedDelivery.sender as any).createdAt,
        updatedAt: (populatedDelivery.sender as any).updatedAt
      },
      receiver: {
        id: (populatedDelivery.receiver as any)._id.toString(),
        name: (populatedDelivery.receiver as any).name,
        phone: (populatedDelivery.receiver as any).phone,
        createdAt: (populatedDelivery.receiver as any).createdAt,
        updatedAt: (populatedDelivery.receiver as any).updatedAt
      },
      route: populatedDelivery.route,
      name: populatedDelivery.name,
      cost: populatedDelivery.cost,
      homeDelivery: populatedDelivery.homeDelivery,
      homeDeliveryCost: populatedDelivery.homeDeliveryCost,
      itemValue: populatedDelivery.itemValue,
      itemCost: populatedDelivery.itemCost,
      collectCost: populatedDelivery.collectCost,
      collectForCustomer: populatedDelivery.collectForCustomer,
      collectForCustomerCost: populatedDelivery.collectForCustomerCost,
      collectForCustomerNote: populatedDelivery.collectForCustomerNote,
      createdByUser: (populatedDelivery.createdByUser as any).username,
      createdAt: populatedDelivery.createdAt,
      updatedAt: populatedDelivery.updatedAt
    };
  }

  /**
   * Create a new delivery
   */
  async createDelivery(data: CreateDeliveryRequest, createdByUserId: string): Promise<IDeliveryResponse> {
    try {
      // Find or create sender
      const sender = await this.customerService.findOrCreateCustomer(
        data.senderName,
        data.senderPhone
      );

      // Find or create receiver
      const receiver = await this.customerService.findOrCreateCustomer(
        data.receiverName,
        data.receiverPhone
      );

      const newDelivery = new Delivery({
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
        createdByUser: createdByUserId
      });

      await newDelivery.save();
      return await this.transformDeliveryToResponse(newDelivery);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create delivery');
    }
  }

  /**
   * Update delivery by ID
   */
  async updateDelivery(id: string, data: UpdateDeliveryRequest): Promise<IDeliveryResponse> {
    try {
      const delivery = await Delivery.findById(id);
      if (!delivery) {
        throw new Error('Delivery not found');
      }

      let senderId = delivery.sender;
      let receiverId = delivery.receiver;

      // Update sender if provided
      if (data.senderName && data.senderPhone) {
        const sender = await this.customerService.findOrCreateCustomer(
          data.senderName,
          data.senderPhone
        );
        senderId = sender.id as any;
      }

      // Update receiver if provided
      if (data.receiverName && data.receiverPhone) {
        const receiver = await this.customerService.findOrCreateCustomer(
          data.receiverName,
          data.receiverPhone
        );
        receiverId = receiver.id as any;
      }

      const updateData: any = {
        sender: senderId,
        receiver: receiverId
      };

      // Add other fields if provided
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

      const updatedDelivery = await Delivery.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedDelivery) {
        throw new Error('Failed to update delivery');
      }

      return await this.transformDeliveryToResponse(updatedDelivery);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update delivery');
    }
  }

  /**
   * Get delivery by ID
   */
  async getDeliveryById(id: string): Promise<IDeliveryResponse | null> {
    try {
      const delivery = await Delivery.findById(id);
      if (!delivery) return null;

      return await this.transformDeliveryToResponse(delivery);
    } catch (error) {
      console.error('Error getting delivery by ID:', error);
      return null;
    }
  }

  /**
   * Get all deliveries
   */
  async getAllDeliveries(): Promise<IDeliveryResponse[]> {
    try {
      const deliveries = await Delivery.find({}).sort({ createdAt: -1 });
      const transformedDeliveries = await Promise.all(
        deliveries.map(delivery => this.transformDeliveryToResponse(delivery))
      );
      return transformedDeliveries;
    } catch (error) {
      console.error('Error getting all deliveries:', error);
      throw new Error('Failed to fetch deliveries');
    }
  }
}