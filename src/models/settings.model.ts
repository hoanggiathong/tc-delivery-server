import mongoose, { Document, Schema } from 'mongoose';

export interface IShippingRate {
  fromAmount: number;
  toAmount: number;
  regularShippingFee: number;
  expressShippingFee: number;
}

export interface ISettings extends Document {
  name: string;
  metadata: IShippingRate[];
  createdAt: Date;
  updatedAt: Date;
}

const shippingRateSchema = new Schema<IShippingRate>({
  fromAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  toAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  regularShippingFee: {
    type: Number,
    required: true,
    min: 0,
  },
  expressShippingFee: {
    type: Number,
    required: true,
    min: 0,
  },
});

const settingsSchema = new Schema<ISettings>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: ['shipping_rates', 'other_settings'],
    },
    metadata: {
      type: [shippingRateSchema],
      required: true,
      validate: {
        validator: function (rates: IShippingRate[]) {
          if (!Array.isArray(rates) || rates.length === 0) {
            return false;
          }
          for (let i = 0; i < rates.length; i++) {
            const rate = rates[i];
            if (rate.toAmount <= rate.fromAmount) {
              return false;
            }
            if (i > 0) {
              const prevRate = rates[i - 1];
              if (rate.fromAmount !== prevRate.toAmount + 1) {
                return false;
              }
            }
          }
          return true;
        },
        message: 'Invalid shipping rates configuration',
      },
    },
  },
  {
    timestamps: true,
  }
);

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);
