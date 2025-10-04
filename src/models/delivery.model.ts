import mongoose, { Document, Schema } from 'mongoose';

export interface IDelivery extends Document {
  _id: string;
  code: string;
  fullCode: string;
  subCode: string;
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  fromRoute: mongoose.Types.ObjectId;
  toRoute: mongoose.Types.ObjectId;
  name: string;
  nameProductAndAdditionalInformation: string;
  quantity: number;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number; // Thu hộ
  collectForCustomer: number; // Thu dùm
  collectForCustomerCost: number; // Phụ phí
  collectForCustomerNote?: string;
  details?: {
    weight?: number; // Khối lượng (kg)
    length?: number; // Dài (cm)
    width?: number; // Rộng (cm)
    height?: number; // Cao (cm)
    isOverweight?: boolean; // Quá tải
    convertedWeight?: number; // Khối lượng quy đổi
  };
  notes?: string;
  totalCost: number;
  paymentType: 'paid' | 'debt'; // 'paid' (default), 'debt' (nợ)
  isFree: boolean; // Miễn phí (default false)
  createdByUser: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const deliverySchema = new Schema<IDelivery>(
  {
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
      required: false, // Will be calculated by pre-save middleware
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
    nameProductAndAdditionalInformation: {
      type: String,
      required: [true, 'Item name and additional information is required'],
      trim: true,
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

// Pre-save middleware for totalCost calculation and business logic validation
deliverySchema.pre('save', function (next) {
  // Business logic validation
  if (this.sender.toString() === this.receiver.toString()) {
    return next(new Error('Sender and receiver cannot be the same'));
  }
  if (this.fromRoute.toString() === this.toRoute.toString()) {
    return next(new Error('From route and to route cannot be the same'));
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

    // Only calculate if at least one cost field or isFree is being updated
    if (
      update.cost !== undefined ||
      update.itemCost !== undefined ||
      update.collectCost !== undefined ||
      update.collectForCustomerCost !== undefined ||
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
        const isFree = update.isFree !== undefined ? update.isFree : currentDoc.isFree;

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
deliverySchema.index({ code: 1, fromRoute: 1, toRoute: 1 });
deliverySchema.index({ subCode: 1 });
// Additional unique index for fullCode
deliverySchema.index({ fullCode: 1 }, { unique: true });
deliverySchema.index({ sender: 1, receiver: 1, toRoute: 1 });
deliverySchema.index({ receiver: 1, toRoute: 1 });
// Optimized index for cost report queries
deliverySchema.index({ fromRoute: 1, createdAt: -1 }); // Cost report by route and date

export const Delivery = mongoose.model<IDelivery>('Delivery', deliverySchema);
