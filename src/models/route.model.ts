import mongoose, { Document, Schema } from 'mongoose';
import {
  PHONE_NUMBER_PATTERN,
  ROUTE_CODE_PATTERN,
  VALIDATION_MESSAGES,
} from '@/utils/validation-patterns';
import { SurchargeUnit, RouteType } from '@/types/route.type';

export interface IRoute extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  name: string;
  address?: string;
  lat?: number | null;
  lon?: number | null;
  distance?: number;
  surcharge?: number;
  surchargeUnit?: SurchargeUnit;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
  type: RouteType;
  parentRouteId?: mongoose.Types.ObjectId | null;
}

const routeSchema = new Schema<IRoute>(
  {
    code: {
      type: String,
      required: [true, 'Code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [ROUTE_CODE_PATTERN, VALIDATION_MESSAGES.ROUTE_CODE],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    address: {
      type: String,
      required: false,
      trim: true,
      maxlength: [200, 'Address must not exceed 200 characters'],
    },
    lat: {
      type: Number,
      required: false,
      default: null,
    },

    lon: {
      type: Number,
      required: false,
      default: null,
    },
    distance: {
      type: Number,
      required: false,
      min: [0, 'Distance must be a positive number'],
      validate: {
        validator: function (v: number) {
          return v === null || v === undefined || v >= 0;
        },
        message: 'Distance must be a positive number',
      },
    },
    surcharge: {
      type: Number,
      required: false,
      min: [0, 'Surcharge must be a positive number'],
      validate: {
        validator: function (v: number) {
          return v === null || v === undefined || v >= 0;
        },
        message: 'Surcharge must be a positive number',
      },
    },
    surchargeUnit: {
      type: String,
      required: false,
      enum: {
        values: Object.values(SurchargeUnit),
        message: 'Surcharge unit must be either "percentage" or "fixed"',
      },
      default: SurchargeUnit.PERCENTAGE,
    },
    phone: {
      type: String,
      required: false,
      trim: true,
      match: [PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER],
    },
    type: {
      type: String,
      enum: Object.values(RouteType),
      default: RouteType.OWNED,
    },

    parentRouteId: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: _id, ...rest };
      },
    },
  }
);

// Index is already created by unique: true in the field definition

export const Route = mongoose.model<IRoute>('Route', routeSchema);
