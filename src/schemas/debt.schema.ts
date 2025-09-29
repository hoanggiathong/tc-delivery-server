import { SORT_BY_DEBT } from '@/const/debt.const';
import z from 'zod';

const SortBySchema = z.union([
  z.literal(SORT_BY_DEBT.TO_ROUTE),
  z.literal(SORT_BY_DEBT.TOTAL_COST),
]);

const keySortOptionalSchema = z.preprocess(
  v => (v === null || String(v).trim() === '' ? undefined : String(v).trim()),
  SortBySchema.optional()
);

const typeSortOptionalSchema = z.preprocess(
  v => {
    if (v === null || String(v).trim() === '') {
      return undefined;
    }
    const s = String(v).toLowerCase().trim();
    if (s === 'desc' || s === '-1') {
      return -1;
    }
    if (s === 'asc' || s === '1') {
      return 1;
    }
    return NaN;
  },
  z
    .number()
    .refine(n => n === 1 || n === -1, 'typeSort must be one of asc, desc, 1, -1')
    .optional()
);

// Schema for get list debt
export const getListDebtSchema = z
  .object({
    query: z.object({
      startDate: z
        .string()
        .refine(val => !isNaN(Date.parse(val)), 'Please provide a valid start date in ISO format')
        .transform(val => new Date(val))
        .refine(val => {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          return val >= oneMonthAgo;
        }, 'Start date cannot be more than 1 month in the past'),
      endDate: z
        .string()
        .refine(val => !isNaN(Date.parse(val)), 'Please provide a valid end date in ISO format')
        .transform(val => new Date(val)),
      fromRouteId: z
        .string()
        .min(1, 'From route ID is required')
        .regex(/^[0-9a-fA-F]{24}$/, 'Please provide a valid from route ID')
        .trim(),
      keySort: keySortOptionalSchema,
      typeSort: typeSortOptionalSchema,
      key: z.string().trim().max(120).optional(),
    }),
  })
  .refine(data => data.query.startDate <= data.query.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['query', 'startDate'],
  });
