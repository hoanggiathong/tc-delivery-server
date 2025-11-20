import mongoose, { Document, Schema, Types } from 'mongoose';
import { appConfig } from '@/config/app.config';
import { generateFullImageUrl, extractBasePath } from '@/utils/image-url.utils';
import { PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES } from '@/utils/validation-patterns';

export enum CustomerType {
  DELIVERY = 'delivery',
  MONEY = 'money',
}

export interface ICustomerImage {
  url: string;
  rotate: number;
}

export interface ICustomer extends Document {
  _id: string;
  name: string;
  phone: string;
  routeId: Types.ObjectId;
  type: CustomerType;
  bankId: Types.ObjectId;
  images: ICustomerImage[];
  address: string;
  identityCardIssuedDate: Date;
  identityCardNumber: string;
  createdBy: Types.ObjectId;
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
      match: [PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER],
    },
    routeId: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'From route is required'],
    },
    type: {
      type: String,
      enum: Object.values(CustomerType),
      default: CustomerType.DELIVERY,
      required: true,
    },
    bankId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomerBank',
    },
    images: {
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
        validator: function (images: ICustomerImage[]) {
          return images.length <= 5;
        },
        message: 'Maximum 5 images allowed',
      },
    },
    address: {
      type: String,
      default: null,
    },
    identityCardIssuedDate: {
      type: Date,
      default: null,
    },
    identityCardNumber: {
      type: String,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        const { _id, __v, ...rest } = ret;

        // Transform image URLs to include domain
        if (rest.images && Array.isArray(rest.images)) {
          rest.images = rest.images.map((img: ICustomerImage) => {
            const basePath = extractBasePath(img.url);
            return {
              ...img,
              url: generateFullImageUrl(basePath, appConfig.baseUrl),
            };
          });
        }

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
