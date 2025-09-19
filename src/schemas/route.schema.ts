import { z } from 'zod';
import { ROUTE_CODE_PATTERN, VALIDATION_MESSAGES } from '@/utils/validation-patterns';

export const createRouteSchema = z.object({
  body: z.object({
    code: z
      .string()
      .min(1, 'Code is required')
      .max(10, 'Code must not exceed 10 characters')
      .regex(ROUTE_CODE_PATTERN, VALIDATION_MESSAGES.ROUTE_CODE)
      .trim(),
    name: z
      .string()
      .min(1, 'Name is required')
      .max(100, 'Name must not exceed 100 characters')
      .trim(),
  }),
});

export const updateRouteSchema = z.object({
  body: z
    .object({
      code: z
        .string()
        .min(1, 'Code is required')
        .max(10, 'Code must not exceed 10 characters')
        .regex(ROUTE_CODE_PATTERN, VALIDATION_MESSAGES.ROUTE_CODE)
        .trim()
        .optional(),
      name: z
        .string()
        .min(1, 'Name is required')
        .max(100, 'Name must not exceed 100 characters')
        .trim()
        .optional(),
    })
    .refine(data => data.code || data.name, {
      message: 'At least one field (code or name) must be provided',
    }),
});

export const routeParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Route ID is required'),
  }),
});

export type CreateRouteRequest = z.infer<typeof createRouteSchema>['body'];
export type UpdateRouteRequest = z.infer<typeof updateRouteSchema>['body'];
