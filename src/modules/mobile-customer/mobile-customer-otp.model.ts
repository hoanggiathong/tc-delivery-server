import mongoose, { Document, Schema } from 'mongoose';

export enum MobileCustomerOtpPurpose {
  REGISTER = 'REGISTER',
  LOGIN = 'LOGIN',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  ACCOUNT_DELETION = 'ACCOUNT_DELETION',
  ACCOUNT_DELETION_CANCEL = 'ACCOUNT_DELETION_CANCEL',
}

export enum MobileCustomerOtpProviderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export interface IMobileCustomerOtp extends Document {
  phone: string;
  purpose: MobileCustomerOtpPurpose;
  otpHash: string;
  expiresAt: Date;
  resendAvailableAt: Date;
  attempts: number;
  maxAttempts: number;
  usedAt?: Date | null;
  invalidatedAt?: Date | null;
  providerStatus: MobileCustomerOtpProviderStatus;
  providerMessageId?: string | null;
  providerErrorCode?: string | null;
  providerErrorMessage?: string | null;
  providerResponse?: Record<string, unknown> | null;
  requestIp?: string | null;
  purgeAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const mobileCustomerOtpSchema = new Schema<IMobileCustomerOtp>(
  {
    phone: { type: String, required: true, trim: true, index: true },
    purpose: {
      type: String,
      enum: Object.values(MobileCustomerOtpPurpose),
      required: true,
      index: true,
    },
    otpHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, index: true },
    resendAvailableAt: { type: Date, required: true },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, required: true, min: 1 },
    usedAt: { type: Date, default: null, index: true },
    invalidatedAt: { type: Date, default: null, index: true },
    providerStatus: {
      type: String,
      enum: Object.values(MobileCustomerOtpProviderStatus),
      default: MobileCustomerOtpProviderStatus.PENDING,
      required: true,
      index: true,
    },
    providerMessageId: { type: String, default: null },
    providerErrorCode: { type: String, default: null },
    providerErrorMessage: { type: String, default: null },
    providerResponse: { type: Schema.Types.Mixed, default: null },
    requestIp: { type: String, default: null },
    purgeAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    collection: 'mobile_customer_otps',
  }
);

mobileCustomerOtpSchema.index({ phone: 1, purpose: 1, createdAt: -1 });
mobileCustomerOtpSchema.index({ requestIp: 1, createdAt: -1 });
mobileCustomerOtpSchema.index(
  { purgeAt: 1 },
  { expireAfterSeconds: 0, name: 'mobile_customer_otp_purge_ttl' }
);

export const MobileCustomerOtp =
  (mongoose.models.MobileCustomerOtp as mongoose.Model<IMobileCustomerOtp> | undefined) ||
  mongoose.model<IMobileCustomerOtp>('MobileCustomerOtp', mobileCustomerOtpSchema);
