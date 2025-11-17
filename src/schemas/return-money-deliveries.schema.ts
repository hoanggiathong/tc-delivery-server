import z from 'zod';
import { DATE_YYYY_MM_DD_PATTERN, VALIDATION_MESSAGES } from '@/utils/validation-patterns';

// Schema for get list return money deliveries type collect status done
export const getListReturnMoneyDeliveriesTypeCollectStatusDoneSchema = z
  .object({
    query: z.object({
      startDate: z
        .string()
        .regex(DATE_YYYY_MM_DD_PATTERN, VALIDATION_MESSAGES.DATE_YYYY_MM_DD)
        .transform(val => new Date(val)),
      endDate: z
        .string()
        .regex(DATE_YYYY_MM_DD_PATTERN, VALIDATION_MESSAGES.DATE_YYYY_MM_DD)
        .transform(val => new Date(val))
        .refine(val => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const endDate = new Date(val);
          endDate.setHours(0, 0, 0, 0);
          return endDate <= today;
        }, 'End date cannot be in the future'),
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
      return diffDays <= 30;
    },
    {
      message: 'Date range cannot exceed 30 days',
      path: ['query', 'endDate'],
    }
  );
