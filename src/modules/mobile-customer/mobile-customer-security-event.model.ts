import mongoose, { type Document, Schema, type Types } from 'mongoose';

export enum MobileCustomerSecurityEventType {
  ACCOUNT_REGISTERED = 'ACCOUNT_REGISTERED',
  LOGIN_PASSWORD_SUCCESS = 'LOGIN_PASSWORD_SUCCESS',
  LOGIN_PASSWORD_FAILED = 'LOGIN_PASSWORD_FAILED',
  LOGIN_OTP_SUCCESS = 'LOGIN_OTP_SUCCESS',
  NEW_DEVICE_LOGIN = 'NEW_DEVICE_LOGIN',
  LOGOUT = 'LOGOUT',
  SESSION_REVOKED = 'SESSION_REVOKED',
  LOGOUT_OTHER_DEVICES = 'LOGOUT_OTHER_DEVICES',
  LOGOUT_ALL = 'LOGOUT_ALL',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ACCOUNT_DELETION_REQUESTED = 'ACCOUNT_DELETION_REQUESTED',
  ACCOUNT_DELETION_CANCELLED = 'ACCOUNT_DELETION_CANCELLED',
  ACCOUNT_DELETION_COMPLETED = 'ACCOUNT_DELETION_COMPLETED',
}

export type MobileCustomerSecurityPlatform = 'android' | 'ios' | 'web' | 'unknown';

export interface IMobileCustomerSecurityEvent extends Document {
  accountId: Types.ObjectId;
  type: MobileCustomerSecurityEventType;

  deviceId?: string | null;
  targetDeviceId?: string | null;

  /**
   * Chỉ dùng cho các sự kiện cần chống tạo trùng.
   */
  eventKey?: string;

  platform: MobileCustomerSecurityPlatform;
  deviceName: string;

  /**
   * Chỉ lưu địa chỉ đã che bớt để giảm dữ liệu nhạy cảm.
   */
  ipAddress?: string | null;

  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;

  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const mobileCustomerSecurityEventSchema = new Schema<IMobileCustomerSecurityEvent>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'MobileCustomerAccount',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: Object.values(MobileCustomerSecurityEventType),
      required: true,
      index: true,
    },

    deviceId: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    targetDeviceId: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    /**
     * Không đặt default null để sparse unique
     * bỏ qua các sự kiện thông thường.
     */
    eventKey: {
      type: String,
      trim: true,
      maxlength: 300,
      required: false,
    },

    platform: {
      type: String,
      enum: ['android', 'ios', 'web', 'unknown'],
      required: true,
      default: 'unknown',
    },

    deviceName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      default: 'Thiết bị',
    },

    ipAddress: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'mobile_customer_security_events',
  }
);

mobileCustomerSecurityEventSchema.index({
  accountId: 1,
  createdAt: -1,
});

mobileCustomerSecurityEventSchema.index({
  accountId: 1,
  deviceId: 1,
  type: 1,
  createdAt: -1,
});

mobileCustomerSecurityEventSchema.index(
  {
    eventKey: 1,
  },
  {
    unique: true,
    sparse: true,
    name: 'mobile_customer_security_event_key_unique',
  }
);

mobileCustomerSecurityEventSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
    name: 'mobile_customer_security_event_ttl',
  }
);

export const MobileCustomerSecurityEvent =
  (mongoose.models.MobileCustomerSecurityEvent as
    | mongoose.Model<IMobileCustomerSecurityEvent>
    | undefined) ||
  mongoose.model<IMobileCustomerSecurityEvent>(
    'MobileCustomerSecurityEvent',
    mobileCustomerSecurityEventSchema
  );
