import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  _id: string;
  name: string;
  phone: string;
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
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Create compound index for name and phone (both together must be unique)
customerSchema.index({ name: 1, phone: 1 }, { unique: true });

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
