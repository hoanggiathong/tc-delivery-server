import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose';

export type MobileCustomerPlatform = 'android' | 'ios' | 'web' | 'unknown';

export interface IMobileCustomerRefreshToken {
  accountId: Types.ObjectId;
  tokenHash: string;

  deviceId: string;
  platform: MobileCustomerPlatform;
  userAgent?: string | null;
  createdByIp?: string | null;

  expiresAt: Date;
  lastUsedAt?: Date | null;

  revokedAt?: Date | null;
  replacedByTokenId?: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

export type MobileCustomerRefreshTokenDocument = HydratedDocument<IMobileCustomerRefreshToken>;

export type MobileCustomerRefreshTokenModel = Model<IMobileCustomerRefreshToken>;

const mobileCustomerRefreshTokenSchema = new Schema<
  IMobileCustomerRefreshToken,
  MobileCustomerRefreshTokenModel
>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'MobileCustomerAccount',
      required: true,
      index: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },

    deviceId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },

    platform: {
      type: String,
      enum: ['android', 'ios', 'web', 'unknown'],
      default: 'unknown',
      required: true,
    },

    userAgent: {
      type: String,
      trim: true,
      default: null,
      maxlength: 500,
    },

    createdByIp: {
      type: String,
      trim: true,
      default: null,
      maxlength: 100,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    lastUsedAt: {
      type: Date,
      default: null,
    },

    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },

    replacedByTokenId: {
      type: Schema.Types.ObjectId,
      ref: 'MobileCustomerRefreshToken',
      default: null,
    },

    createdAt: {
      type: Date,
    },

    updatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'mobile_customer_refresh_tokens',
  }
);

mobileCustomerRefreshTokenSchema.index(
  {
    tokenHash: 1,
  },
  {
    unique: true,
    name: 'mobile_customer_refresh_token_hash_unique',
  }
);

mobileCustomerRefreshTokenSchema.index({
  accountId: 1,
  deviceId: 1,
  revokedAt: 1,
  expiresAt: -1,
});

mobileCustomerRefreshTokenSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
    name: 'mobile_customer_refresh_token_expiry_ttl',
  }
);

export const MobileCustomerRefreshToken =
  (mongoose.models.MobileCustomerRefreshToken as MobileCustomerRefreshTokenModel | undefined) ||
  mongoose.model<IMobileCustomerRefreshToken, MobileCustomerRefreshTokenModel>(
    'MobileCustomerRefreshToken',
    mobileCustomerRefreshTokenSchema
  );
