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
    routeId: z
      .string()
      .min(1, 'Route ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid route ID format'),
    type: z.enum(['delivery', 'money']).default('delivery'),
    relativeReceiver: z
      .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid customer ID format'))
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
        .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')
        .trim()
        .optional(),
      routeId: z
        .string()
        .min(1, 'Route ID is required')
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid route ID format')
        .optional(),
      type: z.enum(['delivery', 'money']).optional(),
      relativeReceiver: z
        .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid customer ID format'))
        .optional(),
    })
    .refine(data => data.name || data.phone || data.routeId || data.type || data.relativeReceiver, {
      message: 'At least one field must be provided',
    }),
});

export const customerParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Customer ID is required'),
  }),
});

export type CreateCustomerRequest = z.infer<typeof createCustomerSchema>['body'];
export type UpdateCustomerRequest = z.infer<typeof updateCustomerSchema>['body'];
