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
    fromRouteId: z
      .string()
      .min(1, 'From route ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid from route ID format'),
    toRouteId: z
      .string()
      .min(1, 'To route ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid to route ID format'),
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
      fromRouteId: z
        .string()
        .min(1, 'From route ID is required')
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid from route ID format')
        .optional(),
      toRouteId: z
        .string()
        .min(1, 'To route ID is required')
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid to route ID format')
        .optional(),
    })
    .refine(data => data.name || data.phone || data.fromRouteId || data.toRouteId, {
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
