import mongoose, { type Document, Schema } from 'mongoose';

export type MobilePushPlatform = 'android' | 'ios' | 'web';

export interface IMobilePushToken extends Document {
  accountId?: mongoose.Types.ObjectId | null;

  /**
   * Field cũ, giữ tạm để tương thích dữ liệu đã có.
   */
  customerId?: mongoose.Types.ObjectId | null;

  phone: string;
  token: string;
  platform: MobilePushPlatform;

  deviceId?: string | null;
  deviceName?: string | null;
  appVersion?: string | null;
  osVersion?: string | null;

  isActive: boolean;
  lastRegisteredAt?: Date | null;
  deactivatedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const mobilePushTokenSchema = new Schema<IMobilePushToken>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'MobileCustomerAccount',
      default: null,
      index: true,
    },

    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    token: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    platform: {
      type: String,
      enum: ['android', 'ios', 'web'],
      required: true,
    },

    /**
     * Phải dùng cùng ID với refresh session:
     * DeviceSessionService.getDeviceId().
     */
    deviceId: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
      index: true,
    },

    deviceName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    appVersion: {
      type: String,
      trim: true,
      maxlength: 50,
      default: null,
    },

    osVersion: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    lastRegisteredAt: {
      type: Date,
      default: null,
    },

    deactivatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'mobile_push_tokens',
  }
);

mobilePushTokenSchema.index(
  {
    token: 1,
  },
  {
    unique: true,
    name: 'mobile_push_token_unique',
  }
);

mobilePushTokenSchema.index({
  accountId: 1,
  deviceId: 1,
  isActive: 1,
});

mobilePushTokenSchema.index({
  accountId: 1,
  isActive: 1,
  updatedAt: -1,
});

export const MobilePushToken =
  (mongoose.models.MobilePushToken as mongoose.Model<IMobilePushToken> | undefined) ||
  mongoose.model<IMobilePushToken>('MobilePushToken', mobilePushTokenSchema);
