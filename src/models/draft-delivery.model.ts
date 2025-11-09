import mongoose, { Document, Schema } from 'mongoose';
import { PaymentType } from '@/types';
import { VehicleType } from './delivery.model';

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
  quantity: number;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  carryCost: number;
  homeDeliveryCostTotal?: number;
  vehicleType?: VehicleType; // Loại phương tiện (required when homeDeliveryCost > 0)
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
  paymentType: PaymentType;
  isFree: boolean;
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
    carryCost: {
      type: Number,
      required: false,
      min: [0, 'Carry cost must be positive'],
      default: 0,
    },
    homeDeliveryCostTotal: {
      type: Number,
      required: false,
      min: [0, 'Home delivery total cost must be positive'],
    },
    vehicleType: {
      type: String,
      enum: Object.values(VehicleType),
      required: false,
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
      default: 'paid',
      required: true,
    },
    isFree: {
      type: Boolean,
      default: false,
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
      transform: function (_doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: _id, ...rest };
      },
    },
  }
);

// Pre-save middleware for totalCost calculation
draftDeliverySchema.pre('save', function (next) {
  // Validation: homeDelivery is required when carryCost or homeDeliveryCost > 0
  if (
    (this.carryCost > 0 || this.homeDeliveryCost > 0) &&
    (!this.homeDelivery || this.homeDelivery.trim() === '')
  ) {
    return next(
      new Error('homeDelivery is required when carryCost or homeDeliveryCost is greater than 0')
    );
  }

  // Validation: vehicleType is required when homeDelivery has value
  if (this.homeDelivery && this.homeDelivery.trim() !== '' && !this.vehicleType) {
    return next(new Error('vehicleType is required when homeDelivery is provided'));
  }

  // Calculate homeDeliveryCostTotal
  if (this.homeDelivery && this.homeDelivery.trim() !== '') {
    this.homeDeliveryCostTotal = this.carryCost + this.homeDeliveryCost;
  } else {
    this.homeDeliveryCostTotal = undefined;
  }

  // Calculate totalCost: if isFree, then 0; otherwise cost + itemCost + collectForCustomerCost
  if (this.isFree) {
    this.totalCost = 0;
  } else {
    this.totalCost = this.cost + this.itemCost + this.collectForCustomerCost;
  }
  next();
});

// Pre-update middleware to calculate totalCost
draftDeliverySchema.pre(['updateOne', 'findOneAndUpdate'], async function (next) {
  const update = this.getUpdate() as any;
  if (update) {
    // Only calculate if at least one cost field or isFree is being updated
    if (
      update.cost !== undefined ||
      update.itemCost !== undefined ||
      update.collectForCustomerCost !== undefined ||
      update.carryCost !== undefined ||
      update.homeDeliveryCost !== undefined ||
      update.homeDelivery !== undefined ||
      update.isFree !== undefined
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
        const carryCost = update.carryCost !== undefined ? update.carryCost : currentDoc.carryCost;
        const homeDeliveryCost =
          update.homeDeliveryCost !== undefined
            ? update.homeDeliveryCost
            : currentDoc.homeDeliveryCost;
        const homeDelivery =
          update.homeDelivery !== undefined ? update.homeDelivery : currentDoc.homeDelivery;
        const vehicleType =
          update.vehicleType !== undefined ? update.vehicleType : currentDoc.vehicleType;
        const isFree = update.isFree !== undefined ? update.isFree : currentDoc.isFree;

        // Validation: homeDelivery is required when carryCost or homeDeliveryCost > 0
        if (
          (carryCost > 0 || homeDeliveryCost > 0) &&
          (!homeDelivery || homeDelivery.trim() === '')
        ) {
          return next(
            new Error(
              'homeDelivery is required when carryCost or homeDeliveryCost is greater than 0'
            )
          );
        }

        // Validation: vehicleType is required when homeDelivery has value
        if (homeDelivery && homeDelivery.trim() !== '' && !vehicleType) {
          return next(new Error('vehicleType is required when homeDelivery is provided'));
        }

        // Calculate homeDeliveryCostTotal
        if (homeDelivery && homeDelivery.trim() !== '') {
          update.homeDeliveryCostTotal = carryCost + homeDeliveryCost;
        } else {
          update.homeDeliveryCostTotal = undefined;
        }

        // Calculate totalCost: if isFree, then 0; otherwise cost + itemCost + collectForCustomerCost
        if (isFree) {
          update.totalCost = 0;
        } else {
          update.totalCost = cost + itemCost + collectForCustomerCost;
        }
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
