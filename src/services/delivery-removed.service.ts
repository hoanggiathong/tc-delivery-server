import { RemovedDelivery } from '@/models/delivery-removed.model';
import { Delivery } from '@/models/delivery.model';
import { User } from '@/models/user.model';
import { Types } from 'mongoose';
import { IDeleteDeliveryResponse } from '@/types/delivery-removed.type';
import Logger from '@/utils/logger';

export class RemovedDeliveryService {
  /**
   * Move delivery to removed collection with password verification
   */
  async moveDeliveryToRemoved(
    fullCode: string,
    userId: string,
    password: string,
    reason: string
  ): Promise<IDeleteDeliveryResponse> {
    try {
      // 1. Find and verify user with password
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      // 2. Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }

      // 3. Find delivery by fullCode
      const delivery = await Delivery.findOne({ fullCode });
      if (!delivery) {
        throw new Error('Delivery not found');
      }

      // 4. Create removed delivery record
      const expiredAt = new Date();
      expiredAt.setDate(expiredAt.getDate() + 90); // 90 days from now

      const removedDelivery = new RemovedDelivery({
        // Copy all original delivery data
        originalDeliveryId: delivery._id,
        code: delivery.code,
        fullCode: delivery.fullCode,
        subCode: delivery.subCode,
        sender: delivery.sender,
        senderName: delivery.senderName,
        receiver: delivery.receiver,
        receiverName: delivery.receiverName,
        fromRoute: delivery.fromRoute,
        toRoute: delivery.toRoute,
        name: delivery.name,
        nameProductAndAdditionalInformation: delivery.nameProductAndAdditionalInformation,
        quantity: delivery.quantity,
        cost: delivery.cost,
        homeDelivery: delivery.homeDelivery,
        homeDeliveryCost: delivery.homeDeliveryCost,
        carryCost: delivery.carryCost,
        homeDeliveryCostTotal: delivery.homeDeliveryCostTotal,
        vehicleType: delivery.vehicleType,
        itemValue: delivery.itemValue,
        itemCost: delivery.itemCost,
        collectCost: delivery.collectCost,
        collectForCustomer: delivery.collectForCustomer,
        collectForCustomerCost: delivery.collectForCustomerCost,
        collectForCustomerNote: delivery.collectForCustomerNote,
        details: delivery.details,
        notes: delivery.notes,
        totalCost: delivery.totalCost,
        actualRevenue: delivery.actualRevenue,
        paymentType: delivery.paymentType,
        isFree: delivery.isFree,
        createdByUser: delivery.createdByUser,
        originalCreatedAt: delivery.createdAt,
        originalUpdatedAt: delivery.updatedAt,
        isReturn: delivery.isReturn,
        inventory: delivery.inventory,
        smsType: delivery.smsType,
        timeToSendSMS: delivery.timeToSendSMS,
        upItems: delivery.upItems,
        downItems: delivery.downItems,
        quantityReturn: delivery.quantityReturn,
        returnDeliveryImages: delivery.returnDeliveryImages,
        dateReturn: delivery.dateReturn,

        // Removal metadata
        deletedBy: new Types.ObjectId(userId),
        reason,
        deletedAt: new Date(),
        expiredAt,
      });

      // 5. Save removed delivery and delete original (in transaction)
      const session = await RemovedDelivery.startSession();
      session.startTransaction();

      try {
        await removedDelivery.save({ session });
        await Delivery.findByIdAndDelete(delivery._id, { session });

        await session.commitTransaction();
        session.endSession();

        Logger.info('Delivery moved to removed collection successfully', {
          originalDeliveryId: delivery._id,
          fullCode,
          deletedBy: userId,
          reason,
        });

        return {
          success: true,
          message: 'Delivery deleted successfully',
          data: {
            deletedDelivery: {
              id: removedDelivery._id,
              fullCode: removedDelivery.fullCode,
              deletedAt: removedDelivery.deletedAt,
              reason: removedDelivery.reason,
            },
          },
        };
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
    } catch (error) {
      Logger.error('Failed to move delivery to removed collection', {
        error: error instanceof Error ? error.message : error,
        fullCode,
        userId,
      });
      throw error;
    }
  }
}
