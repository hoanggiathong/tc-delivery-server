import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { Types } from 'mongoose';

import {
  MobileCustomerAccount,
  MobileCustomerDeletionStatus,
} from '@/modules/mobile-customer/mobile-customer-account.model';
import { MobileCustomerRefreshToken } from '@/modules/mobile-customer/mobile-customer-refresh-token.model';
import {
  MobileCustomerOtp,
  MobileCustomerOtpPurpose,
} from '@/modules/mobile-customer/mobile-customer-otp.model';
import { MobileCustomerOtpService } from '@/modules/mobile-customer/mobile-customer-otp.service';
import { MobilePushToken } from '@/modules/mobile-customer/mobile-push-token.model';
import { MobileNotificationPreference } from '@/modules/mobile-customer/mobile-notification-preference.model';
import { MobileNotificationRead } from '@/modules/mobile-customer/mobile-notification-read.model';
import { MobileNotification } from '@/modules/mobile-customer/mobile-notification.model';
import { MobileCustomerSecurityEvent } from '@/modules/mobile-customer/mobile-customer-security-event.model';
import {
  MobileCustomerSecurityEventService,
  MobileCustomerSecurityEventType,
} from '@/modules/mobile-customer/mobile-customer-security-event.service';
import type { IMobileCustomerSessionContext } from '@/modules/mobile-customer/mobile-customer-auth.service';
import Logger from '@/utils/logger';

export interface RequestAccountDeletionInput {
  currentPassword: string;
  otp: string;
  confirmation: string;
  reason?: string | null;
}

export interface AccountDeletionStatusResult {
  deletionStatus: MobileCustomerDeletionStatus;
  deletionRequestedAt: Date | null;
  scheduledDeletionAt: Date | null;
  deletedAt: Date | null;
  canCancel: boolean;
  remainingSeconds: number;
  maskedPhone: string;
}

export interface AccountDeletionRequestResult extends AccountDeletionStatusResult {
  deletionToken: string;
}

export interface AccountDeletionJobResult {
  scanned: number;
  completed: number;
  failed: number;
}

export class MobileCustomerAccountDeletionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'MobileCustomerAccountDeletionError';
  }
}

const CONFIRMATION_TEXT = 'XOA TAI KHOAN';
const PROCESSING_STALE_MINUTES = 30;
const TOKEN_STATUS_EXTRA_HOURS = 48;

const readGraceDays = (): number => {
  const value = Number(process.env.MOBILE_ACCOUNT_DELETION_GRACE_DAYS);
  return Number.isInteger(value) && value >= 1 && value <= 30 ? value : 7;
};

const normalizeConfirmation = (value: unknown): string =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

const normalizeReason = (value: unknown): string | null => {
  const reason = String(value || '').trim();
  if (!reason) {
    return null;
  }
  if (reason.length > 300) {
    throw new MobileCustomerAccountDeletionError(
      'Lý do không được vượt quá 300 ký tự',
      400,
      'ACCOUNT_DELETION_REASON_TOO_LONG'
    );
  }
  return reason;
};

const hashToken = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

const createPlainToken = (accountId: string): string =>
  `${accountId}.${crypto.randomBytes(32).toString('base64url')}`;

const maskPhone = (value: string): string => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 7) {
    return '***';
  }
  return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
};

export class MobileCustomerAccountDeletionService {
  constructor(
    private readonly otpService = new MobileCustomerOtpService(),
    private readonly securityEventService = new MobileCustomerSecurityEventService()
  ) {}

  async sendRequestOtp(
    accountId: string,
    currentPasswordInput: string,
    context: IMobileCustomerSessionContext
  ) {
    const account = await MobileCustomerAccount.findById(accountId).select(
      '+passwordHash phone isActive deletionStatus'
    );

    if (!account) {
      throw new MobileCustomerAccountDeletionError(
        'Không tìm thấy tài khoản',
        404,
        'MOBILE_ACCOUNT_NOT_FOUND'
      );
    }

    if (
      !account.isActive ||
      (account.deletionStatus || MobileCustomerDeletionStatus.NONE) !==
        MobileCustomerDeletionStatus.NONE
    ) {
      throw new MobileCustomerAccountDeletionError(
        'Tài khoản không thể tạo yêu cầu xóa mới',
        409,
        'ACCOUNT_DELETION_ALREADY_REQUESTED'
      );
    }

    await this.assertCurrentPassword(account.passwordHash, currentPasswordInput);

    return this.otpService.requestOtp(account.phone, MobileCustomerOtpPurpose.ACCOUNT_DELETION, {
      ip: context.ip,
    });
  }

  async requestDeletion(
    accountId: string,
    input: RequestAccountDeletionInput,
    context: IMobileCustomerSessionContext
  ): Promise<AccountDeletionRequestResult> {
    if (normalizeConfirmation(input.confirmation) !== CONFIRMATION_TEXT) {
      throw new MobileCustomerAccountDeletionError(
        `Vui lòng nhập đúng “${CONFIRMATION_TEXT}”`,
        400,
        'ACCOUNT_DELETION_CONFIRMATION_INVALID'
      );
    }

    const reason = normalizeReason(input.reason);
    const account = await MobileCustomerAccount.findById(accountId).select(
      '+passwordHash phone isActive deletionStatus'
    );

    if (!account) {
      throw new MobileCustomerAccountDeletionError(
        'Không tìm thấy tài khoản',
        404,
        'MOBILE_ACCOUNT_NOT_FOUND'
      );
    }

    if (account.deletionStatus === MobileCustomerDeletionStatus.PENDING) {
      throw new MobileCustomerAccountDeletionError(
        'Tài khoản đã có yêu cầu xóa đang chờ xử lý',
        409,
        'ACCOUNT_DELETION_ALREADY_REQUESTED'
      );
    }

    if (!account.isActive) {
      throw new MobileCustomerAccountDeletionError(
        'Tài khoản đã bị khóa',
        403,
        'MOBILE_ACCOUNT_DISABLED'
      );
    }

    await this.assertCurrentPassword(account.passwordHash, input.currentPassword);
    await this.otpService.verifyOtp(
      account.phone,
      String(input.otp || '').trim(),
      MobileCustomerOtpPurpose.ACCOUNT_DELETION
    );

    const now = new Date();
    const graceDays = readGraceDays();
    const scheduledDeletionAt = new Date(now.getTime() + graceDays * 24 * 60 * 60 * 1000);
    const plainToken = createPlainToken(String(account._id));

    const updated = await MobileCustomerAccount.findOneAndUpdate(
      {
        _id: account._id,
        isActive: true,
        $or: [
          { deletionStatus: MobileCustomerDeletionStatus.NONE },
          { deletionStatus: { $exists: false } },
        ],
      },
      {
        $set: {
          isActive: false,
          deletionStatus: MobileCustomerDeletionStatus.PENDING,
          deletionRequestedAt: now,
          scheduledDeletionAt,
          deletionProcessingAt: null,
          deletedAt: null,
          deletionReason: reason,
          deletionRequestTokenHash: hashToken(plainToken),
          deletionRequestTokenExpiresAt: new Date(
            scheduledDeletionAt.getTime() + TOKEN_STATUS_EXTRA_HOURS * 60 * 60 * 1000
          ),
        },
      },
      { new: true, runValidators: true }
    ).select('+deletionRequestTokenHash');

    if (!updated) {
      throw new MobileCustomerAccountDeletionError(
        'Yêu cầu xóa đã được xử lý ở yêu cầu khác',
        409,
        'ACCOUNT_DELETION_CONFLICT'
      );
    }

    const cleanup = await Promise.allSettled([
      MobileCustomerRefreshToken.updateMany(
        { accountId: updated._id, revokedAt: null },
        { $set: { revokedAt: now, lastUsedAt: now } }
      ),
      MobilePushToken.updateMany(
        { accountId: updated._id, isActive: true },
        { $set: { isActive: false, deactivatedAt: now } }
      ),
    ]);

    cleanup.forEach((result, index) => {
      if (result.status === 'rejected') {
        Logger.error('Tài khoản đã khóa nhưng cleanup phiên khi yêu cầu xóa thất bại', {
          accountId: String(updated._id),
          cleanupStep: index === 0 ? 'refresh-token' : 'push-token',
          error: result.reason instanceof Error ? result.reason.message : result.reason,
        });
      }
    });

    await this.securityEventService.recordSafely({
      accountId: updated._id,
      type: MobileCustomerSecurityEventType.ACCOUNT_DELETION_REQUESTED,
      ...context,
      metadata: {
        scheduledDeletionAt: scheduledDeletionAt.toISOString(),
        graceDays,
        hasReason: Boolean(reason),
      },
    });

    return {
      ...this.mapStatus(updated),
      deletionToken: plainToken,
    };
  }

  async getStatusByToken(tokenInput: string): Promise<AccountDeletionStatusResult> {
    const account = await this.findPendingAccountByToken(tokenInput);
    return this.mapStatus(account);
  }

  async sendCancelOtp(tokenInput: string, context: IMobileCustomerSessionContext) {
    const account = await this.findPendingAccountByToken(tokenInput, true);
    return this.otpService.requestOtp(
      account.phone,
      MobileCustomerOtpPurpose.ACCOUNT_DELETION_CANCEL,
      { ip: context.ip }
    );
  }

  async cancelDeletion(
    tokenInput: string,
    otpInput: string,
    context: IMobileCustomerSessionContext
  ): Promise<AccountDeletionStatusResult> {
    const account = await this.findPendingAccountByToken(tokenInput, true);
    await this.otpService.verifyOtp(
      account.phone,
      String(otpInput || '').trim(),
      MobileCustomerOtpPurpose.ACCOUNT_DELETION_CANCEL
    );
    return this.cancelPendingAccount(account._id, context);
  }

  /** Recovery khi app bị cài lại và local deletion token bị mất. */
  async sendRecoveryOtp(
    phoneInput: string,
    context: IMobileCustomerSessionContext
  ): Promise<{ accepted: true }> {
    const phone = this.otpService.normalizePhone(phoneInput);
    const account = await MobileCustomerAccount.findOne({
      phone,
      deletionStatus: MobileCustomerDeletionStatus.PENDING,
      scheduledDeletionAt: { $gt: new Date() },
      deletionProcessingAt: null,
    })
      .select('_id phone')
      .lean();

    // Response cố định để giảm khả năng dò số điện thoại.
    if (account) {
      await this.otpService.requestOtp(phone, MobileCustomerOtpPurpose.ACCOUNT_DELETION_CANCEL, {
        ip: context.ip,
      });
    }

    return { accepted: true };
  }

  async cancelDeletionByPhone(
    phoneInput: string,
    otpInput: string,
    context: IMobileCustomerSessionContext
  ): Promise<AccountDeletionStatusResult> {
    const phone = this.otpService.normalizePhone(phoneInput);
    const account = await MobileCustomerAccount.findOne({
      phone,
      deletionStatus: MobileCustomerDeletionStatus.PENDING,
      scheduledDeletionAt: { $gt: new Date() },
      deletionProcessingAt: null,
    }).select('_id phone');

    if (!account) {
      throw new MobileCustomerAccountDeletionError(
        'Không tìm thấy yêu cầu xóa còn hiệu lực',
        404,
        'ACCOUNT_DELETION_NOT_FOUND'
      );
    }

    await this.otpService.verifyOtp(
      phone,
      String(otpInput || '').trim(),
      MobileCustomerOtpPurpose.ACCOUNT_DELETION_CANCEL
    );

    return this.cancelPendingAccount(account._id, context);
  }

  async processDueDeletions(limitInput = 50): Promise<AccountDeletionJobResult> {
    const limit = Math.min(Math.max(Math.floor(Number(limitInput) || 50), 1), 200);
    const now = new Date();
    const staleBefore = new Date(now.getTime() - PROCESSING_STALE_MINUTES * 60 * 1000);

    const candidates = await MobileCustomerAccount.find({
      deletionStatus: MobileCustomerDeletionStatus.PENDING,
      scheduledDeletionAt: { $lte: now },
      $or: [{ deletionProcessingAt: null }, { deletionProcessingAt: { $lte: staleBefore } }],
    })
      .select('_id phone')
      .sort({ scheduledDeletionAt: 1, _id: 1 })
      .limit(limit)
      .lean<Array<{ _id: Types.ObjectId; phone: string }>>();

    let completed = 0;
    let failed = 0;

    for (const candidate of candidates) {
      const claimedAt = new Date();
      const claimed = await MobileCustomerAccount.findOneAndUpdate(
        {
          _id: candidate._id,
          deletionStatus: MobileCustomerDeletionStatus.PENDING,
          scheduledDeletionAt: { $lte: now },
          $or: [{ deletionProcessingAt: null }, { deletionProcessingAt: { $lte: staleBefore } }],
        },
        { $set: { deletionProcessingAt: claimedAt } },
        { new: true }
      ).select('phone');

      if (!claimed) {
        continue;
      }

      try {
        await this.finalizeDeletion(claimed._id, claimed.phone, claimedAt);
        completed += 1;
      } catch (error) {
        failed += 1;
        await MobileCustomerAccount.updateOne(
          {
            _id: claimed._id,
            deletionStatus: MobileCustomerDeletionStatus.PENDING,
            deletionProcessingAt: claimedAt,
          },
          { $set: { deletionProcessingAt: null } }
        );
        Logger.error('Ẩn danh tài khoản đến hạn thất bại', {
          accountId: String(claimed._id),
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    return { scanned: candidates.length, completed, failed };
  }

  private async finalizeDeletion(
    accountId: Types.ObjectId,
    originalPhone: string,
    claimedAt: Date
  ): Promise<void> {
    const cleanup = await Promise.allSettled([
      MobileCustomerRefreshToken.deleteMany({ accountId }),
      MobilePushToken.deleteMany({ accountId }),
      MobileNotificationPreference.deleteMany({ accountId }),
      MobileNotificationRead.deleteMany({ accountId }),
      MobileNotification.deleteMany({
        audience: 'account',
        recipientAccountId: accountId,
      }),
      MobileCustomerSecurityEvent.deleteMany({ accountId }),
      MobileCustomerOtp.deleteMany({ phone: originalPhone }),
    ]);

    const cleanupFailure = cleanup.find(item => item.status === 'rejected');
    if (cleanupFailure?.status === 'rejected') {
      throw cleanupFailure.reason || new Error('Không dọn được dữ liệu tài khoản');
    }

    const passwordHash = await bcrypt.hash(crypto.randomBytes(48).toString('base64url'), 12);
    const deletedAt = new Date();

    const result = await MobileCustomerAccount.updateOne(
      {
        _id: accountId,
        deletionStatus: MobileCustomerDeletionStatus.PENDING,
        deletionProcessingAt: claimedAt,
      },
      {
        $set: {
          phone: `deleted_${String(accountId)}@removed`,
          name: 'Tài khoản đã xóa',
          passwordHash,
          email: null,
          avatar: null,
          isActive: false,
          phoneVerifiedAt: null,
          acceptedTermsAt: null,
          lastLoginAt: null,
          deletionStatus: MobileCustomerDeletionStatus.COMPLETED,
          deletionRequestedAt: null,
          scheduledDeletionAt: null,
          deletionProcessingAt: null,
          deletedAt,
          deletionReason: null,
          deletionRequestTokenHash: null,
          deletionRequestTokenExpiresAt: null,
        },
      },
      { runValidators: true }
    );

    if (result.modifiedCount !== 1) {
      throw new Error('Tài khoản thay đổi trạng thái trong khi ẩn danh');
    }

    await this.securityEventService.recordSafely({
      accountId,
      type: MobileCustomerSecurityEventType.ACCOUNT_DELETION_COMPLETED,
      metadata: { completedAt: deletedAt.toISOString() },
    });
  }

  private async cancelPendingAccount(
    accountId: Types.ObjectId,
    context: IMobileCustomerSessionContext
  ): Promise<AccountDeletionStatusResult> {
    const now = new Date();
    const updated = await MobileCustomerAccount.findOneAndUpdate(
      {
        _id: accountId,
        deletionStatus: MobileCustomerDeletionStatus.PENDING,
        scheduledDeletionAt: { $gt: now },
        deletionProcessingAt: null,
      },
      {
        $set: {
          isActive: true,
          deletionStatus: MobileCustomerDeletionStatus.NONE,
          deletionRequestedAt: null,
          scheduledDeletionAt: null,
          deletionProcessingAt: null,
          deletionReason: null,
          deletionRequestTokenHash: null,
          deletionRequestTokenExpiresAt: null,
        },
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw new MobileCustomerAccountDeletionError(
        'Yêu cầu xóa đã hết thời gian hủy hoặc đang được xử lý',
        409,
        'ACCOUNT_DELETION_CANCEL_EXPIRED'
      );
    }

    await this.securityEventService.recordSafely({
      accountId: updated._id,
      type: MobileCustomerSecurityEventType.ACCOUNT_DELETION_CANCELLED,
      ...context,
    });

    return this.mapStatus(updated);
  }

  private async findPendingAccountByToken(tokenInput: string, requireCancelable = false) {
    const token = String(tokenInput || '').trim();
    if (!token || token.length > 500) {
      throw new MobileCustomerAccountDeletionError(
        'Mã yêu cầu xóa không hợp lệ',
        400,
        'ACCOUNT_DELETION_TOKEN_INVALID'
      );
    }

    const now = new Date();
    const account = await MobileCustomerAccount.findOne({
      deletionRequestTokenHash: hashToken(token),
      deletionStatus: MobileCustomerDeletionStatus.PENDING,
      deletionRequestTokenExpiresAt: { $gt: now },
      ...(requireCancelable
        ? {
            scheduledDeletionAt: { $gt: now },
            deletionProcessingAt: null,
          }
        : {}),
    }).select(
      '+deletionRequestTokenHash phone deletionStatus deletionRequestedAt scheduledDeletionAt deletedAt deletionProcessingAt'
    );

    if (!account) {
      throw new MobileCustomerAccountDeletionError(
        'Không tìm thấy yêu cầu xóa còn hiệu lực',
        404,
        'ACCOUNT_DELETION_NOT_FOUND'
      );
    }

    return account;
  }

  private async assertCurrentPassword(
    passwordHash: string,
    currentPasswordInput: string
  ): Promise<void> {
    const currentPassword = String(currentPasswordInput || '');
    if (!currentPassword) {
      throw new MobileCustomerAccountDeletionError(
        'Vui lòng nhập mật khẩu hiện tại',
        400,
        'CURRENT_PASSWORD_REQUIRED'
      );
    }

    if (!(await bcrypt.compare(currentPassword, passwordHash))) {
      throw new MobileCustomerAccountDeletionError(
        'Mật khẩu hiện tại không đúng',
        401,
        'INVALID_CURRENT_PASSWORD'
      );
    }
  }

  private mapStatus(account: {
    phone: string;
    deletionStatus: MobileCustomerDeletionStatus;
    deletionRequestedAt?: Date | null;
    scheduledDeletionAt?: Date | null;
    deletedAt?: Date | null;
    deletionProcessingAt?: Date | null;
  }): AccountDeletionStatusResult {
    const scheduledTime = account.scheduledDeletionAt?.getTime() || 0;
    const canCancel =
      account.deletionStatus === MobileCustomerDeletionStatus.PENDING &&
      scheduledTime > Date.now() &&
      !account.deletionProcessingAt;

    return {
      deletionStatus: account.deletionStatus,
      deletionRequestedAt: account.deletionRequestedAt || null,
      scheduledDeletionAt: account.scheduledDeletionAt || null,
      deletedAt: account.deletedAt || null,
      canCancel,
      remainingSeconds: canCancel ? Math.max(Math.ceil((scheduledTime - Date.now()) / 1000), 0) : 0,
      maskedPhone: maskPhone(account.phone),
    };
  }
}
