import { z } from 'zod';

export const createUserRouteSchema = z.object({
  body: z.object({
    userId: z.string()
      .min(1, 'User ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
    routeId: z.string()
      .min(1, 'Route ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid route ID format')
  })
});

export const assignMultipleRoutesSchema = z.object({
  body: z.object({
    userId: z.string()
      .min(1, 'User ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
    routeIds: z.array(z.string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid route ID format'))
      .min(1, 'At least one route ID is required')
      .max(50, 'Cannot assign more than 50 routes at once')
  })
});

export const removeMultipleRoutesSchema = z.object({
  body: z.object({
    userId: z.string()
      .min(1, 'User ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
    routeIds: z.array(z.string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid route ID format'))
      .min(1, 'At least one route ID is required')
      .max(50, 'Cannot remove more than 50 routes at once')
  })
});

export const userRouteParamsSchema = z.object({
  params: z.object({
    id: z.string()
      .min(1, 'User route ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user route ID format')
  })
});

export const userIdParamsSchema = z.object({
  params: z.object({
    userId: z.string()
      .min(1, 'User ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
  })
});

export const routeIdParamsSchema = z.object({
  params: z.object({
    routeId: z.string()
      .min(1, 'Route ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid route ID format')
  })
});

export type CreateUserRouteRequest = z.infer<typeof createUserRouteSchema>['body'];
export type AssignMultipleRoutesRequest = z.infer<typeof assignMultipleRoutesSchema>['body'];
export type RemoveMultipleRoutesRequest = z.infer<typeof removeMultipleRoutesSchema>['body'];