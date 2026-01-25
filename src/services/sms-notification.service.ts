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
import { getStartOfDayVietnam, getEndOfDayVietnam, convertVietnamToUTC } from '@/utils/date.utils';
import { convertPhoneToLocalFormat } from '@/utils/validation-patterns';
import { UserService } from '@/services/user.service';

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
  private userService: UserService;

  constructor() {
    this.apiUrl = process.env.YOURSALES_API_URL || 'https://api.yoursales.vn/api';
    this.apiKey = process.env.YOURSALES_API_KEY || '';
    this.apiToken = process.env.YOURSALES_TOKEN || '';
    this.zaloTemplateId = process.env.ZALO_ZNS_TEMPLATE_ID || '';
    this.smsTemplateId = process.env.SMS_TEMPLATE_ID || '';
    this.userService = new UserService();
  }

  /**
   * Get deliveries eligible for SMS notification
   * Condition: isReturn=true AND smsStatus=0 (NOT_SENT)
   * Optional: filter by date (toDate) - gets results from 7 days before that date up to that date
   * Automatically filters by user's selected route
   */
  async getEligibleDeliveries(
    userId: string,
    filters?: {
      toDate?: Date;
    }
  ): Promise<IEligibleDeliveryForSMS[]> {
    // Fetch user's selected route ID
    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

    const query: Record<string, unknown> = {
      toRoute: selectedRouteId,
      isReturn: { $ne: true },
    };

    // Always apply 7-day filter (default to today if not provided)
    const endDate = filters?.toDate || getEndOfDayVietnam(new Date());

    const startDateCalc = new Date(endDate);
    startDateCalc.setDate(startDateCalc.getDate() - 7); // Subtract 7 days
    const startDate = getStartOfDayVietnam(startDateCalc); // Set to 00:00:00

    query.createdAt = {
      $gte: convertVietnamToUTC(startDate),
      $lte: endDate, // Already UTC from schema transform or getEndOfDayVietnam
    };

    const deliveries = await Delivery.find(query)
      .populate('receiver', 'phone')
      .populate('toRoute', '_id code name address phone')
      .lean<IDeliveryForSMSLean[]>();

    return deliveries.map(delivery => ({
      _id: delivery._id.toString(),
      fullCode: delivery.fullCode,
      receiverName: delivery.receiverName,
      receiverPhone: delivery.receiverPhone || '',
      senderName: delivery.senderName,
      senderPhone: delivery.senderPhone,
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
   * Optional: filter by date (toDate) - gets results from 7 days before that date up to that date
   * Automatically filters by user's selected route
   */
  async getIncompleteQuantityDeliveries(
    userId: string,
    filters?: {
      toDate?: Date;
    }
  ): Promise<IIncompleteQuantityDeliveryForSMS[]> {
    // Fetch user's selected route ID
    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

    const query: Record<string, unknown> = {
      toRoute: selectedRouteId,
      isReturn: { $ne: true },
      $or: [{ smsStatus: null }, { smsStatus: SMSStatus.NOT_SENT }],
      // Use $expr to compare two fields: quantityReturn < quantity
      $expr: { $lt: ['$quantityReturn', '$quantity'] },
    };

    // Always apply 7-day filter (default to today if not provided)
    const endDate = filters?.toDate || getEndOfDayVietnam(new Date());

    const startDateCalc = new Date(endDate);
    startDateCalc.setDate(startDateCalc.getDate() - 7); // Subtract 7 days
    const startDate = getStartOfDayVietnam(startDateCalc); // Set to 00:00:00

    query.createdAt = {
      $gte: convertVietnamToUTC(startDate),
      $lte: endDate, // Already UTC from schema transform or getEndOfDayVietnam
    };

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
      .populate('sender', 'phone')
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
        phone: delivery.sender?.phone || '',
        errorCode: 'ALREADY_SENT',
        errorMessage: 'Notification already sent for this delivery',
      };
    }

    const phone = delivery.sender?.phone;
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
        messageType: SMSType.ZALO,
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
      gia: this.formatCurrency(delivery.totalCost),
      hinh_thuc: delivery.homeDelivery ? 'Giao tận nhà' : 'Giao dịch trực tiếp tại quầy',
      dia_chi: toRoute.address || '',
      '0123456789': convertPhoneToLocalFormat(toRoute.phone || ''),
    };

    // Try Zalo ZNS first
    const zaloResult = await this.sendZaloZNS({
      phone,
      templateId: Number(this.zaloTemplateId),
      templateData,
    });

    if (zaloResult.success) {
      // Success with Zalo ZNS
      await Delivery.findByIdAndUpdate(deliveryId, {
        smsStatus: SMSStatus.SENT,
        smsType: SMSType.ZALO,
        timeToSendSMS: new Date(),
        msgId: zaloResult.data?.msg_id,
      });
      await this.createSMSLog({
        deliveryId,
        phone,
        messageType: SMSType.ZALO,
        status: SMSLogStatus.SUCCESS,
        apiResponse: zaloResult.data,
        userId,
      });
      return {
        success: true,
        deliveryId,
        phone,
        messageType: SMSType.ZALO,
      };
    }

    // If Zalo fails with "not registered", try SMS
    if (zaloResult.errorCode === 'NOT_REGISTERED' || zaloResult.errorCode === 'ZALO_NOT_FOUND') {
      const smsResult = await this.sendSMS({
        phone,
        templateId: Number(this.smsTemplateId),
        templateData,
      });

      if (smsResult.success) {
        await Delivery.findByIdAndUpdate(deliveryId, {
          smsStatus: SMSStatus.SENT,
          smsType: SMSType.SMS,
          timeToSendSMS: new Date(),
          msgId: smsResult.data?.msg_id,
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
      messageType: SMSType.ZALO,
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
      Logger.info('Sending Zalo ZNS', { phone: params.phone, templateId: params.templateId });

      const response = await fetch(`${this.apiUrl}/public/zns/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Basic ${this.apiToken}`,
        },
        body: JSON.stringify({
          template_id: params.templateId,
          phone: convertPhoneToLocalFormat(params.phone),
          data: params.templateData,
          sms_failover: {
            brand: 'VT.GiaPhuoc',
            msg: 'VT.GiaPhuoc kinh moi quy khach den chi nhanh nhan buu pham tu voi so tien can thanh toan. Giao dich tai quay. Chi tiet vui long lien he.',
          },
        }),
      });

      const data = (await response.json()) as IYourSalesAPIData;

      if (response.status === 201 && data.data?.msg_id) {
        return { success: true, data };
      }

      return {
        success: false,
        errorCode: data.error_code || 'ZALO_ERROR',
        errorMessage: data.message || 'Failed to send Zalo ZNS',
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
          data: params.templateData,
        }),
      });

      const data = (await response.json()) as IYourSalesAPIData;

      if (response.status === 201 && data.data?.msg_id) {
        return { success: true, data };
      }

      return {
        success: false,
        errorCode: data.error_code || 'SMS_ERROR',
        errorMessage: data.message || 'Failed to send SMS',
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
        templateId: data.messageType === SMSType.ZALO ? this.zaloTemplateId : this.smsTemplateId,
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
