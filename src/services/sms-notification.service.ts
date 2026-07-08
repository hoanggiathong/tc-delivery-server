import mongoose from 'mongoose';
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
import { getStartOfDayVietnam, getEndOfDayVietnam } from '@/utils/date.utils';
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
   * Condition: isReturn != true AND no homeDelivery (not GTN - giao tận nơi)
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
      $or: [{ homeDelivery: null }, { homeDelivery: '' }],
    };

    // Always apply 7-day filter (default to today if not provided)
    const endDate = filters?.toDate || getEndOfDayVietnam(new Date());

    const startDateCalc = new Date(endDate);
    startDateCalc.setDate(startDateCalc.getDate() - 7); // Subtract 7 days
    const startDate = getStartOfDayVietnam(startDateCalc); // Set to 00:00:00

    query.createdAt = {
      $gte: startDate,
      $lte: endDate,
    };

    const deliveries = await Delivery.find(query)
      .populate('sender', 'name phone')
      .populate('receiver', 'name phone')
      .populate('toRoute', '_id code name address phone')
      .lean<IDeliveryForSMSLean[]>();

    // Get messageTime (latest sentAt) from SMS logs for all deliveries
    const deliveryIds = deliveries.map(d => d._id.toString());
    const objectIds = deliveryIds.map(id => new mongoose.Types.ObjectId(id));
    const smsLogs = await SMSLog.aggregate([
      { $match: { deliveryId: { $in: objectIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$deliveryId',
          latestSentAt: { $first: '$sentAt' },
        },
      },
    ]);

    // Create a map of deliveryId -> messageTime
    const messageTimeMap = new Map<string, Date | undefined>();
    for (const log of smsLogs) {
      messageTimeMap.set(log._id.toString(), log.latestSentAt);
    }

    return deliveries.map(delivery => ({
      _id: delivery._id.toString(),
      fullCode: delivery.fullCode,
      receiverName: delivery.receiver?.name || '',
      receiverPhone: delivery.receiver?.phone || '',
      senderName: delivery.sender?.name || '',
      senderPhone: delivery.sender?.phone || '',
      name: delivery.name,
      collectCost: delivery.collectCost,
      homeDeliveryCost: delivery.homeDeliveryCost,
      downItems: delivery.downItems,
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
      messageTime: messageTimeMap.get(delivery._id.toString()),
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
      isQuantityChecked: { $ne: true },
      $or: [{ smsStatus: null }, { smsStatus: SMSStatus.NOT_SENT }],
    };

    // Always apply 7-day filter (default to today if not provided)
    const endDate = filters?.toDate || getEndOfDayVietnam(new Date());

    const startDateCalc = new Date(endDate);
    startDateCalc.setDate(startDateCalc.getDate() - 7); // Subtract 7 days
    const startDate = getStartOfDayVietnam(startDateCalc); // Set to 00:00:00

    query.createdAt = {
      $gte: startDate,
      $lte: endDate,
    };

    const deliveries = await Delivery.find(query)
      .populate('receiver', 'name phone')
      .populate('sender', 'name phone')
      .populate('toRoute', '_id code name address phone')
      .lean<IDeliveryForSMSLean[]>();

    const incompleteDeliveries = deliveries.filter(delivery => {
      const quantity = Number(delivery.quantity || 0);

      const toRoute = delivery.toRoute as unknown as {
        _id?: unknown;
        code?: string;
        name?: string;
      };

      const destinationDownQuantity = this.getDestinationDownQuantity(
        delivery.downItems,
        toRoute?.code
      );

      /**
       * Chỉ hiện kiểm kê khi:
       * - Đã xuống đúng trạm đích
       * - Nhưng tổng số lượng trong [] tại trạm đích chưa đủ quantity
       */
      return destinationDownQuantity > 0 && destinationDownQuantity < quantity;
    });

    // Get messageTime (latest sentAt) from SMS logs for all deliveries
    const deliveryIds = incompleteDeliveries.map(d => d._id.toString());
    const objectIds = deliveryIds.map(id => new mongoose.Types.ObjectId(id));
    const smsLogs = await SMSLog.aggregate([
      { $match: { deliveryId: { $in: objectIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$deliveryId',
          latestSentAt: { $first: '$sentAt' },
        },
      },
    ]);

    // Create a map of deliveryId -> messageTime
    const messageTimeMap = new Map<string, Date | undefined>();
    for (const log of smsLogs) {
      messageTimeMap.set(log._id.toString(), log.latestSentAt);
    }

    return incompleteDeliveries.map(delivery => ({
      _id: delivery._id.toString(),
      fullCode: delivery.fullCode,
      receiverName: delivery.receiver.name,
      receiverPhone: delivery.receiver?.phone || '',
      senderName: delivery.sender.name,
      senderPhone: delivery.sender.phone,
      name: delivery.name,
      collectCost: delivery.collectCost,
      homeDeliveryCost: delivery.homeDeliveryCost,
      downItems: delivery.downItems,
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
      messageTime: messageTimeMap.get(delivery._id.toString()),
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
      chi_nhanh: (toRoute.name || '').replace(/\./g, '-'),
      ma_van_don: this.maskCode(delivery.fullCode),
      nguoi_gui: delivery.senderName,
      buu_pham: (delivery.name || '').replace(/\./g, '-'),
      trang_thai: 'Đã đến trạm phát',
      gia: (delivery.actualRevenue ?? 0).toString(),
      hinh_thuc: delivery.homeDelivery ? 'Giao tận nhà' : 'Giao dịch trực tiếp tại quầy',
      dia_chi: (toRoute.address || '').replace(/\./g, '-'),
      link_cta: convertPhoneToLocalFormat(toRoute.phone || ''),
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

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private getDestinationDownQuantity(downItems: unknown, routeCode?: string): number {
    if (!routeCode || typeof downItems !== 'string' || !downItems.trim()) {
      return 0;
    }

    const normalizedDownItems = downItems.toUpperCase();
    const normalizedRouteCode = routeCode.toUpperCase();

    const regex = new RegExp(`${this.escapeRegex(normalizedRouteCode)}\\d+\\[(\\d+)\\]`, 'g');

    let total = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(normalizedDownItems)) !== null) {
      total += Number(match[1] || 0);
    }

    return total;
  }

  /**
   * Update SMS status manually
   */
  async updateSMSStatus(deliveryId: string, smsStatus: SMSStatus): Promise<boolean> {
    const result = await Delivery.findByIdAndUpdate(deliveryId, { smsStatus });
    return !!result;
  }

  /**
   * Mark multiple deliveries as quantity checked
   * Returns the number of deliveries updated
   */
  async markQuantityChecked(deliveryIds: string[], userId: string): Promise<number> {
    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

    const deliveries = await Delivery.find({
      _id: { $in: deliveryIds },
      toRoute: selectedRouteId,
      isReturn: { $ne: true },
      $or: [{ smsStatus: null }, { smsStatus: SMSStatus.NOT_SENT }],
    })
      .select('_id quantity downItems toRoute isQuantityChecked')
      .populate('toRoute', '_id code name')
      .lean<IDeliveryForSMSLean[]>();

    const validCheckedIds: string[] = [];

    for (const delivery of deliveries) {
      const quantity = Number(delivery.quantity || 0);

      const toRoute = delivery.toRoute as unknown as {
        _id?: unknown;
        code?: string;
        name?: string;
      };

      const destinationDownQuantity = this.getDestinationDownQuantity(
        delivery.downItems,
        toRoute?.code
      );

      /**
       * Chỉ cho xác nhận kiểm kê khi:
       * - Đã xuống đúng trạm đích
       * - Nhưng chưa đủ số lượng
       *
       * Ví dụ:
       * quantity = 4
       * downItems = CT000434[2], LX000436[2]
       * => được xác nhận kiểm kê
       *
       * downItems = CT000434[2]
       * => chưa xuống LX, không cho xác nhận
       */
      if (destinationDownQuantity > 0 && destinationDownQuantity < quantity) {
        validCheckedIds.push(delivery._id.toString());
      }
    }

    if (validCheckedIds.length === 0) {
      return 0;
    }

    const result = await Delivery.updateMany(
      {
        _id: { $in: validCheckedIds },
        toRoute: selectedRouteId,
      },
      {
        $set: {
          isQuantityChecked: true,
          quantityCheckedBy: userId,
        },
      }
    );

    return result.modifiedCount;
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
      // Mask tracking code: first 6 chars and last 2 chars with asterisks
      const code = params.templateData.ma_van_don;
      const maskedCode = code.length > 8 ? '******' + code.slice(6, -2) + '**' : code;

      Logger.info('Sending Zalo ZNS', { phone: params.phone, templateId: params.templateId });
      Logger.info('Sending data:', {
        template_id: params.templateId,
        phone: convertPhoneToLocalFormat(params.phone),
        data: params.templateData,
        sms_failover: {
          brand: 'VT.GiaPhuoc',
          msg: `VT.GiaPhuoc kinh moi quy khach ${params.templateData.ten_khach_hang} den chi nhanh ${params.templateData.chi_nhanh} nhan buu pham ${maskedCode} tu ${params.templateData.nguoi_gui} voi so tien can thanh toan ${params.templateData.gia}. Giao dich tai quay ${params.templateData.dia_chi}. Chi tiet vui long lien he ${params.templateData.link_cta}.`,
        },
      });
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
            msg: `VT.GiaPhuoc kinh moi quy khach ${params.templateData.ten_khach_hang} den chi nhanh ${params.templateData.chi_nhanh} nhan buu pham ${maskedCode} tu ${params.templateData.nguoi_gui} voi so tien can thanh toan ${params.templateData.gia}. Giao dich tai quay ${params.templateData.dia_chi}. Chi tiet vui long lien he ${params.templateData.link_cta}.`,
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

  /**
   * Mask tracking code - hide first 6 chars and last 2 chars with asterisks
   * Example: "ABC123456TP89" -> "******3456TP**"
   */
  private maskCode(code: string): string {
    if (!code || code.length <= 8) {
      return code;
    }
    return '******' + code.slice(6, -2) + '**';
  }
}
