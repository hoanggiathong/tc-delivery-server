import { z } from 'zod';

const shippingRateSchema = z.object({
  fromAmount: z.number().min(0, 'From amount must be non-negative'),
  toAmount: z.number().min(0, 'To amount must be non-negative'),
  regularShippingFee: z.number().min(0, 'Regular shipping fee must be non-negative'),
  expressShippingFee: z.number().min(0, 'Express shipping fee must be non-negative'),
});

export const createSettingsSchema = z.object({
  body: z.object({
    name: z.enum(['shipping_rates', 'other_settings']),
    metadata: z
      .array(shippingRateSchema)
      .min(1, 'At least one shipping rate is required')
      .refine(
        rates => {
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
        {
          message: 'Invalid shipping rates: ranges must be continuous and non-overlapping',
        }
      ),
  }),
});

export const updateSettingsSchema = z.object({
  params: z.object({
    name: z.enum(['shipping_rates', 'other_settings']),
  }),
  body: z.object({
    metadata: z
      .array(shippingRateSchema)
      .min(1, 'At least one shipping rate is required')
      .refine(
        rates => {
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
        {
          message: 'Invalid shipping rates: ranges must be continuous and non-overlapping',
        }
      ),
  }),
});

export const getSettingsByNameSchema = z.object({
  params: z.object({
    name: z.enum(['shipping_rates', 'other_settings']),
  }),
});

export const deleteSettingsSchema = z.object({
  params: z.object({
    name: z.enum(['shipping_rates', 'other_settings']),
  }),
});

export const calculateShippingFeeSchema = z.object({
  body: z.object({
    amount: z.number().min(0, 'Amount must be non-negative'),
    isExpress: z.boolean().optional().default(false),
  }),
});

export type CreateSettingsInput = z.infer<typeof createSettingsSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type GetSettingsByNameInput = z.infer<typeof getSettingsByNameSchema>;
export type DeleteSettingsInput = z.infer<typeof deleteSettingsSchema>;
export type CalculateShippingFeeInput = z.infer<typeof calculateShippingFeeSchema>;
