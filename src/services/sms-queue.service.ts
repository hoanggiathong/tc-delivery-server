import { SMSQueue } from '@/models/sms-queue.model';
import { Delivery } from '@/models/delivery.model';
import {
  SMS_QUEUE_STATUS,
  SMS_QUEUE_CONFIG,
  ISMSQueue,
  ISMSQueueLean,
  ISMSQueueCreateInput,
  ISMSQueueBatchResult,
  ISMSQueueStats,
} from '@/types/sms-queue.type';
import { SMSStatus } from '@/types/sms-notification.type';
import { SMSNotificationService } from '@/services/sms-notification.service';
import Logger from '@/utils/logger';

/**
 * SMS Queue Service
 * Handles queue operations for SMS notifications
 */
export class SMSQueueService {
  private smsNotificationService: SMSNotificationService;

  constructor() {
    this.smsNotificationService = new SMSNotificationService();
  }

  /**
   * Add single delivery to SMS queue
   */
  async addToQueue(input: ISMSQueueCreateInput): Promise<ISMSQueue> {
    // Check if already in queue with pending/processing status
    const existing = await SMSQueue.findOne({
      deliveryId: input.deliveryId,
      status: { $in: [SMS_QUEUE_STATUS.PENDING, SMS_QUEUE_STATUS.PROCESSING] },
    });

    if (existing) {
      Logger.warn('Delivery already in queue', { deliveryId: input.deliveryId });
      return existing;
    }

    const queueItem = new SMSQueue({
      deliveryId: input.deliveryId,
      userId: input.userId,
      status: SMS_QUEUE_STATUS.PENDING,
      retryCount: 0,
    });

    await queueItem.save();
    Logger.info('Added to SMS queue', { deliveryId: input.deliveryId, queueId: queueItem._id });
    return queueItem;
  }

  /**
   * Add multiple deliveries to queue
   */
  async addBulkToQueue(
    deliveryIds: string[],
    userId: string
  ): Promise<{ added: number; skipped: number }> {
    // Step 1: Find deliveries that are eligible (smsStatus is null or NOT_SENT)
    const eligibleDeliveries = await Delivery.find({
      _id: { $in: deliveryIds },
      $or: [{ smsStatus: null }, { smsStatus: SMSStatus.NOT_SENT }],
    }).select('_id');

    const eligibleIds = eligibleDeliveries.map(d => d._id.toString());

    if (eligibleIds.length === 0) {
      return { added: 0, skipped: deliveryIds.length };
    }

    // Step 2: Find which ones are already in queue
    const existingInQueue = await SMSQueue.find({
      deliveryId: { $in: eligibleIds },
      status: { $in: [SMS_QUEUE_STATUS.PENDING, SMS_QUEUE_STATUS.PROCESSING] },
    }).select('deliveryId');

    const existingIds = new Set(existingInQueue.map(q => q.deliveryId.toString()));

    // Step 3: Filter out existing ones
    const idsToAdd = eligibleIds.filter(id => !existingIds.has(id));

    if (idsToAdd.length === 0) {
      return { added: 0, skipped: deliveryIds.length };
    }

    // Step 4: Update deliveries status to WAITING_ZALO_SMS
    await Delivery.updateMany(
      { _id: { $in: idsToAdd } },
      { $set: { smsStatus: SMSStatus.WAITING_ZALO_SMS } }
    );

    // Step 5: Bulk insert into queue
    const queueItems = idsToAdd.map(deliveryId => ({
      deliveryId,
      userId,
      status: SMS_QUEUE_STATUS.PENDING,
      retryCount: 0,
    }));

    await SMSQueue.insertMany(queueItems);

    const added = idsToAdd.length;
    const skipped = deliveryIds.length - added;

    Logger.info('Bulk add to SMS queue completed', { added, skipped, total: deliveryIds.length });
    return { added, skipped };
  }

  /**
   * Get next batch of pending records for processing (FIFO)
   */
  async getNextBatch(batchSize: number = SMS_QUEUE_CONFIG.BATCH_SIZE): Promise<ISMSQueueLean[]> {
    return SMSQueue.find({ status: SMS_QUEUE_STATUS.PENDING })
      .sort({ createdAt: 1 }) // FIFO: oldest first
      .limit(batchSize)
      .lean<ISMSQueueLean[]>();
  }

  /**
   * Mark records as processing
   */
  async markAsProcessing(queueIds: string[]): Promise<number> {
    const result = await SMSQueue.updateMany(
      {
        _id: { $in: queueIds },
        status: SMS_QUEUE_STATUS.PENDING,
      },
      {
        $set: { status: SMS_QUEUE_STATUS.PROCESSING },
      }
    );
    return result.modifiedCount;
  }

  /**
   * Delete queue item after successful processing
   */
  async markAsCompleted(queueId: string): Promise<void> {
    await SMSQueue.findByIdAndDelete(queueId);
  }

  /**
   * Mark as failed with error info, delete if max retries reached
   */
  async markAsFailed(queueId: string, errorCode?: string, errorMessage?: string): Promise<void> {
    const queueItem = await SMSQueue.findById(queueId);
    if (!queueItem) return;

    const newRetryCount = queueItem.retryCount + 1;

    // If retry count exceeds max, delete the record
    if (newRetryCount >= SMS_QUEUE_CONFIG.MAX_RETRY_COUNT) {
      Logger.warn('SMS Queue item reached max retries, deleting', {
        queueId,
        deliveryId: queueItem.deliveryId,
        retryCount: newRetryCount,
        errorCode,
        errorMessage,
      });
      await SMSQueue.findByIdAndDelete(queueId);
    } else {
      // Reset to pending for retry
      await SMSQueue.findByIdAndUpdate(queueId, {
        status: SMS_QUEUE_STATUS.PENDING,
        retryCount: newRetryCount,
        errorCode,
        errorMessage,
      });
    }
  }

  /**
   * Process a batch of queue items
   */
  async processBatch(): Promise<ISMSQueueBatchResult> {
    const batch = await this.getNextBatch();

    if (batch.length === 0) {
      return {
        totalProcessed: 0,
        successCount: 0,
        failedCount: 0,
        results: [],
      };
    }

    const queueIds = batch.map(item => item._id.toString());
    await this.markAsProcessing(queueIds);

    const results: ISMSQueueBatchResult['results'] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const item of batch) {
      try {
        const sendResult = await this.smsNotificationService.sendNotification(
          item.deliveryId.toString(),
          item.userId.toString()
        );

        if (sendResult.success) {
          await this.markAsCompleted(item._id.toString());
          successCount++;
          results.push({
            queueId: item._id.toString(),
            deliveryId: item.deliveryId.toString(),
            success: true,
          });
        } else {
          await this.markAsFailed(
            item._id.toString(),
            sendResult.errorCode,
            sendResult.errorMessage
          );
          failedCount++;
          results.push({
            queueId: item._id.toString(),
            deliveryId: item.deliveryId.toString(),
            success: false,
            errorMessage: sendResult.errorMessage,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.markAsFailed(item._id.toString(), 'PROCESSING_ERROR', errorMessage);
        failedCount++;
        results.push({
          queueId: item._id.toString(),
          deliveryId: item.deliveryId.toString(),
          success: false,
          errorMessage,
        });
      }
    }

    Logger.info('SMS Queue batch processed', {
      totalProcessed: batch.length,
      successCount,
      failedCount,
    });

    return {
      totalProcessed: batch.length,
      successCount,
      failedCount,
      results,
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<ISMSQueueStats> {
    const [pending, processing, success, failed] = await Promise.all([
      SMSQueue.countDocuments({ status: SMS_QUEUE_STATUS.PENDING }),
      SMSQueue.countDocuments({ status: SMS_QUEUE_STATUS.PROCESSING }),
      SMSQueue.countDocuments({ status: SMS_QUEUE_STATUS.SUCCESS }),
      SMSQueue.countDocuments({ status: SMS_QUEUE_STATUS.FAILED }),
    ]);

    return { pending, processing, success, failed };
  }

  /**
   * Reset stuck processing items (items processing for more than 5 minutes)
   */
  async resetStuckItems(): Promise<number> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const result = await SMSQueue.updateMany(
      {
        status: SMS_QUEUE_STATUS.PROCESSING,
        updatedAt: { $lt: fiveMinutesAgo },
      },
      {
        $set: { status: SMS_QUEUE_STATUS.PENDING },
      }
    );

    if (result.modifiedCount > 0) {
      Logger.warn('Reset stuck SMS queue items', { count: result.modifiedCount });
    }

    return result.modifiedCount;
  }
}

export default new SMSQueueService();
