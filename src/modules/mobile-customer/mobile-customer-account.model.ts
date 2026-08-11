import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export enum MobileCustomerDeletionStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

export interface IMobileCustomerAccount {
  phone: string;
  name: string;
  passwordHash: string;

  email?: string | null;
  avatar?: string | null;

  isActive: boolean;

  phoneVerifiedAt?: Date | null;
  acceptedTermsAt?: Date | null;
  lastLoginAt?: Date | null;

  deletionStatus: MobileCustomerDeletionStatus;
  deletionRequestedAt?: Date | null;
  scheduledDeletionAt?: Date | null;
  deletionProcessingAt?: Date | null;
  deletedAt?: Date | null;
  deletionReason?: string | null;

  /** Database chỉ lưu SHA-256 của deletion token. */
  deletionRequestTokenHash?: string | null;
  deletionRequestTokenExpiresAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type MobileCustomerAccountDocument = HydratedDocument<IMobileCustomerAccount>;

export type MobileCustomerAccountModel = Model<IMobileCustomerAccount>;

const mobileCustomerAccountSchema = new Schema<IMobileCustomerAccount, MobileCustomerAccountModel>(
  {
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    avatar: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    phoneVerifiedAt: {
      type: Date,
      default: null,
    },
    acceptedTermsAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    deletionStatus: {
      type: String,
      enum: Object.values(MobileCustomerDeletionStatus),
      required: true,
      default: MobileCustomerDeletionStatus.NONE,
      index: true,
    },
    deletionRequestedAt: {
      type: Date,
      default: null,
    },
    scheduledDeletionAt: {
      type: Date,
      default: null,
      index: true,
    },
    deletionProcessingAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletionReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },
    deletionRequestTokenHash: {
      type: String,
      trim: true,
      maxlength: 64,
      default: null,
      select: false,
    },
    deletionRequestTokenExpiresAt: {
      type: Date,
      default: null,
    },
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'mobile_customer_accounts',
    toJSON: {
      transform: (_doc, ret) => {
        const result = ret as Record<string, unknown>;
        result.id = String(result._id);
        delete result._id;
        delete result.__v;
        delete result.passwordHash;
        delete result.deletionRequestTokenHash;
        return result;
      },
    },
  }
);

mobileCustomerAccountSchema.index(
  { phone: 1 },
  {
    unique: true,
    name: 'mobile_customer_account_phone_unique',
  }
);

mobileCustomerAccountSchema.index({
  isActive: 1,
  createdAt: -1,
});

mobileCustomerAccountSchema.index({
  deletionStatus: 1,
  scheduledDeletionAt: 1,
  deletionProcessingAt: 1,
});

mobileCustomerAccountSchema.index(
  { deletionRequestTokenHash: 1 },
  {
    unique: true,
    name: 'mobile_customer_account_deletion_token_unique',
    partialFilterExpression: {
      deletionRequestTokenHash: { $type: 'string' },
    },
  }
);

export const MobileCustomerAccount =
  (mongoose.models.MobileCustomerAccount as MobileCustomerAccountModel | undefined) ||
  mongoose.model<IMobileCustomerAccount, MobileCustomerAccountModel>(
    'MobileCustomerAccount',
    mobileCustomerAccountSchema
  );
