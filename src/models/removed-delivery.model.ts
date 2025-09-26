import mongoose, { Document, Schema } from 'mongoose';

export interface IRemovedDelivery extends Document {
  _id: string;
  // Original delivery data
  originalDeliveryId: mongoose.Types.ObjectId;
  code: string;
  fullCode: string;
  subCode: string;
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  fromRoute: mongoose.Types.ObjectId;
  toRoute: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  details?: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    isOverweight?: boolean;
    convertedWeight?: number;
  };
  notes?: string;
  totalCost: number;
  paymentType: 'paid' | 'debt';
  isFree: boolean;
  createdByUser: mongoose.Types.ObjectId;
  originalCreatedAt: Date;
  originalUpdatedAt: Date;

  // Removal metadata
  deletedBy: mongoose.Types.ObjectId;
  reason: string;
  deletedAt: Date;
  expiredAt: Date;
}

const removedDeliverySchema = new Schema<IRemovedDelivery>(
  {
    // Original delivery data
    originalDeliveryId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Original delivery ID is required'],
      index: true,
    },
    code: {
      type: String,
      required: [true, 'Delivery code is required'],
      trim: true,
      match: [/^\d{6}\d{4}$/, 'Code must be 10 digits in format YYMMDD + sequence (0001-9999)'],
    },
    fullCode: {
      type: String,
      required: [true, 'Full code is required'],
      trim: true,
      index: true,
    },
    subCode: {
      type: String,
      required: [true, 'Sub code is required'],
      trim: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Sender is required'],
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Receiver is required'],
    },
    fromRoute: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'From route is required'],
    },
    toRoute: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'To route is required'],
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    cost: {
      type: Number,
      required: [true, 'Cost is required'],
      min: [0, 'Cost must be positive'],
    },
    homeDelivery: {
      type: String,
      required: false,
      trim: true,
    },
    homeDeliveryCost: {
      type: Number,
      required: [true, 'Home delivery cost is required'],
      min: [0, 'Home delivery cost must be positive'],
      default: 0,
    },
    itemValue: {
      type: Number,
      required: [true, 'Item value is required'],
      min: [0, 'Item value must be positive'],
    },
    itemCost: {
      type: Number,
      required: [true, 'Item cost is required'],
      min: [0, 'Item cost must be positive'],
    },
    collectCost: {
      type: Number,
      required: [true, 'Collect cost is required'],
      min: [0, 'Collect cost must be positive'],
    },
    collectForCustomer: {
      type: Number,
      required: [true, 'Collect for customer amount is required'],
      min: [0, 'Collect for customer amount must be positive'],
      default: 0,
    },
    collectForCustomerCost: {
      type: Number,
      required: [true, 'Collect for customer cost is required'],
      min: [0, 'Collect for customer cost must be positive'],
    },
    totalCost: {
      type: Number,
      required: true,
      min: [0, 'Total cost must be positive'],
    },
    collectForCustomerNote: {
      type: String,
      trim: true,
    },
    details: {
      type: {
        weight: {
          type: Number,
          min: [0, 'Weight must be positive'],
        },
        length: {
          type: Number,
          min: [0, 'Length must be positive'],
        },
        width: {
          type: Number,
          min: [0, 'Width must be positive'],
        },
        height: {
          type: Number,
          min: [0, 'Height must be positive'],
        },
        isOverweight: {
          type: Boolean,
          default: false,
        },
        convertedWeight: {
          type: Number,
          min: [0, 'Converted weight must be positive'],
        },
      },
      required: false,
    },
    notes: {
      type: String,
      trim: true,
    },
    paymentType: {
      type: String,
      enum: ['paid', 'debt'],
      required: true,
    },
    isFree: {
      type: Boolean,
      required: true,
    },
    createdByUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
    },
    originalCreatedAt: {
      type: Date,
      required: [true, 'Original created date is required'],
    },
    originalUpdatedAt: {
      type: Date,
      required: [true, 'Original updated date is required'],
    },

    // Removal metadata
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Deleted by user is required'],
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'Deletion reason is required'],
      trim: true,
      maxlength: [500, 'Reason must not exceed 500 characters'],
    },
    deletedAt: {
      type: Date,
      required: [true, 'Deleted date is required'],
      default: Date.now,
      index: true,
    },
    expiredAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: { expireAfterSeconds: 0 }, // TTL index for automatic cleanup
    },
  },
  {
    timestamps: false, // We manage our own timestamps
    toJSON: {
      transform: function (_doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: _id, ...rest };
      },
    },
  }
);

// Indexes for performance
removedDeliverySchema.index({ deletedBy: 1, deletedAt: -1 }); // User's deletion history
removedDeliverySchema.index({ fullCode: 1 }); // Search by fullCode
removedDeliverySchema.index({ originalDeliveryId: 1 }); // Reference to original
removedDeliverySchema.index({ fromRoute: 1, toRoute: 1 }); // Route analysis
removedDeliverySchema.index({ deletedAt: -1 }); // Recent deletions

export const RemovedDelivery = mongoose.model<IRemovedDelivery>(
  'RemovedDelivery',
  removedDeliverySchema
);
