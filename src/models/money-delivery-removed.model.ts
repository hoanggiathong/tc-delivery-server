import mongoose, { Document, Schema } from 'mongoose';
import {
  MoneyDeliveryStatus,
  MoneyDeliveryType,
  TransferType,
  IMoneyDeliveryImage,
} from './money-delivery.model';

export interface IRemovedMoneyDelivery extends Document {
  _id: string;
  // Original money delivery data
  originalMoneyDeliveryId: mongoose.Types.ObjectId;
  code: string;
  fullCode: string;
  subCode: string;
  sender: mongoose.Types.ObjectId;
  senderName: string;
  receiver: mongoose.Types.ObjectId;
  receiverName: string;
  fromRoute: mongoose.Types.ObjectId;
  toRoute: mongoose.Types.ObjectId;
  sendMoneyAmount: number;
  sendCost: number;
  transferType: TransferType;
  isFree: boolean;
  totalCost: number;
  notes?: string;
  status: MoneyDeliveryStatus;
  type: MoneyDeliveryType;
  deliveryId?: mongoose.Types.ObjectId;
  images?: IMoneyDeliveryImage[];
  createdByUser: mongoose.Types.ObjectId;
  originalCreatedAt: Date;
  originalUpdatedAt: Date;
  dateReturn?: Date;
  contentReturn?: string;

  // Removal metadata
  deletedBy: mongoose.Types.ObjectId;
  reason: string;
  deletedAt: Date;
  expiredAt: Date;
}

const removedMoneyDeliverySchema = new Schema<IRemovedMoneyDelivery>(
  {
    // Original money delivery data
    originalMoneyDeliveryId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Original money delivery ID is required'],
    },
    code: {
      type: String,
      required: [true, 'Money delivery code is required'],
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
    senderName: {
      type: String,
      required: [true, 'Sender name is required'],
      trim: true,
      maxlength: [100, 'Sender name must not exceed 100 characters'],
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Receiver is required'],
    },
    receiverName: {
      type: String,
      required: [true, 'Receiver name is required'],
      trim: true,
      maxlength: [100, 'Receiver name must not exceed 100 characters'],
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
    transferType: {
      type: String,
      enum: Object.values(TransferType),
      required: true,
    },
    isFree: {
      type: Boolean,
      required: true,
    },
    totalCost: {
      type: Number,
      required: true,
      min: [0, 'Total cost must be positive'],
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(MoneyDeliveryStatus),
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(MoneyDeliveryType),
      required: true,
    },
    deliveryId: {
      type: Schema.Types.ObjectId,
      ref: 'Delivery',
      required: false,
    },
    images: {
      type: [
        {
          url: {
            type: String,
            required: true,
          },
          rotate: {
            type: Number,
            default: 0,
            enum: [0, 90, 180, 270],
          },
        },
      ],
      default: [],
    },
    createdByUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
    },
    originalCreatedAt: {
      type: Date,
      required: [true, 'Original created date is required'],
    },
    originalUpdatedAt: {
      type: Date,
      required: [true, 'Original updated date is required'],
    },
    dateReturn: {
      type: Date,
      default: null,
    },
    contentReturn: {
      type: String,
      default: null,
    },

    // Removal metadata
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Deleted by user is required'],
    },
    reason: {
      type: String,
      required: [true, 'Deletion reason is required'],
      trim: true,
      maxlength: [500, 'Reason must not exceed 500 characters'],
    },
    deletedAt: {
      type: Date,
      required: [true, 'Deleted date is required'],
      default: Date.now,
    },
    expiredAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: { expireAfterSeconds: 0 }, // TTL index for automatic cleanup
    },
  },
  {
    timestamps: false, // We manage our own timestamps
    collection: 'removedMoneyDeliveries',
    toJSON: {
      transform: function (_doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: _id, ...rest };
      },
    },
  }
);

// Indexes for performance
removedMoneyDeliverySchema.index({ deletedBy: 1, deletedAt: -1 }); // User's deletion history
removedMoneyDeliverySchema.index({ fullCode: 1 }); // Search by fullCode
removedMoneyDeliverySchema.index({ originalMoneyDeliveryId: 1 }); // Reference to original
removedMoneyDeliverySchema.index({ fromRoute: 1, toRoute: 1 }); // Route analysis
removedMoneyDeliverySchema.index({ deletedAt: -1 }); // Recent deletions

export const RemovedMoneyDelivery = mongoose.model<IRemovedMoneyDelivery>(
  'RemovedMoneyDelivery',
  removedMoneyDeliverySchema
);
