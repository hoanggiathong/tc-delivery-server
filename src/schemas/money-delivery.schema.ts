import { z } from 'zod';
import {
  DELIVERY_IDENTIFIER_PATTERN,
  MONEY_DELIVERY_IDENTIFIER_PATTERN,
  PHONE_NUMBER_PATTERN,
  OBJECTID_PATTERN,
  VALIDATION_MESSAGES,
  DATE_YYYY_MM_DD_PATTERN,
} from '@/utils/validation-patterns';
import {
  MoneyDeliveryStatus,
  MoneyDeliveryType,
  TransferType,
} from '@/models/money-delivery.model';

export const createMoneyDeliverySchema = z
  .object({
    body: z.object({
      senderName: z
        .string()
        .min(1, 'Sender name is required')
        .max(100, 'Sender name must not exceed 100 characters')
        .trim(),
      senderPhone: z
        .string()
        .min(1, 'Sender phone is required')
        .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
        .trim(),
      receiverName: z
        .string()
        .min(1, 'Receiver name is required')
        .max(100, 'Receiver name must not exceed 100 characters')
        .trim(),
      receiverPhone: z
        .string()
        .min(1, 'Receiver phone is required')
        .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
        .trim(),
      toRouteId: z
        .string()
        .min(1, 'To route ID is required')
        .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID)
        .trim(),
      sendMoneyAmount: z.number().min(0, 'Send money amount must be positive'),
      sendCost: z.number().min(0, 'Send cost must be positive'),
      transferType: z.nativeEnum(TransferType).optional(),
      isFree: z.boolean().optional(),
      notes: z.string().trim().optional(),
      status: z.nativeEnum(MoneyDeliveryStatus).optional(),
      type: z.nativeEnum(MoneyDeliveryType).optional(),
      deliveryId: z
        .string()
        .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID)
        .trim()
        .optional(),
    }),
  })
  .refine(
    data => {
      const { type, deliveryId } = data.body;
      if (type === 'collect' || type === 'collectForCustomer') {
        return !!deliveryId;
      }
      if (type === 'normal' && deliveryId) {
        return false;
      }
      return true;
    },
    {
      message:
        'deliveryId is required when type is "collect" or "collectForCustomer", and must be null when type is "normal"',
      path: ['body', 'deliveryId'],
    }
  );

export const updateMoneyDeliverySchema = z.object({
  body: z.object({
    senderName: z
      .string()
      .min(1, 'Sender name is required')
      .max(100, 'Sender name must not exceed 100 characters')
      .trim()
      .optional(),
    senderPhone: z
      .string()
      .min(1, 'Sender phone is required')
      .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
      .trim()
      .optional(),
    receiverName: z
      .string()
      .min(1, 'Receiver name is required')
      .max(100, 'Receiver name must not exceed 100 characters')
      .trim()
      .optional(),
    receiverPhone: z
      .string()
      .min(1, 'Receiver phone is required')
      .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
      .trim()
      .optional(),
    toRouteId: z
      .string()
      .min(1, 'To route ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID)
      .trim()
      .optional(),
    sendMoneyAmount: z.number().min(0, 'Send money amount must be positive').optional(),
    sendCost: z.number().min(0, 'Send cost must be positive').optional(),
    transferType: z.nativeEnum(TransferType).optional(),
    isFree: z.boolean().optional(),
    notes: z.string().trim().optional(),
    status: z.nativeEnum(MoneyDeliveryStatus).optional(),
    deliveryId: z.string().regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID).trim().optional(),
  }),
});

export const moneyDeliveryParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Money delivery ID is required'),
  }),
});

// Schema for getting next money delivery code
export const getNextMoneyDeliveryCodeSchema = z.object({
  query: z.object({
    toRouteId: z
      .string()
      .min(1, 'To route ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID)
      .trim(),
  }),
});

// Schema for money delivery code lookup
export const moneyDeliveryCodeSchema = z.object({
  params: z.object({
    deliveryIdentifier: z
      .string()
      .min(14, 'Money delivery identifier must be at least 14 characters') // 10 digits code + 2 route codes + -T suffix minimum
      .max(22, 'Money delivery identifier must not exceed 22 characters')
      .regex(MONEY_DELIVERY_IDENTIFIER_PATTERN, VALIDATION_MESSAGES.MONEY_DELIVERY_IDENTIFIER)
      .trim(),
  }),
});

// Schema for money delivery code validation
export const moneyDeliveryCodeValidationSchema = z
  .string()
  .length(10, 'Money delivery code must be exactly 10 digits')
  .regex(
    /^\d{10}$/,
    'Money delivery code must contain only digits in format DDMMYY + sequence (0001-9999)'
  );

// Schema for frequent money customers
export const frequentMoneyCustomersSchema = z.object({
  params: z.object({
    senderIdentifier: z
      .string()
      .min(1, 'Sender identifier is required')
      .max(100, 'Sender identifier must not exceed 100 characters')
      .trim(),
  }),
});

// Schema for money delivery cost report
export const moneyDeliveryCostReportSchema = z
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

export type CreateMoneyDeliveryRequest = z.infer<typeof createMoneyDeliverySchema>['body'];
export type UpdateMoneyDeliveryRequest = z.infer<typeof updateMoneyDeliverySchema>['body'];
export type GetNextMoneyDeliveryCodeRequest = z.infer<
  typeof getNextMoneyDeliveryCodeSchema
>['query'];
export type MoneyDeliveryCodeParams = z.infer<typeof moneyDeliveryCodeSchema>['params'];
export type MoneyDeliveryCostReportQuery = z.infer<typeof moneyDeliveryCostReportSchema>['query'];

// Schema for updating money delivery by fullCode
export const updateMoneyDeliveryByFullCodeSchema = z.object({
  params: z.object({
    fullCode: z
      .string()
      .min(14, 'Money delivery fullCode must be at least 14 characters') // 10 digits code + 2 route codes + -T suffix minimum
      .max(22, 'Money delivery fullCode must not exceed 22 characters')
      .regex(MONEY_DELIVERY_IDENTIFIER_PATTERN, VALIDATION_MESSAGES.MONEY_DELIVERY_IDENTIFIER)
      .trim(),
  }),
  body: z
    .object({
      // Only allow updating sender, receiver, and route information
      senderName: z
        .string()
        .min(1, 'Sender name is required')
        .max(100, 'Sender name must not exceed 100 characters')
        .trim()
        .optional(),
      senderPhone: z
        .string()
        .min(1, 'Sender phone is required')
        .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
        .trim()
        .optional(),
      receiverName: z
        .string()
        .min(1, 'Receiver name is required')
        .max(100, 'Receiver name must not exceed 100 characters')
        .trim()
        .optional(),
      receiverPhone: z
        .string()
        .min(1, 'Receiver phone is required')
        .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
        .trim()
        .optional(),
      toRouteId: z
        .string()
        .min(1, 'To route ID is required')
        .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID)
        .trim()
        .optional(),
    })
    .refine(data => Object.keys(data).length > 0, {
      message:
        'At least one field (senderName, senderPhone, receiverName, receiverPhone, or toRouteId) must be provided',
    }),
});

export type UpdateMoneyDeliveryByFullCodeRequest = z.infer<
  typeof updateMoneyDeliveryByFullCodeSchema
>;

// Schema for upload images money delivery
export const uploadMoneyDeliveryImagesSchema = z.object({
  body: z.object({
    moneyDeliveryId: z
      .string()
      .min(1, 'Money delivery ID is required')
      .regex(OBJECTID_PATTERN, 'Invalid ObjectId format'),
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

// Schema for get detail images money delivery
export const getDetailImagesMoneyDeliverySchema = z.object({
  params: z.object({
    moneyDeliveryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
  }),
});

// Schema for get detail images money delivery by delivery ID
export const getDetailImagesByDeliveryIdSchema = z.object({
  params: z.object({
    deliveryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
  }),
});

// Schema for update data images money delivery
export const updateDataImagesMoneyDeliverySchema = z.object({
  params: z.object({
    moneyDeliveryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
  }),
  body: z.object({
    images: z
      .array(
        z.object({
          id: z.string().optional(),
          url: z.string().min(1, 'URL is required'),
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

// Schema for deleting money delivery by fullCode
export const deleteMoneyDeliveryByFullCodeSchema = z.object({
  params: z.object({
    fullCode: z
      .string()
      .min(14, 'Money delivery fullCode must be at least 14 characters')
      .max(22, 'Money delivery fullCode must not exceed 22 characters')
      .regex(MONEY_DELIVERY_IDENTIFIER_PATTERN, VALIDATION_MESSAGES.MONEY_DELIVERY_IDENTIFIER)
      .trim(),
  }),
  body: z.object({
    password: z.string().min(1, 'Password is required'),
    reason: z
      .string()
      .min(1, 'Reason is required')
      .max(500, 'Reason must not exceed 500 characters')
      .trim(),
  }),
});

export type DeleteMoneyDeliveryByFullCodeRequest = z.infer<
  typeof deleteMoneyDeliveryByFullCodeSchema
>;

// Schema for recovery money delivery with type COLLECT
export const recoveryMoneyDeliveryWithTypeCollectSchema = z.object({
  body: z.object({
    fullCode: z
      .string()
      .min(12, 'Delivery identifier must be at least 12 characters') // 10 digits code + 2 route codes minimum
      .max(20, 'Delivery identifier must not exceed 20 characters')
      .regex(DELIVERY_IDENTIFIER_PATTERN, VALIDATION_MESSAGES.DELIVERY_IDENTIFIER)
      .trim(),
    staffNameRecoveryMoney: z
      .string()
      .min(1, 'Staff name recovery money is required')
      .max(100, 'Staff name recovery money must not exceed 100 characters')
      .trim(),
  }),
});

// Schema for recovery money delivery with type NORMAL
export const recoveryMoneyDeliveryWithTypeNormalSchema = z.object({
  body: z.object({
    fullCode: z
      .string()
      .min(14, 'Money delivery fullCode must be at least 14 characters')
      .max(22, 'Money delivery fullCode must not exceed 22 characters')
      .regex(MONEY_DELIVERY_IDENTIFIER_PATTERN, VALIDATION_MESSAGES.MONEY_DELIVERY_IDENTIFIER)
      .trim(),
    staffNameRecoveryMoney: z
      .string()
      .min(1, 'Staff name recovery money is required')
      .max(100, 'Staff name recovery money must not exceed 100 characters')
      .trim(),
  }),
});

export type RecoveryMoneyDeliveryWithTypeCollectRequest = z.infer<
  typeof recoveryMoneyDeliveryWithTypeCollectSchema
>;
export type RecoveryMoneyDeliveryWithTypeNormalRequest = z.infer<
  typeof recoveryMoneyDeliveryWithTypeNormalSchema
>;
