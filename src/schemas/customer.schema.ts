import { z } from 'zod';

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
      .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')
      .trim(),
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
        .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')
        .trim()
        .optional(),
    })
    .refine(data => data.name || data.phone, {
      message: 'At least one field (name or phone) must be provided',
    }),
});

export const customerParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Customer ID is required'),
  }),
});

export type CreateCustomerRequest = z.infer<typeof createCustomerSchema>['body'];
export type UpdateCustomerRequest = z.infer<typeof updateCustomerSchema>['body'];
