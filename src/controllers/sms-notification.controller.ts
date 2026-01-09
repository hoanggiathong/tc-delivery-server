import { Request, Response } from 'express';
import { SMSNotificationService } from '@/services/sms-notification.service';
import { SMSLogStatus, SMSStatus } from '@/types/sms-notification.type';
import { AuthRequest } from '@/types';

/**
 * SMS Notification Controller
 * Handles API endpoints for SMS/Zalo ZNS notifications
 */
export class SMSNotificationController {
  private smsNotificationService: SMSNotificationService;

  constructor() {
    this.smsNotificationService = new SMSNotificationService();
  }

  /**
   * GET /api/sms/eligible
   * Get deliveries eligible for SMS notification
   * Query params:
   * - routeId (required): Route ID to filter
   * - fromDate (optional): Get all results from this date and before (ISO date string)
   * Note: Always filters by createdAt field
   */
  getEligibleDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { routeId, fromDate } = req.query;

      if (!routeId || typeof routeId !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Validation error: routeId is required',
        });
        return;
      }

      // Build filters object - always use createdAt for date filtering
      const filters: { fromDate?: Date; dateField: 'createdAt' } = {
        dateField: 'createdAt',
      };
      if (fromDate && typeof fromDate === 'string') {
        filters.fromDate = new Date(fromDate);
      }

      const deliveries = await this.smsNotificationService.getEligibleDeliveries(
        routeId,
        Object.keys(filters).length > 0 ? filters : undefined
      );

      res.status(200).json({
        success: true,
        message: 'Eligible deliveries retrieved successfully',
        data: deliveries,
      });
    } catch (error) {
      console.error('Get eligible deliveries error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get eligible deliveries',
      });
    }
  };

  /**
   * GET /api/sms/incomplete-quantity
   * Get deliveries with incomplete quantity (quantityReturn < quantity)
   * For inventory verification - when items have arrived but not fully scanned
   * Query params:
   * - routeId (required): Route ID to filter
   * - fromDate (optional): Get all results from this date and before (ISO date string)
   * Note: Always filters by createdAt field
   */
  getIncompleteQuantityDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { routeId, fromDate } = req.query;

      if (!routeId || typeof routeId !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Validation error: routeId is required',
        });
        return;
      }

      // Build filters object - always use createdAt for date filtering
      const filters: { fromDate?: Date; dateField: 'createdAt' } = {
        dateField: 'createdAt',
      };
      if (fromDate && typeof fromDate === 'string') {
        filters.fromDate = new Date(fromDate);
      }

      const deliveries = await this.smsNotificationService.getIncompleteQuantityDeliveries(
        routeId,
        Object.keys(filters).length > 0 ? filters : undefined
      );

      res.status(200).json({
        success: true,
        message: 'Incomplete quantity deliveries retrieved successfully',
        data: deliveries,
      });
    } catch (error) {
      console.error('Get incomplete quantity deliveries error:', error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to get incomplete quantity deliveries',
      });
    }
  };

  /**
   * POST /api/sms/send
   * Send notifications to selected deliveries
   */
  sendNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { deliveryIds } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      if (!deliveryIds || !Array.isArray(deliveryIds) || deliveryIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Validation error: deliveryIds array is required',
        });
        return;
      }

      const result = await this.smsNotificationService.sendBulkNotifications(deliveryIds, userId);

      res.status(200).json({
        success: true,
        message: `Sent ${result.successCount}/${result.totalCount} notifications successfully`,
        data: result,
      });
    } catch (error) {
      console.error('Send notifications error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send notifications',
      });
    }
  };

  /**
   * POST /api/sms/retry/:deliveryId
   * Retry failed notification for a delivery
   */
  retryNotification = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { deliveryId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      if (!deliveryId) {
        res.status(400).json({
          success: false,
          message: 'Validation error: deliveryId is required',
        });
        return;
      }

      const result = await this.smsNotificationService.retryNotification(deliveryId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Notification retried successfully',
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.errorMessage || 'Failed to retry notification',
          data: result,
        });
      }
    } catch (error) {
      console.error('Retry notification error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retry notification',
      });
    }
  };

  /**
   * PUT /api/sms/update-status/:deliveryId
   * Update SMS status manually
   */
  updateSMSStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { deliveryId } = req.params;
      const { smsStatus } = req.body;

      if (!deliveryId) {
        res.status(400).json({
          success: false,
          message: 'Validation error: deliveryId is required',
        });
        return;
      }

      if (smsStatus === undefined || !Object.values(SMSStatus).includes(smsStatus)) {
        res.status(400).json({
          success: false,
          message: 'Validation error: valid smsStatus is required',
        });
        return;
      }

      const success = await this.smsNotificationService.updateSMSStatus(deliveryId, smsStatus);

      if (success) {
        res.status(200).json({
          success: true,
          message: 'SMS status updated successfully',
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Delivery not found',
        });
      }
    } catch (error) {
      console.error('Update SMS status error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update SMS status',
      });
    }
  };

  /**
   * GET /api/sms/logs/:deliveryId
   * Get SMS logs for a specific delivery
   */
  getSMSLogsByDelivery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deliveryId } = req.params;

      if (!deliveryId) {
        res.status(400).json({
          success: false,
          message: 'Validation error: deliveryId is required',
        });
        return;
      }

      const logs = await this.smsNotificationService.getSMSLogsByDelivery(deliveryId);

      res.status(200).json({
        success: true,
        message: 'SMS logs retrieved successfully',
        data: logs,
      });
    } catch (error) {
      console.error('Get SMS logs error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get SMS logs',
      });
    }
  };

  /**
   * GET /api/sms/logs
   * Get all SMS logs with filters
   */
  getAllSMSLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, startDate, endDate, page, limit } = req.query;

      const filters: {
        status?: SMSLogStatus;
        startDate?: Date;
        endDate?: Date;
        page?: number;
        limit?: number;
      } = {};

      if (status && Object.values(SMSLogStatus).includes(status as SMSLogStatus)) {
        filters.status = status as SMSLogStatus;
      }
      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }
      if (page) {
        filters.page = parseInt(page as string, 10);
      }
      if (limit) {
        filters.limit = parseInt(limit as string, 10);
      }

      const result = await this.smsNotificationService.getAllSMSLogs(filters);

      res.status(200).json({
        success: true,
        message: 'SMS logs retrieved successfully',
        data: result.logs,
        pagination: {
          total: result.total,
          page: filters.page || 1,
          limit: filters.limit || 50,
          totalPages: Math.ceil(result.total / (filters.limit || 50)),
        },
      });
    } catch (error) {
      console.error('Get all SMS logs error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get SMS logs',
      });
    }
  };
}
