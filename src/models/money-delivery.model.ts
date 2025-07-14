import mongoose, { Document, Schema } from 'mongoose';

export interface IMoneyDelivery extends Document {
  _id: string;
  code: string;
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  fromRoute: mongoose.Types.ObjectId;
  toRoute: mongoose.Types.ObjectId;
  sendMoneyAmount: number;
  sendCost: number;
  totalCost: number;
  notes?: string;
  createdByUser: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const moneyDeliverySchema = new Schema<IMoneyDelivery>({
  code: {
    type: String,
    required: [true, 'Money delivery code is required'],
    unique: true,
    trim: true,
    match: [/^\d{10}$/, 'Code must be 10 digits in format DDMMYY + sequence (0001-9999)']
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Sender is required']
  },
  receiver: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Receiver is required']
  },
  fromRoute: {
    type: Schema.Types.ObjectId,
    ref: 'Route',
    required: [true, 'From route is required']
  },
  toRoute: {
    type: Schema.Types.ObjectId,
    ref: 'Route',
    required: [true, 'To route is required']
  },
  sendMoneyAmount: {
    type: Number,
    required: [true, 'Send money amount is required'],
    min: [0, 'Send money amount must be positive']
  },
  sendCost: {
    type: Number,
    required: [true, 'Send cost is required'],
    min: [0, 'Send cost must be positive']
  },
  totalCost: {
    type: Number,
    required: false, // Will be calculated by pre-save middleware
    min: [0, 'Total cost must be positive'],
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  createdByUser: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Pre-save middleware to calculate totalCost
moneyDeliverySchema.pre('save', function(next) {
  this.totalCost = this.sendCost;
  next();
});

// Pre-update middleware to calculate totalCost
moneyDeliverySchema.pre(['updateOne', 'findOneAndUpdate'], async function(next) {
  const update = this.getUpdate() as any;
  if (update) {
    // Only calculate if sendCost is being updated
    if (update.sendCost !== undefined) {
      update.totalCost = update.sendCost;
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

export const MoneyDelivery = mongoose.model<IMoneyDelivery>('MoneyDelivery', moneyDeliverySchema);