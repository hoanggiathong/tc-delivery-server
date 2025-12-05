import { z } from 'zod';
import { OBJECTID_PATTERN, VALIDATION_MESSAGES } from '@/utils/validation-patterns';

export const createUserRouteSchema = z.object({
  body: z.object({
    userId: z
      .string()
      .min(1, 'User ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
    routeId: z
      .string()
      .min(1, 'Route ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
  }),
});

export const assignMultipleRoutesSchema = z.object({
  body: z.object({
    userId: z
      .string()
      .min(1, 'User ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
    routeIds: z
      .array(z.string().regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID))
      .min(1, 'At least one route ID is required')
      .max(50, 'Cannot assign more than 50 routes at once'),
  }),
});

export const removeMultipleRoutesSchema = z.object({
  body: z.object({
    userId: z
      .string()
      .min(1, 'User ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
    routeIds: z
      .array(z.string().regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID))
      .min(1, 'At least one route ID is required')
      .max(50, 'Cannot remove more than 50 routes at once'),
  }),
});

export const userRouteParamsSchema = z.object({
  params: z.object({
    id: z
      .string()
      .min(1, 'User route ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
  }),
});

export const userIdParamsSchema = z.object({
  params: z.object({
    userId: z
      .string()
      .min(1, 'User ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
  }),
});

export const routeIdParamsSchema = z.object({
  params: z.object({
    routeId: z
      .string()
      .min(1, 'Route ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
  }),
});

export type CreateUserRouteRequest = z.infer<typeof createUserRouteSchema>['body'];
export type AssignMultipleRoutesRequest = z.infer<typeof assignMultipleRoutesSchema>['body'];
export type RemoveMultipleRoutesRequest = z.infer<typeof removeMultipleRoutesSchema>['body'];
