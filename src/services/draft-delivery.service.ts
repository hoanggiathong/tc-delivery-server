import { DraftDelivery } from '@/models/draft-delivery.model';
import { Route } from '@/models/route.model';
import { User } from '@/models/user.model';
import { IDraftDeliveryInput, IDraftDeliveryResponse } from '@/types/draft-delivery.type';
import { DeliveryService } from './delivery.service';
import { SettingsService } from './settings.service';

export class DraftDeliveryService {
  private deliveryService: DeliveryService;
  private settingsService: SettingsService;

  constructor() {
    this.deliveryService = new DeliveryService();
    this.settingsService = new SettingsService();
  }

  /**
   * Create a draft delivery
   */
  async createDraft(data: IDraftDeliveryInput, userId: string): Promise<IDraftDeliveryResponse> {
    // Get user's selected route
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.selectedRouteId) {
      throw new Error('User has no selected route. Please select a route first.');
    }

    // Verify fromRoute matches user's selected route
    if (data.fromRouteId !== user.selectedRouteId.toString()) {
      throw new Error('From route must match your selected route');
    }

    // Verify routes exist
    const fromRoute = await Route.findById(data.fromRouteId);
    if (!fromRoute) {
      throw new Error('From route not found');
    }

    const toRoute = await Route.findById(data.toRouteId);
    if (!toRoute) {
      throw new Error('To route not found');
    }

    // Create draft
    const draft = new DraftDelivery({
      senderName: data.senderName,
      senderPhone: data.senderPhone,
      receiverName: data.receiverName,
      receiverPhone: data.receiverPhone,
      fromRoute: data.fromRouteId,
      toRoute: data.toRouteId,
      name: data.name,
      cost: data.cost,
      homeDelivery: data.homeDelivery,
      homeDeliveryCost: data.homeDeliveryCost || 0,
      itemValue: data.itemValue || 0,
      itemCost: data.itemCost || 0,
      collectCost: data.collectCost || 0,
      collectForCustomer: data.collectForCustomer || 0,
      collectForCustomerCost: data.collectForCustomerCost || 0,
      collectForCustomerNote: data.collectForCustomerNote,
      notes: data.notes,
      paymentType: data.paymentType,
      createdByUser: userId,
    });

    await draft.save();

    // Populate and return
    const populatedDraft = await DraftDelivery.findById(draft._id)
      .populate([
        { path: 'fromRoute', select: '_id code name address' },
        { path: 'toRoute', select: '_id code name address' },
        { path: 'createdByUser', select: '_id username' },
      ])
      .lean();

    return this.formatDraftResponse(populatedDraft);
  }

  /**
   * Update a draft delivery
   */
  async updateDraft(
    draftId: string,
    data: Partial<IDraftDeliveryInput>,
    userId: string
  ): Promise<IDraftDeliveryResponse> {
    const draft = await DraftDelivery.findById(draftId);
    if (!draft) {
      throw new Error('Draft not found');
    }

    // Check ownership
    if (draft.createdByUser.toString() !== userId) {
      throw new Error('You can only update your own drafts');
    }

    // Validate routes if updating
    if (data.fromRouteId) {
      const user = await User.findById(userId);
      if (data.fromRouteId !== user?.selectedRouteId?.toString()) {
        throw new Error('From route must match your selected route');
      }
      const fromRoute = await Route.findById(data.fromRouteId);
      if (!fromRoute) {
        throw new Error('From route not found');
      }
    }

    if (data.toRouteId) {
      const toRoute = await Route.findById(data.toRouteId);
      if (!toRoute) {
        throw new Error('To route not found');
      }
    }

    // Validate itemCost if updating relevant fields

    // Update draft
    const updateData: any = {};
    const fieldsToUpdate = [
      'senderName',
      'senderPhone',
      'receiverName',
      'receiverPhone',
      'name',
      'cost',
      'homeDelivery',
      'homeDeliveryCost',
      'itemValue',
      'itemCost',
      'collectCost',
      'collectForCustomer',
      'collectForCustomerCost',
      'collectForCustomerNote',
      'notes',
      'paymentType',
    ];

    fieldsToUpdate.forEach(field => {
      if (data[field as keyof IDraftDeliveryInput] !== undefined) {
        updateData[field] = data[field as keyof IDraftDeliveryInput];
      }
    });

    if (data.fromRouteId) {
      updateData.fromRoute = data.fromRouteId;
    }
    if (data.toRouteId) {
      updateData.toRoute = data.toRouteId;
    }

    const updatedDraft = await DraftDelivery.findByIdAndUpdate(draftId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate([
        { path: 'fromRoute', select: '_id code name address' },
        { path: 'toRoute', select: '_id code name address' },
        { path: 'createdByUser', select: '_id username' },
      ])
      .lean();

    return this.formatDraftResponse(updatedDraft);
  }

  /**
   * Get all drafts for current user's selected route
   */
  async getUserDrafts(userId: string): Promise<IDraftDeliveryResponse[]> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.selectedRouteId) {
      throw new Error('User has no selected route');
    }

    const drafts = await DraftDelivery.find({
      fromRoute: user.selectedRouteId,
      createdByUser: userId,
    })
      .populate([
        { path: 'fromRoute', select: '_id code name address' },
        { path: 'toRoute', select: '_id code name address' },
        { path: 'createdByUser', select: '_id username' },
      ])
      .sort({ createdAt: -1 })
      .lean();

    return drafts.map(draft => this.formatDraftResponse(draft));
  }

  /**
   * Get a single draft by ID
   */
  async getDraftById(draftId: string, userId: string): Promise<IDraftDeliveryResponse> {
    const draft = await DraftDelivery.findById(draftId)
      .populate([
        { path: 'fromRoute', select: '_id code name address' },
        { path: 'toRoute', select: '_id code name address' },
        { path: 'createdByUser', select: '_id username' },
      ])
      .lean();

    if (!draft) {
      throw new Error('Draft not found');
    }

    // Check ownership
    if (draft.createdByUser._id.toString() !== userId) {
      throw new Error('You can only view your own drafts');
    }

    return this.formatDraftResponse(draft);
  }

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: string, userId: string): Promise<void> {
    const draft = await DraftDelivery.findById(draftId);
    if (!draft) {
      throw new Error('Draft not found');
    }

    // Check ownership
    if (draft.createdByUser.toString() !== userId) {
      throw new Error('You can only delete your own drafts');
    }

    await DraftDelivery.findByIdAndDelete(draftId);
  }

  /**
   * Convert draft to actual delivery
   */
  async convertToDelivery(draftId: string, userId: string): Promise<any> {
    const draft = await DraftDelivery.findById(draftId);
    if (!draft) {
      throw new Error('Draft not found');
    }

    // Check ownership
    if (draft.createdByUser.toString() !== userId) {
      throw new Error('You can only convert your own drafts');
    }

    const deliveryData = {
      senderName: draft.senderName,
      senderPhone: draft.senderPhone,
      receiverName: draft.receiverName,
      receiverPhone: draft.receiverPhone,
      fromRouteId: draft.fromRoute.toString(),
      toRouteId: draft.toRoute.toString(),
      name: draft.name,
      cost: draft.cost,
      homeDelivery: draft.homeDelivery,
      homeDeliveryCost: draft.homeDeliveryCost,
      itemValue: draft.itemValue,
      itemCost: draft.itemCost,
      collectCost: draft.collectCost,
      collectForCustomer: draft.collectForCustomer,
      collectForCustomerCost: draft.collectForCustomerCost,
      collectForCustomerNote: draft.collectForCustomerNote,
      notes: draft.notes,
      paymentType: draft.paymentType,
      isFree: draft.isFree,
    };

    // Create actual delivery
    const delivery = await this.deliveryService.createDelivery(deliveryData, userId);

    // Delete draft after successful conversion
    await DraftDelivery.findByIdAndDelete(draftId);

    return delivery;
  }

  /**
   * Delete all drafts for a user (utility method)
   */
  async deleteAllUserDrafts(userId: string): Promise<{ deletedCount: number }> {
    const result = await DraftDelivery.deleteMany({ createdByUser: userId });
    return { deletedCount: result.deletedCount };
  }

  /**
   * Format draft response
   */
  private formatDraftResponse(draft: any): IDraftDeliveryResponse {
    return {
      id: draft._id.toString(),
      senderName: draft.senderName,
      senderPhone: draft.senderPhone,
      receiverName: draft.receiverName,
      receiverPhone: draft.receiverPhone,
      fromRoute: {
        id: draft.fromRoute._id.toString(),
        code: draft.fromRoute.code,
        name: draft.fromRoute.name,
        address: draft.fromRoute.address,
      },
      toRoute: {
        id: draft.toRoute._id.toString(),
        code: draft.toRoute.code,
        name: draft.toRoute.name,
        address: draft.toRoute.address,
      },
      name: draft.name,
      quantity: draft.quantity || 1,
      cost: draft.cost,
      homeDelivery: draft.homeDelivery,
      homeDeliveryCost: draft.homeDeliveryCost,
      itemValue: draft.itemValue,
      itemCost: draft.itemCost,
      collectCost: draft.collectCost,
      collectForCustomer: draft.collectForCustomer,
      collectForCustomerCost: draft.collectForCustomerCost,
      collectForCustomerNote: draft.collectForCustomerNote,
      details: draft.details,
      notes: draft.notes,
      totalCost: draft.totalCost,
      paymentType: draft.paymentType,
      createdByUser: {
        id: draft.createdByUser._id.toString(),
        username: draft.createdByUser.username,
      },
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    };
  }
}
