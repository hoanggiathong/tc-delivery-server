import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMobileNotificationRead extends Document {
  accountId: mongoose.Types.ObjectId;
  notificationId: mongoose.Types.ObjectId;
  readAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const mobileNotificationReadSchema = new Schema<IMobileNotificationRead>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'MobileCustomerAccount',
      required: true,
    },

    notificationId: {
      type: Schema.Types.ObjectId,
      ref: 'mobile_notifications',
      required: true,
    },

    readAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'mobile_notification_reads',
  }
);

/**
 * Một tài khoản chỉ có một trạng thái đọc
 * cho một thông báo.
 */
mobileNotificationReadSchema.index(
  {
    accountId: 1,
    notificationId: 1,
  },
  {
    unique: true,
    name: 'uniq_mobile_notification_read_account_notification',
  }
);

mobileNotificationReadSchema.index(
  {
    accountId: 1,
    readAt: -1,
  },
  {
    name: 'idx_mobile_notification_read_account_read_at',
  }
);

export const MobileNotificationRead: Model<IMobileNotificationRead> =
  (mongoose.models.MobileNotificationRead as Model<IMobileNotificationRead> | undefined) ||
  mongoose.model<IMobileNotificationRead>('MobileNotificationRead', mobileNotificationReadSchema);
