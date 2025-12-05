import { DEBT_MANAGEMENT_TYPE, SORT_BY } from '@/const/debt-management.const';
import z from 'zod';
import { OBJECTID_PATTERN, VALIDATION_MESSAGES } from '@/utils/validation-patterns';

const SortBySchema = z.union([
  z.literal(SORT_BY.TO_ROUTE),
  z.literal(SORT_BY.CASH),
  z.literal(SORT_BY.CASH_DATE),
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

// Schema for get list receipt debt management
export const getListReceiptDebtManagementSchema = z
  .object({
    query: z.object({
      startDate: z
        .string()
        .refine(val => !isNaN(Date.parse(val)), 'Please provide a valid start date in ISO format')
        .transform(val => new Date(val)),
      endDate: z
        .string()
        .refine(val => !isNaN(Date.parse(val)), 'Please provide a valid end date in ISO format')
        .transform(val => new Date(val)),
      fromRouteId: z
        .string()
        .min(1, 'From route ID is required')
        .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID)
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

export const getListPaymentDebtManagementSchema = z
  .object({
    query: z.object({
      startDate: z
        .string()
        .refine(val => !isNaN(Date.parse(val)), 'Please provide a valid start date in ISO format')
        .transform(val => new Date(val)),
      endDate: z
        .string()
        .refine(val => !isNaN(Date.parse(val)), 'Please provide a valid end date in ISO format')
        .transform(val => new Date(val)),
      toRouteId: z
        .string()
        .min(1, 'To route ID is required')
        .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID)
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

export const debtManagementParamsSchema = z.object({
  params: z.object({
    id: z
      .string()
      .min(1, 'Debt Management ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID)
      .trim(),
  }),
});

export const createDebtManagementSchema = z.object({
  body: z.object({
    content: z
      .string()
      .min(1, 'content is required')
      .max(100, 'content must not exceed 100 characters')
      .trim(),
    fromRoute: z
      .string()
      .min(1, 'To route ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID)
      .trim(),
    toRoute: z
      .string()
      .min(1, 'To route ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID)
      .trim(),
    cash: z.number().min(0, 'Send cost must be positive'),
    type: z.enum([
      DEBT_MANAGEMENT_TYPE.COLLECTION,
      DEBT_MANAGEMENT_TYPE.PAYMENT,
      DEBT_MANAGEMENT_TYPE.RECEIPT,
    ]),
    cashDate: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), 'Please provide a valid cash date in ISO format')
      .transform(val => new Date(val)),
  }),
});
export type CreateDebtManagementRequest = z.infer<typeof createDebtManagementSchema>['body'];
