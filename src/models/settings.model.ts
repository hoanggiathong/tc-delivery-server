import { IBankConfig } from '@/types/setting.type';
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

export type IShippingRateConfigResponse = {
  id: string;
  fromAmount: number;
  toAmount: number;
  regularShippingFee: number;
  expressShippingFee: number;
  fromAmountUnit: 'VND' | 'USD' | '%';
  toAmountUnit: 'VND' | 'USD' | '%';
  regularShippingFeeUnit: 'VND' | 'USD' | '%';
  expressShippingFeeUnit: 'VND' | 'USD' | '%';
};

export type IProductConfig = {
  _id?: mongoose.Types.ObjectId;
  name: string;
  cost: number;
};

export type IProductConfigResponse = {
  id: string;
  name: string;
  cost: number;
};

export type SettingsMetadata =
  | IShippingRateConfig[]
  | IProductConfig[]
  | IBankConfig[]
  | Record<string, unknown>;

interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export interface ISettings extends Document {
  name: string;
  metadata: SettingsMetadata;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function validateRangeOverlap(rates: IShippingRateConfig[]): ValidationResult {
  // Sort rates by fromAmount to check for overlaps
  const sortedRates = [...rates].sort((a, b) => a.fromAmount - b.fromAmount);

  // Check for invalid ranges (toAmount <= fromAmount)
  for (const rate of sortedRates) {
    if (rate.toAmount <= rate.fromAmount) {
      return {
        isValid: false,
        errorMessage: `Số tiền từ (${rate.fromAmount.toLocaleString('vi-VN')}) phải nhỏ hơn số tiền đến (${rate.toAmount.toLocaleString('vi-VN')})`,
      };
    }
  }

  // Check for overlapping ranges
  for (let i = 0; i < sortedRates.length - 1; i++) {
    const currentRate = sortedRates[i];
    const nextRate = sortedRates[i + 1];

    // Check if current range overlaps with next range
    if (currentRate.toAmount >= nextRate.fromAmount) {
      return {
        isValid: false,
        errorMessage: `Các khoảng giá bị chồng lấp: [${currentRate.fromAmount.toLocaleString('vi-VN')} - ${currentRate.toAmount.toLocaleString('vi-VN')}] trùng với [${nextRate.fromAmount.toLocaleString('vi-VN')} - ${nextRate.toAmount.toLocaleString('vi-VN')}]`,
      };
    }
  }

  return { isValid: true };
}

function validateNoDuplicateRanges(rates: IShippingRateConfig[]): ValidationResult {
  // Check for exact duplicate ranges
  for (let i = 0; i < rates.length; i++) {
    for (let j = i + 1; j < rates.length; j++) {
      const rateA = rates[i];
      const rateB = rates[j];

      // Check for exact duplicate ranges (same fromAmount and toAmount)
      if (rateA.fromAmount === rateB.fromAmount && rateA.toAmount === rateB.toAmount) {
        return {
          isValid: false,
          errorMessage: `Phát hiện khoảng giá trùng lặp: [${rateA.fromAmount.toLocaleString('vi-VN')} - ${rateA.toAmount.toLocaleString('vi-VN')}]`,
        };
      }
    }
  }
  return { isValid: true };
}

function validateShippingRates(rates: unknown): ValidationResult {
  if (!Array.isArray(rates) || rates.length === 0) {
    return {
      isValid: false,
      errorMessage: 'Dữ liệu shipping rates phải là một mảng và không được rỗng',
    };
  }

  const validUnits = ['VND', 'USD', '%'];
  const typedRates = rates as IShippingRateConfig[];

  // Validate basic constraints
  for (const rate of typedRates) {
    if (
      typeof rate.fromAmount !== 'number' ||
      typeof rate.toAmount !== 'number' ||
      typeof rate.regularShippingFee !== 'number' ||
      typeof rate.expressShippingFee !== 'number'
    ) {
      return {
        isValid: false,
        errorMessage:
          'Giá trị fromAmount, toAmount, regularShippingFee, expressShippingFee phải là số',
      };
    }

    if (
      !validUnits.includes(rate.fromAmountUnit || 'VND') ||
      !validUnits.includes(rate.toAmountUnit || 'VND') ||
      !validUnits.includes(rate.regularShippingFeeUnit || 'VND') ||
      !validUnits.includes(rate.expressShippingFeeUnit || 'VND')
    ) {
      return {
        isValid: false,
        errorMessage: 'Đơn vị không hợp lệ. Chỉ chấp nhận: VND, USD, %',
      };
    }

    // Check for non-negative values
    if (
      rate.fromAmount < 0 ||
      rate.toAmount < 0 ||
      rate.regularShippingFee < 0 ||
      rate.expressShippingFee < 0
    ) {
      return {
        isValid: false,
        errorMessage:
          'Các giá trị fromAmount, toAmount, regularShippingFee, expressShippingFee không được âm',
      };
    }
  }

  // Validate no overlaps
  const overlapValidation = validateRangeOverlap(typedRates);
  if (!overlapValidation.isValid) {
    return overlapValidation;
  }

  // Validate no duplicate ranges
  const duplicateValidation = validateNoDuplicateRanges(typedRates);
  if (!duplicateValidation.isValid) {
    return duplicateValidation;
  }

  return { isValid: true };
}

function validateNoDuplicateProductNames(products: IProductConfig[]): ValidationResult {
  // Check for duplicate product names (case-insensitive)
  const names = products.map(product => product.name.toLowerCase().trim());
  const uniqueNames = new Set(names);

  if (names.length !== uniqueNames.size) {
    // Find the duplicate name
    const seen = new Set();
    for (const name of names) {
      if (seen.has(name)) {
        return {
          isValid: false,
          errorMessage: `Tên sản phẩm bị trùng lặp: "${name}"`,
        };
      }
      seen.add(name);
    }
  }

  return { isValid: true };
}

function validateProductConfig(products: unknown): ValidationResult {
  if (!Array.isArray(products)) {
    return {
      isValid: false,
      errorMessage: 'Dữ liệu sản phẩm phải là một mảng',
    };
  }

  const typedProducts = products as IProductConfig[];

  // Validate basic constraints
  for (const product of typedProducts) {
    if (typeof product.name !== 'string' || product.name.trim().length === 0) {
      return {
        isValid: false,
        errorMessage: 'Tên sản phẩm không được để trống và phải là chuỗi ký tự',
      };
    }

    if (typeof product.cost !== 'number' || product.cost < 0) {
      return {
        isValid: false,
        errorMessage: 'Giá sản phẩm phải là số và không được âm',
      };
    }
  }

  // Validate no duplicate names
  const duplicateValidation = validateNoDuplicateProductNames(typedProducts);
  if (!duplicateValidation.isValid) {
    return duplicateValidation;
  }

  return { isValid: true };
}

function validateNoDuplicateBankNames(banks: IBankConfig[]): ValidationResult {
  // Check for duplicate bank names (case-insensitive)
  const names = banks.map(bank => bank.name.toLowerCase().trim());
  const uniqueNames = new Set(names);

  if (names.length !== uniqueNames.size) {
    // Find the duplicate name
    const seen = new Set();
    for (const name of names) {
      if (seen.has(name)) {
        return {
          isValid: false,
          errorMessage: `Tên ngân hàng bị trùng lặp: "${name}"`,
        };
      }
      seen.add(name);
    }
  }

  return { isValid: true };
}

function validateBankConfig(banks: unknown): ValidationResult {
  if (!Array.isArray(banks)) {
    return {
      isValid: false,
      errorMessage: 'Dữ liệu ngân hàng phải là một mảng',
    };
  }

  const typedBanks = banks as IBankConfig[];

  // Validate basic constraints
  for (const bank of typedBanks) {
    if (typeof bank.name !== 'string' || bank.name.trim().length === 0) {
      return {
        isValid: false,
        errorMessage: 'Tên ngân hàng không được để trống và phải là chuỗi ký tự',
      };
    }
  }

  // Validate no duplicate names
  const duplicateValidation = validateNoDuplicateBankNames(typedBanks);
  if (!duplicateValidation.isValid) {
    return duplicateValidation;
  }

  return { isValid: true };
}

function validateMetadataByName(name: string, metadata: unknown): ValidationResult {
  switch (name) {
    case 'shipping_rates':
      return validateShippingRates(metadata);
    case 'product_list':
      return validateProductConfig(metadata);
    case 'bank_list':
      return validateBankConfig(metadata);
    default:
      if (typeof metadata === 'object' && metadata !== null) {
        return { isValid: true };
      } else {
        return {
          isValid: false,
          errorMessage: 'Dữ liệu metadata phải là một object hợp lệ',
        };
      }
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
          const name = doc._conditions?.name;

          if (!name) {
            return false;
          }

          const validationResult = validateMetadataByName(name, data);
          return validationResult.isValid;
        },
        message: function (props: { value: unknown }) {
          const doc = this as unknown as QueryOptions;
          const name = doc._conditions?.name;

          if (!name) {
            return 'Không thể xác định loại setting';
          }

          const validationResult = validateMetadataByName(name, props.value);
          return (
            validationResult.errorMessage || 'Invalid metadata structure for this setting type'
          );
        },
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
