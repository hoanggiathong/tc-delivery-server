import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomerBank extends Document {
  _id: string;
  name: string;
  bankName: string;
  bankAccount: string;
  bankBranch: string;
  bankAddress: string;
  qrCode: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerBankSchema = new Schema<ICustomerBank>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true,
      maxlength: [100, 'Bank name must not exceed 100 characters'],
    },
    bankAccount: {
      type: String,
      required: [true, 'Bank account is required'],
      trim: true,
      maxlength: [50, 'Bank account must not exceed 50 characters'],
    },
    bankBranch: {
      type: String,
      trim: true,
      maxlength: [100, 'Bank branch must not exceed 100 characters'],
    },
    bankAddress: {
      type: String,
      trim: true,
      maxlength: [200, 'Bank address must not exceed 200 characters'],
    },
    qrCode: {
      type: String,
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

// Index for bank account uniqueness
customerBankSchema.index({ bankAccount: 1 }, { unique: true });

// Performance indexes for search
customerBankSchema.index({ name: 'text' }); // Text index for name search
customerBankSchema.index({ bankName: 1 }); // Index for bank name search

export const CustomerBank = mongoose.model<ICustomerBank>(
  'CustomerBank',
  customerBankSchema,
  'customerBank'
);
