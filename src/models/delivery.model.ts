import mongoose, { Document, Schema } from 'mongoose';

export interface IDelivery extends Document {
  _id: string;
  code: string;
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  fromRoute: mongoose.Types.ObjectId;
  toRoute: mongoose.Types.ObjectId;
  name: string;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  notes?: string;
  totalCost: number;
  createdByUser: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const deliverySchema = new Schema<IDelivery>(
  {
    code: {
      type: String,
      required: [true, 'Delivery code is required'],
      unique: true,
      trim: true,
      match: [/^\d{6}\d{4}$/, 'Code must be 10 digits in format DDMMYY + sequence (0001-9999)'],
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
      required: false, // Will be calculated by pre-save middleware
      min: [0, 'Total cost must be positive'],
      default: 0,
    },
    collectForCustomerNote: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdByUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: _id, ...rest };
      },
    },
  }
);

// Pre-save middleware to calculate totalCost
deliverySchema.pre('save', function (next) {
  // Calculate totalCost = cost + homeDeliveryCost + itemCost + collectCost + collectForCustomerCost
  this.totalCost =
    this.cost +
    this.homeDeliveryCost +
    this.itemCost +
    this.collectCost +
    this.collectForCustomerCost;
  next();
});

// Business logic validation
deliverySchema.pre('save', function (next) {
  if (this.sender.toString() === this.receiver.toString()) {
    return next(new Error('Sender and receiver cannot be the same'));
  }
  if (this.fromRoute.toString() === this.toRoute.toString()) {
    return next(new Error('From route and to route cannot be the same'));
  }
  next();
});

// Pre-update middleware to calculate totalCost
deliverySchema.pre(['updateOne', 'findOneAndUpdate'], async function (next) {
  const update = this.getUpdate() as any;
  if (update) {
    // Business logic validation for updates
    if (
      update.sender &&
      update.receiver &&
      update.sender.toString() === update.receiver.toString()
    ) {
      return next(new Error('Sender and receiver cannot be the same'));
    }
    if (
      update.fromRoute &&
      update.toRoute &&
      update.fromRoute.toString() === update.toRoute.toString()
    ) {
      return next(new Error('From route and to route cannot be the same'));
    }

    // Only calculate if at least one cost field is being updated
    if (
      update.cost !== undefined ||
      update.homeDeliveryCost !== undefined ||
      update.itemCost !== undefined ||
      update.collectCost !== undefined ||
      update.collectForCustomerCost !== undefined
    ) {
      // Get current document to merge with updates
      const currentDoc = await this.model.findOne(this.getQuery());
      if (currentDoc) {
        const cost = update.cost !== undefined ? update.cost : currentDoc.cost;
        const homeDeliveryCost =
          update.homeDeliveryCost !== undefined
            ? update.homeDeliveryCost
            : currentDoc.homeDeliveryCost;
        const itemCost = update.itemCost !== undefined ? update.itemCost : currentDoc.itemCost;
        const collectCost =
          update.collectCost !== undefined ? update.collectCost : currentDoc.collectCost;
        const collectForCustomerCost =
          update.collectForCustomerCost !== undefined
            ? update.collectForCustomerCost
            : currentDoc.collectForCustomerCost;

        update.totalCost =
          cost + homeDeliveryCost + itemCost + collectCost + collectForCustomerCost;
      }
    }
  }
  next();
});

// =========================================
// PERFORMANCE INDEXES FOR SCALE (10M+ records)
// =========================================

// 1. Most common query patterns - Single field indexes
deliverySchema.index({ sender: 1 });
deliverySchema.index({ receiver: 1 });
deliverySchema.index({ fromRoute: 1 });
deliverySchema.index({ toRoute: 1 });
deliverySchema.index({ createdByUser: 1 });
deliverySchema.index({ createdAt: -1 }); // Recent first
deliverySchema.index({ fromRoute: 1, toRoute: 1, createdAt: -1 }); // Route analysis
deliverySchema.index({ sender: 1, createdAt: -1 }); // Sender history
deliverySchema.index({ receiver: 1, createdAt: -1 }); // Receiver history
deliverySchema.index({ code: 1, fromRoute: 1, toRoute: 1 }); // For code + route lookup

export const Delivery = mongoose.model<IDelivery>('Delivery', deliverySchema);
