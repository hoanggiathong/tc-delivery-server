import mongoose, { Document, Schema } from 'mongoose';

export interface IUserDevice extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  deviceId: string;
  deviceName?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  userAgent?: string;
  currentRouteId?: mongoose.Types.ObjectId | null;
  firstLoginAt: Date;
  lastLoginAt: Date;
  lastActiveAt: Date;
  lastLogoutAt?: Date | null;
  forceLogout: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userDeviceSchema = new Schema<IUserDevice>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    deviceName: {
      type: String,
      trim: true,
      default: '',
    },
    browser: {
      type: String,
      trim: true,
      default: '',
    },
    os: {
      type: String,
      trim: true,
      default: '',
    },
    ipAddress: {
      type: String,
      trim: true,
      default: '',
    },
    userAgent: {
      type: String,
      trim: true,
      default: '',
    },
    currentRouteId: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      default: null,
      index: true,
    },
    firstLoginAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastLoginAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastActiveAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastLogoutAt: {
      type: Date,
      default: null,
    },
    forceLogout: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'userDevices',
  }
);

userDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
userDeviceSchema.index({ lastActiveAt: -1 });
userDeviceSchema.index({ userId: 1, lastActiveAt: -1 });

export const UserDevice = mongoose.model<IUserDevice>('UserDevice', userDeviceSchema);
