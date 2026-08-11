import crypto from 'node:crypto';

import {
  MobileCustomerAccount,
  MobileCustomerDeletionStatus,
} from '@/modules/mobile-customer/mobile-customer-account.model';
import {
  MobileCustomerOtp,
  MobileCustomerOtpProviderStatus,
  MobileCustomerOtpPurpose,
} from './mobile-customer-otp.model';
import { MobileCustomerSmsService } from './mobile-customer-sms.service';

export interface IMobileCustomerOtpRequestResult {
  purpose: MobileCustomerOtpPurpose;
  expiresIn: number;
  resendAfter: number;
  devOtp?: string;
}

export interface IMobileCustomerOtpRequestContext {
  ip?: string;
}

export class MobileCustomerOtpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'MobileCustomerOtpError';
  }
}

export class MobileCustomerOtpService {
  private readonly smsService = new MobileCustomerSmsService();
  private readonly otpLength = 6;
  private readonly expiresSeconds = this.readPositiveInt(
    process.env.MOBILE_OTP_EXPIRES_SECONDS,
    90
  );
  private readonly resendSeconds = this.readPositiveInt(process.env.MOBILE_OTP_RESEND_SECONDS, 90);
  private readonly maxAttempts = this.readPositiveInt(process.env.MOBILE_OTP_MAX_ATTEMPTS, 5);
  private readonly maxPerHour = this.readPositiveInt(process.env.MOBILE_OTP_MAX_PER_HOUR, 5);
  private readonly maxPerDay = this.readPositiveInt(process.env.MOBILE_OTP_MAX_PER_DAY, 20);
  private readonly maxPerIpHour = this.readPositiveInt(process.env.MOBILE_OTP_MAX_PER_IP_HOUR, 20);
  private readonly retentionHours = this.readPositiveInt(
    process.env.MOBILE_OTP_RETENTION_HOURS,
    48
  );

  async resolvePurpose(
    phoneInput: string,
    requestedPurpose?: unknown
  ): Promise<MobileCustomerOtpPurpose> {
    const phone = this.normalizePhone(phoneInput);
    this.assertPhone(phone);

    const explicit = this.parsePurpose(requestedPurpose);
    if (
      explicit === MobileCustomerOtpPurpose.ACCOUNT_DELETION ||
      explicit === MobileCustomerOtpPurpose.ACCOUNT_DELETION_CANCEL
    ) {
      throw new MobileCustomerOtpError(
        'Mục đích OTP này phải được gọi qua API xóa tài khoản',
        400,
        'INVALID_OTP_PURPOSE'
      );
    }
    if (explicit) {
      return explicit;
    }

    const account = await MobileCustomerAccount.exists({
      phone,
      deletionStatus: { $ne: MobileCustomerDeletionStatus.COMPLETED },
    });

    return account ? MobileCustomerOtpPurpose.LOGIN : MobileCustomerOtpPurpose.REGISTER;
  }

  async requestOtp(
    phoneInput: string,
    purpose: MobileCustomerOtpPurpose,
    context: IMobileCustomerOtpRequestContext = {}
  ): Promise<IMobileCustomerOtpRequestResult> {
    const phone = this.normalizePhone(phoneInput);
    this.assertPhone(phone);
    this.assertSupportedPurpose(purpose);
    await this.assertPurposeAllowed(phone, purpose);
    await this.assertRateLimits(phone, purpose, context.ip);

    const now = new Date();
    const otp = this.isMockEnabled() ? this.getMockOtp() : this.generateOtp();
    const otpHash = this.hashOtp(phone, purpose, otp);

    await MobileCustomerOtp.updateMany(
      { phone, purpose, usedAt: null, invalidatedAt: null },
      { $set: { invalidatedAt: now } }
    );

    const record = await MobileCustomerOtp.create({
      phone,
      purpose,
      otpHash,
      expiresAt: new Date(now.getTime() + this.expiresSeconds * 1000),
      resendAvailableAt: new Date(now.getTime() + this.resendSeconds * 1000),
      attempts: 0,
      maxAttempts: this.maxAttempts,
      usedAt: null,
      invalidatedAt: null,
      providerStatus: MobileCustomerOtpProviderStatus.PENDING,
      providerMessageId: null,
      providerErrorCode: null,
      providerErrorMessage: null,
      providerResponse: null,
      requestIp: context.ip || null,
      purgeAt: new Date(now.getTime() + this.retentionHours * 60 * 60 * 1000),
    });

    if (this.isMockEnabled()) {
      await MobileCustomerOtp.updateOne(
        { _id: record._id },
        {
          $set: {
            providerStatus: MobileCustomerOtpProviderStatus.SENT,
            providerMessageId: 'MOCK',
            providerResponse: { mock: true },
          },
        }
      );

      return {
        purpose,
        expiresIn: this.expiresSeconds,
        resendAfter: this.resendSeconds,
        devOtp: otp,
      };
    }

    const smsResult = await this.smsService.send({
      phone,
      message: this.buildOtpMessage(otp, purpose),
    });

    if (!smsResult.success) {
      await MobileCustomerOtp.updateOne(
        { _id: record._id },
        {
          $set: {
            providerStatus: MobileCustomerOtpProviderStatus.FAILED,
            providerErrorCode: smsResult.errorCode || 'SMS_SEND_FAILED',
            providerErrorMessage: smsResult.errorMessage || 'Không thể gửi mã OTP',
            providerResponse: smsResult.providerResponse || null,
            invalidatedAt: new Date(),
          },
        }
      );

      throw new MobileCustomerOtpError(
        'Không thể gửi mã OTP. Vui lòng thử lại sau',
        502,
        smsResult.errorCode || 'SMS_SEND_FAILED'
      );
    }

    await MobileCustomerOtp.updateOne(
      { _id: record._id },
      {
        $set: {
          providerStatus: MobileCustomerOtpProviderStatus.SENT,
          providerMessageId: smsResult.messageId || null,
          providerResponse: smsResult.providerResponse || null,
        },
      }
    );

    return {
      purpose,
      expiresIn: this.expiresSeconds,
      resendAfter: this.resendSeconds,
      devOtp: process.env.NODE_ENV === 'production' ? undefined : otp,
    };
  }

  async verifyOtp(
    phoneInput: string,
    otpInput: string,
    purpose: MobileCustomerOtpPurpose
  ): Promise<void> {
    const phone = this.normalizePhone(phoneInput);
    const otp = String(otpInput || '').trim();

    this.assertPhone(phone);
    this.assertSupportedPurpose(purpose);
    this.assertOtpFormat(otp);

    const record = await MobileCustomerOtp.findOne({
      phone,
      purpose,
      providerStatus: MobileCustomerOtpProviderStatus.SENT,
      usedAt: null,
      invalidatedAt: null,
    })
      .select('+otpHash')
      .sort({ createdAt: -1 });

    if (!record) {
      throw new MobileCustomerOtpError('OTP không đúng hoặc đã hết hạn', 401, 'OTP_NOT_FOUND');
    }

    const now = new Date();

    if (record.expiresAt.getTime() <= now.getTime()) {
      await MobileCustomerOtp.updateOne(
        { _id: record._id, usedAt: null, invalidatedAt: null },
        { $set: { invalidatedAt: now } }
      );
      throw new MobileCustomerOtpError('OTP không đúng hoặc đã hết hạn', 401, 'OTP_EXPIRED');
    }

    if (record.attempts >= record.maxAttempts) {
      await MobileCustomerOtp.updateOne(
        { _id: record._id, usedAt: null, invalidatedAt: null },
        { $set: { invalidatedAt: now } }
      );
      throw new MobileCustomerOtpError('OTP đã bị khóa. Vui lòng gửi mã mới', 429, 'OTP_LOCKED');
    }

    const expected = this.hexToBuffer(record.otpHash);
    const actual = this.hexToBuffer(this.hashOtp(phone, purpose, otp));
    const valid = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

    if (!valid) {
      await this.handleInvalidOtpAttempt(
        String(record._id),
        record.attempts,
        record.maxAttempts,
        now
      );
    }

    const consumed = await MobileCustomerOtp.updateOne(
      {
        _id: record._id,
        providerStatus: MobileCustomerOtpProviderStatus.SENT,
        usedAt: null,
        invalidatedAt: null,
        expiresAt: { $gt: now },
      },
      { $set: { usedAt: now } }
    );

    if (consumed.modifiedCount !== 1) {
      throw new MobileCustomerOtpError(
        'OTP đã được sử dụng hoặc đã hết hạn',
        401,
        'OTP_ALREADY_USED'
      );
    }
  }

  normalizePhone(phoneInput: string): string {
    const raw = String(phoneInput || '').replace(/\D/g, '');
    if (raw.startsWith('0084') && raw.length === 13) {
      return `+84${raw.slice(4)}`;
    }
    if (raw.startsWith('84') && raw.length === 11) {
      return `+${raw}`;
    }
    if (raw.startsWith('0') && raw.length === 10) {
      return `+84${raw.slice(1)}`;
    }
    return raw;
  }

  private async assertPurposeAllowed(
    phone: string,
    purpose: MobileCustomerOtpPurpose
  ): Promise<void> {
    const account = await MobileCustomerAccount.findOne({ phone })
      .select('_id isActive deletionStatus scheduledDeletionAt deletionProcessingAt')
      .lean<{
        _id: unknown;
        isActive: boolean;
        deletionStatus?: MobileCustomerDeletionStatus;
        scheduledDeletionAt?: Date | null;
        deletionProcessingAt?: Date | null;
      } | null>();

    if (
      purpose === MobileCustomerOtpPurpose.LOGIN ||
      purpose === MobileCustomerOtpPurpose.FORGOT_PASSWORD
    ) {
      if (!account) {
        throw new MobileCustomerOtpError('Tài khoản chưa đăng ký', 404, 'MOBILE_ACCOUNT_NOT_FOUND');
      }
      if (account.deletionStatus === MobileCustomerDeletionStatus.PENDING) {
        throw new MobileCustomerOtpError('Tài khoản đang chờ xóa', 403, 'ACCOUNT_PENDING_DELETION');
      }
      if (!account.isActive) {
        throw new MobileCustomerOtpError('Tài khoản đã bị khóa', 403, 'MOBILE_ACCOUNT_DISABLED');
      }
      return;
    }

    if (purpose === MobileCustomerOtpPurpose.REGISTER) {
      if (account) {
        throw new MobileCustomerOtpError(
          'Số điện thoại này đã đăng ký tài khoản',
          409,
          'MOBILE_ACCOUNT_EXISTS'
        );
      }
      return;
    }

    if (purpose === MobileCustomerOtpPurpose.ACCOUNT_DELETION) {
      if (!account || !account.isActive) {
        throw new MobileCustomerOtpError(
          'Tài khoản không hoạt động',
          403,
          'MOBILE_ACCOUNT_DISABLED'
        );
      }
      if (
        (account.deletionStatus || MobileCustomerDeletionStatus.NONE) !==
        MobileCustomerDeletionStatus.NONE
      ) {
        throw new MobileCustomerOtpError(
          'Tài khoản đã có yêu cầu xóa',
          409,
          'ACCOUNT_DELETION_ALREADY_REQUESTED'
        );
      }
      return;
    }

    if (purpose === MobileCustomerOtpPurpose.ACCOUNT_DELETION_CANCEL) {
      if (!account || account.deletionStatus !== MobileCustomerDeletionStatus.PENDING) {
        throw new MobileCustomerOtpError(
          'Không tìm thấy yêu cầu xóa đang chờ xử lý',
          404,
          'ACCOUNT_DELETION_NOT_FOUND'
        );
      }
      if (
        !account.scheduledDeletionAt ||
        account.scheduledDeletionAt.getTime() <= Date.now() ||
        account.deletionProcessingAt
      ) {
        throw new MobileCustomerOtpError(
          'Yêu cầu xóa đã hết thời gian hủy',
          409,
          'ACCOUNT_DELETION_CANCEL_EXPIRED'
        );
      }
      return;
    }

    throw new MobileCustomerOtpError('Mục đích OTP không hợp lệ', 400, 'INVALID_OTP_PURPOSE');
  }

  private async assertRateLimits(
    phone: string,
    purpose: MobileCustomerOtpPurpose,
    requestIp?: string
  ): Promise<void> {
    const now = new Date();
    const latest = await MobileCustomerOtp.findOne({
      phone,
      purpose,
      providerStatus: {
        $in: [MobileCustomerOtpProviderStatus.PENDING, MobileCustomerOtpProviderStatus.SENT],
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (latest && latest.resendAvailableAt.getTime() > now.getTime()) {
      const remaining = Math.ceil((latest.resendAvailableAt.getTime() - now.getTime()) / 1000);
      throw new MobileCustomerOtpError(
        `Vui lòng chờ ${remaining} giây trước khi gửi lại`,
        429,
        'OTP_RESEND_TOO_SOON'
      );
    }

    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const base = {
      phone,
      purpose,
      providerStatus: MobileCustomerOtpProviderStatus.SENT,
    };

    const [hourCount, dayCount, ipHourCount] = await Promise.all([
      MobileCustomerOtp.countDocuments({
        ...base,
        createdAt: { $gte: oneHourAgo },
      }),
      MobileCustomerOtp.countDocuments({
        ...base,
        createdAt: { $gte: oneDayAgo },
      }),
      requestIp
        ? MobileCustomerOtp.countDocuments({
            requestIp,
            providerStatus: MobileCustomerOtpProviderStatus.SENT,
            createdAt: { $gte: oneHourAgo },
          })
        : Promise.resolve(0),
    ]);

    if (hourCount >= this.maxPerHour) {
      throw new MobileCustomerOtpError(
        'Bạn đã yêu cầu quá nhiều OTP. Vui lòng thử lại sau',
        429,
        'OTP_HOURLY_LIMIT'
      );
    }
    if (dayCount >= this.maxPerDay) {
      throw new MobileCustomerOtpError(
        'Bạn đã đạt giới hạn OTP trong ngày',
        429,
        'OTP_DAILY_LIMIT'
      );
    }
    if (requestIp && ipHourCount >= this.maxPerIpHour) {
      throw new MobileCustomerOtpError(
        'Có quá nhiều yêu cầu OTP từ thiết bị này',
        429,
        'OTP_IP_LIMIT'
      );
    }
  }

  private async handleInvalidOtpAttempt(
    recordId: string,
    currentAttempts: number,
    maxAttempts: number,
    now: Date
  ): Promise<never> {
    const attempts = currentAttempts + 1;
    const lock = attempts >= maxAttempts;

    await MobileCustomerOtp.updateOne(
      { _id: recordId, usedAt: null, invalidatedAt: null },
      {
        $set: {
          attempts,
          ...(lock ? { invalidatedAt: now } : {}),
        },
      }
    );

    throw new MobileCustomerOtpError(
      lock ? 'OTP đã bị khóa. Vui lòng gửi mã mới' : 'OTP không đúng hoặc đã hết hạn',
      lock ? 429 : 401,
      lock ? 'OTP_LOCKED' : 'OTP_INVALID'
    );
  }

  private parsePurpose(value: unknown): MobileCustomerOtpPurpose | null {
    const purpose = String(value || '')
      .trim()
      .toUpperCase();
    return Object.values(MobileCustomerOtpPurpose).includes(purpose as MobileCustomerOtpPurpose)
      ? (purpose as MobileCustomerOtpPurpose)
      : null;
  }

  private assertSupportedPurpose(purpose: MobileCustomerOtpPurpose): void {
    if (!Object.values(MobileCustomerOtpPurpose).includes(purpose)) {
      throw new MobileCustomerOtpError('Mục đích OTP không hợp lệ', 400, 'INVALID_OTP_PURPOSE');
    }
  }

  private assertOtpFormat(otp: string): void {
    if (!new RegExp(`^\\d{${this.otpLength}}$`).test(otp)) {
      throw new MobileCustomerOtpError(
        `Mã OTP phải gồm ${this.otpLength} chữ số`,
        400,
        'INVALID_OTP_FORMAT'
      );
    }
  }

  private generateOtp(): string {
    return crypto.randomInt(10 ** (this.otpLength - 1), 10 ** this.otpLength).toString();
  }

  private hashOtp(phone: string, purpose: MobileCustomerOtpPurpose, otp: string): string {
    const secret = process.env.MOBILE_OTP_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('MOBILE_OTP_SECRET must be configured with at least 32 characters');
    }
    return crypto.createHmac('sha256', secret).update(`${phone}:${purpose}:${otp}`).digest('hex');
  }

  private hexToBuffer(value: string): Buffer {
    return value && /^[a-fA-F0-9]{64}$/.test(value) ? Buffer.from(value, 'hex') : Buffer.alloc(0);
  }

  private buildOtpMessage(otp: string, purpose: MobileCustomerOtpPurpose): string {
    const action =
      purpose === MobileCustomerOtpPurpose.ACCOUNT_DELETION
        ? 'xac nhan yeu cau xoa tai khoan'
        : purpose === MobileCustomerOtpPurpose.ACCOUNT_DELETION_CANCEL
          ? 'huy yeu cau xoa tai khoan'
          : 'xac thuc';

    return (
      `${otp} la ma OTP ${action} tu Gia Phuoc Express ` +
      `(Thoi gian hieu luc la ${this.expiresSeconds} giay).`
    );
  }

  private assertPhone(phone: string): void {
    if (!/^\+84\d{9}$/.test(phone)) {
      throw new MobileCustomerOtpError('Số điện thoại không hợp lệ', 400, 'INVALID_PHONE');
    }
  }

  private isMockEnabled(): boolean {
    return process.env.MOBILE_OTP_MOCK === 'true';
  }

  private getMockOtp(): string {
    const otp = process.env.MOBILE_OTP_TEST_CODE || '123456';
    if (!/^\d{6}$/.test(otp)) {
      throw new Error('MOBILE_OTP_TEST_CODE phải gồm đúng 6 chữ số');
    }
    return otp;
  }

  private readPositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
