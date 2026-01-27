import { PaymentType } from '@/types';
import { SMSStatus, SMSType } from '@/types/sms-notification.type';
import mongoose, { Document, Schema } from 'mongoose';
import logger from '@/utils/logger';

export enum VehicleType {
  MOTORBIKE = 'motorbike',
  SMALL_TRUCK = 'small-truck',
  LARGE_TRUCK = 'large-truck',
}

export interface IDelivery extends Document {
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
  name: string;
  nameProductAndAdditionalInformation: string;
  quantity: number;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  carryCost: number; // Phí bốc xếp
  homeDeliveryCostTotal?: number; // Tổng phí giao tận nhà (carryCost + homeDeliveryCost)
  vehicleType?: VehicleType | null; // Loại phương tiện (required when homeDeliveryCost > 0)
  itemValue: number; // tri gia
  itemCost: number; // phí gia tri
  collectCost: number; // Thu hộ
  collectForCustomer: number; // Thu dùm
  collectForCustomerCost: number; // Phụ phí
  collectForCustomerNote?: string;
  details?: {
    weight?: number; // Khối lượng (kg)
    length?: number; // Dài (cm)
    width?: number; // Rộng (cm)
    height?: number; // Cao (cm)
    isOverweight?: boolean; // Quá tải
    convertedWeight?: number; // Khối lượng quy đổi
    goodsType?: string; // Loại hàng hóa
  };
  notes?: string;
  totalCost: number;
  actualRevenue: number; // Tổng thực thu (bao gồm cả tiền thu dùm)
  paymentType: PaymentType; // 'paid' (default), 'debt' (nợ)
  isFree: boolean; // Miễn phí (default false)
  createdByUser: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isReturn: boolean; // tra hang
  inventory?: string; // kho
  smsType?: SMSType; // Loại tin nhắn đã gửi thành công
  smsStatus: SMSStatus; // Trạng thái gửi tin
  timeToSendSMS?: Date;
  msgId?: string; // ID tin nhắn từ API
  upItems?: string; // len hang
  downItems?: string; //xuong hang
  quantityReturn: number; // so luong tra hang
  returnDeliveryImages?: IReturnDeliveryImage[];
  dateReturn?: Date; // ngay tra hang
}

export interface IReturnDeliveryImage {
  url: string;
  rotate: number;
}

const deliverySchema = new Schema<IDelivery>(
  {
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
      required: false,
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
      required: false, // Will be calculated by pre-save middleware
      min: [0, 'Total cost must be positive'],
      default: 0,
    },
    actualRevenue: {
      type: Number,
      required: false, // Will be calculated by pre-save middleware
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
        goodsType: {
          type: String,
          default: '',
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
      default: 'paid',
      required: true,
    },
    isFree: {
      type: Boolean,
      default: false,
      required: true,
    },
    createdByUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
    },
    nameProductAndAdditionalInformation: {
      type: String,
      required: false,
      trim: true,
    },
    isReturn: {
      type: Boolean,
      default: false,
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
    msgId: {
      type: String,
    },
    inventory: {
      type: String,
      default: null,
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
    dateReturn: {
      type: Date,
      default: null,
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
            validate: {
              validator: function (value: number) {
                return [0, 90, 180, 270].includes(value);
              },
              message: 'Rotate must be 0, 90, 180, or 270 degrees',
            },
          },
        },
      ],
      default: [],
      validate: {
        validator: function (images: IReturnDeliveryImage[]) {
          return images.length <= 5;
        },
        message: 'Maximum 5 images allowed',
      },
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

// Pre-save middleware for totalCost calculation and business logic validation
deliverySchema.pre('save', function (next) {
  // Business logic validation
  // Note: sender and receiver can be the same (same phone number is allowed)
  if (this.fromRoute.toString() === this.toRoute.toString()) {
    return next(new Error('From route and to route cannot be the same'));
  }

  // Validation: homeDelivery is required when carryCost or homeDeliveryCost > 0
  if (
    (this.carryCost > 0 || this.homeDeliveryCost > 0) &&
    (!this.homeDelivery || this.homeDelivery.trim() === '')
  ) {
    return next(
      new Error('homeDelivery is required when carryCost or homeDeliveryCost is greater than 0')
    );
  }

  // Validation: vehicleType is required when homeDelivery has value
  if (this.homeDelivery && this.homeDelivery.trim() !== '' && !this.vehicleType) {
    return next(new Error('vehicleType is required when homeDelivery is provided'));
  }

  // Calculate homeDeliveryCostTotal
  if (this.homeDelivery && this.homeDelivery.trim() !== '') {
    this.homeDeliveryCostTotal = this.carryCost + this.homeDeliveryCost;
  } else {
    this.homeDeliveryCostTotal = undefined;
  }

  // Calculate totalCost (service fees only: cost + itemCost + collectForCustomerCost + homeDeliveryCost)
  if (this.isFree) {
    this.totalCost = 0;
  } else {
    this.totalCost =
      this.cost + this.itemCost + this.collectForCustomerCost + this.homeDeliveryCost;
  }

  // Calculate actualRevenue (totalCost + collectCost + collectForCustomer)
  this.actualRevenue = this.totalCost + this.collectCost + this.collectForCustomer;

  next();
});

// Pre-update middleware to regenerate fullCode when toRoute changes
deliverySchema.pre(['updateOne', 'findOneAndUpdate'], async function (next) {
  const rawUpdate = this.getUpdate() as any;
  if (!rawUpdate) {
    return next();
  }

  // Normalize update object - extract fields from $set if present, otherwise use direct fields
  const updateFields = rawUpdate.$set || rawUpdate;

  // Check if toRoute is being updated
  if (updateFields.toRoute !== undefined) {
    try {
      // Get current document to access current fullCode and fromRoute
      const currentDoc = await this.model.findOne(this.getQuery());
      if (!currentDoc) {
        return next(new Error('Delivery not found'));
      }

      const currentToRouteId = currentDoc.toRoute.toString();
      const newToRouteId = updateFields.toRoute.toString();

      // Only regenerate if toRoute actually changed
      if (currentToRouteId !== newToRouteId) {
        const { CodeGeneratorService } = await import('@/services/code-generator.service');

        // Regenerate fullCode with original code (or new code if conflict)
        const regeneratedCode = await CodeGeneratorService.regenerateFullCodeForRouteChange(
          currentDoc.fullCode,
          currentDoc.fromRoute.toString(),
          newToRouteId,
          currentDoc._id.toString()
        );

        // Update code fields
        updateFields.code = regeneratedCode.code;
        updateFields.fullCode = regeneratedCode.fullCode;
        updateFields.subCode = regeneratedCode.subCode;

        // Log the code change
        if (regeneratedCode.codeChanged) {
          logger.info(
            `[Delivery ${currentDoc._id}] Code regenerated due to fullCode conflict: ${currentDoc.fullCode} -> ${regeneratedCode.fullCode}`
          );
        } else {
          logger.info(
            `[Delivery ${currentDoc._id}] fullCode updated: ${currentDoc.fullCode} -> ${regeneratedCode.fullCode}`
          );
        }
      }
    } catch (error) {
      return next(error as Error);
    }
  }

  next();
});

// Pre-update middleware to calculate totalCost
deliverySchema.pre(['updateOne', 'findOneAndUpdate'], async function (next) {
  const rawUpdate = this.getUpdate() as any;
  if (!rawUpdate) {
    return next();
  }

  // Normalize update object - extract fields from $set if present, otherwise use direct fields
  const updateFields = rawUpdate.$set || rawUpdate;

  // Business logic validation for updates
  // Note: sender and receiver can be the same (same phone number is allowed)
  if (
    updateFields.fromRoute &&
    updateFields.toRoute &&
    updateFields.fromRoute.toString() === updateFields.toRoute.toString()
  ) {
    return next(new Error('From route and to route cannot be the same'));
  }

  // Only calculate if at least one cost field or isFree is being updated
  if (
    updateFields.cost !== undefined ||
    updateFields.itemCost !== undefined ||
    updateFields.collectCost !== undefined ||
    updateFields.collectForCustomerCost !== undefined ||
    updateFields.collectForCustomer !== undefined ||
    updateFields.homeDeliveryCost !== undefined ||
    updateFields.carryCost !== undefined ||
    updateFields.homeDelivery !== undefined ||
    updateFields.isFree !== undefined
  ) {
    // Get current document to merge with updates
    const currentDoc = await this.model.findOne(this.getQuery());
    if (currentDoc) {
      const cost = updateFields.cost !== undefined ? updateFields.cost : currentDoc.cost;
      const itemCost =
        updateFields.itemCost !== undefined ? updateFields.itemCost : currentDoc.itemCost;
      const collectCost =
        updateFields.collectCost !== undefined ? updateFields.collectCost : currentDoc.collectCost;
      const collectForCustomerCost =
        updateFields.collectForCustomerCost !== undefined
          ? updateFields.collectForCustomerCost
          : currentDoc.collectForCustomerCost;
      const collectForCustomer =
        updateFields.collectForCustomer !== undefined
          ? updateFields.collectForCustomer
          : currentDoc.collectForCustomer;
      const homeDeliveryCost =
        updateFields.homeDeliveryCost !== undefined
          ? updateFields.homeDeliveryCost
          : currentDoc.homeDeliveryCost;
      const carryCost =
        updateFields.carryCost !== undefined ? updateFields.carryCost : currentDoc.carryCost;
      const homeDelivery =
        updateFields.homeDelivery !== undefined
          ? updateFields.homeDelivery
          : currentDoc.homeDelivery;
      const vehicleType =
        updateFields.vehicleType !== undefined ? updateFields.vehicleType : currentDoc.vehicleType;
      const isFree = updateFields.isFree !== undefined ? updateFields.isFree : currentDoc.isFree;

      // Validation: homeDelivery is required when carryCost or homeDeliveryCost > 0
      if (
        (carryCost > 0 || homeDeliveryCost > 0) &&
        (!homeDelivery || homeDelivery.trim() === '')
      ) {
        return next(
          new Error('homeDelivery is required when carryCost or homeDeliveryCost is greater than 0')
        );
      }

      // Validation: vehicleType is required when homeDelivery has value
      if (homeDelivery && homeDelivery.trim() !== '' && !vehicleType) {
        return next(new Error('vehicleType is required when homeDelivery is provided'));
      }

      // Calculate homeDeliveryCostTotal
      if (homeDelivery && homeDelivery.trim() !== '') {
        updateFields.homeDeliveryCostTotal = carryCost + homeDeliveryCost;
      } else {
        updateFields.homeDeliveryCostTotal = undefined;
      }

      // Calculate totalCost (service fees only: cost + itemCost + collectForCustomerCost + homeDeliveryCost)
      if (isFree) {
        updateFields.totalCost = 0;
      } else {
        updateFields.totalCost = cost + itemCost + collectForCustomerCost + homeDeliveryCost;
      }

      // Calculate actualRevenue (totalCost + collectCost + collectForCustomer)
      updateFields.actualRevenue = updateFields.totalCost + collectCost + collectForCustomer;
    }
  }
  next();
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
deliverySchema.index({ code: 1, fromRoute: 1, toRoute: 1 });
deliverySchema.index({ subCode: 1 });
// Additional unique index for fullCode
deliverySchema.index({ fullCode: 1 }, { unique: true });
deliverySchema.index({ sender: 1, receiver: 1, toRoute: 1 });
deliverySchema.index({ receiver: 1, toRoute: 1 });
// Optimized index for cost report queries
deliverySchema.index({ fromRoute: 1, createdAt: -1 }); // Cost report by route and date
deliverySchema.index({ toRoute: 1, createdAt: -1, isReturn: 1 });
deliverySchema.index({ sender: 1, fromRoute: 1, createdAt: -1 }); // getFrequentCustomers optimization

export const Delivery = mongoose.model<IDelivery>('Delivery', deliverySchema);
