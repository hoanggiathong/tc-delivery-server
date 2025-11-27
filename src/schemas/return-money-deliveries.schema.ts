import z from 'zod';
import { DATE_YYYY_MM_DD_PATTERN, VALIDATION_MESSAGES } from '@/utils/validation-patterns';

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
      return diffDays <= 30;
    },
    {
      message: 'Date range cannot exceed 30 days',
      path: ['query', 'endDate'],
    }
  );

// Schema for update status return money delivery with images
export const updateStatusReturnMoneyDeliveryWithImagesSchema = z.object({
  body: z.object({
    moneyDeliveryId: z
      .string()
      .min(1, 'Money delivery ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
    contentReturn: z.string().optional(),
    // Money delivery images
    images: z
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
          .max(5, 'Maximum 5 images allowed')
          .optional()
      )
      .optional(),
  }),
});

// Schema for get list old money delivery not type collect cost
export const getListOldMoneyDeliveryNotTypeCollectCostSchema = z
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
      return diffDays <= 30;
    },
    {
      message: 'Date range cannot exceed 30 days',
      path: ['query', 'endDate'],
    }
  );

// Schema for get list money delivery not type collect cost with status done
export const getListMoneyDeliveryNotTypeCollectCostWithStatusDoneSchema = z
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
      return diffDays <= 30;
    },
    {
      message: 'Date range cannot exceed 30 days',
      path: ['query', 'endDate'],
    }
  );

// Schema for get list money delivery type normal with status waiting
export const getListMoneyDeliveryTypeNormalWithStatusWaitingSchema = z
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
      return diffDays <= 30;
    },
    {
      message: 'Date range cannot exceed 30 days',
      path: ['query', 'endDate'],
    }
  );

// Schema for get list money delivery type collect cost with status done
export const getListMoneyDeliveryTypeCollectCostWithStatusDoneSchema = z
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
      // .refine(val => {
      //   const today = new Date();
      //   today.setHours(0, 0, 0, 0);
      //   const endDate = new Date(val);
      //   endDate.setHours(0, 0, 0, 0);
      //   return endDate <= today;
      // }, 'End date cannot be in the future'),
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

// Schema for get list return money type collect cost with status waiting
export const getListReturnMoneyTypeCollectCostWithStatusWaitingSchema = z
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

// Schema for get list report return money delivery type collect with status done
export const getListReportReturnMoneyDeliveryTypeCollectWithStatusDoneSchema = z.object({
  query: z.object({}),
});

// Schema for get list report return money delivery not type collect with status done
export const getListReportReturnMoneyDeliveryNotTypeCollectWithStatusDoneSchema = z.object({
  query: z.object({}),
});

// Schema for update status with customer images and money images
export const updateStatusWithCustomerImagesAndMoneyImagesSchema = z.object({
  body: z.object({
    moneyDeliveryId: z
      .string()
      .min(1, 'Money delivery ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
    customerId: z
      .string()
      .min(1, 'Customer ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
    address: z.string().optional(),
    identityCardIssuedDate: z.string().optional(),
    identityCardNumber: z.string().optional(),
    contentReturn: z.string().optional(),
    // Customer images (optional)
    customerImages: z
      .preprocess(
        val => {
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
    // Money images (optional)
    moneyImages: z
      .preprocess(
        val => {
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
          .max(5, 'Maximum 5 money images allowed')
          .optional()
      )
      .optional(),
  }),
});
