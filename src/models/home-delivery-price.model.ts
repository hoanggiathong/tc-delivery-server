import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IHomeDeliveryPrice extends Document {
  _id: string;
  routeId: Types.ObjectId;
  address: string;
  normalizedAddress: string;
  motorbikePrice: number;
  truck05Price: number;
  truck12Price: number;
  deleted: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  lat?: number | null;
  lon?: number | null;
}

const homeDeliveryPriceSchema = new Schema<IHomeDeliveryPrice>(
  {
    routeId: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      required: true,
      index: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedAddress: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    motorbikePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    truck05Price: {
      type: Number,
      default: 0,
      min: 0,
    },
    truck12Price: {
      type: Number,
      default: 0,
      min: 0,
    },
    lat: {
      type: Number,
      default: null,
    },
    lon: {
      type: Number,
      default: null,
    },
    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: _id, _id, ...rest };
      },
    },
  }
);

homeDeliveryPriceSchema.index({ routeId: 1, normalizedAddress: 1, deleted: 1 }, { unique: true });

export const HomeDeliveryPrice = mongoose.model<IHomeDeliveryPrice>(
  'HomeDeliveryPrice',
  homeDeliveryPriceSchema
);
