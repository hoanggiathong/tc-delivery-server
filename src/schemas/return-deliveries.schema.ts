import { SORT_BY_RETURN_DELIVERIES } from '@/const/return-deliveries.const';
import { DATE_YYYY_MM_DD_PATTERN, VALIDATION_MESSAGES } from '@/utils/validation-patterns';
import z from 'zod';

const SortBySchema = z.literal(SORT_BY_RETURN_DELIVERIES.CREATED_AT);

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

// Schema for get list return deliveries
export const getListReturnDeliveriesSchema = z
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
      phoneReceiver: z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone receiver')
        .trim()
        .optional(),
      keySort: keySortOptionalSchema,
      typeSort: typeSortOptionalSchema,
      key: z.string().trim().max(120).optional(),
    }),
  })
  .refine(data => data.query.endDate.getDate() - data.query.startDate.getDate() <= 45, {
    message: 'The difference between start date and end date must be less than 45 days',
    path: ['query', 'startDate'],
  });

// Schema for get information receiver
export const getInformationReceiverSchema = z.object({
  params: z.object({
    phoneReceiver: z
      .string()
      .min(1, 'Phone receiver is required')
      .max(100, 'Phone receiver must not exceed 100 characters')
      .trim(),
  }),
});

// Schema for get list debt of return deliveries today
export const getListDebtOfReturnDeliveriesTodaySchema = z
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
    }),
  })
  .refine(data => data.query.endDate.getDate() - data.query.startDate.getDate() <= 45, {
    message: 'The difference between start date and end date must be less than 45 days',
    path: ['query', 'startDate'],
  });

// Schema for get list collect for customer not collected (no parameters needed)
export const getListCollectForCustomerNotCollectedSchema = z.object({
  query: z.object({}).optional(),
});

// Schema for get list collect cost of return deliveries not collected
export const getListCollectCostOfReturnDeliveriesNotCollectedSchema = z.object({
  query: z.object({}).optional(),
});

// Schema for get list all return deliveries
export const getListAllReturnDeliveriesSchema = z
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
    }),
  })
  .refine(data => data.query.endDate.getDate() - data.query.startDate.getDate() <= 45, {
    message: 'The difference between start date and end date must be less than 45 days',
    path: ['query', 'startDate'],
  });

// Schema for get list collect cost of return deliveries
export const getListCollectCostOfReturnDeliveriesSchema = z.object({
  query: z.object({
    startDate: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), 'Please provide a valid start date in ISO format')
      .transform(val => new Date(val)),
    endDate: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), 'Please provide a valid end date in ISO format')
      .transform(val => new Date(val)),
  }),
});

// Schema for get list return deliveries is return
export const getListReturnDeliveriesIsReturnSchema = z
  .object({
    query: z.object({
      startDate: z
        .string()
        .regex(DATE_YYYY_MM_DD_PATTERN, VALIDATION_MESSAGES.DATE_YYYY_MM_DD)
        .transform(val => {
          // Parse date as server's local timezone start of day (00:00:00)
          const [year, month, day] = val.split('-').map(Number);
          return new Date(year, month - 1, day, 0, 0, 0, 0);
        }),
      endDate: z
        .string()
        .regex(DATE_YYYY_MM_DD_PATTERN, VALIDATION_MESSAGES.DATE_YYYY_MM_DD)
        .transform(val => {
          // Parse date as server's local timezone end of day (23:59:59.999)
          const [year, month, day] = val.split('-').map(Number);
          return new Date(year, month - 1, day, 23, 59, 59, 999);
        }),
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

// Schema for get detail images return delivery
export const getDetailImagesReturnDeliverySchema = z.object({
  params: z.object({
    deliveryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
  }),
});

// Schema for update note return delivery
export const updateNoteReturnDeliverySchema = z.object({
  params: z.object({
    deliveryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
  }),
  body: z.object({
    note: z.string().min(1, 'Note is required'),
  }),
});

// Schema for upload images to return delivery
export const uploadReturnDeliveryImagesSchema = z.object({
  body: z.object({
    deliveryId: z
      .string()
      .min(1, 'Delivery ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
    // Multiple images support
    images: z
      .array(
        z.object({
          index: z.coerce.number().min(1).max(5),
          rotate: z.coerce
            .number()
            .refine(val => [0, 90, 180, 270].includes(val), {
              message: 'Rotate must be 0, 90, 180, or 270',
            })
            .default(0),
        })
      )
      .max(5, 'Maximum 5 images allowed')
      .optional(),
  }),
});

// Schema for update status with images (case data = 1) - New formData format
export const updateStatusWithImagesSchema = z.object({
  body: z.object({
    deliveryId: z
      .string()
      .min(1, 'Delivery ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
    customerId: z
      .string()
      .min(1, 'Customer ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
    address: z.string().optional(),
    identityCardName: z.string().optional(),
    identityCardIssuedDate: z.string().optional(),
    identityCardNumber: z.string().optional(),
    notes: z.string().optional(),
    // Customer images
    customerImages: z
      .preprocess(
        val => {
          // Filter out undefined, null, or empty objects from array
          if (!val || !Array.isArray(val)) {
            return undefined;
          }
          return val.filter(
            (item: unknown) =>
              item !== null &&
              item !== undefined &&
              typeof item === 'object' &&
              Object.keys(item).length > 0
          );
        },
        z
          .array(
            z.object({
              index: z.coerce.number().min(1).max(5),
              rotate: z.coerce
                .number()
                .refine(val => [0, 90, 180, 270].includes(val), {
                  message: 'Rotate must be 0, 90, 180, or 270',
                })
                .default(0),
            })
          )
          .max(5, 'Maximum 5 customer images allowed')
          .optional()
      )
      .optional(),
    // Return delivery images
    returnDeliveryImages: z
      .preprocess(
        val => {
          // Filter out undefined, null, or empty objects from array
          if (!val || !Array.isArray(val)) {
            return undefined;
          }
          return val.filter(
            (item: unknown) =>
              item !== null &&
              item !== undefined &&
              typeof item === 'object' &&
              Object.keys(item).length > 0
          );
        },
        z
          .array(
            z.object({
              index: z.coerce.number().min(1).max(5),
              rotate: z.coerce
                .number()
                .refine(val => [0, 90, 180, 270].includes(val), {
                  message: 'Rotate must be 0, 90, 180, or 270',
                })
                .default(0),
            })
          )
          .max(5, 'Maximum 5 return delivery images allowed')
          .optional()
      )
      .optional(),
  }),
});

// Schema for update status without images (case update data only)
export const updateStatusWithoutImagesSchema = z.object({
  body: z.object({
    arrayListReturnDelivery: z
      .array(
        z.object({
          deliveryId: z
            .string()
            .min(1, 'Delivery ID is required')
            .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
          // customerId: z
          //   .string()
          //   .min(1, 'Customer ID is required')
          //   .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
          // address: z.string().optional(),
          // identityCardIssuedDate: z.string().optional(),
          // identityCardNumber: z.string().optional(),
        })
      )
      .min(1, 'At least one return delivery item is required'),
  }),
});

// Schema for get list report return delivery with status done
export const getListReportReturnDeliveryWithStatusDoneSchema = z.object({
  query: z.object({}),
});
