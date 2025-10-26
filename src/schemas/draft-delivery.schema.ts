import { z } from 'zod';
import {
  PHONE_NUMBER_PATTERN,
  OBJECTID_PATTERN,
  VALIDATION_MESSAGES,
} from '@/utils/validation-patterns';

export const createDraftDeliverySchema = z.object({
  body: z.object({
    senderName: z.string().min(1, 'Sender name is required').max(100, 'Sender name is too long'),
    senderPhone: z
      .string()
      .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
      .min(1, 'Sender phone is required'),
    receiverName: z
      .string()
      .min(1, 'Receiver name is required')
      .max(100, 'Receiver name is too long'),
    receiverPhone: z
      .string()
      .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
      .min(1, 'Receiver phone is required'),
    fromRouteId: z.string().regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
    toRouteId: z.string().regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
    name: z.string().min(1, 'Item name is required').max(200, 'Item name is too long'),
    quantity: z.number().min(1, 'Quantity must be at least 1').default(1).optional(),
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
    details: z
      .object({
        weight: z.number().min(0, 'Weight must be positive').optional(),
        length: z.number().min(0, 'Length must be positive').optional(),
        width: z.number().min(0, 'Width must be positive').optional(),
        height: z.number().min(0, 'Height must be positive').optional(),
        isOverweight: z.boolean().default(false).optional(),
        convertedWeight: z.number().min(0, 'Converted weight must be positive').optional(),
      })
      .optional(),
    notes: z.string().max(1000, 'Notes are too long').optional(),
    paymentType: z.enum(['paid', 'debt']).default('paid').optional(),
    isFree: z.boolean().default(false).optional(),
  }),
});

export const updateDraftDeliverySchema = z.object({
  params: z.object({
    id: z.string().regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
  }),
  body: z.object({
    senderName: z.string().min(1).max(100).optional(),
    senderPhone: z
      .string()
      .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
      .optional(),
    receiverName: z.string().min(1).max(100).optional(),
    receiverPhone: z
      .string()
      .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
      .optional(),
    fromRouteId: z.string().regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID).optional(),
    toRouteId: z.string().regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID).optional(),
    name: z.string().min(1).max(200).optional(),
    quantity: z.number().min(1, 'Quantity must be at least 1').optional(),
    cost: z.number().min(0).optional(),
    homeDelivery: z.string().max(500).optional(),
    homeDeliveryCost: z.number().min(0).optional(),
    itemValue: z.number().min(0).optional(),
    itemCost: z.number().min(0).optional(),
    collectCost: z.number().min(0).optional(),
    collectForCustomer: z.number().min(0).optional(),
    collectForCustomerCost: z.number().min(0).optional(),
    collectForCustomerNote: z.string().max(500).optional(),
    details: z
      .object({
        weight: z.number().min(0, 'Weight must be positive').optional(),
        length: z.number().min(0, 'Length must be positive').optional(),
        width: z.number().min(0, 'Width must be positive').optional(),
        height: z.number().min(0, 'Height must be positive').optional(),
        isOverweight: z.boolean().optional(),
        convertedWeight: z.number().min(0, 'Converted weight must be positive').optional(),
      })
      .optional(),
    notes: z.string().max(1000).optional(),
    paymentType: z.enum(['paid', 'debt']).optional(),
    isFree: z.boolean().optional(),
  }),
});

export const getDraftDeliveryByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
  }),
});

export const deleteDraftDeliverySchema = z.object({
  params: z.object({
    id: z.string().regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
  }),
});

export const convertDraftToDeliverySchema = z.object({
  params: z.object({
    id: z.string().regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
  }),
});

export type CreateDraftDeliveryInput = z.infer<typeof createDraftDeliverySchema>;
export type UpdateDraftDeliveryInput = z.infer<typeof updateDraftDeliverySchema>;
export type GetDraftDeliveryByIdInput = z.infer<typeof getDraftDeliveryByIdSchema>;
export type DeleteDraftDeliveryInput = z.infer<typeof deleteDraftDeliverySchema>;
export type ConvertDraftToDeliveryInput = z.infer<typeof convertDraftToDeliverySchema>;
