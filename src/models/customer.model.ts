import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICustomer extends Document {
  _id: string;
  name: string;
  phone: string;
  routeId: Types.ObjectId;
  relativeReceiver: Array<Types.ObjectId>;
  type: 'delivery' | 'money';
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'],
    },
    routeId: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'From route is required'],
    },
    relativeReceiver: {
      type: [Schema.Types.ObjectId],
      ref: 'Customer',
      default: [],
    },
    type: {
      type: String,
      enum: ['delivery', 'money'],
      default: 'delivery',
      required: true,
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

// Create compound index for phone and type (both together must be unique)
customerSchema.index({ phone: 1, type: 1 }, { unique: true });

// Performance indexes for frequent customer search
customerSchema.index({ name: 'text' }); // Text index for name search
customerSchema.index({ phone: 1 }); // Single field index for exact phone match

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
