import { Types } from 'mongoose';

import Logger from '@/utils/logger';
import { SMSLog } from '@/models/sms-log.model';
import { SMSLogStatus } from '@/types/sms-notification.type';

const MOBILE_CUSTOMER_OTP_TEMPLATE_ID = 'mobile_customer_otp';
const OTP_SMS_MESSAGE_TYPE = 'otp';

export interface IMobileCustomerSmsSendInput {
  phone: string;
  message: string;
}

export interface IMobileCustomerSmsSendResult {
  success: boolean;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  providerResponse?: Record<string, unknown>;
}

type YourSalesSmsResponse = {
  success?: boolean;
  message?: string;
  error_code?: string;
  errorCode?: string;
  data?: {
    msg_id?: string;
    message_id?: string;
    id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/**
 * Dedicated SMS gateway for the mobile-customer module.
 * Completely isolated from SMSNotificationService.
 */
export class MobileCustomerSmsService {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly brandName: string;
  private readonly timeoutMs: number;

  constructor() {
    this.endpoint =
      process.env.YOURSALES_MOBILE_SMS_API_URL || 'https://api.yoursales.vn/api/public/sms/send';

    this.apiKey = process.env.YOURSALES_MOBILE_SMS_API_KEY || process.env.YOURSALES_API_KEY || '';

    this.brandName = process.env.YOURSALES_MOBILE_SMS_BRANDNAME || '';

    this.timeoutMs = this.readPositiveInt(process.env.YOURSALES_MOBILE_SMS_TIMEOUT_MS, 15_000);
  }

  async send(input: IMobileCustomerSmsSendInput): Promise<IMobileCustomerSmsSendResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const phone = this.toLocalVietnamPhone(input.phone);
    const smsLogId = await this.createPendingOtpLog(phone);

    try {
      this.assertConfigured();

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          phone,
          brand: this.brandName,
          msg: input.message,
        }),
      });

      const data = await this.parseJson(response);
      const messageId = data.data?.msg_id || data.data?.message_id || data.data?.id;

      if (response.ok && data.success !== false) {
        await this.updateOtpLog(smsLogId, {
          status: SMSLogStatus.SUCCESS,
          sentAt: new Date(),
          apiResponse: this.buildSafeApiResponse(response.status, data),
        });

        Logger.info('Mobile customer SMS sent', {
          phone: this.maskPhone(input.phone),
          status: response.status,
          messageId,
        });

        return {
          success: true,
          messageId,
          providerResponse: data,
        };
      }

      const errorCode = data.error_code || data.errorCode || `HTTP_${response.status}`;

      const errorMessage = data.message || 'YourSales rejected the SMS request';

      await this.updateOtpLog(smsLogId, {
        status: SMSLogStatus.FAILED,
        errorCode,
        errorMessage,
        apiResponse: this.buildSafeApiResponse(response.status, data),
      });

      Logger.error('Mobile customer SMS rejected', {
        phone: this.maskPhone(input.phone),
        status: response.status,
        errorCode,
        errorMessage,
      });

      return {
        success: false,
        errorCode,
        errorMessage,
        providerResponse: data,
      };
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError';

      const errorCode = isTimeout ? 'SMS_TIMEOUT' : 'SMS_NETWORK_ERROR';

      const errorMessage = isTimeout
        ? 'YourSales SMS request timed out'
        : error instanceof Error
          ? error.message
          : 'Cannot connect to YourSales SMS';

      await this.updateOtpLog(smsLogId, {
        status: SMSLogStatus.FAILED,
        errorCode,
        errorMessage,
        apiResponse: {
          errorCode,
          errorMessage,
        },
      });

      Logger.error('Mobile customer SMS request failed', {
        phone: this.maskPhone(input.phone),
        errorCode,
        errorMessage,
      });

      return {
        success: false,
        errorCode,
        errorMessage,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async createPendingOtpLog(phone: string): Promise<string | null> {
    try {
      /*
       * Dùng đúng collection của SMSLog nhưng không thay đổi schema/validation
       * đang phục vụ web. OTP không có deliveryId và sentBy nên dùng native
       * collection operation để giữ nguyên hoàn toàn logic hiện tại của web.
       */
      const smsLogCollection = SMSLog.db.collection(SMSLog.collection.name);
      const now = new Date();

      const result = await smsLogCollection.insertOne({
        phone,
        messageType: OTP_SMS_MESSAGE_TYPE,
        templateId: MOBILE_CUSTOMER_OTP_TEMPLATE_ID,
        status: SMSLogStatus.PENDING,
        retryCount: 0,
        errorCode: null,
        errorMessage: null,
        apiResponse: null,
        sentAt: null,
        createdAt: now,
        updatedAt: now,
      });

      return String(result.insertedId);
    } catch (error) {
      Logger.error('Cannot create mobile customer OTP SMS log', {
        phone: this.maskPhone(phone),
        errorMessage: error instanceof Error ? error.message : 'Unknown SMS log error',
      });

      return null;
    }
  }

  private async updateOtpLog(
    smsLogId: string | null,
    update: {
      status: SMSLogStatus;
      errorCode?: string;
      errorMessage?: string;
      apiResponse?: Record<string, unknown>;
      sentAt?: Date;
    }
  ): Promise<void> {
    if (!smsLogId) {
      return;
    }

    try {
      const smsLogCollection = SMSLog.db.collection(SMSLog.collection.name);

      await smsLogCollection.updateOne(
        {
          _id: new Types.ObjectId(smsLogId),
          messageType: OTP_SMS_MESSAGE_TYPE,
        },
        {
          $set: {
            status: update.status,
            errorCode: update.errorCode || null,
            errorMessage: update.errorMessage || null,
            apiResponse: update.apiResponse || null,
            sentAt: update.sentAt || null,
            updatedAt: new Date(),
          },
        }
      );
    } catch (error) {
      Logger.error('Cannot update mobile customer OTP SMS log', {
        smsLogId,
        errorMessage: error instanceof Error ? error.message : 'Unknown SMS log error',
      });
    }
  }

  private buildSafeApiResponse(
    httpStatus: number,
    data: YourSalesSmsResponse
  ): Record<string, unknown> {
    return {
      httpStatus,
      success: data.success,
      message: data.message,
      errorCode: data.error_code || data.errorCode,
      messageId: data.data?.msg_id || data.data?.message_id || data.data?.id,
    };
  }

  private assertConfigured(): void {
    if (!this.apiKey) {
      throw new Error('YOURSALES_MOBILE_SMS_API_KEY is not configured');
    }

    if (!this.brandName) {
      throw new Error('YOURSALES_MOBILE_SMS_BRANDNAME is not configured');
    }
  }

  private async parseJson(response: Response): Promise<YourSalesSmsResponse> {
    const raw = await response.text();

    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as YourSalesSmsResponse;
    } catch {
      return { message: raw.slice(0, 500) };
    }
  }

  private toLocalVietnamPhone(phone: string): string {
    const normalized = String(phone || '').replace(/\D/g, '');

    if (normalized.startsWith('84') && normalized.length === 11) {
      return `0${normalized.slice(2)}`;
    }

    return normalized;
  }

  private maskPhone(phone: string): string {
    const normalized = String(phone || '').replace(/\D/g, '');

    if (normalized.length < 7) {
      return '***';
    }

    return `${normalized.slice(0, 3)}****${normalized.slice(-3)}`;
  }

  private readPositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
