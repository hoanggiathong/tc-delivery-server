import mongoose, { Schema } from 'mongoose';
import { SMS_QUEUE_STATUS, ISMSQueue } from '@/types/sms-queue.type';

const smsQueueSchema = new Schema<ISMSQueue>(
  {
    deliveryId: {
      type: Schema.Types.ObjectId,
      ref: 'Delivery',
      required: [true, 'Delivery ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    status: {
      type: String,
      enum: Object.values(SMS_QUEUE_STATUS),
      default: SMS_QUEUE_STATUS.PENDING,
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    errorCode: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'SMSQueue',
  }
);

// FIFO Index: status + createdAt ascending for FIFO ordering
smsQueueSchema.index({ status: 1, createdAt: 1 });

// Index for finding by deliveryId and status (check duplicate)
smsQueueSchema.index({ deliveryId: 1, status: 1 });

// Index for cleanup old records
smsQueueSchema.index({ status: 1, processedAt: 1 });

export const SMSQueue = mongoose.model<ISMSQueue>('SMSQueue', smsQueueSchema);
