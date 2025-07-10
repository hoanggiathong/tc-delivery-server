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
  homeDelivery: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  notes?: string;
  createdByUser: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const deliverySchema = new Schema<IDelivery>({
  code: {
    type: String,
    required: [true, 'Delivery code is required'],
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
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  cost: {
    type: Number,
    required: [true, 'Cost is required'],
    min: [0, 'Cost must be positive']
  },
  homeDelivery: {
    type: String,
    required: [true, 'Home delivery address is required'],
    trim: true
  },
  homeDeliveryCost: {
    type: Number,
    required: [true, 'Home delivery cost is required'],
    min: [0, 'Home delivery cost must be positive']
  },
  itemValue: {
    type: Number,
    required: [true, 'Item value is required'],
    min: [0, 'Item value must be positive']
  },
  itemCost: {
    type: Number,
    required: [true, 'Item cost is required'],
    min: [0, 'Item cost must be positive']
  },
  collectCost: {
    type: Number,
    required: [true, 'Collect cost is required'],
    min: [0, 'Collect cost must be positive']
  },
  collectForCustomer: {
    type: Number,
    required: [true, 'Collect for customer amount is required'],
    min: [0, 'Collect for customer amount must be positive'],
    default: 0
  },
  collectForCustomerCost: {
    type: Number,
    required: [true, 'Collect for customer cost is required'],
    min: [0, 'Collect for customer cost must be positive']
  },
  collectForCustomerNote: {
    type: String,
    trim: true
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