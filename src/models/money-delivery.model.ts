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

// =========================================
// PERFORMANCE INDEXES FOR SCALE (10M+ records)
// =========================================

// 1. Most common query patterns - Single field indexes
moneyDeliverySchema.index({ code: 1 }); // High priority for code lookup
moneyDeliverySchema.index({ sender: 1 });
moneyDeliverySchema.index({ receiver: 1 });
moneyDeliverySchema.index({ fromRoute: 1 });
moneyDeliverySchema.index({ toRoute: 1 });
moneyDeliverySchema.index({ createdByUser: 1 });

// 2. Time-based queries (very important for large datasets)
moneyDeliverySchema.index({ createdAt: -1 }); // Recent first
moneyDeliverySchema.index({ updatedAt: -1 });

// 3. Compound indexes for common filter combinations
moneyDeliverySchema.index({ fromRoute: 1, toRoute: 1, createdAt: -1 }); // Route analysis
moneyDeliverySchema.index({ sender: 1, createdAt: -1 }); // Sender history
moneyDeliverySchema.index({ receiver: 1, createdAt: -1 }); // Receiver history
moneyDeliverySchema.index({ createdByUser: 1, createdAt: -1 }); // User activity

// 4. Money amount analysis indexes
moneyDeliverySchema.index({ sendMoneyAmount: 1 });
moneyDeliverySchema.index({ sendCost: 1 });

// 5. Route pair analysis (for business intelligence)
moneyDeliverySchema.index({ fromRoute: 1, toRoute: 1 });

// 6. Date range queries optimization
moneyDeliverySchema.index({ createdAt: -1, fromRoute: 1 });
moneyDeliverySchema.index({ createdAt: -1, toRoute: 1 });

// 7. Code-based queries optimization
moneyDeliverySchema.index({ code: 1, fromRoute: 1, toRoute: 1 }); // For code + route lookup

export const MoneyDelivery = mongoose.model<IMoneyDelivery>('MoneyDelivery', moneyDeliverySchema);