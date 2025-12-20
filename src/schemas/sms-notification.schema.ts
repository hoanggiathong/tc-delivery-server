import { z } from 'zod';
import { SMSLogStatus, SMSStatus } from '@/types/sms-notification.type';

/**
 * Schema for getting eligible deliveries
 */
export const getEligibleDeliveriesSchema = z.object({
  query: z.object({
    routeId: z.string().min(1, 'routeId is required'),
  }),
});

/**
 * Schema for sending notifications to multiple deliveries
 */
export const sendNotificationsSchema = z.object({
  body: z.object({
    deliveryIds: z.array(z.string().min(1)).min(1, 'At least one deliveryId is required'),
  }),
});

/**
 * Schema for retrying a notification
 */
export const retryNotificationSchema = z.object({
  params: z.object({
    deliveryId: z.string().min(1, 'deliveryId is required'),
  }),
});

/**
 * Schema for updating SMS status
 */
export const updateSMSStatusSchema = z.object({
  params: z.object({
    deliveryId: z.string().min(1, 'deliveryId is required'),
  }),
  body: z.object({
    smsStatus: z.nativeEnum(SMSStatus),
  }),
});

/**
 * Schema for getting SMS logs by delivery
 */
export const getSMSLogsByDeliverySchema = z.object({
  params: z.object({
    deliveryId: z.string().min(1, 'deliveryId is required'),
  }),
});

/**
 * Schema for getting all SMS logs
 */
export const getAllSMSLogsSchema = z.object({
  query: z.object({
    status: z.nativeEnum(SMSLogStatus).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

// Export types inferred from schemas
export type GetEligibleDeliveriesRequest = z.infer<typeof getEligibleDeliveriesSchema>;
export type SendNotificationsRequest = z.infer<typeof sendNotificationsSchema>;
export type RetryNotificationRequest = z.infer<typeof retryNotificationSchema>;
export type UpdateSMSStatusRequest = z.infer<typeof updateSMSStatusSchema>;
export type GetSMSLogsByDeliveryRequest = z.infer<typeof getSMSLogsByDeliverySchema>;
export type GetAllSMSLogsRequest = z.infer<typeof getAllSMSLogsSchema>;
