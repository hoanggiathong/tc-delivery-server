import { z } from 'zod';
import { VehicleType } from '@/models/delivery.model';
import {
  PHONE_NUMBER_PATTERN,
  OBJECTID_PATTERN,
  VALIDATION_MESSAGES,
} from '@/utils/validation-patterns';

// Schema for getting address history by phone
export const getAddressHistoryParamsSchema = z.object({
  params: z.object({
    phone: z
      .string()
      .min(1, 'Phone is required')
      .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER),
  }),
});

// Schema for creating address history
export const createAddressHistorySchema = z.object({
  params: z.object({
    phone: z
      .string()
      .min(1, 'Phone is required')
      .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER),
  }),
  body: z.object({
    address: z
      .string()
      .min(1, 'Address is required')
      .max(500, 'Address must not exceed 500 characters')
      .trim(),
    homeDeliveryCost: z.number().min(0, 'Home delivery cost must be positive').default(0),
    carryCost: z.number().min(0, 'Carry cost must be positive').default(0),
    vehicleType: z.nativeEnum(VehicleType).default(VehicleType.MOTORBIKE),
  }),
});

// Schema for deleting address history
export const deleteAddressHistorySchema = z.object({
  params: z.object({
    phone: z
      .string()
      .min(1, 'Phone is required')
      .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER),
    addressHistoryId: z
      .string()
      .min(1, 'Address history ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID),
  }),
});

export type GetAddressHistoryParamsRequest = z.infer<typeof getAddressHistoryParamsSchema>;
export type CreateAddressHistoryRequest = z.infer<typeof createAddressHistorySchema>;
export type DeleteAddressHistoryRequest = z.infer<typeof deleteAddressHistorySchema>;
