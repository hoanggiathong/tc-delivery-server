import mongoose, { Document, Schema } from 'mongoose';

export interface IMoneyDelivery extends Document {
  _id: string;
  code: string;
  fullCode: string;
  subCode: string;
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  fromRoute: mongoose.Types.ObjectId;
  toRoute: mongoose.Types.ObjectId;
  sendMoneyAmount: number;
  sendCost: number;
  sendFee: number;
  transferType: 'regular' | 'express' | 'free';
  totalCost: number;
  notes?: string;
  createdByUser: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const moneyDeliverySchema = new Schema<IMoneyDelivery>(
  {
    code: {
      type: String,
      required: [true, 'Money delivery code is required'],
      trim: true,
      match: [/^\d{6}\d{4}$/, 'Code must be 10 digits in format YYMMDD + sequence (0001-9999)'],
    },
    fullCode: {
      type: String,
      required: [true, 'Full code is required'],
      unique: true,
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
    sendMoneyAmount: {
      type: Number,
      required: [true, 'Send money amount is required'],
      min: [0, 'Send money amount must be positive'],
    },
    sendCost: {
      type: Number,
      required: [true, 'Send cost is required'],
      min: [0, 'Send cost must be positive'],
    },
    sendFee: {
      type: Number,
      required: false,
      min: [0, 'Send fee must be positive'],
      default: 0,
    },
    transferType: {
      type: String,
      enum: ['regular', 'express', 'free'],
      default: 'regular',
      required: true,
    },
    totalCost: {
      type: Number,
      required: false, // Will be calculated by pre-save middleware
      min: [0, 'Total cost must be positive'],
      default: 0,
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

// Pre-save middleware to calculate sendFee and totalCost based on transferType
moneyDeliverySchema.pre('save', async function (next) {
  if (this.transferType === 'free') {
    this.sendFee = 0;
    this.totalCost = 0;
  } else {
    // For regular and express, sendFee will be calculated in service layer
    // based on shipping rates configuration
    this.totalCost = this.sendCost;
  }
  next();
});

// Business logic validation
moneyDeliverySchema.pre('save', function (next) {
  if (this.sender.toString() === this.receiver.toString()) {
    return next(new Error('Sender and receiver cannot be the same'));
  }
  if (this.fromRoute.toString() === this.toRoute.toString()) {
    return next(new Error('From route and to route cannot be the same'));
  }
  next();
});

// Pre-update middleware to calculate totalCost based on transferType
moneyDeliverySchema.pre(['updateOne', 'findOneAndUpdate'], async function (next) {
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

    // Calculate totalCost based on transferType
    if (update.transferType === 'free') {
      update.sendFee = 0;
      update.totalCost = 0;
    } else if (update.sendCost !== undefined || update.transferType !== undefined) {
      // For regular and express, sendFee should be calculated in service layer
      // totalCost = sendCost for now
      if (update.sendCost !== undefined) {
        update.totalCost = update.sendCost;
      }
    }
  }
  next();
});

// =========================================
// PERFORMANCE INDEXES FOR SCALE (10M+ records)
// =========================================

// 1. Most common query patterns - Single field indexes
moneyDeliverySchema.index({ sender: 1 });
moneyDeliverySchema.index({ receiver: 1 });
moneyDeliverySchema.index({ fromRoute: 1 });
moneyDeliverySchema.index({ toRoute: 1 });
moneyDeliverySchema.index({ createdByUser: 1 });
moneyDeliverySchema.index({ createdAt: -1 }); // Recent first

// 3. Compound indexes for common filter combinations
moneyDeliverySchema.index({ fromRoute: 1, toRoute: 1, createdAt: -1 }); // Route analysis
moneyDeliverySchema.index({ sender: 1, createdAt: -1 }); // Sender history
moneyDeliverySchema.index({ receiver: 1, createdAt: -1 }); // Receiver history

// 7. Code-based queries optimization
moneyDeliverySchema.index({ code: 1, fromRoute: 1, toRoute: 1 }); // For code + route lookup
moneyDeliverySchema.index({ subCode: 1 });
// Additional unique index for fullCode
moneyDeliverySchema.index({ fullCode: 1 }, { unique: true });

export const MoneyDelivery = mongoose.model<IMoneyDelivery>('MoneyDelivery', moneyDeliverySchema);
