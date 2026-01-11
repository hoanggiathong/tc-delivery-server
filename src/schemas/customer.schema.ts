import { z } from 'zod';
import {
  PHONE_NUMBER_PATTERN,
  OBJECTID_PATTERN,
  VALIDATION_MESSAGES,
} from '@/utils/validation-patterns';

export const createCustomerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(100, 'Name must not exceed 100 characters')
      .trim(),
    phone: z
      .string()
      .min(1, 'Phone is required')
      .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
      .trim(),
    routeId: z
      .string()
      .min(1, 'Route ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
    relativeReceiver: z
      .array(z.string().regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID))
      .optional()
      .default([]),
  }),
});

export const updateCustomerSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(1, 'Name is required')
        .max(100, 'Name must not exceed 100 characters')
        .trim()
        .optional(),
      phone: z
        .string()
        .min(1, 'Phone is required')
        .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
        .trim()
        .optional(),
      routeId: z
        .string()
        .min(1, 'Route ID is required')
        .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID)
        .optional(),
      relativeReceiver: z
        .array(z.string().regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID))
        .optional(),
    })
    .refine(data => data.name || data.phone || data.routeId || data.relativeReceiver, {
      message: 'At least one field must be provided',
    }),
});

export const customerParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Customer ID is required'),
  }),
});

export const uploadImageSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(100, 'Name must not exceed 100 characters')
      .trim(),
    phone: z
      .string()
      .min(1, 'Phone is required')
      .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
      .trim(),
    routeId: z
      .string()
      .min(1, 'Route ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
    imageIndex: z.coerce.number().min(1).max(5),
    rotate: z.coerce
      .number()
      .refine(val => [0, 90, 180, 270].includes(val), {
        message: 'Rotate must be 0, 90, 180, or 270',
      })
      .default(0),
  }),
});

export const updateImageRotationSchema = z.object({
  params: z.object({
    id: z.string().regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
    index: z.string().regex(/^[1-5]$/, 'Index must be between 1 and 5'),
  }),
  body: z.object({
    rotate: z.coerce.number().refine(val => [0, 90, 180, 270].includes(val), {
      message: 'Rotate must be 0, 90, 180, or 270',
    }),
  }),
});

export const deleteImageSchema = z.object({
  params: z.object({
    id: z.string().regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
    index: z.string().regex(/^[1-5]$/, 'Index must be between 1 and 5'),
  }),
});

export const getCustomerByPhoneSchema = z.object({
  params: z.object({
    senderPhone: z
      .string()
      .min(1, 'Sender phone is required')
      .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
      .trim(),
  }),
});

export const updateCustomerBankSchema = z.object({
  body: z.object({
    phone: z
      .string()
      .min(1, 'Phone is required')
      .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
      .trim(),
    name: z
      .string()
      .min(1, 'Name is required when creating new customer')
      .max(100, 'Name must not exceed 100 characters')
      .trim()
      .optional(),
    bankInfo: z
      .object({
        name: z.string().min(1, 'Bank holder name is required').trim(),
        bankName: z.string().min(1, 'Bank name is required').trim(),
        bankAccount: z.string().min(1, 'Bank account is required').trim(),
        bankBranch: z.string().trim().optional(),
        bankAddress: z.string().trim().optional(),
      })
      .optional(),
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
    // Delete specific image indexes
    deleteIndexes: z
      .array(z.coerce.number().min(1).max(5))
      .max(5, 'Maximum 5 indexes allowed')
      .optional(),
  }),
});

export const updateDataImageCustomerSchema = z.object({
  params: z.object({
    customerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
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

export type CreateCustomerRequest = z.infer<typeof createCustomerSchema>['body'];
export type UpdateCustomerRequest = z.infer<typeof updateCustomerSchema>['body'];
export type UploadImageRequest = z.infer<typeof uploadImageSchema>['body'];
export type GetCustomerByPhoneRequest = {
  params: z.infer<typeof getCustomerByPhoneSchema>['params'];
};
export type UpdateCustomerBankRequest = z.infer<typeof updateCustomerBankSchema>['body'];
