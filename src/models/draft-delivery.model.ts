import mongoose, { Document, Schema } from 'mongoose';

export interface IDraftDelivery extends Document {
  _id: string;
  // No code field - drafts don't have codes
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
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
  paymentType: 'paid' | 'debt' | 'free';
  createdByUser: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const draftDeliverySchema = new Schema<IDraftDelivery>(
  {
    // Draft info - not using references to allow flexibility
    senderName: {
      type: String,
      required: [true, 'Sender name is required'],
      trim: true,
    },
    senderPhone: {
      type: String,
      required: [true, 'Sender phone is required'],
      trim: true,
    },
    receiverName: {
      type: String,
      required: [true, 'Receiver name is required'],
      trim: true,
    },
    receiverPhone: {
      type: String,
      required: [true, 'Receiver phone is required'],
      trim: true,
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
      default: 0,
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
      default: 0,
    },
    itemCost: {
      type: Number,
      required: [true, 'Item cost is required'],
      min: [0, 'Item cost must be positive'],
      default: 0,
    },
    collectCost: {
      type: Number,
      required: [true, 'Collect cost is required'],
      min: [0, 'Collect cost must be positive'],
      default: 0,
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
      default: 0,
    },
    totalCost: {
      type: Number,
      required: false,
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
    paymentType: {
      type: String,
      enum: ['paid', 'debt', 'free'],
      default: 'paid',
      required: true,
    },
    createdByUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
    },
  },
  {
    timestamps: true,
    collection: 'draftDelivery',
    toJSON: {
      transform: function (doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: _id, ...rest };
      },
    },
  }
);

// Pre-save middleware for totalCost calculation
draftDeliverySchema.pre('save', function (next) {
  // Calculate totalCost = cost + itemCost + collectForCustomerCost
  this.totalCost = this.cost + this.itemCost + this.collectForCustomerCost;
  next();
});

// Pre-update middleware to calculate totalCost
draftDeliverySchema.pre(['updateOne', 'findOneAndUpdate'], async function (next) {
  const update = this.getUpdate() as any;
  if (update) {
    // Only calculate if at least one cost field is being updated
    if (
      update.cost !== undefined ||
      update.itemCost !== undefined ||
      update.collectForCustomerCost !== undefined
    ) {
      // Get current document to merge with updates
      const currentDoc = await this.model.findOne(this.getQuery());
      if (currentDoc) {
        const cost = update.cost !== undefined ? update.cost : currentDoc.cost;
        const itemCost = update.itemCost !== undefined ? update.itemCost : currentDoc.itemCost;
        const collectForCustomerCost =
          update.collectForCustomerCost !== undefined
            ? update.collectForCustomerCost
            : currentDoc.collectForCustomerCost;

        // Calculate totalCost
        update.totalCost = cost + itemCost + collectForCustomerCost;
      }
    }
  }
  next();
});

// Indexes for performance
draftDeliverySchema.index({ fromRoute: 1, createdByUser: 1, createdAt: -1 }); // Main query pattern
draftDeliverySchema.index({ createdByUser: 1, createdAt: -1 }); // User's drafts
draftDeliverySchema.index({ fromRoute: 1, createdAt: -1 }); // Route-based queries

// TTL index to auto-delete old drafts after 90 days
draftDeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const DraftDelivery = mongoose.model<IDraftDelivery>('DraftDelivery', draftDeliverySchema);
