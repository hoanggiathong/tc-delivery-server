import { AppError } from '@/middlewares/error.middleware';
import {
  IProductConfig,
  IProductConfigResponse,
  ISettings,
  IShippingRateConfig,
  IShippingRateConfigResponse,
  Settings,
  SettingsMetadata,
} from '@/models/settings.model';
import { IBankConfig, IBankConfigResponse } from '@/types/setting.type';
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

  private async getShippingRatesInternal(): Promise<IShippingRateConfig[]> {
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

  async getShippingRates(): Promise<IShippingRateConfigResponse[]> {
    const rates = await this.getShippingRatesInternal();

    if (!rates || rates.length === 0) {
      return [];
    }

    // Transform rates to include id field
    return rates.map(rate => ({
      id: rate._id?.toString() || '',
      fromAmount: rate.fromAmount,
      toAmount: rate.toAmount,
      regularShippingFee: rate.regularShippingFee,
      expressShippingFee: rate.expressShippingFee,
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
      // Check if it's a MongoDB validation error with our custom message
      if (error instanceof Error && error.name === 'ValidationError') {
        const mongoError = error as {
          errors?: { metadata?: { message: string } };
        };
        if (mongoError.errors?.metadata?.message) {
          throw new AppError(mongoError.errors.metadata.message, 400);
        }
      }
      throw new AppError('Failed to update setting', 500);
    }
  }

  async updateShippingRates(rates: IShippingRateConfig[]): Promise<boolean> {
    return this.updateSetting('shipping_rates', rates);
  }

  async appendShippingRates(newRates: IShippingRateConfig[]): Promise<boolean> {
    try {
      const existingRates = await this.getShippingRatesInternal();

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

  async updateShippingRateById(
    rateId: string,
    updates: Partial<IShippingRateConfig>
  ): Promise<IShippingRateConfig> {
    try {
      const existingRates = await this.getShippingRatesInternal();

      // Find the rate to update
      const rateIndex = existingRates.findIndex(rate => rate._id?.toString() === rateId);

      if (rateIndex === -1) {
        throw new AppError(`Shipping rate with id "${rateId}" not found`, 404);
      }

      // Update the rate with new values
      const updatedRate = {
        ...existingRates[rateIndex],
        ...(updates.fromAmount !== undefined && { fromAmount: updates.fromAmount }),
        ...(updates.toAmount !== undefined && { toAmount: updates.toAmount }),
        ...(updates.regularShippingFee !== undefined && {
          regularShippingFee: updates.regularShippingFee,
        }),
        ...(updates.expressShippingFee !== undefined && {
          expressShippingFee: updates.expressShippingFee,
        }),
        ...(updates.fromAmountUnit !== undefined && { fromAmountUnit: updates.fromAmountUnit }),
        ...(updates.toAmountUnit !== undefined && { toAmountUnit: updates.toAmountUnit }),
        ...(updates.regularShippingFeeUnit !== undefined && {
          regularShippingFeeUnit: updates.regularShippingFeeUnit,
        }),
        ...(updates.expressShippingFeeUnit !== undefined && {
          expressShippingFeeUnit: updates.expressShippingFeeUnit,
        }),
      };

      // Replace the rate in the array
      const updatedRates = [...existingRates];
      updatedRates[rateIndex] = updatedRate;

      // Update the setting
      const success = await this.updateSetting('shipping_rates', updatedRates);
      if (!success) {
        throw new AppError('Failed to update shipping rate', 500);
      }

      return updatedRate;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update shipping rate', 500);
    }
  }

  private async getProductListInternal(): Promise<IProductConfig[]> {
    const products = await this.getSetting<IProductConfig[]>('product_list');
    return products || [];
  }

  async getProductList(): Promise<IProductConfigResponse[]> {
    const products = await this.getProductListInternal();
    if (!products || products.length === 0) {
      return [];
    }

    // Transform products to include id field
    return products.map(product => ({
      id: product._id?.toString() || '',
      name: product.name,
      cost: product.cost,
    }));
  }

  async updateProductList(products: IProductConfig[]): Promise<boolean> {
    return this.updateSetting('product_list', products);
  }

  async appendProducts(newProducts: IProductConfig[]): Promise<boolean> {
    try {
      const existingProducts = await this.getProductListInternal();

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

  async updateProductById(
    productId: string,
    updates: Partial<IProductConfig>
  ): Promise<IProductConfig> {
    try {
      const existingProducts = await this.getProductListInternal();

      // Find the product to update
      const productIndex = existingProducts.findIndex(
        product => product._id?.toString() === productId
      );

      if (productIndex === -1) {
        throw new AppError(`Product with id "${productId}" not found`, 404);
      }

      // Update the product with new values
      const updatedProduct = {
        ...existingProducts[productIndex],
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.cost !== undefined && { cost: updates.cost }),
      };

      // Replace the product in the array
      const updatedProducts = [...existingProducts];
      updatedProducts[productIndex] = updatedProduct;

      // Update the setting
      const success = await this.updateSetting('product_list', updatedProducts);
      if (!success) {
        throw new AppError('Failed to update product', 500);
      }

      return updatedProduct;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update product', 500);
    }
  }

  async deleteProductById(productId: string): Promise<boolean> {
    try {
      const existingProducts = await this.getProductListInternal();

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

  async calculateShippingFee(
    amount: number,
    isExpress: boolean = false,
    isFree: boolean = false
  ): Promise<number> {
    try {
      // If isFree is true, return 0 regardless of amount or transfer type
      if (isFree) {
        return 0;
      }

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
      const existingRates = await this.getShippingRatesInternal();

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

  async createBanksWithDefaults(banks: Partial<IBankConfig>[]): Promise<boolean> {
    try {
      const banksWithDefaults = banks.map(bank => ({
        _id: bank._id || new mongoose.Types.ObjectId(),
        name: bank.name || '',
        code: bank.code || '',
        image: bank.image || '',
      })) as IBankConfig[];

      return this.updateSetting('banks_list', banksWithDefaults);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create products with defaults', 500);
    }
  }

  private async getBankListInternal(): Promise<IBankConfig[]> {
    const banks = await this.getSetting<IBankConfig[]>('banks_list');
    return banks || [];
  }

  async getBankList(): Promise<IBankConfigResponse[]> {
    const banks = await this.getBankListInternal();
    if (!banks || banks.length === 0) {
      return [];
    }

    // Transform banks to include id field
    const result = banks.map(bank => ({
      id: bank._id?.toString() || '',
      name: bank.name,
      code: bank.code,
      image: bank.image,
    }));

    return result;
  }
}
