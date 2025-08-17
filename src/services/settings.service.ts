import {
  Settings,
  ISettings,
  IShippingRateConfig,
  SettingsMetadata,
  IProductConfig,
} from '@/models/settings.model';
import { AppError } from '@/middlewares/error.middleware';

export class SettingsService {
  async getSetting<T = SettingsMetadata>(name: string): Promise<T | null> {
    try {
      const setting = await Settings.findOne({ name, isActive: true });
      return setting ? (setting.metadata as T) : null;
    } catch (error) {
      throw new AppError('Failed to get setting', 500);
    }
  }

  async getShippingRates(): Promise<IShippingRateConfig[]> {
    const rates = await this.getSetting<IShippingRateConfig[]>('shipping_rates');
    return rates || [];
  }

  async updateSetting<T extends SettingsMetadata>(name: string, metadata: T): Promise<boolean> {
    try {
      const result = await Settings.findOneAndUpdate(
        { name },
        { metadata, updatedAt: new Date() },
        { upsert: true, new: true, runValidators: true }
      );
      return !!result;
    } catch (error) {
      throw new AppError('Failed to update setting', 500);
    }
  }

  async updateShippingRates(rates: IShippingRateConfig[]): Promise<boolean> {
    return this.updateSetting('shipping_rates', rates);
  }

  async getProductList(): Promise<IProductConfig[]> {
    const products = await this.getSetting<IProductConfig[]>('product_list');
    return products || [];
  }

  async updateProductList(products: IProductConfig[]): Promise<boolean> {
    return this.updateSetting('product_list', products);
  }
  async create(name: string, metadata: SettingsMetadata): Promise<ISettings> {
    try {
      const existingSettings = await Settings.findOne({ name });
      if (existingSettings) {
        throw new AppError(`Settings with name "${name}" already exists`, 409);
      }

      const settings = new Settings({
        name,
        metadata,
      });

      return await settings.save();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create settings', 500);
    }
  }

  async getAll(): Promise<ISettings[]> {
    try {
      return await Settings.find().sort({ name: 1 });
    } catch (error) {
      throw new AppError('Failed to fetch settings', 500);
    }
  }

  async getByName(name: string): Promise<ISettings> {
    try {
      const settings = await Settings.findOne({ name });
      if (!settings) {
        throw new AppError(`Settings with name "${name}" not found`, 404);
      }
      return settings;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to fetch settings', 500);
    }
  }

  async update(name: string, metadata: SettingsMetadata): Promise<ISettings> {
    try {
      const settings = await Settings.findOneAndUpdate(
        { name },
        { metadata },
        { new: true, runValidators: true }
      );

      if (!settings) {
        throw new AppError(`Settings with name "${name}" not found`, 404);
      }

      return settings;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update settings', 500);
    }
  }

  async delete(name: string): Promise<void> {
    try {
      const result = await Settings.deleteOne({ name });
      if (result.deletedCount === 0) {
        throw new AppError(`Settings with name "${name}" not found`, 404);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete settings', 500);
    }
  }

  async getShippingRate(amount: number): Promise<IShippingRateConfig | null> {
    try {
      const settings = await this.getByName('shipping_rates');
      if (!settings || !settings.metadata) {
        return null;
      }

      if (!Array.isArray(settings.metadata)) {
        return null;
      }

      const rate = (settings.metadata as IShippingRateConfig[]).find(
        (rate: IShippingRateConfig) => amount >= rate.fromAmount && amount <= rate.toAmount
      );

      return rate || null;
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        return null;
      }
      throw new AppError('Failed to get shipping rate', 500);
    }
  }

  async calculateShippingFee(amount: number, isExpress: boolean = false): Promise<number> {
    try {
      const rate = await this.getShippingRate(amount);
      if (!rate) {
        throw new AppError('No shipping rate found for the given amount', 404);
      }

      return isExpress ? rate.expressShippingFee : rate.regularShippingFee;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to calculate shipping fee', 500);
    }
  }

  private setDefaultUnits<T extends IShippingRateConfig[]>(rates: T): T {
    return rates.map(rate => ({
      ...rate,
      fromAmountUnit: rate.fromAmountUnit || 'VND',
      toAmountUnit: rate.toAmountUnit || 'VND',
      regularShippingFeeUnit: rate.regularShippingFeeUnit || 'VND',
      expressShippingFeeUnit: rate.expressShippingFeeUnit || 'VND',
    })) as T;
  }

  async createShippingRatesWithDefaults(rates: Partial<IShippingRateConfig>[]): Promise<boolean> {
    const ratesWithDefaults = rates.map(rate => ({
      fromAmount: rate.fromAmount || 0,
      toAmount: rate.toAmount || 0,
      regularShippingFee: rate.regularShippingFee || 0,
      expressShippingFee: rate.expressShippingFee || 0,
      fromAmountUnit: rate.fromAmountUnit || 'VND',
      toAmountUnit: rate.toAmountUnit || 'VND',
      regularShippingFeeUnit: rate.regularShippingFeeUnit || 'VND',
      expressShippingFeeUnit: rate.expressShippingFeeUnit || 'VND',
    })) as IShippingRateConfig[];

    return this.updateSetting('shipping_rates', ratesWithDefaults);
  }
}
