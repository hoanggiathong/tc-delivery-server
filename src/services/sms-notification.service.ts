import { Delivery } from '@/models/delivery.model';
import { SMSLog } from '@/models/sms-log.model';
import {
  SMSStatus,
  SMSType,
  SMSLogStatus,
  ISMSSendResult,
  ISMSBulkSendResult,
  IYourSalesZNSParams,
  IYourSalesAPIResponse,
  ISMSLogResponse,
  IEligibleDeliveryForSMS,
  IDeliveryForSMSLean,
  IYourSalesAPIData,
  ISMSLogLeanPopulated,
  IIncompleteQuantityDeliveryForSMS,
} from '@/types/sms-notification.type';
import Logger from '@/utils/logger';

/**
 * SMS Notification Service
 * Handles sending Zalo ZNS and SMS notifications for return deliveries
 */
export class SMSNotificationService {
  private apiUrl: string;
  private apiKey: string;
  private apiToken: string;
  private zaloTemplateId: string;
  private smsTemplateId: string;

  constructor() {
    this.apiUrl = process.env.YOURSALES_API_URL || 'https://api.yoursales.vn';
    this.apiKey = process.env.YOURSALES_API_KEY || '';
    this.apiToken = process.env.YOURSALES_TOKEN || '';
    this.zaloTemplateId = process.env.ZALO_ZNS_TEMPLATE_ID || '';
    this.smsTemplateId = process.env.SMS_TEMPLATE_ID || '';
  }

  /**
   * Get deliveries eligible for SMS notification
   * Condition: isReturn=true AND smsStatus=0 (NOT_SENT)
   * Optional: filter by date (fromDate) - gets all results from that date and before
   */
  async getEligibleDeliveries(
    routeId: string,
    filters?: {
      fromDate?: Date;
      dateField?: 'dateReturn' | 'createdAt';
    }
  ): Promise<IEligibleDeliveryForSMS[]> {
    const query: Record<string, unknown> = {
      toRoute: routeId,
      isReturn: true,
      smsStatus: SMSStatus.NOT_SENT,
    };

    // Filter by date if fromDate is provided
    if (filters?.fromDate) {
      const dateField = filters.dateField || 'dateReturn';
      query[dateField] = { $lte: filters.fromDate };
    }

    const deliveries = await Delivery.find(query)
      .populate('receiver', 'phone')
      .populate('toRoute', '_id code name address phone')
      .lean<IDeliveryForSMSLean[]>();

    return deliveries.map(delivery => ({
      _id: delivery._id.toString(),
      fullCode: delivery.fullCode,
      receiverName: delivery.receiverName,
      receiverPhone: delivery.receiver?.phone || '',
      senderName: delivery.senderName,
      name: delivery.name,
      collectCost: delivery.collectCost,
      toRoute: {
        _id: delivery.toRoute._id.toString(),
        code: delivery.toRoute.code,
        name: delivery.toRoute.name,
        address: delivery.toRoute.address,
        phone: delivery.toRoute.phone,
      },
      isReturn: delivery.isReturn,
      smsStatus: delivery.smsStatus,
      smsType: delivery.smsType,
      createdAt: delivery.createdAt,
    }));
  }

  /**
   * Get deliveries with incomplete quantity for SMS notification (kiểm kê số lượng)
   * Condition: isReturn=true AND smsStatus=0 (NOT_SENT) AND quantityReturn < quantity
   * Optional: filter by date (fromDate) - gets all results from that date and before
   */
  async getIncompleteQuantityDeliveries(
    routeId: string,
    filters?: {
      fromDate?: Date;
      dateField?: 'dateReturn' | 'createdAt';
    }
  ): Promise<IIncompleteQuantityDeliveryForSMS[]> {
    const query: Record<string, unknown> = {
      toRoute: routeId,
      isReturn: true,
      smsStatus: SMSStatus.NOT_SENT,
      // Use $expr to compare two fields: quantityReturn < quantity
      $expr: { $lt: ['$quantityReturn', '$quantity'] },
    };

    // Filter by date if fromDate is provided
    if (filters?.fromDate) {
      const dateField = filters.dateField || 'dateReturn';
      query[dateField] = { $lte: filters.fromDate };
    }

    const deliveries = await Delivery.find(query)
      .populate('receiver', 'phone')
      .populate('toRoute', '_id code name address phone')
      .lean<IDeliveryForSMSLean[]>();

    return deliveries.map(delivery => ({
      _id: delivery._id.toString(),
      fullCode: delivery.fullCode,
      receiverName: delivery.receiverName,
      receiverPhone: delivery.receiver?.phone || '',
      senderName: delivery.senderName,
      name: delivery.name,
      collectCost: delivery.collectCost,
      quantity: delivery.quantity,
      quantityReturn: delivery.quantityReturn,
      toRoute: {
        _id: delivery.toRoute._id.toString(),
        code: delivery.toRoute.code,
        name: delivery.toRoute.name,
        address: delivery.toRoute.address,
        phone: delivery.toRoute.phone,
      },
      isReturn: delivery.isReturn,
      smsStatus: delivery.smsStatus,
      smsType: delivery.smsType,
      createdAt: delivery.createdAt,
    }));
  }

  /**
   * Send notification to a single delivery
   * Priority: Zalo ZNS first, fallback to SMS if not registered
   */
  async sendNotification(deliveryId: string, userId: string): Promise<ISMSSendResult> {
    const delivery = await Delivery.findById(deliveryId)
      .populate('receiver', 'phone')
      .populate('toRoute', '_id code name address phone')
      .lean<IDeliveryForSMSLean>();

    if (!delivery) {
      return {
        success: false,
        deliveryId,
        phone: '',
        errorCode: 'DELIVERY_NOT_FOUND',
        errorMessage: 'Delivery not found',
      };
    }

    // Check if already sent
    if (delivery.smsStatus === SMSStatus.SENT) {
      return {
        success: false,
        deliveryId,
        phone: delivery.receiver?.phone || '',
        errorCode: 'ALREADY_SENT',
        errorMessage: 'Notification already sent for this delivery',
      };
    }

    const phone = delivery.receiver?.phone;
    if (!phone) {
      // Update delivery status to phone error
      await Delivery.findByIdAndUpdate(deliveryId, { smsStatus: SMSStatus.PHONE_ERROR });
      return {
        success: false,
        deliveryId,
        phone: '',
        errorCode: 'PHONE_NOT_FOUND',
        errorMessage: 'Receiver phone number not found',
      };
    }

    // Validate phone format
    if (!this.isValidPhoneNumber(phone)) {
      await Delivery.findByIdAndUpdate(deliveryId, { smsStatus: SMSStatus.PHONE_ERROR });
      await this.createSMSLog({
        deliveryId,
        phone,
        messageType: SMSType.ZALO_ZNS,
        status: SMSLogStatus.FAILED,
        errorCode: 'INVALID_PHONE',
        errorMessage: 'Invalid phone number format',
        userId,
      });
      return {
        success: false,
        deliveryId,
        phone,
        errorCode: 'INVALID_PHONE',
        errorMessage: 'Invalid phone number format',
      };
    }

    // Update status to waiting
    await Delivery.findByIdAndUpdate(deliveryId, { smsStatus: SMSStatus.WAITING_ZALO_SMS });

    // Prepare template data
    const toRoute = delivery.toRoute;
    const templateData = {
      ten_khach_hang: delivery.receiverName,
      chi_nhanh: toRoute.name,
      ma_van_don: delivery.fullCode,
      nguoi_gui: delivery.senderName,
      buu_pham: delivery.name,
      trang_thai: 'Đã đến trạm phát',
      gia: this.formatCurrency(delivery.collectCost),
      hinh_thuc: delivery.homeDelivery ? 'Giao tận nhà' : 'Giao dịch trực tiếp tại quầy',
      dia_chi: toRoute.address || '',
      link_toi_cta: toRoute.phone || '',
    };

    // Try Zalo ZNS first
    const zaloResult = await this.sendZaloZNS({
      phone,
      templateId: this.zaloTemplateId,
      templateData,
    });

    if (zaloResult.success) {
      // Success with Zalo ZNS
      await Delivery.findByIdAndUpdate(deliveryId, {
        smsStatus: SMSStatus.SENT,
        smsType: SMSType.ZALO_ZNS,
        timeToSendSMS: new Date(),
      });
      await this.createSMSLog({
        deliveryId,
        phone,
        messageType: SMSType.ZALO_ZNS,
        status: SMSLogStatus.SUCCESS,
        apiResponse: zaloResult.data,
        userId,
      });
      return {
        success: true,
        deliveryId,
        phone,
        messageType: SMSType.ZALO_ZNS,
      };
    }

    // If Zalo fails with "not registered", try SMS
    if (zaloResult.errorCode === 'NOT_REGISTERED' || zaloResult.errorCode === 'ZALO_NOT_FOUND') {
      const smsResult = await this.sendSMS({
        phone,
        templateId: this.smsTemplateId,
        templateData,
      });

      if (smsResult.success) {
        await Delivery.findByIdAndUpdate(deliveryId, {
          smsStatus: SMSStatus.SENT,
          smsType: SMSType.SMS,
          timeToSendSMS: new Date(),
        });
        await this.createSMSLog({
          deliveryId,
          phone,
          messageType: SMSType.SMS,
          status: SMSLogStatus.SUCCESS,
          apiResponse: smsResult.data,
          userId,
        });
        return {
          success: true,
          deliveryId,
          phone,
          messageType: SMSType.SMS,
        };
      }

      // SMS also failed
      await Delivery.findByIdAndUpdate(deliveryId, { smsStatus: SMSStatus.NOT_SENT });
      await this.createSMSLog({
        deliveryId,
        phone,
        messageType: SMSType.SMS,
        status: SMSLogStatus.FAILED,
        errorCode: smsResult.errorCode,
        errorMessage: smsResult.errorMessage,
        apiResponse: smsResult.data,
        userId,
      });
      return {
        success: false,
        deliveryId,
        phone,
        errorCode: smsResult.errorCode,
        errorMessage: smsResult.errorMessage,
      };
    }

    // Zalo failed with other error
    await Delivery.findByIdAndUpdate(deliveryId, { smsStatus: SMSStatus.NOT_SENT });
    await this.createSMSLog({
      deliveryId,
      phone,
      messageType: SMSType.ZALO_ZNS,
      status: SMSLogStatus.FAILED,
      errorCode: zaloResult.errorCode,
      errorMessage: zaloResult.errorMessage,
      apiResponse: zaloResult.data,
      userId,
    });
    return {
      success: false,
      deliveryId,
      phone,
      errorCode: zaloResult.errorCode,
      errorMessage: zaloResult.errorMessage,
    };
  }

  /**
   * Send notifications to multiple deliveries
   */
  async sendBulkNotifications(deliveryIds: string[], userId: string): Promise<ISMSBulkSendResult> {
    const results: ISMSSendResult[] = [];

    for (const deliveryId of deliveryIds) {
      const result = await this.sendNotification(deliveryId, userId);
      results.push(result);
    }

    return {
      totalCount: deliveryIds.length,
      successCount: results.filter(r => r.success).length,
      failedCount: results.filter(r => !r.success).length,
      results,
    };
  }

  /**
   * Retry failed notification
   */
  async retryNotification(deliveryId: string, userId: string): Promise<ISMSSendResult> {
    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) {
      return {
        success: false,
        deliveryId,
        phone: '',
        errorCode: 'DELIVERY_NOT_FOUND',
        errorMessage: 'Delivery not found',
      };
    }

    // Only allow retry for phone error or not sent status
    if (delivery.smsStatus !== SMSStatus.PHONE_ERROR && delivery.smsStatus !== SMSStatus.NOT_SENT) {
      return {
        success: false,
        deliveryId,
        phone: '',
        errorCode: 'CANNOT_RETRY',
        errorMessage: 'Can only retry for phone error or not sent status',
      };
    }

    // Increment retry count in latest log
    await SMSLog.findOneAndUpdate(
      { deliveryId },
      { $inc: { retryCount: 1 } },
      { sort: { createdAt: -1 } }
    );

    // Reset status and try again
    await Delivery.findByIdAndUpdate(deliveryId, { smsStatus: SMSStatus.NOT_SENT });
    return this.sendNotification(deliveryId, userId);
  }

  /**
   * Update SMS status manually
   */
  async updateSMSStatus(deliveryId: string, smsStatus: SMSStatus): Promise<boolean> {
    const result = await Delivery.findByIdAndUpdate(deliveryId, { smsStatus });
    return !!result;
  }

  /**
   * Get SMS logs by delivery ID
   */
  async getSMSLogsByDelivery(deliveryId: string): Promise<ISMSLogResponse[]> {
    const logs = await SMSLog.find({ deliveryId })
      .populate('sentBy', '_id username name')
      .sort({ createdAt: -1 })
      .lean<ISMSLogLeanPopulated[]>();

    return logs.map(log => this.transformSMSLogToResponse(log));
  }

  /**
   * Get all SMS logs with filters
   */
  async getAllSMSLogs(
    filters: {
      status?: SMSLogStatus;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ logs: ISMSLogResponse[]; total: number }> {
    const { status, startDate, endDate, page = 1, limit = 50 } = filters;

    const query: Record<string, unknown> = {};
    if (status) {
      query.status = status;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        (query.createdAt as Record<string, Date>).$gte = startDate;
      }
      if (endDate) {
        (query.createdAt as Record<string, Date>).$lte = endDate;
      }
    }

    const [logs, total] = await Promise.all([
      SMSLog.find(query)
        .populate('sentBy', '_id username name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<ISMSLogLeanPopulated[]>(),
      SMSLog.countDocuments(query),
    ]);

    return {
      logs: logs.map(log => this.transformSMSLogToResponse(log)),
      total,
    };
  }

  // Private methods

  /**
   * Send Zalo ZNS message via YourSales API
   */
  private async sendZaloZNS(params: IYourSalesZNSParams): Promise<IYourSalesAPIResponse> {
    try {
      // TODO: Implement actual API call to YourSales
      // For now, return a mock response
      Logger.info('Sending Zalo ZNS', { phone: params.phone, templateId: params.templateId });

      const response = await fetch(`${this.apiUrl}/zalo/zns/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          Authorization: `Bearer ${this.apiToken}`,
        },
        body: JSON.stringify({
          phone: params.phone,
          template_id: params.templateId,
          template_data: params.templateData,
        }),
      });

      const data = (await response.json()) as IYourSalesAPIData;

      if (response.ok && data.success) {
        return { success: true, data };
      }

      return {
        success: false,
        errorCode: data.error_code || 'ZALO_ERROR',
        errorMessage: data.error_message || 'Failed to send Zalo ZNS',
        data,
      };
    } catch (error) {
      Logger.error('Zalo ZNS send error', { error });
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Send SMS message via YourSales API
   */
  private async sendSMS(params: IYourSalesZNSParams): Promise<IYourSalesAPIResponse> {
    try {
      Logger.info('Sending SMS', { phone: params.phone, templateId: params.templateId });

      const response = await fetch(`${this.apiUrl}/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          Authorization: `Bearer ${this.apiToken}`,
        },
        body: JSON.stringify({
          phone: params.phone,
          template_id: params.templateId,
          template_data: params.templateData,
        }),
      });

      const data = (await response.json()) as IYourSalesAPIData;

      if (response.ok && data.success) {
        return { success: true, data };
      }

      return {
        success: false,
        errorCode: data.error_code || 'SMS_ERROR',
        errorMessage: data.error_message || 'Failed to send SMS',
        data,
      };
    } catch (error) {
      Logger.error('SMS send error', { error });
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Create SMS log entry
   */
  private async createSMSLog(data: {
    deliveryId: string;
    phone: string;
    messageType: SMSType;
    status: SMSLogStatus;
    errorCode?: string;
    errorMessage?: string;
    apiResponse?: Record<string, unknown>;
    userId: string;
  }): Promise<void> {
    try {
      const log = new SMSLog({
        deliveryId: data.deliveryId,
        phone: data.phone,
        messageType: data.messageType,
        templateId:
          data.messageType === SMSType.ZALO_ZNS ? this.zaloTemplateId : this.smsTemplateId,
        status: data.status,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        apiResponse: data.apiResponse,
        sentAt: data.status === SMSLogStatus.SUCCESS ? new Date() : undefined,
        sentBy: data.userId,
      });
      await log.save();
    } catch (error) {
      Logger.error('Failed to create SMS log', { error, data });
    }
  }

  /**
   * Transform SMS log to response format
   */
  private transformSMSLogToResponse(log: ISMSLogLeanPopulated): ISMSLogResponse {
    return {
      _id: log._id.toString(),
      deliveryId: log.deliveryId.toString(),
      phone: log.phone,
      messageType: log.messageType,
      templateId: log.templateId,
      status: log.status,
      errorCode: log.errorCode,
      errorMessage: log.errorMessage,
      retryCount: log.retryCount,
      sentAt: log.sentAt,
      sentBy: {
        _id: log.sentBy._id,
        username: log.sentBy.username,
        name: log.sentBy.name,
      },
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    };
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Vietnamese phone format: starts with 0 or +84
    const phoneRegex = /^(\+84|84|0)[1-9]\d{8,9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Format currency to VND string
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount);
  }
}
