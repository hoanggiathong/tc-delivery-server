import mongoose, { Document, QueryOptions, Schema } from 'mongoose';

export interface IShippingRateConfig {
  _id?: mongoose.Types.ObjectId;
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
  _id?: mongoose.Types.ObjectId;
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

function validateRangeOverlap(rates: IShippingRateConfig[]): boolean {
  // Sort rates by fromAmount to check for overlaps
  const sortedRates = [...rates].sort((a, b) => a.fromAmount - b.fromAmount);

  // Check for invalid ranges (toAmount <= fromAmount)
  for (const rate of sortedRates) {
    if (rate.toAmount <= rate.fromAmount) {
      return false;
    }
  }

  // Check for overlapping ranges
  for (let i = 0; i < sortedRates.length - 1; i++) {
    const currentRate = sortedRates[i];
    const nextRate = sortedRates[i + 1];

    // Check if current range overlaps with next range
    if (currentRate.toAmount >= nextRate.fromAmount) {
      return false;
    }
  }

  return true;
}

function validateNoDuplicateRanges(rates: IShippingRateConfig[]): boolean {
  // Check for exact duplicate ranges
  for (let i = 0; i < rates.length; i++) {
    for (let j = i + 1; j < rates.length; j++) {
      const rateA = rates[i];
      const rateB = rates[j];

      // Check for exact duplicate ranges (same fromAmount and toAmount)
      if (rateA.fromAmount === rateB.fromAmount && rateA.toAmount === rateB.toAmount) {
        return false;
      }
    }
  }
  return true;
}

function validateRangeContinuity(rates: IShippingRateConfig[]): boolean {
  // Sort rates by fromAmount
  const sortedRates = [...rates].sort((a, b) => a.fromAmount - b.fromAmount);

  // Check for gaps between ranges
  for (let i = 0; i < sortedRates.length - 1; i++) {
    const currentRate = sortedRates[i];
    const nextRate = sortedRates[i + 1];

    // Check if there's a gap between current and next range
    if (currentRate.toAmount + 1 !== nextRate.fromAmount) {
      return false;
    }
  }

  return true;
}

function validateShippingRates(rates: unknown): boolean {
  if (!Array.isArray(rates) || rates.length === 0) {
    return false;
  }

  const validUnits = ['VND', 'USD', '%'];
  const typedRates = rates as IShippingRateConfig[];

  // Validate basic constraints
  for (const rate of typedRates) {
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

    // Check for non-negative values
    if (
      rate.fromAmount < 0 ||
      rate.toAmount < 0 ||
      rate.regularShippingFee < 0 ||
      rate.expressShippingFee < 0
    ) {
      return false;
    }
  }

  // Validate no overlaps
  if (!validateRangeOverlap(typedRates)) {
    return false;
  }

  // Validate no duplicate ranges
  if (!validateNoDuplicateRanges(typedRates)) {
    return false;
  }

  // Validate continuity
  if (!validateRangeContinuity(typedRates)) {
    return false;
  }

  return true;
}

function validateNoDuplicateProductNames(products: IProductConfig[]): boolean {
  // Check for duplicate product names (case-insensitive)
  const names = products.map(product => product.name.toLowerCase().trim());
  const uniqueNames = new Set(names);
  return names.length === uniqueNames.size;
}

function validateProductConfig(products: unknown): boolean {
  if (!Array.isArray(products)) {
    return false;
  }

  const typedProducts = products as IProductConfig[];

  // Validate basic constraints
  const basicValidation = typedProducts.every(
    (product: IProductConfig) =>
      typeof product.name === 'string' &&
      product.name.trim().length > 0 &&
      typeof product.cost === 'number' &&
      product.cost >= 0
  );

  if (!basicValidation) {
    return false;
  }

  // Validate no duplicate names
  if (!validateNoDuplicateProductNames(typedProducts)) {
    return false;
  }

  return true;
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
          // Access the document's name field
          const doc = this as unknown as QueryOptions;
          const name = doc._conditions.name;

          if (!name) {
            return false;
          }

          return validateMetadataByName(name, data);
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
    toJSON: {
      transform: function (_doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: _id, ...rest };
      },
    },
  }
);

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);
