import { z } from 'zod';

// Reusable phone validation
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

export const createDraftDeliverySchema = z.object({
  body: z.object({
    senderName: z.string().min(1, 'Sender name is required').max(100, 'Sender name is too long'),
    senderPhone: z
      .string()
      .regex(phoneRegex, 'Invalid phone number format')
      .min(1, 'Sender phone is required'),
    receiverName: z
      .string()
      .min(1, 'Receiver name is required')
      .max(100, 'Receiver name is too long'),
    receiverPhone: z
      .string()
      .regex(phoneRegex, 'Invalid phone number format')
      .min(1, 'Receiver phone is required'),
    fromRouteId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
    toRouteId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
    name: z.string().min(1, 'Item name is required').max(200, 'Item name is too long'),
    cost: z.number().min(0, 'Cost must be non-negative'),
    homeDelivery: z.string().max(500, 'Home delivery address is too long').optional(),
    homeDeliveryCost: z.number().min(0, 'Home delivery cost must be non-negative').default(0),
    itemValue: z.number().min(0, 'Item value must be non-negative').default(0),
    itemCost: z.number().min(0, 'Item cost must be non-negative').default(0),
    collectCost: z.number().min(0, 'Collect cost must be non-negative').default(0),
    collectForCustomer: z
      .number()
      .min(0, 'Collect for customer amount must be non-negative')
      .default(0),
    collectForCustomerCost: z
      .number()
      .min(0, 'Collect for customer cost must be non-negative')
      .default(0),
    collectForCustomerNote: z.string().max(500, 'Note is too long').optional(),
    notes: z.string().max(1000, 'Notes are too long').optional(),
    paymentType: z.enum(['debt', 'free']).nullable().optional(),
  }),
});

export const updateDraftDeliverySchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
  }),
  body: z.object({
    senderName: z.string().min(1).max(100).optional(),
    senderPhone: z.string().regex(phoneRegex, 'Invalid phone number format').optional(),
    receiverName: z.string().min(1).max(100).optional(),
    receiverPhone: z.string().regex(phoneRegex, 'Invalid phone number format').optional(),
    fromRouteId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
      .optional(),
    toRouteId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')
      .optional(),
    name: z.string().min(1).max(200).optional(),
    cost: z.number().min(0).optional(),
    homeDelivery: z.string().max(500).optional(),
    homeDeliveryCost: z.number().min(0).optional(),
    itemValue: z.number().min(0).optional(),
    itemCost: z.number().min(0).optional(),
    collectCost: z.number().min(0).optional(),
    collectForCustomer: z.number().min(0).optional(),
    collectForCustomerCost: z.number().min(0).optional(),
    collectForCustomerNote: z.string().max(500).optional(),
    notes: z.string().max(1000).optional(),
    paymentType: z.enum(['debt', 'free']).nullable().optional(),
  }),
});

export const getDraftDeliveryByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
  }),
});

export const deleteDraftDeliverySchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
  }),
});

export const convertDraftToDeliverySchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
  }),
});

export type CreateDraftDeliveryInput = z.infer<typeof createDraftDeliverySchema>;
export type UpdateDraftDeliveryInput = z.infer<typeof updateDraftDeliverySchema>;
export type GetDraftDeliveryByIdInput = z.infer<typeof getDraftDeliveryByIdSchema>;
export type DeleteDraftDeliveryInput = z.infer<typeof deleteDraftDeliverySchema>;
export type ConvertDraftToDeliveryInput = z.infer<typeof convertDraftToDeliverySchema>;
