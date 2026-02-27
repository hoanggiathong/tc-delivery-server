import { z } from 'zod';
import {
  ROUTE_CODE_PATTERN,
  PHONE_NUMBER_PATTERN,
  VALIDATION_MESSAGES,
} from '@/utils/validation-patterns';
import { SurchargeUnit, RouteType } from '@/types/route.type';

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
    address: z.string().max(200, 'Address must not exceed 200 characters').trim().optional(),
    distance: z.number().min(0, 'Distance must be a positive number').optional(),
    surcharge: z.number().min(0, 'Surcharge must be a positive number').optional(),
    surchargeUnit: z.nativeEnum(SurchargeUnit).optional(),
    phone: z
      .string()
      .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
      .trim()
      .optional(),
    type: z.nativeEnum(RouteType).optional(), // default OWNED
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
      address: z.string().max(200, 'Address must not exceed 200 characters').trim().optional(),
      distance: z.number().min(0, 'Distance must be a positive number').optional(),
      surcharge: z.number().min(0, 'Surcharge must be a positive number').optional(),
      surchargeUnit: z.nativeEnum(SurchargeUnit).optional(),
      phone: z
        .string()
        .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
        .trim()
        .optional(),
      type: z.nativeEnum(RouteType).optional(),
    })
    .refine(
      data =>
        data.code ||
        data.name ||
        data.address ||
        data.distance !== undefined ||
        data.surcharge !== undefined ||
        data.surchargeUnit ||
        data.phone ||
        data.type,
      {
        message: 'At least one field must be provided for update',
      }
    ),
});

export const routeParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Route ID is required'),
  }),
});

export type CreateRouteRequest = z.infer<typeof createRouteSchema>['body'];
export type UpdateRouteRequest = z.infer<typeof updateRouteSchema>['body'];
