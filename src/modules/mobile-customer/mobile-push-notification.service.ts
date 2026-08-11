import mongoose from 'mongoose';

import { firebaseMessaging } from '@/config/firebase-admin';
import { MobilePushToken } from '@/modules/mobile-customer/mobile-push-token.model';
import { MobileNotificationPreferenceService } from '@/modules/mobile-customer/mobile-notification-preference.service';
import type {
  MobileNotificationSource,
  MobileNotificationTargetType,
  MobileNotificationType,
} from '@/modules/mobile-customer/mobile-notification.model';

export interface SendPayload {
  title: string;
  body: string;
  type?: MobileNotificationType;
  notificationId?: string;

  targetType?: MobileNotificationTargetType;
  targetId?: string;
  targetCode?: string;
  targetDeviceId?: string;

  source?: MobileNotificationSource;
}

export type MobilePushSendStatus = 'completed' | 'partial' | 'failed' | 'skipped';

export interface IMobilePushSendResult {
  status: MobilePushSendStatus;
  attempted: number;
  success: number;
  failure: number;
  invalidTokens: number;
}

interface PushTokenLean {
  token: string;
  accountId?: unknown;
  deviceId?: string | null;
}

const EMPTY_SKIPPED_RESULT: IMobilePushSendResult = {
  status: 'skipped',
  attempted: 0,
  success: 0,
  failure: 0,
  invalidTokens: 0,
};

const isInvalidRegistrationTokenError = (reason: unknown): boolean => {
  const error = reason as {
    code?: unknown;
    message?: unknown;
  };

  const code = String(error?.code || '').toLowerCase();

  const message = String(error?.message || '').toLowerCase();

  return (
    code.includes('registration-token-not-registered') ||
    code.includes('invalid-registration-token') ||
    message.includes('registration-token-not-registered') ||
    message.includes('requested entity was not found')
  );
};

export class MobilePushNotificationService {
  constructor(private readonly preferenceService = new MobileNotificationPreferenceService()) {}

  async sendToAllCustomers(payload: SendPayload): Promise<IMobilePushSendResult> {
    const disabledAccountIds = await this.preferenceService.getDisabledAccountIds(payload.type);

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (disabledAccountIds.length) {
      where.accountId = {
        $nin: disabledAccountIds,
      };
    }

    const pushTokens = await MobilePushToken.find(where)
      .select({
        token: 1,
        accountId: 1,
        deviceId: 1,
      })
      .lean<PushTokenLean[]>();

    return this.sendToTokens(pushTokens, payload);
  }

  async sendToAccount(accountId: string, payload: SendPayload): Promise<IMobilePushSendResult> {
    return this.sendToAccountInternal(accountId, payload);
  }

  /**
   * Dùng cho cảnh báo đăng nhập thiết bị mới:
   * gửi đến toàn bộ thiết bị cũ nhưng loại chính
   * thiết bị vừa đăng nhập.
   */
  async sendToAccountExceptDevice(
    accountId: string,
    excludedDeviceIdInput: string,
    payload: SendPayload
  ): Promise<IMobilePushSendResult> {
    const excludedDeviceId = String(excludedDeviceIdInput || '').trim();

    return this.sendToAccountInternal(accountId, payload, excludedDeviceId || undefined);
  }

  private async sendToAccountInternal(
    accountId: string,
    payload: SendPayload,
    excludedDeviceId?: string
  ): Promise<IMobilePushSendResult> {
    if (!mongoose.isValidObjectId(accountId)) {
      return {
        ...EMPTY_SKIPPED_RESULT,
      };
    }

    const pushEnabled = await this.preferenceService.isPushEnabled(accountId, payload.type);

    if (!pushEnabled) {
      return {
        ...EMPTY_SKIPPED_RESULT,
      };
    }

    const where: Record<string, unknown> = {
      accountId: new mongoose.Types.ObjectId(accountId),
      isActive: true,
    };

    if (excludedDeviceId) {
      where.deviceId = {
        $ne: excludedDeviceId,
      };
    }

    const pushTokens = await MobilePushToken.find(where)
      .select({
        token: 1,
        accountId: 1,
        deviceId: 1,
      })
      .lean<PushTokenLean[]>();

    return this.sendToTokens(pushTokens, payload);
  }

  private async sendToTokens(
    pushTokens: PushTokenLean[],
    payload: SendPayload
  ): Promise<IMobilePushSendResult> {
    if (!pushTokens.length) {
      return {
        ...EMPTY_SKIPPED_RESULT,
      };
    }

    const results = await Promise.allSettled(
      pushTokens.map(item =>
        firebaseMessaging.send({
          token: item.token,

          notification: {
            title: payload.title,
            body: payload.body,
          },

          data: {
            type: payload.type ?? 'system',

            notificationId: payload.notificationId ?? '',

            targetType: payload.targetType ?? 'notification',

            targetId: payload.targetId ?? '',

            targetCode: payload.targetCode ?? '',

            targetDeviceId: payload.targetDeviceId ?? '',

            source: payload.source ?? 'admin',
          },

          android: {
            priority: 'high',

            notification: {
              channelId: 'gp_customer_general',
              sound: 'default',
            },
          },
        })
      )
    );

    const invalidTokens: string[] = [];
    const failedMessages: string[] = [];

    let success = 0;
    let failure = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        success += 1;
        return;
      }

      failure += 1;

      const reason = result.reason as {
        code?: unknown;
        message?: unknown;
      };

      if (failedMessages.length < 20) {
        failedMessages.push(
          String(reason?.code || reason?.message || 'Unknown Firebase push error')
        );
      }

      if (isInvalidRegistrationTokenError(result.reason)) {
        const token = pushTokens[index]?.token;

        if (token) {
          invalidTokens.push(token);
        }
      }
    });

    if (invalidTokens.length) {
      try {
        await MobilePushToken.updateMany(
          {
            token: {
              $in: invalidTokens,
            },
          },
          {
            $set: {
              isActive: false,
              deactivatedAt: new Date(),
            },
          }
        );
      } catch (error) {
        console.warn('[MOBILE PUSH] Push hoàn tất nhưng không thể vô hiệu hóa token lỗi:', error);
      }
    }

    if (failedMessages.length) {
      console.warn('[MOBILE PUSH] Một số thiết bị nhận push thất bại:', {
        failure,
        loggedErrors: failedMessages.length,
        errors: failedMessages,
      });
    }

    return {
      status: failure === 0 ? 'completed' : success > 0 ? 'partial' : 'failed',

      attempted: pushTokens.length,
      success,
      failure,

      invalidTokens: invalidTokens.length,
    };
  }
}
