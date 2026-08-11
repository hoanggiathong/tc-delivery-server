import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

import {
  MobileCustomerAccount,
  MobileCustomerDeletionStatus,
  type MobileCustomerAccountDocument,
} from '@/modules/mobile-customer/mobile-customer-account.model';
import {
  MobileCustomerRefreshToken,
  type MobileCustomerPlatform,
  type MobileCustomerRefreshTokenDocument,
} from '@/modules/mobile-customer/mobile-customer-refresh-token.model';
import { MobilePushToken } from '@/modules/mobile-customer/mobile-push-token.model';
import Logger from '@/utils/logger';
import {
  MobileCustomerSecurityEventService,
  MobileCustomerSecurityEventType,
} from '@/modules/mobile-customer/mobile-customer-security-event.service';
import { MobileCustomerNotificationService } from '@/modules/mobile-customer/mobile-customer-notification.service';

import { MobileCustomerOtpPurpose } from './mobile-customer-otp.model';
import { MobileCustomerOtpError, MobileCustomerOtpService } from './mobile-customer-otp.service';

export interface IMobileCustomerSessionContext {
  deviceId: string;
  platform?: MobileCustomerPlatform;
  userAgent?: string;
  ip?: string;
}

export interface IMobileCustomerAuthResult {
  /** Giữ tương thích với mobile cũ. */
  token: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;

  customer: {
    id: string;
    name: string;
    phone: string;
  };
}

export interface IMobileCustomerDeviceSession {
  deviceId: string;
  platform: MobileCustomerPlatform;
  deviceName: string;
  userAgent?: string | null;

  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;

  isCurrentDevice: boolean;
  activeTokenCount: number;
}

export interface IMobileCustomerRegisterInput {
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
  otp: string;
  acceptedTerms: boolean;
}

export interface IMobileCustomerResetPasswordInput {
  phone: string;
  otp: string;
  password: string;
  confirmPassword: string;
}

interface ParsedRefreshToken {
  tokenId: string;
  secret: string;
}

export class MobileCustomerAuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MobileCustomerAuthError';
  }
}

export class MobileCustomerAuthService {
  constructor(
    private readonly otpService = new MobileCustomerOtpService(),

    private readonly securityEventService = new MobileCustomerSecurityEventService(),

    private readonly notificationService = new MobileCustomerNotificationService()
  ) {}

  async register(
    input: IMobileCustomerRegisterInput,
    sessionContext: IMobileCustomerSessionContext
  ): Promise<IMobileCustomerAuthResult> {
    const phone = this.otpService.normalizePhone(input.phone);
    const name = String(input.name || '').trim();
    const password = String(input.password || '');
    const confirmPassword = String(input.confirmPassword || '');
    const otp = String(input.otp || '').trim();

    this.assertRegistrationInput({
      name,
      phone,
      password,
      confirmPassword,
      otp,
      acceptedTerms: input.acceptedTerms,
    });
    this.assertSessionContext(sessionContext);

    const existingAccount = await MobileCustomerAccount.findOne({
      phone,
    })
      .select('_id')
      .lean();

    if (existingAccount) {
      throw new MobileCustomerAuthError(
        'Số điện thoại này đã đăng ký tài khoản',
        409,
        'MOBILE_ACCOUNT_EXISTS'
      );
    }

    await this.otpService.verifyOtp(phone, otp, MobileCustomerOtpPurpose.REGISTER);

    const now = new Date();
    const passwordHash = await bcrypt.hash(password, 12);

    try {
      const account = await MobileCustomerAccount.create({
        phone,
        name,
        passwordHash,
        phoneVerifiedAt: now,
        acceptedTermsAt: now,
        lastLoginAt: now,
        isActive: true,
      });

      const result = await this.buildAuthResult(account, sessionContext);

      await this.securityEventService.recordSafely({
        accountId: account._id,
        type: MobileCustomerSecurityEventType.ACCOUNT_REGISTERED,
        ...sessionContext,
      });

      return result;
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new MobileCustomerAuthError(
          'Số điện thoại này đã đăng ký tài khoản',
          409,
          'MOBILE_ACCOUNT_EXISTS'
        );
      }

      throw error;
    }
  }

  async loginWithPassword(
    phoneInput: string,
    passwordInput: string,
    sessionContext: IMobileCustomerSessionContext
  ): Promise<IMobileCustomerAuthResult> {
    const phone = this.otpService.normalizePhone(phoneInput);
    const password = String(passwordInput || '');

    this.assertPhone(phone);
    this.assertSessionContext(sessionContext);

    if (!password) {
      throw new MobileCustomerAuthError('Vui lòng nhập mật khẩu', 400, 'PASSWORD_REQUIRED');
    }

    const account = await MobileCustomerAccount.findOne({
      phone,
    }).select('+passwordHash');

    if (!account) {
      throw new MobileCustomerAuthError('Tài khoản chưa đăng ký', 401, 'MOBILE_ACCOUNT_NOT_FOUND');
    }

    this.assertActive(account);

    if (!account.passwordHash) {
      throw new MobileCustomerAuthError('Tài khoản chưa có mật khẩu', 500, 'PASSWORD_HASH_MISSING');
    }

    const knownDevice = await this.securityEventService.isKnownDevice(
      account._id,
      sessionContext.deviceId
    );

    const valid = await bcrypt.compare(password, account.passwordHash);

    if (!valid) {
      await this.securityEventService.recordSafely({
        accountId: account._id,
        type: MobileCustomerSecurityEventType.LOGIN_PASSWORD_FAILED,
        ...sessionContext,
      });

      throw new MobileCustomerAuthError('Mật khẩu không đúng', 401, 'INVALID_PASSWORD');
    }

    account.lastLoginAt = new Date();
    await account.save();

    const result = await this.buildAuthResult(account, sessionContext);

    await this.securityEventService.recordSafely({
      accountId: account._id,
      type: MobileCustomerSecurityEventType.LOGIN_PASSWORD_SUCCESS,
      ...sessionContext,
    });

    await this.notifyNewDeviceLoginSafely({
      accountId: String(account._id),
      knownDevice,
      sessionContext,
    });

    return result;
  }

  async loginWithOtp(
    phoneInput: string,
    otpInput: string,
    sessionContext: IMobileCustomerSessionContext
  ): Promise<IMobileCustomerAuthResult> {
    const phone = this.otpService.normalizePhone(phoneInput);
    const otp = String(otpInput || '').trim();

    this.assertPhone(phone);
    this.assertSessionContext(sessionContext);

    const account = await MobileCustomerAccount.findOne({ phone });

    if (!account) {
      throw new MobileCustomerAuthError(
        'Số điện thoại chưa đăng ký',
        404,
        'MOBILE_ACCOUNT_NOT_FOUND'
      );
    }

    this.assertActive(account);

    await this.otpService.verifyOtp(phone, otp, MobileCustomerOtpPurpose.LOGIN);

    const knownDevice = await this.securityEventService.isKnownDevice(
      account._id,
      sessionContext.deviceId
    );

    account.phoneVerifiedAt = account.phoneVerifiedAt || new Date();
    account.lastLoginAt = new Date();
    await account.save();

    const result = await this.buildAuthResult(account, sessionContext);

    await this.securityEventService.recordSafely({
      accountId: account._id,
      type: MobileCustomerSecurityEventType.LOGIN_OTP_SUCCESS,
      ...sessionContext,
    });

    await this.notifyNewDeviceLoginSafely({
      accountId: String(account._id),
      knownDevice,
      sessionContext,
    });

    return result;
  }

  async refreshSession(
    refreshTokenInput: string,
    sessionContext: IMobileCustomerSessionContext
  ): Promise<IMobileCustomerAuthResult> {
    this.assertSessionContext(sessionContext);

    const parsed = this.parseRefreshToken(refreshTokenInput);

    if (!parsed || !Types.ObjectId.isValid(parsed.tokenId)) {
      throw this.invalidRefreshTokenError();
    }

    const currentToken = await MobileCustomerRefreshToken.findById(parsed.tokenId).select(
      '+tokenHash'
    );

    if (!currentToken) {
      throw this.invalidRefreshTokenError();
    }

    this.assertRefreshTokenUsable(currentToken, parsed.secret, sessionContext.deviceId);

    const account = await MobileCustomerAccount.findById(currentToken.accountId);

    if (!account) {
      throw this.invalidRefreshTokenError();
    }

    this.assertActive(account);

    const replacement = await this.createRefreshToken(account, sessionContext);

    const now = new Date();
    const rotated = await MobileCustomerRefreshToken.findOneAndUpdate(
      {
        _id: currentToken._id,
        revokedAt: null,
        expiresAt: { $gt: now },
      },
      {
        $set: {
          revokedAt: now,
          lastUsedAt: now,
          replacedByTokenId: replacement.documentId,
        },
      },
      {
        new: true,
      }
    );

    if (!rotated) {
      await MobileCustomerRefreshToken.updateOne(
        { _id: replacement.documentId },
        { $set: { revokedAt: now } }
      );

      throw new MobileCustomerAuthError(
        'Phiên đăng nhập đã được làm mới ở yêu cầu khác',
        401,
        'REFRESH_TOKEN_REUSED'
      );
    }

    return this.buildAuthResultFromRefreshToken(account, replacement.plainToken, sessionContext);
  }

  async logout(
    refreshTokenInput: string,
    sessionContext: IMobileCustomerSessionContext
  ): Promise<void> {
    const parsed = this.parseRefreshToken(refreshTokenInput);

    if (!parsed || !Types.ObjectId.isValid(parsed.tokenId)) {
      return;
    }

    const token = await MobileCustomerRefreshToken.findById(parsed.tokenId).select('+tokenHash');

    if (!token) {
      return;
    }

    if (token.deviceId !== sessionContext.deviceId) {
      return;
    }

    if (!this.isSecretMatch(parsed.secret, token.tokenHash)) {
      return;
    }

    const now = new Date();

    await MobileCustomerRefreshToken.updateMany(
      {
        accountId: token.accountId,
        deviceId: token.deviceId,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: now,
          lastUsedAt: now,
        },
      }
    );

    /**
     * Thiết bị đã đăng xuất không được tiếp tục nhận
     * notification của tài khoản cũ.
     */
    await this.deactivatePushTokensSafely(token.accountId, token.deviceId);

    await this.securityEventService.recordSafely({
      accountId: token.accountId,
      type: MobileCustomerSecurityEventType.LOGOUT,
      ...sessionContext,
    });
  }

  async listDeviceSessions(
    accountId: string,
    currentDeviceId: string
  ): Promise<IMobileCustomerDeviceSession[]> {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new MobileCustomerAuthError('Tài khoản không hợp lệ', 400, 'INVALID_ACCOUNT_ID');
    }

    const now = new Date();

    const tokens = await MobileCustomerRefreshToken.find({
      accountId: new Types.ObjectId(accountId),
      revokedAt: null,
      expiresAt: { $gt: now },
    })
      .select('deviceId platform userAgent createdAt updatedAt lastUsedAt expiresAt')
      .sort({ updatedAt: -1 })
      .lean<
        Array<{
          deviceId: string;
          platform: MobileCustomerPlatform;
          userAgent?: string | null;
          createdAt: Date;
          updatedAt: Date;
          lastUsedAt?: Date | null;
          expiresAt: Date;
        }>
      >();

    const grouped = new Map<string, IMobileCustomerDeviceSession>();

    for (const token of tokens) {
      const deviceId = String(token.deviceId || '').trim();

      if (!deviceId) {
        continue;
      }

      const tokenCreatedAt = new Date(token.createdAt);
      const tokenLastActiveAt = new Date(token.lastUsedAt || token.updatedAt || token.createdAt);
      const tokenExpiresAt = new Date(token.expiresAt);
      const existing = grouped.get(deviceId);

      if (!existing) {
        grouped.set(deviceId, {
          deviceId,
          platform: token.platform || 'unknown',
          deviceName: this.buildDeviceName(token.platform || 'unknown', token.userAgent),
          userAgent: token.userAgent || null,
          createdAt: tokenCreatedAt,
          lastActiveAt: tokenLastActiveAt,
          expiresAt: tokenExpiresAt,
          isCurrentDevice: deviceId === String(currentDeviceId || '').trim(),
          activeTokenCount: 1,
        });
        continue;
      }

      existing.activeTokenCount += 1;

      if (tokenCreatedAt.getTime() < existing.createdAt.getTime()) {
        existing.createdAt = tokenCreatedAt;
      }

      if (tokenLastActiveAt.getTime() > existing.lastActiveAt.getTime()) {
        existing.lastActiveAt = tokenLastActiveAt;
        existing.platform = token.platform || existing.platform;
        existing.userAgent = token.userAgent || existing.userAgent || null;
        existing.deviceName = this.buildDeviceName(existing.platform, existing.userAgent);
      }

      if (tokenExpiresAt.getTime() > existing.expiresAt.getTime()) {
        existing.expiresAt = tokenExpiresAt;
      }
    }

    return [...grouped.values()].sort((left, right) => {
      if (left.isCurrentDevice !== right.isCurrentDevice) {
        return left.isCurrentDevice ? -1 : 1;
      }

      return right.lastActiveAt.getTime() - left.lastActiveAt.getTime();
    });
  }

  async revokeDeviceSession(
    accountId: string,
    deviceIdInput: string,
    actorContext: IMobileCustomerSessionContext
  ): Promise<number> {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new MobileCustomerAuthError('Tài khoản không hợp lệ', 400, 'INVALID_ACCOUNT_ID');
    }

    const deviceId = String(deviceIdInput || '').trim();

    if (!deviceId || deviceId.length > 200) {
      throw new MobileCustomerAuthError('Mã thiết bị không hợp lệ', 400, 'INVALID_DEVICE_ID');
    }

    const accountObjectId = new Types.ObjectId(accountId);
    const now = new Date();

    const result = await MobileCustomerRefreshToken.updateMany(
      {
        accountId: accountObjectId,
        deviceId,
        revokedAt: null,
        expiresAt: { $gt: now },
      },
      {
        $set: {
          revokedAt: now,
          lastUsedAt: now,
        },
      }
    );

    /**
     * Luôn dọn push token theo deviceId, kể cả khi
     * refresh session đã hết hạn nhưng push token còn active.
     */
    await this.deactivatePushTokensSafely(accountObjectId, deviceId);

    const revokedCount = Number(result.modifiedCount || 0);

    if (revokedCount > 0) {
      await this.securityEventService.recordSafely({
        accountId: accountObjectId,
        type: MobileCustomerSecurityEventType.SESSION_REVOKED,
        targetDeviceId: deviceId,
        ...actorContext,
        metadata: {
          revokedCount,
        },
      });
    }

    return revokedCount;
  }

  async revokeAllDeviceSessions(
    accountId: string,
    actorContext: IMobileCustomerSessionContext,
    keepCurrentDevice: boolean
  ): Promise<number> {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new MobileCustomerAuthError('Tài khoản không hợp lệ', 400, 'INVALID_ACCOUNT_ID');
    }

    const accountObjectId = new Types.ObjectId(accountId);
    const normalizedCurrentDeviceId = String(actorContext.deviceId || '').trim();

    const where: Record<string, unknown> = {
      accountId: accountObjectId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    };

    if (keepCurrentDevice) {
      where.deviceId = {
        $ne: normalizedCurrentDeviceId,
      };
    }

    const now = new Date();

    const result = await MobileCustomerRefreshToken.updateMany(where, {
      $set: {
        revokedAt: now,
        lastUsedAt: now,
      },
    });

    /**
     * Giữ thiết bị hiện tại thì chỉ tắt push token
     * của các deviceId khác. Logout-all thì tắt toàn bộ.
     */
    await this.deactivatePushTokensSafely(
      accountObjectId,
      keepCurrentDevice ? { $ne: normalizedCurrentDeviceId } : undefined
    );

    const revokedCount = Number(result.modifiedCount || 0);

    await this.securityEventService.recordSafely({
      accountId: accountObjectId,
      type: keepCurrentDevice
        ? MobileCustomerSecurityEventType.LOGOUT_OTHER_DEVICES
        : MobileCustomerSecurityEventType.LOGOUT_ALL,
      ...actorContext,
      metadata: {
        revokedCount,
        keepCurrentDevice,
      },
    });

    return revokedCount;
  }

  async resetForgotPassword(
    input: IMobileCustomerResetPasswordInput,
    sessionContext?: IMobileCustomerSessionContext
  ): Promise<void> {
    const phone = this.otpService.normalizePhone(input.phone);
    const otp = String(input.otp || '').trim();
    const password = String(input.password || '');
    const confirmPassword = String(input.confirmPassword || '');

    this.assertPhone(phone);
    this.assertResetPasswordInput({
      otp,
      password,
      confirmPassword,
    });

    const account = await MobileCustomerAccount.findOne({
      phone,
    }).select('+passwordHash');

    if (!account) {
      throw new MobileCustomerAuthError(
        'Số điện thoại chưa đăng ký tài khoản',
        404,
        'MOBILE_ACCOUNT_NOT_FOUND'
      );
    }

    this.assertActive(account);

    await this.otpService.verifyOtp(phone, otp, MobileCustomerOtpPurpose.FORGOT_PASSWORD);

    account.passwordHash = await bcrypt.hash(password, 12);
    await account.save();

    await MobileCustomerRefreshToken.updateMany(
      {
        accountId: account._id,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      }
    );

    /**
     * Reset mật khẩu làm hết hiệu lực toàn bộ phiên,
     * vì vậy toàn bộ push token của tài khoản cũng phải tắt.
     */
    await this.deactivatePushTokensSafely(account._id);

    await this.securityEventService.recordSafely({
      accountId: account._id,
      type: MobileCustomerSecurityEventType.PASSWORD_RESET,
      ...(sessionContext || {}),
    });
  }

  private async notifyNewDeviceLoginSafely(input: {
    accountId: string;
    knownDevice: boolean;
    sessionContext: IMobileCustomerSessionContext;
  }): Promise<void> {
    if (input.knownDevice) {
      return;
    }

    const eventResult = await this.securityEventService.recordNewDeviceLoginOnceSafely({
      accountId: input.accountId,
      deviceId: input.sessionContext.deviceId,
      platform: input.sessionContext.platform,
      userAgent: input.sessionContext.userAgent,
      ip: input.sessionContext.ip,
    });

    if (!eventResult.created) {
      return;
    }

    try {
      await this.notificationService.emitNewDeviceLogin({
        accountId: input.accountId,

        deviceId: input.sessionContext.deviceId,

        deviceName:
          eventResult.deviceName ||
          this.buildDeviceName(
            input.sessionContext.platform || 'unknown',
            input.sessionContext.userAgent
          ),

        occurredAt: eventResult.createdAt || new Date(),
      });
    } catch (error) {
      /**
       * Đăng nhập đã hoàn tất thành công.
       * Lỗi notification không được rollback phiên.
       */
      Logger.error('Đăng nhập thiết bị mới thành công nhưng gửi cảnh báo thất bại', {
        accountId: input.accountId,
        deviceId: input.sessionContext.deviceId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  private async deactivatePushTokensSafely(
    accountId: Types.ObjectId | string,
    deviceIdFilter?: string | { $ne: string }
  ): Promise<number> {
    try {
      const accountObjectId =
        accountId instanceof Types.ObjectId ? accountId : new Types.ObjectId(accountId);

      const where: Record<string, unknown> = {
        accountId: accountObjectId,
        isActive: true,
      };

      if (deviceIdFilter !== undefined) {
        where.deviceId = deviceIdFilter;
      }

      const now = new Date();

      const result = await MobilePushToken.updateMany(where, {
        $set: {
          isActive: false,
          deactivatedAt: now,
        },
      });

      return Number(result.modifiedCount || 0);
    } catch (error) {
      /**
       * Phiên đăng nhập đã được thu hồi thành công.
       * Lỗi cleanup push không được khôi phục lại session.
       */
      Logger.error('Không thể vô hiệu hóa push token khi thu hồi phiên thiết bị', {
        accountId: String(accountId),
        deviceIdFilter,
        error: error instanceof Error ? error.message : error,
      });

      return 0;
    }
  }

  private async buildAuthResult(
    account: MobileCustomerAccountDocument,
    sessionContext: IMobileCustomerSessionContext
  ): Promise<IMobileCustomerAuthResult> {
    const refreshToken = await this.createRefreshToken(account, sessionContext);

    return this.buildAuthResultFromRefreshToken(account, refreshToken.plainToken, sessionContext);
  }

  private buildAuthResultFromRefreshToken(
    account: MobileCustomerAccountDocument,
    refreshToken: string,
    sessionContext: IMobileCustomerSessionContext
  ): IMobileCustomerAuthResult {
    const accessToken = this.signAccessToken(account, sessionContext);

    return {
      token: accessToken,
      accessToken,
      refreshToken,
      expiresIn: this.getAccessTokenExpiresInSeconds(),
      customer: {
        id: String(account._id),
        name: account.name,
        phone: account.phone,
      },
    };
  }

  private async createRefreshToken(
    account: MobileCustomerAccountDocument,
    sessionContext: IMobileCustomerSessionContext
  ): Promise<{
    documentId: Types.ObjectId;
    plainToken: string;
  }> {
    const secret = crypto.randomBytes(48).toString('base64url');
    const tokenHash = this.hashRefreshSecret(secret);
    const expiresAt = new Date(Date.now() + this.getRefreshTokenDays() * 24 * 60 * 60 * 1000);

    const document = await MobileCustomerRefreshToken.create({
      accountId: account._id,
      tokenHash,
      deviceId: sessionContext.deviceId.trim(),
      platform: sessionContext.platform || 'unknown',
      userAgent: sessionContext.userAgent || null,
      createdByIp: sessionContext.ip || null,
      expiresAt,
      lastUsedAt: null,
      revokedAt: null,
      replacedByTokenId: null,
    });

    return {
      documentId: document._id,
      plainToken: `${String(document._id)}.${secret}`,
    };
  }

  private signAccessToken(
    account: MobileCustomerAccountDocument,
    sessionContext: IMobileCustomerSessionContext
  ): string {
    return jwt.sign(
      {
        accountId: String(account._id),
        phone: account.phone,
        name: account.name,
        deviceId: sessionContext.deviceId.trim(),
        tokenType: 'MOBILE_CUSTOMER_ACCESS',
      },
      this.getJwtSecret(),
      {
        expiresIn: process.env.MOBILE_CUSTOMER_ACCESS_TOKEN_EXPIRES_IN || '15m',
      } as jwt.SignOptions
    );
  }

  private buildDeviceName(platform: MobileCustomerPlatform, userAgent?: string | null): string {
    const agent = String(userAgent || '').toLowerCase();

    if (platform === 'android') {
      return 'Thiết bị Android';
    }

    if (platform === 'ios') {
      return agent.includes('ipad') ? 'iPad' : 'iPhone';
    }

    if (agent.includes('windows')) {
      return 'Trình duyệt Windows';
    }

    if (agent.includes('macintosh') || agent.includes('mac os')) {
      return 'Trình duyệt macOS';
    }

    if (agent.includes('linux')) {
      return 'Trình duyệt Linux';
    }

    if (platform === 'web') {
      return 'Trình duyệt web';
    }

    return 'Thiết bị không xác định';
  }

  private assertRefreshTokenUsable(
    token: MobileCustomerRefreshTokenDocument,
    secret: string,
    deviceId: string
  ): void {
    if (token.revokedAt) {
      throw new MobileCustomerAuthError(
        'Phiên đăng nhập đã hết hiệu lực',
        401,
        'REFRESH_TOKEN_REVOKED'
      );
    }

    if (token.expiresAt.getTime() <= Date.now()) {
      throw new MobileCustomerAuthError('Phiên đăng nhập đã hết hạn', 401, 'REFRESH_TOKEN_EXPIRED');
    }

    if (token.deviceId !== deviceId.trim()) {
      throw new MobileCustomerAuthError(
        'Phiên đăng nhập không thuộc thiết bị này',
        401,
        'REFRESH_TOKEN_DEVICE_MISMATCH'
      );
    }

    if (!this.isSecretMatch(secret, token.tokenHash)) {
      throw this.invalidRefreshTokenError();
    }
  }

  private parseRefreshToken(value: string): ParsedRefreshToken | null {
    const normalized = String(value || '').trim();
    const separatorIndex = normalized.indexOf('.');

    if (separatorIndex <= 0) {
      return null;
    }

    const tokenId = normalized.slice(0, separatorIndex);
    const secret = normalized.slice(separatorIndex + 1);

    if (!tokenId || !secret) {
      return null;
    }

    return { tokenId, secret };
  }

  private hashRefreshSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  private isSecretMatch(secret: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hashRefreshSecret(secret), 'utf8');
    const expected = Buffer.from(expectedHash, 'utf8');

    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }

  private assertSessionContext(context: IMobileCustomerSessionContext): void {
    const deviceId = String(context.deviceId || '').trim();

    if (!deviceId) {
      throw new MobileCustomerAuthError('Thiếu mã thiết bị', 400, 'DEVICE_ID_REQUIRED');
    }

    if (deviceId.length > 200) {
      throw new MobileCustomerAuthError('Mã thiết bị không hợp lệ', 400, 'INVALID_DEVICE_ID');
    }
  }

  private assertRegistrationInput(input: {
    name: string;
    phone: string;
    password: string;
    confirmPassword: string;
    otp: string;
    acceptedTerms: boolean;
  }): void {
    if (!input.name) {
      throw new MobileCustomerAuthError('Vui lòng nhập họ tên', 400, 'NAME_REQUIRED');
    }

    this.assertPhone(input.phone);

    if (input.password.length < 6) {
      throw new MobileCustomerAuthError(
        'Mật khẩu phải có ít nhất 6 ký tự',
        400,
        'PASSWORD_TOO_SHORT'
      );
    }

    if (input.password !== input.confirmPassword) {
      throw new MobileCustomerAuthError(
        'Mật khẩu xác nhận không khớp',
        400,
        'PASSWORD_CONFIRMATION_MISMATCH'
      );
    }

    if (!input.otp) {
      throw new MobileCustomerAuthError('Vui lòng nhập mã OTP', 400, 'OTP_REQUIRED');
    }

    if (!/^\d{6}$/.test(input.otp)) {
      throw new MobileCustomerAuthError('Mã OTP phải gồm 6 chữ số', 400, 'INVALID_OTP_FORMAT');
    }

    if (!input.acceptedTerms) {
      throw new MobileCustomerAuthError(
        'Vui lòng đồng ý thỏa thuận người dùng',
        400,
        'TERMS_NOT_ACCEPTED'
      );
    }
  }

  private assertResetPasswordInput(input: {
    otp: string;
    password: string;
    confirmPassword: string;
  }): void {
    if (!input.otp) {
      throw new MobileCustomerAuthError('Vui lòng nhập mã OTP', 400, 'OTP_REQUIRED');
    }

    if (!/^\d{6}$/.test(input.otp)) {
      throw new MobileCustomerAuthError('Mã OTP phải gồm 6 chữ số', 400, 'INVALID_OTP_FORMAT');
    }

    if (input.password.length < 6) {
      throw new MobileCustomerAuthError(
        'Mật khẩu phải có ít nhất 6 ký tự',
        400,
        'PASSWORD_TOO_SHORT'
      );
    }

    if (input.password !== input.confirmPassword) {
      throw new MobileCustomerAuthError(
        'Mật khẩu xác nhận không khớp',
        400,
        'PASSWORD_CONFIRMATION_MISMATCH'
      );
    }
  }

  private assertActive(account: MobileCustomerAccountDocument): void {
    if (account.deletionStatus === MobileCustomerDeletionStatus.PENDING) {
      throw new MobileCustomerAuthError('Tài khoản đang chờ xóa', 401, 'ACCOUNT_PENDING_DELETION', {
        scheduledDeletionAt: account.scheduledDeletionAt || null,
      });
    }

    if (account.deletionStatus === MobileCustomerDeletionStatus.COMPLETED) {
      throw new MobileCustomerAuthError('Tài khoản đã được xóa', 401, 'ACCOUNT_DELETED');
    }

    if (!account.isActive) {
      throw new MobileCustomerAuthError('Tài khoản đã bị khóa', 403, 'MOBILE_ACCOUNT_DISABLED');
    }
  }

  private assertPhone(phone: string): void {
    if (!/^\+84\d{9}$/.test(phone)) {
      throw new MobileCustomerAuthError('Số điện thoại không hợp lệ', 400, 'INVALID_PHONE');
    }
  }

  private invalidRefreshTokenError(): MobileCustomerAuthError {
    return new MobileCustomerAuthError('Refresh token không hợp lệ', 401, 'INVALID_REFRESH_TOKEN');
  }

  private isDuplicateKeyError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const record = error as {
      code?: unknown;
      message?: unknown;
    };

    return (
      record.code === 11000 ||
      (typeof record.message === 'string' && record.message.includes('duplicate key'))
    );
  }

  private getAccessTokenExpiresInSeconds(): number {
    return this.parseDurationToSeconds(
      process.env.MOBILE_CUSTOMER_ACCESS_TOKEN_EXPIRES_IN || '15m',
      15 * 60
    );
  }

  private getRefreshTokenDays(): number {
    const value = Number(process.env.MOBILE_CUSTOMER_REFRESH_TOKEN_DAYS || 30);

    if (!Number.isFinite(value) || value <= 0) {
      return 30;
    }

    return Math.min(365, Math.floor(value));
  }

  private parseDurationToSeconds(value: string, fallback: number): number {
    const normalized = String(value || '')
      .trim()
      .toLowerCase();
    const numeric = Number(normalized);

    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.floor(numeric);
    }

    const match = normalized.match(/^(\d+)\s*([smhd])$/);

    if (!match) {
      return fallback;
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multiplier = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 60 * 60 : 24 * 60 * 60;

    return amount * multiplier;
  }

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    return secret;
  }
}

export { MobileCustomerOtpError };
