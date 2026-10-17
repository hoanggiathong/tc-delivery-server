import crypto from 'node:crypto';

import { MobileCustomerAccount } from '@/modules/mobile-customer/mobile-customer-account.model';
import {
  MobileCustomerOtp,
  MobileCustomerOtpProviderStatus,
  MobileCustomerOtpPurpose,
} from './mobile-customer-otp.model';
import { MobileCustomerSmsService } from './mobile-customer-sms.service';

export interface MobileCustomerOtpRequestContext {
  ip?: string;
}

export interface MobileCustomerOtpRequestResult {
  purpose: MobileCustomerOtpPurpose;
  expiresIn: number;
  resendAfter: number;
  devOtp?: string;
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
  private readonly smsService: MobileCustomerSmsService;

  private readonly otpLength: number;
  private readonly expiresSeconds: number;
  private readonly resendSeconds: number;
  private readonly maxAttempts: number;
  private readonly maxPerHour: number;
  private readonly maxPerDay: number;
  private readonly maxPerIpHour: number;
  private readonly retentionHours: number;

  constructor() {
    this.smsService = new MobileCustomerSmsService();

    this.otpLength = 6;

    // OTP có hiệu lực 90 giây.
    this.expiresSeconds = this.readPositiveInt(process.env.MOBILE_OTP_EXPIRES_SECONDS, 90);

    this.resendSeconds = this.readPositiveInt(process.env.MOBILE_OTP_RESEND_SECONDS, 90);

    this.maxAttempts = this.readPositiveInt(process.env.MOBILE_OTP_MAX_ATTEMPTS, 5);

    this.maxPerHour = this.readPositiveInt(process.env.MOBILE_OTP_MAX_PER_HOUR, 5);

    this.maxPerDay = this.readPositiveInt(process.env.MOBILE_OTP_MAX_PER_DAY, 20);

    this.maxPerIpHour = this.readPositiveInt(process.env.MOBILE_OTP_MAX_PER_IP_HOUR, 20);

    this.retentionHours = this.readPositiveInt(process.env.MOBILE_OTP_RETENTION_HOURS, 48);
  }

  async resolvePurpose(
    phoneInput: unknown,
    requestedPurpose?: unknown
  ): Promise<MobileCustomerOtpPurpose> {
    const phone = this.normalizePhone(phoneInput);

    this.assertPhone(phone);

    const rawPurpose = String(requestedPurpose || '').trim();

    if (rawPurpose) {
      const explicitPurpose = this.parsePurpose(rawPurpose);

      if (!explicitPurpose) {
        throw new MobileCustomerOtpError('Mục đích OTP không hợp lệ', 400, 'INVALID_OTP_PURPOSE');
      }

      return explicitPurpose;
    }

    const accountExists = await MobileCustomerAccount.exists({
      phone,
    });

    return accountExists ? MobileCustomerOtpPurpose.LOGIN : MobileCustomerOtpPurpose.REGISTER;
  }

  async requestOtp(
    phoneInput: unknown,
    purpose: MobileCustomerOtpPurpose,
    context: MobileCustomerOtpRequestContext = {}
  ): Promise<MobileCustomerOtpRequestResult> {
    const phone = this.normalizePhone(phoneInput);

    this.assertPhone(phone);
    this.assertSupportedPurpose(purpose);

    await this.assertPurposeAllowed(phone, purpose);
    await this.assertRateLimits(phone, purpose, context.ip);

    const now = new Date();

    const mockEnabled = this.isMockEnabled();

    const otp = mockEnabled ? this.getMockOtp() : this.generateOtp();

    const otpHash = this.hashOtp(phone, purpose, otp);

    /*
     * Hủy các OTP cũ chưa sử dụng của cùng số điện thoại
     */
    await MobileCustomerOtp.updateMany(
      {
        phone,
        purpose,
        usedAt: null,
        invalidatedAt: null,
      },
      {
        $set: {
          invalidatedAt: now,
        },
      }
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

    /*
     * Chế độ mock:
     * - Không gọi API SMS thật.
     * - Trả devOtp để phục vụ phát triển.
     */
    if (mockEnabled) {
      await MobileCustomerOtp.updateOne(
        {
          _id: record._id,
        },
        {
          $set: {
            providerStatus: MobileCustomerOtpProviderStatus.SENT,
            providerMessageId: 'MOCK',
            providerResponse: {
              mock: true,
            },
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

    /*
     * Tất cả action REGISTER, LOGIN và FORGOT_PASSWORD
     * đều dùng chung API SMS và cùng một template.
     */
    const smsResult = await this.smsService.send({
      phone,
      message: this.buildOtpMessage(otp),
    });

    if (!smsResult.success) {
      await MobileCustomerOtp.updateOne(
        {
          _id: record._id,
        },
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
      {
        _id: record._id,
      },
      {
        $set: {
          providerStatus: MobileCustomerOtpProviderStatus.SENT,
          providerMessageId: smsResult.messageId || null,
          providerResponse: smsResult.providerResponse || null,
        },
      }
    );

    /*
     * Chế độ gửi thật không trả OTP trong API response.
     * Người dùng phải lấy OTP từ tin nhắn SMS.
     */
    return {
      purpose,
      expiresIn: this.expiresSeconds,
      resendAfter: this.resendSeconds,
    };
  }

  async verifyOtp(
    phoneInput: unknown,
    otpInput: unknown,
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
      .sort({
        createdAt: -1,
      });

    if (!record) {
      throw new MobileCustomerOtpError('OTP không đúng hoặc đã hết hạn', 401, 'OTP_NOT_FOUND');
    }

    const now = new Date();

    if (record.expiresAt.getTime() <= now.getTime()) {
      await MobileCustomerOtp.updateOne(
        {
          _id: record._id,
          usedAt: null,
          invalidatedAt: null,
        },
        {
          $set: {
            invalidatedAt: now,
          },
        }
      );

      throw new MobileCustomerOtpError('OTP không đúng hoặc đã hết hạn', 401, 'OTP_EXPIRED');
    }

    if (record.attempts >= record.maxAttempts) {
      await MobileCustomerOtp.updateOne(
        {
          _id: record._id,
          usedAt: null,
          invalidatedAt: null,
        },
        {
          $set: {
            invalidatedAt: now,
          },
        }
      );

      throw new MobileCustomerOtpError('OTP đã bị khóa. Vui lòng gửi mã mới', 429, 'OTP_LOCKED');
    }

    const expectedHash = this.hexToBuffer(record.otpHash);

    const actualHash = this.hexToBuffer(this.hashOtp(phone, purpose, otp));

    const valid =
      expectedHash.length === actualHash.length && crypto.timingSafeEqual(expectedHash, actualHash);

    if (!valid) {
      await this.handleInvalidOtpAttempt(
        String(record._id),
        record.attempts,
        record.maxAttempts,
        now
      );
    }

    /*
     * Đánh dấu đã sử dụng bằng update có điều kiện
     * để ngăn OTP bị sử dụng đồng thời nhiều lần.
     */
    const consumed = await MobileCustomerOtp.updateOne(
      {
        _id: record._id,

        providerStatus: MobileCustomerOtpProviderStatus.SENT,

        usedAt: null,
        invalidatedAt: null,

        expiresAt: {
          $gt: now,
        },
      },
      {
        $set: {
          usedAt: now,
        },
      }
    );

    if (consumed.modifiedCount !== 1) {
      throw new MobileCustomerOtpError(
        'OTP đã được sử dụng hoặc đã hết hạn',
        401,
        'OTP_ALREADY_USED'
      );
    }
  }

  public normalizePhone(phoneInput: unknown): string {
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
    const account = await MobileCustomerAccount.findOne({
      phone,
    })
      .select('_id isActive')
      .lean();

    if (
      purpose === MobileCustomerOtpPurpose.LOGIN ||
      purpose === MobileCustomerOtpPurpose.FORGOT_PASSWORD ||
      purpose === MobileCustomerOtpPurpose.ACCOUNT_DELETION ||
      purpose === MobileCustomerOtpPurpose.ACCOUNT_DELETION_CANCEL
    ) {
      if (!account) {
        throw new MobileCustomerOtpError('Tài khoản chưa đăng ký', 404, 'MOBILE_ACCOUNT_NOT_FOUND');
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
      .sort({
        createdAt: -1,
      })
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

    const baseQuery = {
      phone,
      purpose,
      providerStatus: MobileCustomerOtpProviderStatus.SENT,
    };

    const [hourCount, dayCount, ipHourCount] = await Promise.all([
      MobileCustomerOtp.countDocuments({
        ...baseQuery,

        createdAt: {
          $gte: oneHourAgo,
        },
      }),

      MobileCustomerOtp.countDocuments({
        ...baseQuery,

        createdAt: {
          $gte: oneDayAgo,
        },
      }),

      requestIp
        ? MobileCustomerOtp.countDocuments({
            requestIp,

            providerStatus: MobileCustomerOtpProviderStatus.SENT,

            createdAt: {
              $gte: oneHourAgo,
            },
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
    const nextAttempts = currentAttempts + 1;
    const shouldLock = nextAttempts >= maxAttempts;

    await MobileCustomerOtp.updateOne(
      {
        _id: recordId,
        usedAt: null,
        invalidatedAt: null,
      },
      {
        $set: {
          attempts: nextAttempts,

          ...(shouldLock
            ? {
                invalidatedAt: now,
              }
            : {}),
        },
      }
    );

    throw new MobileCustomerOtpError(
      shouldLock ? 'OTP đã bị khóa. Vui lòng gửi mã mới' : 'OTP không đúng hoặc đã hết hạn',
      shouldLock ? 429 : 401,
      shouldLock ? 'OTP_LOCKED' : 'OTP_INVALID'
    );
  }

  private parsePurpose(requestedPurpose?: unknown): MobileCustomerOtpPurpose | null {
    const purpose = String(requestedPurpose || '')
      .trim()
      .toUpperCase();

    const supportedPurposes = Object.values(MobileCustomerOtpPurpose) as string[];

    return supportedPurposes.includes(purpose) ? (purpose as MobileCustomerOtpPurpose) : null;
  }

  private assertSupportedPurpose(purpose: MobileCustomerOtpPurpose): void {
    const supportedPurposes = Object.values(MobileCustomerOtpPurpose);

    if (!supportedPurposes.includes(purpose)) {
      throw new MobileCustomerOtpError('Mục đích OTP không hợp lệ', 400, 'INVALID_OTP_PURPOSE');
    }
  }

  private assertOtpFormat(otp: string): void {
    const otpPattern = new RegExp(`^\\d{${this.otpLength}}$`);

    if (!otpPattern.test(otp)) {
      throw new MobileCustomerOtpError(
        `Mã OTP phải gồm ${this.otpLength} chữ số`,
        400,
        'INVALID_OTP_FORMAT'
      );
    }
  }

  private generateOtp(): string {
    const min = 10 ** (this.otpLength - 1);
    const max = 10 ** this.otpLength;

    return crypto.randomInt(min, max).toString();
  }

  private hashOtp(phone: string, purpose: MobileCustomerOtpPurpose, otp: string): string {
    const secret = process.env.MOBILE_OTP_SECRET;

    if (!secret || secret.length < 32) {
      throw new Error('MOBILE_OTP_SECRET must be configured with at least 32 characters');
    }

    return crypto.createHmac('sha256', secret).update(`${phone}:${purpose}:${otp}`).digest('hex');
  }

  private hexToBuffer(value: unknown): Buffer {
    if (typeof value !== 'string' || !/^[a-fA-F0-9]{64}$/.test(value)) {
      return Buffer.alloc(0);
    }

    return Buffer.from(value, 'hex');
  }

  /**
   * Đây là template OTP cố định cho tất cả action:
   * - REGISTER
   * - LOGIN
   * - FORGOT_PASSWORD
   *
   * Chỉ thay đổi:
   * 1. Mã OTP
   * 2. Thời gian hiệu lực
   */
  private buildOtpMessage(otp: string): string {
    const expiresMinutes = (this.expiresSeconds / 60)
      .toFixed(this.expiresSeconds % 60 === 0 ? 0 : 1)
      .replace('.', ',');

    const expiresLabel = `${this.expiresSeconds}s/${expiresMinutes}`;

    return (
      `[VT.GiaPhuoc] Ma OTP tai ung dung Gia Phuoc Express la ${otp}. ` +
      `Thoi gian co hieu luc trong vong ${expiresLabel} phut. ` +
      'Vui long khong chia se ma nay cho bat ky ai'
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
