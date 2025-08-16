import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface for delivery counter document
 */
export interface IDeliveryCounter extends Document {
  _id: mongoose.Types.ObjectId;
  datePrefix: string; // DDMMYY format
  toRoute: mongoose.Types.ObjectId;
  deliverySequence: number; // Current sequence for deliveries
  moneyDeliverySequence: number; // Current sequence for money deliveries
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for delivery counter
 * This table ensures atomic sequence generation for delivery codes
 */
const deliveryCounterSchema = new Schema<IDeliveryCounter>(
  {
    datePrefix: {
      type: String,
      required: [true, 'Date prefix is required'],
      match: [/^\d{6}$/, 'Date prefix must be 6 digits (DDMMYY)'],
    },
    toRoute: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'Route reference is required'],
      index: true,
    },
    deliverySequence: {
      type: Number,
      default: 0,
      min: [0, 'Delivery sequence cannot be negative'],
      max: [9999, 'Maximum 9999 deliveries per day per route'],
    },
    moneyDeliverySequence: {
      type: Number,
      default: 0,
      min: [0, 'Money delivery sequence cannot be negative'],
      max: [9999, 'Maximum 9999 money deliveries per day per route'],
    },
  },
  {
    timestamps: true,
    collection: 'deliveryCounters',
  }
);

// Compound unique index to ensure one counter per date-route combination
deliveryCounterSchema.index({ datePrefix: 1, toRoute: 1 }, { unique: true });

// TTL index - MongoDB automatically deletes documents after 90 days
deliveryCounterSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const DeliveryCounter = mongoose.model<IDeliveryCounter>(
  'DeliveryCounter',
  deliveryCounterSchema
);
