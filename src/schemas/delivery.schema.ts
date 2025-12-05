import { z } from 'zod';
import {
  DELIVERY_IDENTIFIER_PATTERN,
  PHONE_NUMBER_PATTERN,
  OBJECTID_PATTERN,
  VALIDATION_MESSAGES,
  DATE_YYYY_MM_DD_PATTERN,
} from '@/utils/validation-patterns';
import { VehicleType } from '@/models/delivery.model';

export const createDeliverySchema = z
  .object({
    body: z.object({
      senderName: z
        .string()
        .min(1, 'Sender name is required')
        .max(100, 'Sender name must not exceed 100 characters')
        .trim(),
      senderPhone: z
        .string()
        .min(1, 'Sender phone is required')
        .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
        .trim(),
      receiverName: z
        .string()
        .min(1, 'Receiver name is required')
        .max(100, 'Receiver name must not exceed 100 characters')
        .trim(),
      receiverPhone: z
        .string()
        .min(1, 'Receiver phone is required')
        .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
        .trim(),
      fromRouteId: z
        .string()
        .min(1, 'From route ID is required')
        .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID)
        .trim(),
      toRouteId: z
        .string()
        .min(1, 'To route ID is required')
        .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID)
        .trim(),
      name: z.string().min(1, 'Item name is required').trim(),
      nameProductAndAdditionalInformation: z.string().trim().optional(),
      quantity: z.number().min(1, 'Quantity must be at least 1').default(1).optional(),
      cost: z.number().min(0, 'Cost must be positive'),
      homeDelivery: z.string().trim().optional(),
      homeDeliveryCost: z
        .number()
        .min(0, 'Home delivery cost must be positive')
        .default(0)
        .optional(),
      carryCost: z.number().min(0, 'Carry cost must be positive').default(0).optional(),
      vehicleType: z.nativeEnum(VehicleType).nullable().optional(),
      itemValue: z.number().min(0, 'Item value must be positive'),
      itemCost: z.number().min(0, 'Item cost must be positive'),
      collectCost: z.number().min(0, 'Collect cost must be positive'),
      collectForCustomer: z.number().min(0, 'Collect for customer amount must be positive'),
      collectForCustomerCost: z.number().min(0, 'Collect for customer cost must be positive'),
      collectForCustomerNote: z.string().trim().optional(),
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
      notes: z.string().trim().optional(),
      paymentType: z.enum(['paid', 'debt']).default('paid').optional(),
      isFree: z.boolean().default(false).optional(),
    }),
  })
  .refine(
    data => {
      const { homeDelivery, vehicleType } = data.body;
      // If homeDelivery has value, vehicleType must be provided
      if (homeDelivery && homeDelivery.trim() !== '' && !vehicleType) {
        return false;
      }
      return true;
    },
    {
      message: 'vehicleType is required when homeDelivery is provided',
      path: ['body', 'vehicleType'],
    }
  );

export const updateDeliverySchema = z.object({
  body: z.object({
    senderName: z
      .string()
      .min(1, 'Sender name is required')
      .max(100, 'Sender name must not exceed 100 characters')
      .trim()
      .optional(),
    senderPhone: z
      .string()
      .min(1, 'Sender phone is required')
      .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
      .trim()
      .optional(),
    receiverName: z
      .string()
      .min(1, 'Receiver name is required')
      .max(100, 'Receiver name must not exceed 100 characters')
      .trim()
      .optional(),
    receiverPhone: z
      .string()
      .min(1, 'Receiver phone is required')
      .regex(PHONE_NUMBER_PATTERN, VALIDATION_MESSAGES.PHONE_NUMBER)
      .trim()
      .optional(),
    fromRouteId: z
      .string()
      .min(1, 'From route ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID)
      .trim()
      .optional(),
    toRouteId: z
      .string()
      .min(1, 'To route ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID)
      .trim()
      .optional(),
    name: z.string().min(1, 'Item name is required').trim().optional(),
    nameProductAndAdditionalInformation: z.string().trim().optional(),
    quantity: z.number().min(1, 'Quantity must be at least 1').optional(),
    cost: z.number().min(0, 'Cost must be positive').optional(),
    homeDelivery: z.string().trim().optional(),
    homeDeliveryCost: z
      .number()
      .min(0, 'Home delivery cost must be positive')
      .default(0)
      .optional(),
    carryCost: z.number().min(0, 'Carry cost must be positive').default(0).optional(),
    vehicleType: z.nativeEnum(VehicleType).nullable().optional(),
    itemValue: z.number().min(0, 'Item value must be positive').optional(),
    itemCost: z.number().min(0, 'Item cost must be positive').optional(),
    collectCost: z.number().min(0, 'Collect cost must be positive').optional(),
    collectForCustomer: z
      .number()
      .min(0, 'Collect for customer amount must be positive')
      .optional(),
    collectForCustomerCost: z
      .number()
      .min(0, 'Collect for customer cost must be positive')
      .optional(),
    collectForCustomerNote: z.string().trim().optional(),
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
    notes: z.string().trim().optional(),
    paymentType: z.enum(['paid', 'debt']).optional(),
    isFree: z.boolean().optional(),
  }),
});

export const deliveryParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Delivery ID is required'),
  }),
});

// Schema for getting next delivery code
export const getNextCodeSchema = z.object({
  query: z.object({
    toRouteId: z
      .string()
      .min(1, 'To route ID is required')
      .regex(OBJECTID_PATTERN, VALIDATION_MESSAGES.OBJECTID)
      .trim(),
  }),
});

// Schema for delivery code lookup
export const deliveryCodeSchema = z.object({
  params: z.object({
    deliveryIdentifier: z
      .string()
      .min(12, 'Delivery identifier must be at least 12 characters') // 10 digits code + 2 route codes minimum
      .max(20, 'Delivery identifier must not exceed 20 characters')
      .regex(DELIVERY_IDENTIFIER_PATTERN, VALIDATION_MESSAGES.DELIVERY_IDENTIFIER)
      .trim(),
  }),
});

// Schema for delivery code validation
export const deliveryCodeValidationSchema = z
  .string()
  .length(10, 'Delivery code must be exactly 10 digits')
  .regex(
    /^\d{10}$/,
    'Delivery code must contain only digits in format DDMMYY + sequence (0001-9999)'
  );

// Schema for frequent customers lookup
export const frequentCustomersSchema = z.object({
  params: z.object({
    senderIdentifier: z
      .string()
      .min(1, 'Sender identifier is required')
      .max(100, 'Sender identifier must not exceed 100 characters')
      .trim(),
  }),
});

// Schema for cost report
export const deliveryCostReportSchema = z
  .object({
    query: z.object({
      startDate: z
        .string()
        .regex(DATE_YYYY_MM_DD_PATTERN, VALIDATION_MESSAGES.DATE_YYYY_MM_DD)
        .transform(val => new Date(val)),
      endDate: z
        .string()
        .regex(DATE_YYYY_MM_DD_PATTERN, VALIDATION_MESSAGES.DATE_YYYY_MM_DD)
        .transform(val => new Date(val))
        .refine(val => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const endDate = new Date(val);
          endDate.setHours(0, 0, 0, 0);
          return endDate <= today;
        }, 'End date cannot be in the future'),
    }),
  })
  .refine(data => data.query.startDate <= data.query.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['query', 'startDate'],
  })
  .refine(
    data => {
      const diffTime = Math.abs(data.query.endDate.getTime() - data.query.startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    },
    {
      message: 'Date range cannot exceed 30 days',
      path: ['query', 'endDate'],
    }
  );

export type CreateDeliveryRequest = z.infer<typeof createDeliverySchema>['body'];
export type UpdateDeliveryRequest = z.infer<typeof updateDeliverySchema>['body'];
export type GetNextCodeRequest = z.infer<typeof getNextCodeSchema>['query'];
export type DeliveryCodeParams = z.infer<typeof deliveryCodeSchema>['params'];
export type FrequentCustomersParams = z.infer<typeof frequentCustomersSchema>['params'];
export type DeliveryCostReportQuery = z.infer<typeof deliveryCostReportSchema>['query'];

// Schema for delivery fullCode parameter
export const deliveryFullCodeSchema = z.object({
  params: z.object({
    fullCode: z
      .string()
      .min(12, 'Delivery fullCode must be at least 12 characters') // 10 digits code + 2 route codes minimum
      .max(20, 'Delivery fullCode must not exceed 20 characters')
      .regex(DELIVERY_IDENTIFIER_PATTERN, VALIDATION_MESSAGES.DELIVERY_IDENTIFIER)
      .trim(),
  }),
});

export type DeliveryFullCodeParams = z.infer<typeof deliveryFullCodeSchema>['params'];

// Schema for deleting delivery by fullCode with password verification
export const deleteDeliveryByFullCodeSchema = z.object({
  params: z.object({
    fullCode: z
      .string()
      .min(12, 'Delivery fullCode must be at least 12 characters')
      .max(20, 'Delivery fullCode must not exceed 20 characters')
      .regex(DELIVERY_IDENTIFIER_PATTERN, VALIDATION_MESSAGES.DELIVERY_IDENTIFIER)
      .trim(),
  }),
  body: z.object({
    password: z
      .string()
      .min(1, 'Password is required')
      .min(6, 'Password must be at least 6 characters')
      .trim(),
    reason: z
      .string()
      .min(1, 'Deletion reason is required')
      .max(500, 'Reason must not exceed 500 characters')
      .trim(),
  }),
});

export type DeleteDeliveryByFullCodeParams = z.infer<
  typeof deleteDeliveryByFullCodeSchema
>['params'];
export type DeleteDeliveryByFullCodeBody = z.infer<typeof deleteDeliveryByFullCodeSchema>['body'];
