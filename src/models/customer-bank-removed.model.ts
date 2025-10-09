import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomerBankRemoved extends Document {
  _id: string;
  name: string;
  bankName: string;
  bankAccount: string;
  bankBranch: string;
  bankAddress: string;
  qrCodeUrl: string;
  createdAt: Date;
  updatedAt: Date;

  // Removal metadata
  customerId: mongoose.Types.ObjectId;
  deletedBy: mongoose.Types.ObjectId;
  deletedAt: Date;
  expiredAt: Date;
}

const customerBankRemovedSchema = new Schema<ICustomerBankRemoved>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true,
    },
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
    qrCodeUrl: {
      type: String,
      trim: true,
      default: '',
    },

    // Removal metadata
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Deleted by user is required'],
      index: true,
    },
    deletedAt: {
      type: Date,
      required: [true, 'Deleted date is required'],
      default: Date.now,
      index: true,
    },
    expiredAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: { expireAfterSeconds: 0 }, // TTL index for automatic cleanup
    },
  },
  {
    timestamps: true,
    collection: 'customerBankRemoved',
    toJSON: {
      transform: function (_doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: _id, ...rest };
      },
    },
  }
);

// Index for bank account uniqueness
customerBankRemovedSchema.index({ bankAccount: 1 }, { unique: true });

// Performance indexes for search
customerBankRemovedSchema.index({ name: 'text' }); // Text index for name search
customerBankRemovedSchema.index({ bankName: 1 }); // Index for bank name search

export const CustomerBankRemoved = mongoose.model<ICustomerBankRemoved>(
  'CustomerBankRemoved',
  customerBankRemovedSchema,
  'customerBankRemoved'
);
