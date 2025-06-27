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
    route: z.string()
      .min(1, 'Route is required')
      .trim(),
    name: z.string()
      .min(1, 'Item name is required')
      .trim(),
    cost: z.number()
      .min(0, 'Cost must be positive'),
    homeDelivery: z.string()
      .min(1, 'Home delivery address is required')
      .trim(),
    homeDeliveryCost: z.number()
      .min(0, 'Home delivery cost must be positive'),
    itemValue: z.number()
      .min(0, 'Item value must be positive'),
    itemCost: z.number()
      .min(0, 'Item cost must be positive'),
    collectCost: z.number()
      .min(0, 'Collect cost must be positive'),
    collectForCustomer: z.boolean(),
    collectForCustomerCost: z.number()
      .min(0, 'Collect for customer cost must be positive'),
    collectForCustomerNote: z.string()
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
    route: z.string()
      .min(1, 'Route is required')
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
      .min(1, 'Home delivery address is required')
      .trim()
      .optional(),
    homeDeliveryCost: z.number()
      .min(0, 'Home delivery cost must be positive')
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
    collectForCustomer: z.boolean()
      .optional(),
    collectForCustomerCost: z.number()
      .min(0, 'Collect for customer cost must be positive')
      .optional(),
    collectForCustomerNote: z.string()
      .trim()
      .optional()
  })
});

export const deliveryParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Delivery ID is required')
  })
});

export type CreateDeliveryRequest = z.infer<typeof createDeliverySchema>['body'];
export type UpdateDeliveryRequest = z.infer<typeof updateDeliverySchema>['body'];