import mongoose, { Document, Schema } from 'mongoose';
import { VehicleType } from './delivery.model';

export interface ICustomerAddressHistory extends Document {
  _id: string;
  customerId: mongoose.Types.ObjectId;
  address: string;
  homeDeliveryCost: number;
  carryCost: number;
  homeDeliveryTotalCost: number; // carryCost + homeDeliveryCost
  vehicleType: VehicleType;
  createdAt: Date;
  updatedAt: Date;
}

const customerAddressHistorySchema = new Schema<ICustomerAddressHistory>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [500, 'Address must not exceed 500 characters'],
    },
    homeDeliveryCost: {
      type: Number,
      required: [true, 'Home delivery cost is required'],
      min: [0, 'Home delivery cost must be positive'],
      default: 0,
    },
    carryCost: {
      type: Number,
      required: [true, 'Carry cost is required'],
      min: [0, 'Carry cost must be positive'],
      default: 0,
    },
    homeDeliveryTotalCost: {
      type: Number,
      required: [true, 'Home delivery total cost is required'],
      min: [0, 'Home delivery total cost must be positive'],
    },
    vehicleType: {
      type: String,
      enum: Object.values(VehicleType),
      required: [true, 'Vehicle type is required'],
      default: VehicleType.MOTORBIKE,
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

// Compound index for efficient query + sort (customerId + createdAt DESC)
customerAddressHistorySchema.index({ customerId: 1, createdAt: -1 });

export const CustomerAddressHistory = mongoose.model<ICustomerAddressHistory>(
  'CustomerAddressHistory',
  customerAddressHistorySchema
);
