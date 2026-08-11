import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type MobileNotificationEventModule = 'delivery' | 'money-delivery';

export interface IMobileNotificationEventSetting extends Document {
  module: MobileNotificationEventModule;
  eventCode: string;
  enabled: boolean;
  sendToSender: boolean;
  sendToReceiver: boolean;

  senderTitleTemplate?: string;
  senderContentTemplate?: string;
  receiverTitleTemplate?: string;
  receiverContentTemplate?: string;

  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IMobileNotificationEventSetting>(
  {
    module: {
      type: String,
      enum: ['delivery', 'money-delivery'],
      required: true,
    },
    eventCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 100,
    },
    enabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    sendToSender: {
      type: Boolean,
      required: true,
      default: true,
    },
    sendToReceiver: {
      type: Boolean,
      required: true,
      default: true,
    },
    senderTitleTemplate: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    senderContentTemplate: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    receiverTitleTemplate: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    receiverContentTemplate: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'mobile_notification_event_settings',
  }
);

schema.index(
  {
    module: 1,
    eventCode: 1,
  },
  {
    unique: true,
    name: 'idx_mobile_notification_event_setting_unique',
  }
);

export const MobileNotificationEventSetting = mongoose.model<IMobileNotificationEventSetting>(
  'MobileNotificationEventSetting',
  schema
);
