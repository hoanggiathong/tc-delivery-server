import z from 'zod';
import { DATE_YYYY_MM_DD_PATTERN, VALIDATION_MESSAGES } from '@/utils/validation-patterns';

// Schema for get report return money delivery and return delivery
export const getReportReturnMoneyDeliveryAndReturnDeliverySchema = z
  .object({
    query: z.object({
      startDate: z
        .string()
        .regex(DATE_YYYY_MM_DD_PATTERN, VALIDATION_MESSAGES.DATE_YYYY_MM_DD)
        .transform(val => new Date(val)),
      endDate: z
        .string()
        .regex(DATE_YYYY_MM_DD_PATTERN, VALIDATION_MESSAGES.DATE_YYYY_MM_DD)
        .transform(val => new Date(val)),
      routeId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
        .optional(),
    }),
  })
  .refine(data => data.query.startDate <= data.query.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['query', 'startDate'],
  })
  .refine(
    data => {
      const diffTime = Math.abs(data.query.endDate.getTime() - data.query.startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 45;
    },
    {
      message: 'Date range cannot exceed 45 days',
      path: ['query', 'endDate'],
    }
  );

// Schema for accounting report (no routeId required)
export const accountingReportSchema = z
  .object({
    query: z.object({
      startDate: z
        .string()
        .regex(DATE_YYYY_MM_DD_PATTERN, VALIDATION_MESSAGES.DATE_YYYY_MM_DD)
        .transform(val => new Date(val)),
      endDate: z
        .string()
        .regex(DATE_YYYY_MM_DD_PATTERN, VALIDATION_MESSAGES.DATE_YYYY_MM_DD)
        .transform(val => new Date(val)),
    }),
  })
  .refine(data => data.query.startDate <= data.query.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['query', 'startDate'],
  })
  .refine(
    data => {
      const diffTime = Math.abs(data.query.endDate.getTime() - data.query.startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 45;
    },
    {
      message: 'Date range cannot exceed 45 days',
      path: ['query', 'endDate'],
    }
  );
