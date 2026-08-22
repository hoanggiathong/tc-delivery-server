import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose';

export type MobileAppPlatform = 'android' | 'ios';

export interface IMobileAppVersion {
  _id: MobileAppPlatform;
  latestVersion: string;
  latestBuild: number;
  minimumVersion: string;
  minimumBuild: number;
  storeUrl: string;
  message: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type MobileAppVersionDocument = HydratedDocument<IMobileAppVersion>;

const mobileAppVersionSchema = new Schema<IMobileAppVersion>(
  {
    _id: {
      type: String,
      enum: ['android', 'ios'],
      required: true,
    },
    latestVersion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
    },
    latestBuild: {
      type: Number,
      required: true,
      min: 1,
    },
    minimumVersion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
    },
    minimumBuild: {
      type: Number,
      required: true,
      min: 1,
    },
    storeUrl: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    message: {
      type: String,
      default:
        'Đã có phiên bản mới của Gia Phước Express. Vui lòng cập nhật để có trải nghiệm tốt nhất.',
      trim: true,
      maxlength: 500,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: 'mobile_app_versions',
    timestamps: true,
  }
);

/**
 * Dùng chính _id = android | ios làm khóa duy nhất.
 * MongoDB luôn có unique index cho _id nên không phụ thuộc autoIndex
 * của production và không cần migration/index riêng cho config này.
 */
export const MobileAppVersion =
  (mongoose.models.MobileAppVersion as Model<IMobileAppVersion> | undefined) ||
  mongoose.model<IMobileAppVersion>('MobileAppVersion', mobileAppVersionSchema);
