import {
  Settings,
  ISettings,
  IShippingRateConfig,
  SettingsMetadata,
  IProductConfig,
} from '@/models/settings.model';
import { AppError } from '@/middlewares/error.middleware';
import mongoose from 'mongoose';

export class SettingsService {
  async getSetting<T = SettingsMetadata>(name: string): Promise<T | null> {
    try {
      const setting = await Settings.findOne({ name, isActive: { $ne: false } });
      return setting ? (setting.metadata as T) : null;
    } catch (error) {
      throw new AppError('Failed to get setting', 500);
    }
  }

  async getShippingRates(): Promise<IShippingRateConfig[]> {
    const rates = await this.getSetting<IShippingRateConfig[]>('shipping_rates');

    if (!rates) {
      return [];
    }

    // Ensure all rates have default unit values
    return rates.map(rate => ({
      ...rate,
      fromAmountUnit: rate.fromAmountUnit || 'VND',
      toAmountUnit: rate.toAmountUnit || 'VND',
      regularShippingFeeUnit: rate.regularShippingFeeUnit || 'VND',
      expressShippingFeeUnit: rate.expressShippingFeeUnit || 'VND',
    }));
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

  async appendShippingRates(newRates: IShippingRateConfig[]): Promise<boolean> {
    try {
      const existingRates = await this.getShippingRates();

      // Add _id to new rates if not present
      const newRatesWithIds = newRates.map(rate => ({
        ...rate,
        _id: rate._id || new mongoose.Types.ObjectId(),
      }));

      // Ensure existing rates have _id
      const existingRatesWithIds = existingRates.map(rate => ({
        ...rate,
        _id: rate._id || new mongoose.Types.ObjectId(),
      }));

      const combinedRates = [...existingRatesWithIds, ...newRatesWithIds];
      return this.updateSetting('shipping_rates', combinedRates);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to append shipping rates', 500);
    }
  }

  async appendShippingRatesWithDefaults(rates: Partial<IShippingRateConfig>[]): Promise<boolean> {
    try {
      const ratesWithDefaults = rates.map(rate => ({
        _id: rate._id || new mongoose.Types.ObjectId(),
        fromAmount: rate.fromAmount ?? 0,
        toAmount: rate.toAmount ?? 0,
        regularShippingFee: rate.regularShippingFee ?? 0,
        expressShippingFee: rate.expressShippingFee ?? 0,
        fromAmountUnit: rate.fromAmountUnit || 'VND',
        toAmountUnit: rate.toAmountUnit || 'VND',
        regularShippingFeeUnit: rate.regularShippingFeeUnit || 'VND',
        expressShippingFeeUnit: rate.expressShippingFeeUnit || 'VND',
      })) as IShippingRateConfig[];

      return this.appendShippingRates(ratesWithDefaults);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to append shipping rates with defaults', 500);
    }
  }

  async getProductList(): Promise<IProductConfig[]> {
    const products = await this.getSetting<IProductConfig[]>('product_list');
    return products || [];
  }

  async updateProductList(products: IProductConfig[]): Promise<boolean> {
    return this.updateSetting('product_list', products);
  }

  async appendProducts(newProducts: IProductConfig[]): Promise<boolean> {
    try {
      const existingProducts = await this.getProductList();

      // Add _id to new products if not present
      const newProductsWithIds = newProducts.map(product => ({
        ...product,
        _id: product._id || new mongoose.Types.ObjectId(),
      }));

      // Ensure existing products have _id
      const existingProductsWithIds = existingProducts.map(product => ({
        ...product,
        _id: product._id || new mongoose.Types.ObjectId(),
      }));

      const combinedProducts = [...existingProductsWithIds, ...newProductsWithIds];
      return this.updateSetting('product_list', combinedProducts);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to append products', 500);
    }
  }

  async appendProductsWithDefaults(products: Partial<IProductConfig>[]): Promise<boolean> {
    try {
      const productsWithDefaults = products.map(product => ({
        _id: product._id || new mongoose.Types.ObjectId(),
        name: product.name || '',
        cost: product.cost ?? 0,
      })) as IProductConfig[];

      return this.appendProducts(productsWithDefaults);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to append products with defaults', 500);
    }
  }

  async createProductsWithDefaults(products: Partial<IProductConfig>[]): Promise<boolean> {
    try {
      const productsWithDefaults = products.map(product => ({
        _id: product._id || new mongoose.Types.ObjectId(),
        name: product.name || '',
        cost: product.cost ?? 0,
      })) as IProductConfig[];

      return this.updateSetting('product_list', productsWithDefaults);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create products with defaults', 500);
    }
  }

  async deleteProductById(productId: string): Promise<boolean> {
    try {
      const existingProducts = await this.getProductList();

      // Find the product to delete
      const productIndex = existingProducts.findIndex(
        product => product._id?.toString() === productId
      );

      if (productIndex === -1) {
        throw new AppError(`Product with id "${productId}" not found`, 404);
      }

      // Remove the product from array
      const updatedProducts = existingProducts.filter(
        product => product._id?.toString() !== productId
      );

      // Update with the filtered array
      return this.updateSetting('product_list', updatedProducts);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete product', 500);
    }
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

      if (!rate) {
        return null;
      }

      // Return rate with default unit values
      return {
        ...rate,
        fromAmountUnit: rate.fromAmountUnit || 'VND',
        toAmountUnit: rate.toAmountUnit || 'VND',
        regularShippingFeeUnit: rate.regularShippingFeeUnit || 'VND',
        expressShippingFeeUnit: rate.expressShippingFeeUnit || 'VND',
      };
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

  async createShippingRatesWithDefaults(rates: Partial<IShippingRateConfig>[]): Promise<boolean> {
    try {
      const ratesWithDefaults = rates.map(rate => ({
        _id: rate._id || new mongoose.Types.ObjectId(),
        fromAmount: rate.fromAmount ?? 0,
        toAmount: rate.toAmount ?? 0,
        regularShippingFee: rate.regularShippingFee ?? 0,
        expressShippingFee: rate.expressShippingFee ?? 0,
        fromAmountUnit: rate.fromAmountUnit || 'VND',
        toAmountUnit: rate.toAmountUnit || 'VND',
        regularShippingFeeUnit: rate.regularShippingFeeUnit || 'VND',
        expressShippingFeeUnit: rate.expressShippingFeeUnit || 'VND',
      })) as IShippingRateConfig[];

      return this.updateSetting('shipping_rates', ratesWithDefaults);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create shipping rates with defaults', 500);
    }
  }

  async deleteShippingRateById(rateId: string): Promise<boolean> {
    try {
      const existingRates = await this.getShippingRates();

      // Find the rate to delete
      const rateIndex = existingRates.findIndex(rate => rate._id?.toString() === rateId);

      if (rateIndex === -1) {
        throw new AppError(`Shipping rate with id "${rateId}" not found`, 404);
      }

      // Remove the rate from array
      const updatedRates = existingRates.filter(rate => rate._id?.toString() !== rateId);

      // Update with the filtered array
      return this.updateSetting('shipping_rates', updatedRates);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete shipping rate', 500);
    }
  }
}
