import { z } from 'zod';

export const createDeliverySchema = z.object({
  body: z.object({
    senderName: z.string()
      .min(1, 'Sender name is required')
      .max(100, 'Sender name must not exceed 100 characters')
      .trim(),
    senderPhone: z.string()
      .min(1, 'Sender phone is required')
      .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid sender phone number')
      .trim(),
    receiverName: z.string()
      .min(1, 'Receiver name is required')
      .max(100, 'Receiver name must not exceed 100 characters')
      .trim(),
    receiverPhone: z.string()
      .min(1, 'Receiver phone is required')
      .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid receiver phone number')
      .trim(),
    fromRouteId: z.string()
      .min(1, 'From route ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Please provide a valid from route ID')
      .trim(),
    toRouteId: z.string()
      .min(1, 'To route ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Please provide a valid to route ID')
      .trim(),
    name: z.string()
      .min(1, 'Item name is required')
      .trim(),
    cost: z.number()
      .min(0, 'Cost must be positive'),
    homeDelivery: z.string()
      .trim()
      .optional(),
    homeDeliveryCost: z.number()
      .min(0, 'Home delivery cost must be positive')
      .default(0),
    itemValue: z.number()
      .min(0, 'Item value must be positive'),
    itemCost: z.number()
      .min(0, 'Item cost must be positive'),
    collectCost: z.number()
      .min(0, 'Collect cost must be positive'),
    collectForCustomer: z.number()
      .min(0, 'Collect for customer amount must be positive'),
    collectForCustomerCost: z.number()
      .min(0, 'Collect for customer cost must be positive'),
    collectForCustomerNote: z.string()
      .trim()
      .optional(),
    notes: z.string()
      .trim()
      .optional()
  })
});

export const updateDeliverySchema = z.object({
  body: z.object({
    senderName: z.string()
      .min(1, 'Sender name is required')
      .max(100, 'Sender name must not exceed 100 characters')
      .trim()
      .optional(),
    senderPhone: z.string()
      .min(1, 'Sender phone is required')
      .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid sender phone number')
      .trim()
      .optional(),
    receiverName: z.string()
      .min(1, 'Receiver name is required')
      .max(100, 'Receiver name must not exceed 100 characters')
      .trim()
      .optional(),
    receiverPhone: z.string()
      .min(1, 'Receiver phone is required')
      .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid receiver phone number')
      .trim()
      .optional(),
    fromRouteId: z.string()
      .min(1, 'From route ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Please provide a valid from route ID')
      .trim()
      .optional(),
    toRouteId: z.string()
      .min(1, 'To route ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Please provide a valid to route ID')
      .trim()
      .optional(),
    name: z.string()
      .min(1, 'Item name is required')
      .trim()
      .optional(),
    cost: z.number()
      .min(0, 'Cost must be positive')
      .optional(),
    homeDelivery: z.string()
      .trim()
      .optional(),
    homeDeliveryCost: z.number()
      .min(0, 'Home delivery cost must be positive')
      .default(0)
      .optional(),
    itemValue: z.number()
      .min(0, 'Item value must be positive')
      .optional(),
    itemCost: z.number()
      .min(0, 'Item cost must be positive')
      .optional(),
    collectCost: z.number()
      .min(0, 'Collect cost must be positive')
      .optional(),
    collectForCustomer: z.number()
      .min(0, 'Collect for customer amount must be positive')
      .optional(),
    collectForCustomerCost: z.number()
      .min(0, 'Collect for customer cost must be positive')
      .optional(),
    collectForCustomerNote: z.string()
      .trim()
      .optional(),
    notes: z.string()
      .trim()
      .optional()
  })
});

export const deliveryParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Delivery ID is required')
  })
});

// Schema for getting next delivery code
export const getNextCodeSchema = z.object({
  body: z.object({
    toRouteId: z.string()
      .min(1, 'To route ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Please provide a valid to route ID')
      .trim()
  })
});

// Schema for delivery code lookup
export const deliveryCodeSchema = z.object({
  params: z.object({
    deliveryIdentifier: z.string()
      .min(12, 'Delivery identifier must be at least 12 characters') // 10 digits code + 2 route codes minimum
      .max(20, 'Delivery identifier must not exceed 20 characters')
      .regex(/^\d{10}[A-Z]\d+[A-Z]\d+$/, 'Invalid delivery identifier format. Expected: codeFromRouteToRoute (e.g., 2401250001T1T2)')
      .trim()
  })
});

// Schema for delivery code validation
export const deliveryCodeValidationSchema = z.string()
  .length(10, 'Delivery code must be exactly 10 digits')
  .regex(/^\d{10}$/, 'Delivery code must contain only digits in format DDMMYY + sequence (0001-9999)');

// Schema for frequent customers lookup
export const frequentCustomersSchema = z.object({
  params: z.object({
    senderIdentifier: z.string()
      .min(1, 'Sender identifier is required')
      .max(100, 'Sender identifier must not exceed 100 characters')
      .trim()
  }),
  query: z.object({
    page: z.string()
      .optional()
      .transform((val) => val ? parseInt(val) : 1)
      .refine((val) => val >= 1, 'Page must be greater than 0'),
    limit: z.string()
      .optional()
      .transform((val) => val ? parseInt(val) : 10)
      .refine((val) => val >= 1 && val <= 100, 'Limit must be between 1 and 100')
  })
});

export type CreateDeliveryRequest = z.infer<typeof createDeliverySchema>['body'];
export type UpdateDeliveryRequest = z.infer<typeof updateDeliverySchema>['body'];
export type GetNextCodeRequest = z.infer<typeof getNextCodeSchema>['body'];
export type DeliveryCodeParams = z.infer<typeof deliveryCodeSchema>['params'];
export type FrequentCustomersParams = z.infer<typeof frequentCustomersSchema>['params'];
export type FrequentCustomersQuery = z.infer<typeof frequentCustomersSchema>['query'];