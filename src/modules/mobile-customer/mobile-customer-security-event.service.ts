import mongoose, { type Types } from 'mongoose';

import { MobileCustomerRefreshToken } from '@/modules/mobile-customer/mobile-customer-refresh-token.model';
import {
  MobileCustomerSecurityEvent,
  MobileCustomerSecurityEventType,
  type MobileCustomerSecurityPlatform,
} from '@/modules/mobile-customer/mobile-customer-security-event.model';
import Logger from '@/utils/logger';

export interface RecordMobileCustomerSecurityEventInput {
  accountId: string | Types.ObjectId;
  type: MobileCustomerSecurityEventType;

  deviceId?: string | null;
  targetDeviceId?: string | null;
  eventKey?: string;

  platform?: string | null;
  ip?: string | null;
  userAgent?: string | null;

  metadata?: Record<string, unknown> | null;
}

export interface MobileCustomerSecurityEventResponse {
  id: string;
  type: MobileCustomerSecurityEventType;

  deviceId?: string | null;
  targetDeviceId?: string | null;

  platform: MobileCustomerSecurityPlatform;
  deviceName: string;
  ipAddress?: string | null;

  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface MobileCustomerSecurityEventListResult {
  data: MobileCustomerSecurityEventResponse[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface NewDeviceLoginRecordResult {
  created: boolean;
  createdAt?: Date;
  deviceName?: string;
}

const SECURITY_EVENT_RETENTION_DAYS = 180;

const KNOWN_DEVICE_EVENT_TYPES = [
  MobileCustomerSecurityEventType.ACCOUNT_REGISTERED,
  MobileCustomerSecurityEventType.LOGIN_PASSWORD_SUCCESS,
  MobileCustomerSecurityEventType.LOGIN_OTP_SUCCESS,
  MobileCustomerSecurityEventType.NEW_DEVICE_LOGIN,
];

const normalizePlatform = (value?: string | null): MobileCustomerSecurityPlatform => {
  const platform = String(value || '')
    .trim()
    .toLowerCase();

  if (platform === 'android' || platform === 'ios' || platform === 'web') {
    return platform;
  }

  return 'unknown';
};

const buildDeviceName = (
  platform: MobileCustomerSecurityPlatform,
  userAgent?: string | null
): string => {
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

  return 'Thiết bị';
};

const maskIpAddress = (value?: string | null): string | null => {
  const ip = String(value || '')
    .trim()
    .replace(/^::ffff:/, '');

  if (!ip) {
    return null;
  }

  const ipv4Parts = ip.split('.');

  if (ipv4Parts.length === 4 && ipv4Parts.every(part => /^\d{1,3}$/.test(part))) {
    return [ipv4Parts[0], ipv4Parts[1], ipv4Parts[2], '***'].join('.');
  }

  if (ip.includes(':')) {
    const groups = ip.split(':').filter(Boolean).slice(0, 4);

    return groups.length ? `${groups.join(':')}:****` : 'IPv6';
  }

  return null;
};

const normalizeLimit = (value: unknown): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.min(Math.max(Math.floor(parsed), 1), 50);
};

const normalizePage = (value: unknown): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.max(Math.floor(parsed), 1);
};

const isDuplicateKeyError = (error: unknown): boolean => {
  const value = error as {
    code?: unknown;
  };

  return Number(value?.code) === 11000;
};

export class MobileCustomerSecurityEventService {
  async recordSafely(input: RecordMobileCustomerSecurityEventInput): Promise<void> {
    try {
      await this.createEvent(input);
    } catch (error) {
      /**
       * Lỗi audit không được làm hỏng đăng nhập,
       * đổi mật khẩu hoặc thao tác thu hồi phiên.
       */
      Logger.error('Không ghi được lịch sử bảo mật mobile', {
        accountId: String(input.accountId),
        type: input.type,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Kiểm tra trước khi tạo refresh token mới.
   *
   * Ưu tiên lịch sử refresh session, sau đó đến
   * security event để nhận diện thiết bị đã từng dùng.
   */
  async isKnownDevice(
    accountIdInput: string | Types.ObjectId,
    deviceIdInput: string
  ): Promise<boolean> {
    try {
      const accountId =
        accountIdInput instanceof mongoose.Types.ObjectId
          ? accountIdInput
          : new mongoose.Types.ObjectId(String(accountIdInput));

      const deviceId = String(deviceIdInput || '').trim();

      if (!deviceId) {
        return true;
      }

      const [existingRefreshSession, existingSecurityEvent] = await Promise.all([
        MobileCustomerRefreshToken.exists({
          accountId,
          deviceId,
        }),

        MobileCustomerSecurityEvent.exists({
          accountId,
          deviceId,
          type: {
            $in: KNOWN_DEVICE_EVENT_TYPES,
          },
        }),
      ]);

      return Boolean(existingRefreshSession || existingSecurityEvent);
    } catch (error) {
      /**
       * Không xác định được thì không phát cảnh báo,
       * tránh báo nhầm hoặc làm hỏng đăng nhập.
       */
      Logger.error('Không kiểm tra được thiết bị đã biết', {
        accountId: String(accountIdInput),
        deviceId: String(deviceIdInput || ''),
        error: error instanceof Error ? error.message : error,
      });

      return true;
    }
  }

  /**
   * Claim sự kiện đăng nhập thiết bị mới bằng
   * eventKey unique để chống trùng khi có hai
   * request đăng nhập đồng thời.
   */
  async recordNewDeviceLoginOnceSafely(
    input: Omit<RecordMobileCustomerSecurityEventInput, 'type' | 'eventKey'>
  ): Promise<NewDeviceLoginRecordResult> {
    const accountId =
      input.accountId instanceof mongoose.Types.ObjectId
        ? input.accountId
        : new mongoose.Types.ObjectId(String(input.accountId));

    const deviceId = String(input.deviceId || '').trim();

    if (!deviceId) {
      return {
        created: false,
      };
    }

    const eventKey = `security:new-device:${String(accountId)}:${deviceId}`;

    try {
      const document = await this.createEvent({
        ...input,
        accountId,
        type: MobileCustomerSecurityEventType.NEW_DEVICE_LOGIN,
        eventKey,
      });

      return {
        created: true,
        createdAt: document.createdAt,
        deviceName: document.deviceName,
      };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return {
          created: false,
        };
      }

      Logger.error('Không ghi được cảnh báo đăng nhập thiết bị mới', {
        accountId: String(accountId),
        deviceId,
        error: error instanceof Error ? error.message : error,
      });

      return {
        created: false,
      };
    }
  }

  async list(
    accountId: string,
    pageInput: unknown,
    limitInput: unknown
  ): Promise<MobileCustomerSecurityEventListResult> {
    if (!mongoose.isValidObjectId(accountId)) {
      throw new Error('Invalid mobile customer account ID');
    }

    const page = normalizePage(pageInput);

    const limit = normalizeLimit(limitInput);

    const where = {
      accountId: new mongoose.Types.ObjectId(accountId),
    };

    const [documents, total] = await Promise.all([
      MobileCustomerSecurityEvent.find(where)
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .select({
          type: 1,
          deviceId: 1,
          targetDeviceId: 1,
          platform: 1,
          deviceName: 1,
          ipAddress: 1,
          metadata: 1,
          createdAt: 1,
        })
        .lean(),

      MobileCustomerSecurityEvent.countDocuments(where),
    ]);

    return {
      data: documents.map(document => ({
        id: String(document._id),
        type: document.type,

        deviceId: document.deviceId || null,

        targetDeviceId: document.targetDeviceId || null,

        platform: document.platform,
        deviceName: document.deviceName,

        ipAddress: document.ipAddress || null,

        metadata: (document.metadata as Record<string, unknown> | null | undefined) || null,

        createdAt: document.createdAt,
      })),

      page,
      limit,
      total,
      hasMore: page * limit < total,
    };
  }

  private async createEvent(input: RecordMobileCustomerSecurityEventInput) {
    const accountId =
      input.accountId instanceof mongoose.Types.ObjectId
        ? input.accountId
        : new mongoose.Types.ObjectId(String(input.accountId));

    const platform = normalizePlatform(input.platform);

    const expiresAt = new Date(Date.now() + SECURITY_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    return MobileCustomerSecurityEvent.create({
      accountId,
      type: input.type,

      deviceId: String(input.deviceId || '').trim() || null,

      targetDeviceId: String(input.targetDeviceId || '').trim() || null,

      ...(input.eventKey
        ? {
            eventKey: String(input.eventKey).trim(),
          }
        : {}),

      platform,

      deviceName: buildDeviceName(platform, input.userAgent),

      ipAddress: maskIpAddress(input.ip),

      userAgent:
        String(input.userAgent || '')
          .trim()
          .slice(0, 500) || null,

      metadata: input.metadata || null,
      expiresAt,
    });
  }
}

export { MobileCustomerSecurityEventType };
