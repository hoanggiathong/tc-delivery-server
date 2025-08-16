import { Settings, ISettings, IShippingRate } from '@/models/settings.model';
import { AppError } from '@/middlewares/error.middleware';

export class SettingsService {
  async create(name: string, metadata: IShippingRate[]): Promise<ISettings> {
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

  async update(name: string, metadata: IShippingRate[]): Promise<ISettings> {
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

  async getShippingRate(amount: number): Promise<IShippingRate | null> {
    try {
      const settings = await this.getByName('shipping_rates');
      if (!settings || !settings.metadata) {
        return null;
      }

      const rate = settings.metadata.find(
        rate => amount >= rate.fromAmount && amount <= rate.toAmount
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
}
