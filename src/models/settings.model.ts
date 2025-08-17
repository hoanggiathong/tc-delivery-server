import mongoose, { Document, Schema } from 'mongoose';

export interface IShippingRateConfig {
  fromAmount: number;
  toAmount: number;
  regularShippingFee: number;
  expressShippingFee: number;
  fromAmountUnit: 'VND' | 'USD' | '%';
  toAmountUnit: 'VND' | 'USD' | '%';
  regularShippingFeeUnit: 'VND' | 'USD' | '%';
  expressShippingFeeUnit: 'VND' | 'USD' | '%';
}

export type IProductConfig = {
  name: string;
  cost: number;
};

export type SettingsMetadata = IShippingRateConfig[] | IProductConfig[] | Record<string, unknown>;

export interface ISettings extends Document {
  name: string;
  metadata: SettingsMetadata;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function validateShippingRates(rates: unknown): boolean {
  if (!Array.isArray(rates) || rates.length === 0) {
    return false;
  }

  const validUnits = ['VND', 'USD', '%'];

  for (let i = 0; i < rates.length; i++) {
    const rate = rates[i] as IShippingRateConfig;

    if (
      typeof rate.fromAmount !== 'number' ||
      typeof rate.toAmount !== 'number' ||
      typeof rate.regularShippingFee !== 'number' ||
      typeof rate.expressShippingFee !== 'number' ||
      !validUnits.includes(rate.fromAmountUnit || 'VND') ||
      !validUnits.includes(rate.toAmountUnit || 'VND') ||
      !validUnits.includes(rate.regularShippingFeeUnit || 'VND') ||
      !validUnits.includes(rate.expressShippingFeeUnit || 'VND')
    ) {
      return false;
    }

    if (rate.toAmount <= rate.fromAmount) {
      return false;
    }

    if (i > 0) {
      const prevRate = rates[i - 1] as IShippingRateConfig;
      if (rate.fromAmount !== prevRate.toAmount + 1) {
        return false;
      }
    }
  }
  return true;
}

function validateProductConfig(products: unknown): boolean {
  if (!Array.isArray(products)) {
    return false;
  }

  return products.every(
    (product: IProductConfig) =>
      typeof product.name === 'string' &&
      product.name.trim().length > 0 &&
      typeof product.cost === 'number' &&
      product.cost >= 0
  );
}

function validateMetadataByName(name: string, metadata: unknown): boolean {
  switch (name) {
    case 'shipping_rates':
      return validateShippingRates(metadata);
    case 'product_list':
      return validateProductConfig(metadata);
    default:
      return typeof metadata === 'object' && metadata !== null;
  }
}

const settingsSchema = new Schema<ISettings>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: true,
      validate: {
        validator: function (data: unknown) {
          return validateMetadataByName((this as ISettings).name, data);
        },
        message: 'Invalid metadata structure for this setting type',
      },
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);
