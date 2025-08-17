import { DeliveryService } from '@/services/delivery.service';
import { SettingsService } from '@/services/settings.service';

jest.mock('@/services/settings.service');
const MockedSettingsService = SettingsService as jest.MockedClass<typeof SettingsService>;

describe('DeliveryService - ItemCost Validation', () => {
  let deliveryService: DeliveryService;
  let mockSettingsService: jest.Mocked<SettingsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    deliveryService = new DeliveryService();
    mockSettingsService = new MockedSettingsService() as jest.Mocked<SettingsService>;
    (deliveryService as any).settingsService = mockSettingsService;
  });

  describe('validateItemCost', () => {
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
        regularShippingFee: 25000,
        expressShippingFee: 35000,
        fromAmountUnit: 'VND' as const,
        toAmountUnit: 'VND' as const,
        regularShippingFeeUnit: 'VND' as const,
        expressShippingFeeUnit: 'VND' as const,
      },
      {
        fromAmount: 2000001,
        toAmount: 5000000,
        regularShippingFee: 2,
        expressShippingFee: 3,
        fromAmountUnit: 'VND' as const,
        toAmountUnit: 'VND' as const,
        regularShippingFeeUnit: '%' as const,
        expressShippingFeeUnit: '%' as const,
      },
    ];

    it('should validate itemCost successfully for fixed fee rates', async () => {
      mockSettingsService.getShippingRates.mockResolvedValue(mockShippingRates);

      // Test case: itemValue 500,000 VND should use first rate (15,000 VND fixed fee)
      await expect((deliveryService as any).validateItemCost(500000, 15000)).resolves.not.toThrow();
    });

    it('should validate itemCost successfully for percentage-based rates', async () => {
      mockSettingsService.getShippingRates.mockResolvedValue(mockShippingRates);

      // Test case: itemValue 3,000,000 VND should use third rate (2% = 60,000 VND)
      const itemValue = 3000000;
      const expectedFee = Math.round(itemValue * 0.02); // 2% = 60,000

      await expect(
        (deliveryService as any).validateItemCost(itemValue, expectedFee)
      ).resolves.not.toThrow();
    });

    it('should throw error for incorrect fixed fee amount', async () => {
      mockSettingsService.getShippingRates.mockResolvedValue(mockShippingRates);

      // Test case: itemValue 500,000 VND should use 15,000 fee, but providing 20,000
      await expect((deliveryService as any).validateItemCost(500000, 20000)).rejects.toThrow(
        'Invalid item cost. Expected: 15,000 VND, but received: 20,000 VND. Please correct the item cost.'
      );
    });

    it('should throw error for incorrect percentage-based fee amount', async () => {
      mockSettingsService.getShippingRates.mockResolvedValue(mockShippingRates);

      // Test case: itemValue 3,000,000 VND should use 2% (60,000), but providing 50,000
      await expect((deliveryService as any).validateItemCost(3000000, 50000)).rejects.toThrow(
        'Invalid item cost. Expected: 2% of item value (60,000 VND), but received: 50,000 VND. Please correct the item cost.'
      );
    });

    it('should throw error when no shipping rate found for item value', async () => {
      mockSettingsService.getShippingRates.mockResolvedValue(mockShippingRates);

      // Test case: itemValue 10,000,000 VND exceeds all rate ranges
      await expect((deliveryService as any).validateItemCost(10000000, 100000)).rejects.toThrow(
        'No shipping rate found for item value 10,000,000 VND. Please check the item value.'
      );
    });

    it('should throw error when shipping rate settings not found', async () => {
      mockSettingsService.getShippingRates.mockResolvedValue([]);

      await expect((deliveryService as any).validateItemCost(500000, 15000)).rejects.toThrow(
        'Shipping rate configuration not found. Please contact administrator.'
      );
    });

    it('should throw error when shipping rates metadata is empty', async () => {
      mockSettingsService.getShippingRates.mockResolvedValue([]);

      await expect((deliveryService as any).validateItemCost(500000, 15000)).rejects.toThrow(
        'Shipping rate configuration not found. Please contact administrator.'
      );
    });

    it('should throw error when shipping rates metadata is not an array', async () => {
      mockSettingsService.getShippingRates.mockResolvedValue(null as any);

      await expect((deliveryService as any).validateItemCost(500000, 15000)).rejects.toThrow(
        'Shipping rate configuration not found. Please contact administrator.'
      );
    });

    it('should handle edge case: itemValue at exact boundary (lower bound)', async () => {
      mockSettingsService.getShippingRates.mockResolvedValue(mockShippingRates);

      // Test case: itemValue exactly at fromAmount (1,000,001) should use second rate
      await expect(
        (deliveryService as any).validateItemCost(1000001, 25000)
      ).resolves.not.toThrow();
    });

    it('should handle edge case: itemValue at exact boundary (upper bound)', async () => {
      mockSettingsService.getShippingRates.mockResolvedValue(mockShippingRates);

      // Test case: itemValue exactly at toAmount (1,000,000) should use first rate
      await expect(
        (deliveryService as any).validateItemCost(1000000, 15000)
      ).resolves.not.toThrow();
    });

    it('should handle percentage calculation with proper rounding', async () => {
      const percentageRates = [
        {
          fromAmount: 0,
          toAmount: 10000000,
          regularShippingFee: 2.5,
          expressShippingFee: 3.5,
          fromAmountUnit: 'VND' as const,
          toAmountUnit: 'VND' as const,
          regularShippingFeeUnit: '%' as const,
          expressShippingFeeUnit: '%' as const,
        },
      ];
      mockSettingsService.getShippingRates.mockResolvedValue(percentageRates);

      // Test case: 2.5% of 1,000,000 = 25,000 (should round properly)
      const itemValue = 1000000;
      const expectedFee = Math.round(itemValue * 0.025); // 25,000

      await expect(
        (deliveryService as any).validateItemCost(itemValue, expectedFee)
      ).resolves.not.toThrow();
    });

    it('should handle small percentage calculations', async () => {
      const smallPercentageRates = [
        {
          fromAmount: 0,
          toAmount: 10000000,
          regularShippingFee: 0.5,
          expressShippingFee: 1,
          fromAmountUnit: 'VND' as const,
          toAmountUnit: 'VND' as const,
          regularShippingFeeUnit: '%' as const,
          expressShippingFeeUnit: '%' as const,
        },
      ];
      mockSettingsService.getShippingRates.mockResolvedValue(smallPercentageRates);

      // Test case: 0.5% of 100,000 = 500
      const itemValue = 100000;
      const expectedFee = Math.round(itemValue * 0.005); // 500

      await expect(
        (deliveryService as any).validateItemCost(itemValue, expectedFee)
      ).resolves.not.toThrow();
    });

    it('should throw error for database/service errors', async () => {
      mockSettingsService.getShippingRates.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect((deliveryService as any).validateItemCost(500000, 15000)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle zero itemValue correctly', async () => {
      mockSettingsService.getShippingRates.mockResolvedValue(mockShippingRates);

      // Test case: itemValue 0 should use first rate (15,000 VND fixed fee)
      await expect((deliveryService as any).validateItemCost(0, 15000)).resolves.not.toThrow();
    });

    it('should handle zero percentage calculation', async () => {
      const zeroPercentageRates = [
        {
          fromAmount: 0,
          toAmount: 10000000,
          regularShippingFee: 2,
          expressShippingFee: 3,
          fromAmountUnit: 'VND' as const,
          toAmountUnit: 'VND' as const,
          regularShippingFeeUnit: '%' as const,
          expressShippingFeeUnit: '%' as const,
        },
      ];
      mockSettingsService.getShippingRates.mockResolvedValue(zeroPercentageRates);

      // Test case: 2% of 0 = 0
      await expect((deliveryService as any).validateItemCost(0, 0)).resolves.not.toThrow();
    });
  });
});
