import mongoose, { Document, Schema } from 'mongoose';

export enum MoneyDeliveryStatus {
  WAITING = 'waiting',
  DONE = 'done',
}

export enum MoneyDeliveryType {
  NORMAL = 'normal', // giao hàng thường
  COLLECT = 'collect', // thu ho
  COLLECT_FOR_CUSTOMER = 'collectForCustomer', // thu dùm
}

export enum TransferType {
  REGULAR = 'regular',
  EXPRESS = 'express',
}

export interface IMoneyDeliveryImage {
  url: string;
  rotate: number;
}

export interface IMoneyDelivery extends Document {
  _id: string;
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
  createdAt: Date;
  updatedAt: Date;
  dateReturn?: Date;
  contentReturn?: string;
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
      default: TransferType.REGULAR,
      required: true,
    },
    isFree: {
      type: Boolean,
      default: false,
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
    status: {
      type: String,
      enum: Object.values(MoneyDeliveryStatus),
      default: MoneyDeliveryStatus.WAITING,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(MoneyDeliveryType),
      default: MoneyDeliveryType.NORMAL,
      required: true,
    },
    deliveryId: {
      type: Schema.Types.ObjectId,
      ref: 'Delivery',
      required: false,
    },
    createdByUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
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
      validate: {
        validator: function (images: IMoneyDeliveryImage[]) {
          return images.length <= 5;
        },
        message: 'Maximum 5 images allowed',
      },
    },
    dateReturn: {
      type: Date,
      default: null,
    },
    contentReturn: {
      type: String,
      default: null,
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

// Pre-save middleware to calculate totalCost based on isFree flag
moneyDeliverySchema.pre('save', async function (next) {
  if (this.isFree) {
    this.totalCost = 0;
  } else {
    // For paid transfers (regular/express), totalCost = sendCost
    this.totalCost = this.sendCost;
  }
  next();
});

// Business logic validation
moneyDeliverySchema.pre('save', function (next) {
  // Validate sender and receiver
  if (this.sender.toString() === this.receiver.toString()) {
    return next(new Error('Sender and receiver cannot be the same'));
  }

  // Validate routes
  if (this.fromRoute.toString() === this.toRoute.toString()) {
    return next(new Error('From route and to route cannot be the same'));
  }

  // Validate deliveryId based on type
  if (
    (this.type === MoneyDeliveryType.COLLECT ||
      this.type === MoneyDeliveryType.COLLECT_FOR_CUSTOMER) &&
    !this.deliveryId
  ) {
    return next(new Error('deliveryId is required when type is "collect" or "collectForCustomer"'));
  }

  if (this.type === MoneyDeliveryType.NORMAL && this.deliveryId) {
    return next(new Error('deliveryId must be null when type is "normal"'));
  }

  // Prevent type changes after creation
  if (!this.isNew && this.isModified('type')) {
    return next(new Error('type field cannot be changed after creation'));
  }

  // Validate status transition (waiting → done only)
  if (this.isModified('status') && !this.isNew) {
    const originalDoc = (this as unknown as { $locals: { originalStatus?: MoneyDeliveryStatus } })
      .$locals;
    if (originalDoc?.originalStatus === MoneyDeliveryStatus.DONE) {
      if (this.status === MoneyDeliveryStatus.WAITING) {
        return next(new Error('Cannot change status from "done" back to "waiting"'));
      }
    }
  }

  next();
});

// Pre-update middleware to calculate totalCost based on transferType
moneyDeliverySchema.pre(['updateOne', 'findOneAndUpdate'], async function (next) {
  const update = this.getUpdate() as Record<string, unknown>;
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

    // Prevent type changes in updates
    if (update.type !== undefined) {
      return next(new Error('type field cannot be changed after creation'));
    }

    // Validate status transition in updates
    if (update.status !== undefined) {
      const doc = await this.model.findOne(this.getQuery());
      if (
        doc &&
        doc.status === MoneyDeliveryStatus.DONE &&
        update.status === MoneyDeliveryStatus.WAITING
      ) {
        return next(new Error('Cannot change status from "done" back to "waiting"'));
      }
    }

    // Validate deliveryId based on type
    if (update.deliveryId !== undefined) {
      const doc = await this.model.findOne(this.getQuery());
      const effectiveType =
        update.type !== undefined ? (update.type as MoneyDeliveryType) : doc?.type;

      if (
        effectiveType &&
        (effectiveType === MoneyDeliveryType.COLLECT ||
          effectiveType === MoneyDeliveryType.COLLECT_FOR_CUSTOMER) &&
        !update.deliveryId
      ) {
        return next(
          new Error('deliveryId is required when type is "collect" or "collectForCustomer"')
        );
      }

      if (effectiveType === MoneyDeliveryType.NORMAL && update.deliveryId) {
        return next(new Error('deliveryId must be null when type is "normal"'));
      }
    }

    // Calculate totalCost based on isFree flag
    if (update.isFree === true) {
      update.totalCost = 0;
    } else if (update.sendCost !== undefined || update.isFree === false) {
      // For paid transfers (regular/express), totalCost = sendCost
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
// Text search indexes for sender and receiver names
moneyDeliverySchema.index({ senderName: 'text' });
moneyDeliverySchema.index({ receiverName: 'text' });

export const MoneyDelivery = mongoose.model<IMoneyDelivery>(
  'MoneyDelivery',
  moneyDeliverySchema,
  'moneyDeliveries'
);
