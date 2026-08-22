import mongoose from 'mongoose';

import { MobileCustomerAccount } from '@/modules/mobile-customer/mobile-customer-account.model';
import {
  MobileNotification,
  type MobileNotificationRecipientRole,
  type MobileNotificationSource,
  type MobileNotificationTargetType,
  type MobileNotificationType,
} from '@/modules/mobile-customer/mobile-notification.model';
import {
  MobilePushNotificationService,
  type IMobilePushSendResult,
} from '@/modules/mobile-customer/mobile-push-notification.service';
import { MobileNotificationEventSettingService } from '@/modules/mobile-customer/mobile-notification-event-setting.service';
import type { MobileNotificationEventModule } from '@/modules/mobile-customer/mobile-notification-event-setting.model';

interface AccountLean {
  _id: unknown;
  phone: string;
}

export interface EmitBusinessNotificationInput {
  module: MobileNotificationEventModule;
  eventCode: string;

  entityId: string;
  fullCode: string;

  senderPhone?: string | null;
  receiverPhone?: string | null;

  type: Extract<MobileNotificationType, 'order' | 'money'>;

  targetType: Extract<MobileNotificationTargetType, 'delivery' | 'money-delivery'>;

  targetId?: string;
  targetCode?: string;

  source: Extract<MobileNotificationSource, 'delivery-event' | 'money-event'>;
}

export interface EmitBusinessNotificationResult {
  status: 'completed' | 'partial' | 'skipped';

  reason?: 'EVENT_DISABLED' | 'NO_RECIPIENT_ACCOUNT';

  created: number;
  duplicate: number;
  failed: number;
}

export interface EmitNewDeviceLoginInput {
  accountId: string;
  deviceId: string;
  deviceName: string;
  occurredAt: Date;
}

export interface EmitNewsPublishedInput {
  articleId: string;
  slug: string;
  title: string;
}

export interface EmitNewsPublishedResult {
  status: 'created' | 'duplicate';
  pushResult?: IMobilePushSendResult;
}

interface ResolvedRecipient {
  accountId: string;
  role: MobileNotificationRecipientRole;
}

interface CreateAccountNotificationInput {
  accountId: string;

  recipientRole?: MobileNotificationRecipientRole | null;

  title: string;
  content: string;
  type: MobileNotificationType;

  targetType: MobileNotificationTargetType;

  targetId?: string;
  targetCode?: string;
  targetDeviceId?: string;

  source: MobileNotificationSource;

  eventKey: string;

  excludedPushDeviceId?: string;
}

interface CreateAccountNotificationResult {
  status: 'created' | 'duplicate';

  pushResult?: IMobilePushSendResult;
}

const isDuplicateKeyError = (error: unknown): boolean => {
  const value = error as {
    code?: unknown;
  };

  return Number(value?.code) === 11000;
};

const renderTemplate = (template: string, variables: Record<string, string>): string => {
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.split(`{{${key}}}`).join(value),
    template
  );
};

const formatVietnamDateTime = (value: Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
};

const normalizeNewsValue = (value: unknown, maxLength: number): string =>
  String(value || '')
    .trim()
    .slice(0, maxLength);

export class MobileCustomerNotificationService {
  constructor(
    private readonly pushService = new MobilePushNotificationService(),

    private readonly eventSettingService = new MobileNotificationEventSettingService()
  ) {}

  async emitDeliveryEvent(input: {
    eventCode: string;
    deliveryId: string;
    fullCode: string;
    senderPhone?: string | null;
    receiverPhone?: string | null;
  }): Promise<EmitBusinessNotificationResult> {
    return this.emitBusinessEvent({
      module: 'delivery',
      eventCode: input.eventCode,
      entityId: input.deliveryId,
      fullCode: input.fullCode,
      senderPhone: input.senderPhone,
      receiverPhone: input.receiverPhone,
      type: 'order',
      targetType: 'delivery',
      targetId: input.deliveryId,
      source: 'delivery-event',
    });
  }

  async emitMoneyEvent(input: {
    eventCode: string;
    moneyDeliveryId: string;
    fullCode: string;
    senderPhone?: string | null;
    receiverPhone?: string | null;
  }): Promise<EmitBusinessNotificationResult> {
    return this.emitBusinessEvent({
      module: 'money-delivery',
      eventCode: input.eventCode,
      entityId: input.moneyDeliveryId,
      fullCode: input.fullCode,
      senderPhone: input.senderPhone,
      receiverPhone: input.receiverPhone,
      type: 'money',
      targetType: 'money-delivery',
      targetCode: input.fullCode,
      source: 'money-event',
    });
  }

  /**
   * News dùng chung preference `promotion`.
   * Notification được lưu global trong app; FCM sẽ tự lọc
   * các account đã tắt promotionPushEnabled ở push service.
   */
  async emitNewsPublished(input: EmitNewsPublishedInput): Promise<EmitNewsPublishedResult> {
    const articleId = normalizeNewsValue(input.articleId, 100);

    const slug = normalizeNewsValue(input.slug, 180);

    const articleTitle = normalizeNewsValue(input.title, 1000);

    if (!articleId || !slug || !articleTitle) {
      throw new Error('Invalid news publication notification payload');
    }

    const eventKey = `news:published:${articleId}`;

    let notification;

    try {
      notification = await MobileNotification.create({
        title: 'Tin mới từ Gia Phước Express',
        content: articleTitle,
        type: 'promotion',

        targetType: 'news',
        targetId: articleId,
        targetCode: slug,
        targetDeviceId: '',

        audience: 'global',
        recipientAccountId: null,
        recipientRole: null,

        source: 'news-event',
        eventKey,

        isActive: true,

        pushResult: {
          status: 'pending',
          attempted: 0,
          success: 0,
          failure: 0,
          invalidTokens: 0,
        },

        sentAt: null,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return {
          status: 'duplicate',
        };
      }

      throw error;
    }

    let pushResult: IMobilePushSendResult;

    try {
      pushResult = await this.pushService.sendToAllCustomers({
        title: notification.title,
        body: notification.content,
        type: 'promotion',
        notificationId: String(notification._id),
        targetType: 'news',
        targetId: articleId,
        targetCode: slug,
        source: 'news-event',
      });
    } catch (error) {
      console.error('[MOBILE NOTIFICATION] Đã tạo notification News nhưng push thất bại:', error);

      pushResult = {
        status: 'failed',
        attempted: 0,
        success: 0,
        failure: 0,
        invalidTokens: 0,
      };
    }

    try {
      await MobileNotification.updateOne(
        {
          _id: notification._id,
        },
        {
          $set: {
            pushResult,
            sentAt: new Date(),
          },
        },
        {
          runValidators: true,
        }
      );
    } catch (error) {
      console.error('[MOBILE NOTIFICATION] Không lưu được kết quả push News:', error);
    }

    return {
      status: 'created',
      pushResult,
    };
  }

  /**
   * Nếu admin đổi slug sau khi bài đã publish,
   * đồng bộ deep-link của notification đã tạo.
   */
  async syncNewsTargetCode(articleIdInput: string, slugInput: string): Promise<void> {
    const articleId = normalizeNewsValue(articleIdInput, 100);

    const slug = normalizeNewsValue(slugInput, 180);

    if (!articleId || !slug) {
      return;
    }

    await MobileNotification.updateOne(
      {
        eventKey: `news:published:${articleId}`,
        source: 'news-event',
      },
      {
        $set: {
          targetCode: slug,
        },
      },
      {
        runValidators: true,
      }
    );
  }

  /**
   * Notification được lưu cho toàn bộ tài khoản,
   * nhưng FCM chỉ gửi đến các thiết bị cũ.
   */
  async emitNewDeviceLogin(
    input: EmitNewDeviceLoginInput
  ): Promise<CreateAccountNotificationResult> {
    const deviceId = String(input.deviceId || '').trim();

    const deviceName = String(input.deviceName || '').trim() || 'Thiết bị mới';

    return this.createAccountNotification({
      accountId: input.accountId,
      recipientRole: null,

      title: 'Có đăng nhập trên thiết bị mới',

      content: `Tài khoản của bạn vừa đăng nhập trên ${deviceName} lúc ${formatVietnamDateTime(
        input.occurredAt
      )}.`,

      type: 'system',

      targetType: 'security',
      targetDeviceId: deviceId,

      source: 'security-event',

      eventKey: `security:new-device:${input.accountId}:${deviceId}`,

      excludedPushDeviceId: deviceId,
    });
  }

  async emitBusinessEvent(
    input: EmitBusinessNotificationInput
  ): Promise<EmitBusinessNotificationResult> {
    const eventCode = String(input.eventCode || '')
      .trim()
      .toUpperCase();

    const setting = await this.eventSettingService.resolve(input.module, eventCode);

    if (!setting.enabled) {
      return {
        status: 'skipped',
        reason: 'EVENT_DISABLED',
        created: 0,
        duplicate: 0,
        failed: 0,
      };
    }

    const recipients = await this.resolveRecipients({
      senderPhone: setting.sendToSender ? input.senderPhone : null,

      receiverPhone: setting.sendToReceiver ? input.receiverPhone : null,
    });

    if (!recipients.length) {
      return {
        status: 'skipped',
        reason: 'NO_RECIPIENT_ACCOUNT',
        created: 0,
        duplicate: 0,
        failed: 0,
      };
    }

    const variables = {
      fullCode: input.fullCode,
    };

    const results = await Promise.allSettled(
      recipients.map(recipient => {
        const titleTemplate =
          recipient.role === 'sender' ? setting.senderTitleTemplate : setting.receiverTitleTemplate;

        const contentTemplate =
          recipient.role === 'sender'
            ? setting.senderContentTemplate
            : setting.receiverContentTemplate;

        return this.createAccountNotification({
          accountId: recipient.accountId,

          recipientRole: recipient.role,

          title: renderTemplate(titleTemplate, variables),

          content: renderTemplate(contentTemplate, variables),

          type: input.type,

          targetType: input.targetType,

          targetId: input.targetId,

          targetCode: input.targetCode,

          source: input.source,

          eventKey: `${input.module}:${input.entityId}:${eventCode}:${recipient.accountId}`,
        });
      })
    );

    let created = 0;
    let duplicate = 0;
    let failed = 0;

    for (const result of results) {
      if (result.status === 'rejected') {
        failed += 1;

        console.error('[MOBILE NOTIFICATION] Không tạo được thông báo nghiệp vụ:', result.reason);

        continue;
      }

      if (result.value.status === 'duplicate') {
        duplicate += 1;
      } else {
        created += 1;
      }
    }

    return {
      status: failed > 0 ? 'partial' : 'completed',

      created,
      duplicate,
      failed,
    };
  }

  private async resolveRecipients(input: {
    senderPhone?: string | null;
    receiverPhone?: string | null;
  }): Promise<ResolvedRecipient[]> {
    const [senderAccount, receiverAccount] = await Promise.all([
      this.findAccountByPhone(input.senderPhone),

      this.findAccountByPhone(input.receiverPhone),
    ]);

    const recipients = new Map<string, ResolvedRecipient>();

    if (senderAccount) {
      recipients.set(senderAccount, {
        accountId: senderAccount,
        role: 'sender',
      });
    }

    if (receiverAccount && !recipients.has(receiverAccount)) {
      recipients.set(receiverAccount, {
        accountId: receiverAccount,
        role: 'receiver',
      });
    }

    return Array.from(recipients.values());
  }

  private async findAccountByPhone(phoneInput?: string | null): Promise<string | null> {
    const candidates = this.buildPhoneCandidates(phoneInput);

    if (!candidates.length) {
      return null;
    }

    const account = await MobileCustomerAccount.findOne({
      phone: {
        $in: candidates,
      },
      isActive: true,
    })
      .select({
        _id: 1,
        phone: 1,
      })
      .lean<AccountLean>();

    return account?._id ? String(account._id) : null;
  }

  private buildPhoneCandidates(phoneInput?: string | null): string[] {
    const original = String(phoneInput || '').trim();

    const normalized = original.replace(/\D/g, '');

    const candidates = new Set<string>();

    if (!normalized) {
      return [];
    }

    candidates.add(original);
    candidates.add(normalized);

    if (normalized.startsWith('0') && normalized.length === 10) {
      const international = `84${normalized.slice(1)}`;

      candidates.add(international);

      candidates.add(`+${international}`);
    }

    if (normalized.startsWith('84') && normalized.length === 11) {
      candidates.add(`+${normalized}`);

      candidates.add(`0${normalized.slice(2)}`);
    }

    return Array.from(candidates).filter(Boolean);
  }

  private async createAccountNotification(
    input: CreateAccountNotificationInput
  ): Promise<CreateAccountNotificationResult> {
    if (!mongoose.isValidObjectId(input.accountId)) {
      throw new Error('Invalid mobile customer account ID');
    }

    let notification;

    try {
      notification = await MobileNotification.create({
        title: input.title,
        content: input.content,
        type: input.type,

        targetType: input.targetType,

        targetId: input.targetId || '',

        targetCode: input.targetCode || '',

        targetDeviceId: input.targetDeviceId || '',

        audience: 'account',

        recipientAccountId: new mongoose.Types.ObjectId(input.accountId),

        recipientRole: input.recipientRole || null,

        source: input.source,
        eventKey: input.eventKey,

        isActive: true,

        pushResult: {
          status: 'pending',
          attempted: 0,
          success: 0,
          failure: 0,
          invalidTokens: 0,
        },

        sentAt: null,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return {
          status: 'duplicate',
        };
      }

      throw error;
    }

    let pushResult: IMobilePushSendResult;

    try {
      const payload = {
        title: notification.title,
        body: notification.content,
        type: notification.type,

        notificationId: String(notification._id),

        targetType: notification.targetType,

        targetId: notification.targetId,

        targetCode: notification.targetCode,

        targetDeviceId: notification.targetDeviceId,

        source: notification.source,
      };

      pushResult = input.excludedPushDeviceId
        ? await this.pushService.sendToAccountExceptDevice(
            input.accountId,
            input.excludedPushDeviceId,
            payload
          )
        : await this.pushService.sendToAccount(input.accountId, payload);
    } catch (error) {
      console.error('[MOBILE NOTIFICATION] Đã tạo notification nhưng push thất bại:', error);

      pushResult = {
        status: 'failed',
        attempted: 0,
        success: 0,
        failure: 0,
        invalidTokens: 0,
      };
    }

    try {
      await MobileNotification.updateOne(
        {
          _id: notification._id,
        },
        {
          $set: {
            pushResult,
            sentAt: new Date(),
          },
        },
        {
          runValidators: true,
        }
      );
    } catch (error) {
      console.error('[MOBILE NOTIFICATION] Không lưu được kết quả push nghiệp vụ:', error);
    }

    return {
      status: 'created',
      pushResult,
    };
  }
}
