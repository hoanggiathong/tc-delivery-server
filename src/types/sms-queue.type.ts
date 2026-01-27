import { Document, Types } from 'mongoose';

/**
 * SMS Queue Status
 */
export enum SMS_QUEUE_STATUS {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
}

/**
 * SMS Queue Configuration
 */
export const SMS_QUEUE_CONFIG = {
  MAX_RETRY_COUNT: 2,
  BATCH_SIZE: 10,
  PROCESS_INTERVAL: 5000, // 5 seconds
};

/**
 * SMS Queue Document Interface
 */
export interface ISMSQueue extends Document {
  deliveryId: Types.ObjectId;
  userId: Types.ObjectId;
  status: SMS_QUEUE_STATUS;
  retryCount: number;
  errorCode?: string;
  errorMessage?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SMS Queue Lean Interface (for .lean() queries)
 */
export interface ISMSQueueLean {
  _id: Types.ObjectId;
  deliveryId: Types.ObjectId;
  userId: Types.ObjectId;
  status: SMS_QUEUE_STATUS;
  retryCount: number;
  errorCode?: string;
  errorMessage?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating queue item
 */
export interface ISMSQueueCreateInput {
  deliveryId: string;
  userId: string;
}

/**
 * Result from processing a batch
 */
export interface ISMSQueueBatchResult {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  results: Array<{
    queueId: string;
    deliveryId: string;
    success: boolean;
    errorMessage?: string;
  }>;
}

/**
 * Queue statistics
 */
export interface ISMSQueueStats {
  pending: number;
  processing: number;
  success: number;
  failed: number;
}
