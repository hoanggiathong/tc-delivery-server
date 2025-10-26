import { z } from 'zod';
import {
  MONEY_DELIVERY_IDENTIFIER_PATTERN,
  PHONE_NUMBER_PATTERN,
  OBJECTID_PATTERN,
  VALIDATION_MESSAGES,
} from '@/utils/validation-patterns';

export const createMoneyDeliverySchema = z.object({
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
    transferType: z.enum(['regular', 'express']).optional(),
    isFree: z.boolean().optional(),
    notes: z.string().trim().optional(),
  }),
});

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
    transferType: z.enum(['regular', 'express']).optional(),
    isFree: z.boolean().optional(),
    notes: z.string().trim().optional(),
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
        .transform(val => new Date(val))
        .refine(val => val <= new Date(), 'End date cannot be in the future'),
      page: z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val) : 1))
        .refine(val => val >= 1, 'Page must be greater than 0'),
      limit: z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val) : 100))
        .refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
    }),
  })
  .refine(data => data.query.startDate <= data.query.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['query', 'startDate'],
  });

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
