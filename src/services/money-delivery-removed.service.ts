import { RemovedMoneyDelivery } from '@/models/money-delivery-removed.model';
import { MoneyDelivery } from '@/models/money-delivery.model';
import { User } from '@/models/user.model';
import { Types } from 'mongoose';
import { IDeleteMoneyDeliveryResponse } from '@/types/money-delivery-removed.type';
import Logger from '@/utils/logger';

export class RemovedMoneyDeliveryService {
  /**
   * Move money delivery to removed collection with password verification
   */
  async moveMoneyDeliveryToRemoved(
    fullCode: string,
    userId: string,
    password: string,
    reason: string
  ): Promise<IDeleteMoneyDeliveryResponse> {
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

      // 3. Find money delivery by fullCode
      const moneyDelivery = await MoneyDelivery.findOne({ fullCode });
      if (!moneyDelivery) {
        throw new Error('Money delivery not found');
      }

      // 4. Create removed money delivery record
      const expiredAt = new Date();
      expiredAt.setDate(expiredAt.getDate() + 90); // 90 days from now

      const removedMoneyDelivery = new RemovedMoneyDelivery({
        // Copy all original money delivery data
        originalMoneyDeliveryId: moneyDelivery._id,
        code: moneyDelivery.code,
        fullCode: moneyDelivery.fullCode,
        subCode: moneyDelivery.subCode,
        sender: moneyDelivery.sender,
        senderName: moneyDelivery.senderName,
        receiver: moneyDelivery.receiver,
        receiverName: moneyDelivery.receiverName,
        fromRoute: moneyDelivery.fromRoute,
        toRoute: moneyDelivery.toRoute,
        sendMoneyAmount: moneyDelivery.sendMoneyAmount,
        sendCost: moneyDelivery.sendCost,
        transferType: moneyDelivery.transferType,
        isFree: moneyDelivery.isFree,
        totalCost: moneyDelivery.totalCost,
        notes: moneyDelivery.notes,
        status: moneyDelivery.status,
        type: moneyDelivery.type,
        deliveryId: moneyDelivery.deliveryId,
        images: moneyDelivery.images,
        createdByUser: moneyDelivery.createdByUser,
        originalCreatedAt: moneyDelivery.createdAt,
        originalUpdatedAt: moneyDelivery.updatedAt,
        dateReturn: moneyDelivery.dateReturn,
        contentReturn: moneyDelivery.contentReturn,

        // Removal metadata
        deletedBy: new Types.ObjectId(userId),
        reason,
        deletedAt: new Date(),
        expiredAt,
      });

      // 5. Save removed money delivery and delete original (in transaction)
      const session = await RemovedMoneyDelivery.startSession();
      session.startTransaction();

      try {
        await removedMoneyDelivery.save({ session });
        await MoneyDelivery.findByIdAndDelete(moneyDelivery._id, { session });

        await session.commitTransaction();
        session.endSession();

        Logger.info('Money delivery moved to removed collection successfully', {
          originalMoneyDeliveryId: moneyDelivery._id,
          fullCode,
          deletedBy: userId,
          reason,
        });

        return {
          success: true,
          message: 'Money delivery deleted successfully',
          data: {
            deletedMoneyDelivery: {
              id: removedMoneyDelivery._id,
              fullCode: removedMoneyDelivery.fullCode,
              deletedAt: removedMoneyDelivery.deletedAt,
              reason: removedMoneyDelivery.reason,
            },
          },
        };
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
    } catch (error) {
      Logger.error('Failed to move money delivery to removed collection', {
        error: error instanceof Error ? error.message : error,
        fullCode,
        userId,
      });
      throw error;
    }
  }
}
