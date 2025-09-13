import { SettingsService } from '@/services/settings.service';
import { Settings } from '@/models/settings.model';
import { AppError } from '@/middlewares/error.middleware';

jest.mock('@/models/settings.model');

describe('SettingsService', () => {
  let settingsService: SettingsService;
  const MockedSettings = Settings as jest.MockedClass<typeof Settings>;

  const mockShippingRates = [
    {
      fromAmount: 0,
      toAmount: 1000000,
      regularShippingFee: 15000,
      expressShippingFee: 20000,
      fromAmountUnit: 'VND' as const,
      toAmountUnit: 'VND' as const,
      regularShippingFeeUnit: 'VND' as const,
      expressShippingFeeUnit: 'VND' as const,
    },
    {
      fromAmount: 1000001,
      toAmount: 2000000,
      regularShippingFee: 15000,
      expressShippingFee: 30000,
      fromAmountUnit: 'VND' as const,
      toAmountUnit: 'VND' as const,
      regularShippingFeeUnit: 'VND' as const,
      expressShippingFeeUnit: 'VND' as const,
    },
    {
      fromAmount: 2000001,
      toAmount: 3000000,
      regularShippingFee: 20000,
      expressShippingFee: 40000,
      fromAmountUnit: 'VND' as const,
      toAmountUnit: 'VND' as const,
      regularShippingFeeUnit: 'VND' as const,
      expressShippingFeeUnit: 'VND' as const,
    },
  ];

  const mockSettings = {
    _id: '507f1f77bcf86cd799439011',
    name: 'shipping_rates',
    metadata: mockShippingRates,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
  };

  beforeEach(() => {
    settingsService = new SettingsService();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create settings successfully', async () => {
      (MockedSettings.findOne as jest.Mock).mockResolvedValue(null);
      (MockedSettings as any).mockImplementation(() => ({
        ...mockSettings,
        save: jest.fn().mockResolvedValue(mockSettings),
      }));

      const result = await settingsService.create('shipping_rates', mockShippingRates);

      expect(MockedSettings.findOne).toHaveBeenCalledWith({ name: 'shipping_rates' });
      expect(result).toEqual(mockSettings);
    });

    it('should throw error if settings already exists', async () => {
      (MockedSettings.findOne as jest.Mock).mockResolvedValue(mockSettings);

      await expect(settingsService.create('shipping_rates', mockShippingRates)).rejects.toThrow(
        new AppError('Settings with name "shipping_rates" already exists', 409)
      );
    });
  });

  describe('getAll', () => {
    it('should get all settings successfully', async () => {
      const mockSettingsList = [mockSettings];
      (MockedSettings.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockSettingsList),
      });

      const result = await settingsService.getAll();

      expect(MockedSettings.find).toHaveBeenCalled();
      expect(result).toEqual(mockSettingsList);
    });

    it('should throw error on failure', async () => {
      (MockedSettings.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(settingsService.getAll()).rejects.toThrow(
        new AppError('Failed to fetch settings', 500)
      );
    });
  });

  describe('getByName', () => {
    it('should get settings by name successfully', async () => {
      (MockedSettings.findOne as jest.Mock).mockResolvedValue(mockSettings);

      const result = await settingsService.getByName('shipping_rates');

      expect(MockedSettings.findOne).toHaveBeenCalledWith({ name: 'shipping_rates' });
      expect(result).toEqual(mockSettings);
    });

    it('should throw error if settings not found', async () => {
      (MockedSettings.findOne as jest.Mock).mockResolvedValue(null);

      await expect(settingsService.getByName('shipping_rates')).rejects.toThrow(
        new AppError('Settings with name "shipping_rates" not found', 404)
      );
    });
  });

  describe('update', () => {
    it('should update settings successfully', async () => {
      const updatedSettings = { ...mockSettings, metadata: mockShippingRates };
      (MockedSettings.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedSettings);

      const result = await settingsService.update('shipping_rates', mockShippingRates);

      expect(MockedSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { name: 'shipping_rates' },
        { metadata: mockShippingRates },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(updatedSettings);
    });

    it('should throw error if settings not found', async () => {
      (MockedSettings.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(settingsService.update('shipping_rates', mockShippingRates)).rejects.toThrow(
        new AppError('Settings with name "shipping_rates" not found', 404)
      );
    });
  });

  describe('delete', () => {
    it('should delete settings successfully', async () => {
      (MockedSettings.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      await settingsService.delete('shipping_rates');

      expect(MockedSettings.deleteOne).toHaveBeenCalledWith({ name: 'shipping_rates' });
    });

    it('should throw error if settings not found', async () => {
      (MockedSettings.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 0 });

      await expect(settingsService.delete('shipping_rates')).rejects.toThrow(
        new AppError('Settings with name "shipping_rates" not found', 404)
      );
    });
  });

  describe('getShippingRate', () => {
    it('should get shipping rate for amount successfully', async () => {
      jest.spyOn(settingsService, 'getByName').mockResolvedValue(mockSettings as any);

      const result = await settingsService.getShippingRate(1500000);

      expect(result).toEqual({
        fromAmount: 1000001,
        toAmount: 2000000,
        regularShippingFee: 15000,
        expressShippingFee: 30000,
        fromAmountUnit: 'VND',
        toAmountUnit: 'VND',
        regularShippingFeeUnit: 'VND',
        expressShippingFeeUnit: 'VND',
      });
    });

    it('should return null if no rate found for amount', async () => {
      jest.spyOn(settingsService, 'getByName').mockResolvedValue(mockSettings as any);

      const result = await settingsService.getShippingRate(5000000);

      expect(result).toBeNull();
    });

    it('should return null if settings not found', async () => {
      jest.spyOn(settingsService, 'getByName').mockRejectedValue(new AppError('Not found', 404));

      const result = await settingsService.getShippingRate(1500000);

      expect(result).toBeNull();
    });
  });

  describe('calculateShippingFee', () => {
    it('should calculate regular shipping fee successfully', async () => {
      jest.spyOn(settingsService, 'getShippingRate').mockResolvedValue({
        fromAmount: 1000001,
        toAmount: 2000000,
        regularShippingFee: 15000,
        expressShippingFee: 30000,
        fromAmountUnit: 'VND',
        toAmountUnit: 'VND',
        regularShippingFeeUnit: 'VND',
        expressShippingFeeUnit: 'VND',
      });

      const result = await settingsService.calculateShippingFee(1500000, false);

      expect(result).toBe(15000);
    });

    it('should calculate express shipping fee successfully', async () => {
      jest.spyOn(settingsService, 'getShippingRate').mockResolvedValue({
        fromAmount: 1000001,
        toAmount: 2000000,
        regularShippingFee: 15000,
        expressShippingFee: 30000,
        fromAmountUnit: 'VND',
        toAmountUnit: 'VND',
        regularShippingFeeUnit: 'VND',
        expressShippingFeeUnit: 'VND',
      });

      const result = await settingsService.calculateShippingFee(1500000, true);

      expect(result).toBe(30000);
    });

    it('should return 0 when isFree is true', async () => {
      // Mock shouldn't be called when isFree is true
      const mockGetShippingRate = jest.spyOn(settingsService, 'getShippingRate');

      const result = await settingsService.calculateShippingFee(1500000, false, true);
      expect(result).toBe(0);
      expect(mockGetShippingRate).not.toHaveBeenCalled();
    });

    it('should return 0 when isFree is true even for express transfer', async () => {
      // Mock shouldn't be called when isFree is true
      const mockGetShippingRate = jest.spyOn(settingsService, 'getShippingRate');

      const result = await settingsService.calculateShippingFee(1500000, true, true);
      expect(result).toBe(0);
      expect(mockGetShippingRate).not.toHaveBeenCalled();
    });

    it('should throw error if no rate found', async () => {
      jest.spyOn(settingsService, 'getShippingRate').mockResolvedValue(null);

      await expect(settingsService.calculateShippingFee(5000000)).rejects.toThrow(
        new AppError('No shipping rate found for the given amount', 404)
      );
    });
  });
});
