import mongoose, { Document, Schema } from 'mongoose';

import { SMSLogStatus, SMSType } from '@/types/sms-notification.type';

/**
 * SMSLog Model - Track SMS/Zalo ZNS notification history
 */
export interface ISMSLog extends Document {
  deliveryId: mongoose.Types.ObjectId;
  phone: string;
  messageType: SMSType;
  templateId: string;
  status: SMSLogStatus;
  errorCode?: string;
  errorMessage?: string;
  apiResponse?: Record<string, unknown>;
  retryCount: number;
  sentAt?: Date;
  sentBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const smsLogSchema = new Schema<ISMSLog>(
  {
    deliveryId: {
      type: Schema.Types.ObjectId,
      ref: 'Delivery',
      required: [true, 'Delivery ID is required'],
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    messageType: {
      type: String,
      enum: Object.values(SMSType),
      required: [true, 'Message type is required'],
    },
    templateId: {
      type: String,
      required: [true, 'Template ID is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(SMSLogStatus),
      default: SMSLogStatus.PENDING,
    },
    errorCode: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    apiResponse: {
      type: Schema.Types.Mixed,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    sentBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sent by user is required'],
    },
  },
  {
    timestamps: true,
    collection: 'smslogs',
  }
);

// Indexes for efficient querying
smsLogSchema.index({ deliveryId: 1, createdAt: -1 });
smsLogSchema.index({ status: 1, createdAt: -1 });
smsLogSchema.index({ phone: 1 });
smsLogSchema.index({ sentBy: 1, createdAt: -1 });

export const SMSLog = mongoose.model<ISMSLog>('SMSLog', smsLogSchema);
