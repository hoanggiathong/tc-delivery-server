import mongoose, { Document, Schema } from 'mongoose';
import { VehicleType, IReturnDeliveryImage } from './delivery.model';
import { SMSStatus, SMSType } from '@/types/sms-notification.type';

export interface IRemovedDelivery extends Document {
  _id: string;
  // Original delivery data
  originalDeliveryId: mongoose.Types.ObjectId;
  code: string;
  fullCode: string;
  subCode: string;
  sender: mongoose.Types.ObjectId;
  senderName: string;
  receiver: mongoose.Types.ObjectId;
  receiverName: string;
  fromRoute: mongoose.Types.ObjectId;
  toRoute: mongoose.Types.ObjectId;
  name: string;
  nameProductAndAdditionalInformation?: string;
  quantity: number;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  carryCost: number;
  homeDeliveryCostTotal?: number;
  vehicleType?: VehicleType | null;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  details?: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    isOverweight?: boolean;
    convertedWeight?: number;
  };
  notes?: string;
  totalCost: number;
  actualRevenue: number;
  paymentType: 'paid' | 'debt';
  isFree: boolean;
  createdByUser: mongoose.Types.ObjectId;
  originalCreatedAt: Date;
  originalUpdatedAt: Date;
  isReturn: boolean;
  inventory?: string;
  smsType?: SMSType;
  smsStatus: SMSStatus;
  timeToSendSMS?: Date;
  upItems?: string;
  downItems?: string;
  quantityReturn: number;
  returnDeliveryImages?: IReturnDeliveryImage[];
  dateReturn?: Date;

  // Removal metadata
  deletedBy: mongoose.Types.ObjectId;
  reason: string;
  deletedAt: Date;
  expiredAt: Date;
}

const removedDeliverySchema = new Schema<IRemovedDelivery>(
  {
    // Original delivery data
    originalDeliveryId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Original delivery ID is required'],
    },
    code: {
      type: String,
      required: [true, 'Delivery code is required'],
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
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    nameProductAndAdditionalInformation: {
      type: String,
      required: false,
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    cost: {
      type: Number,
      required: [true, 'Cost is required'],
      min: [0, 'Cost must be positive'],
    },
    homeDelivery: {
      type: String,
      required: false,
      trim: true,
    },
    homeDeliveryCost: {
      type: Number,
      required: [true, 'Home delivery cost is required'],
      min: [0, 'Home delivery cost must be positive'],
      default: 0,
    },
    carryCost: {
      type: Number,
      required: false,
      min: [0, 'Carry cost must be positive'],
      default: 0,
    },
    homeDeliveryCostTotal: {
      type: Number,
      required: false,
      min: [0, 'Home delivery cost total must be positive'],
    },
    vehicleType: {
      type: String,
      enum: Object.values(VehicleType),
      required: false,
      default: null,
    },
    itemValue: {
      type: Number,
      required: [true, 'Item value is required'],
      min: [0, 'Item value must be positive'],
    },
    itemCost: {
      type: Number,
      required: [true, 'Item cost is required'],
      min: [0, 'Item cost must be positive'],
    },
    collectCost: {
      type: Number,
      required: [true, 'Collect cost is required'],
      min: [0, 'Collect cost must be positive'],
    },
    collectForCustomer: {
      type: Number,
      required: [true, 'Collect for customer amount is required'],
      min: [0, 'Collect for customer amount must be positive'],
      default: 0,
    },
    collectForCustomerCost: {
      type: Number,
      required: [true, 'Collect for customer cost is required'],
      min: [0, 'Collect for customer cost must be positive'],
    },
    totalCost: {
      type: Number,
      required: true,
      min: [0, 'Total cost must be positive'],
    },
    actualRevenue: {
      type: Number,
      required: false,
      min: [0, 'Actual revenue must be positive'],
      default: 0,
    },
    collectForCustomerNote: {
      type: String,
      trim: true,
    },
    details: {
      type: {
        weight: {
          type: Number,
          min: [0, 'Weight must be positive'],
        },
        length: {
          type: Number,
          min: [0, 'Length must be positive'],
        },
        width: {
          type: Number,
          min: [0, 'Width must be positive'],
        },
        height: {
          type: Number,
          min: [0, 'Height must be positive'],
        },
        isOverweight: {
          type: Boolean,
          default: false,
        },
        convertedWeight: {
          type: Number,
          min: [0, 'Converted weight must be positive'],
        },
      },
      required: false,
    },
    notes: {
      type: String,
      trim: true,
    },
    paymentType: {
      type: String,
      enum: ['paid', 'debt'],
      required: true,
    },
    isFree: {
      type: Boolean,
      required: true,
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
    isReturn: {
      type: Boolean,
      default: false,
    },
    inventory: {
      type: String,
      default: null,
    },
    smsType: {
      type: String,
      enum: Object.values(SMSType),
      default: null,
    },
    smsStatus: {
      type: Number,
      enum: Object.values(SMSStatus).filter(v => typeof v === 'number'),
      default: SMSStatus.NOT_SENT,
    },
    timeToSendSMS: {
      type: Date,
    },
    upItems: {
      type: String,
      default: null,
    },
    downItems: {
      type: String,
      default: null,
    },
    quantityReturn: {
      type: Number,
      default: 0,
    },
    returnDeliveryImages: {
      type: [
        {
          url: {
            type: String,
            required: true,
            trim: true,
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
    dateReturn: {
      type: Date,
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
    collection: 'removedDeliveries',
    toJSON: {
      transform: function (_doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: _id, ...rest };
      },
    },
  }
);

// Indexes for performance
removedDeliverySchema.index({ deletedBy: 1, deletedAt: -1 }); // User's deletion history
removedDeliverySchema.index({ fullCode: 1 }); // Search by fullCode
removedDeliverySchema.index({ originalDeliveryId: 1 }); // Reference to original
removedDeliverySchema.index({ fromRoute: 1, toRoute: 1 }); // Route analysis
removedDeliverySchema.index({ deletedAt: -1 }); // Recent deletions

export const RemovedDelivery = mongoose.model<IRemovedDelivery>(
  'RemovedDelivery',
  removedDeliverySchema
);
