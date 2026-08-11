import { Response } from 'express';
import mongoose from 'mongoose';

import type { CustomerAuthRequest } from '@/middlewares/authenticate-customer-token.middleware';

import {
  MobilePushToken,
  type MobilePushPlatform,
} from '@/modules/mobile-customer/mobile-push-token.model';

const ALLOWED_PLATFORMS: ReadonlySet<MobilePushPlatform> = new Set(['android', 'ios', 'web']);

const normalizeOptionalString = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
};

const normalizeToken = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const normalizePlatform = (value: unknown): MobilePushPlatform | null => {
  const platform = String(value || '')
    .trim()
    .toLowerCase() as MobilePushPlatform;

  return ALLOWED_PLATFORMS.has(platform) ? platform : null;
};

export class MobilePushTokenController {
  private getAuthenticatedCustomer(req: CustomerAuthRequest): {
    accountId: string;
    phone: string;
  } {
    const accountId = req.customer?.accountId || req.customer?.id;

    const phone = req.customer?.phone?.trim();

    if (!accountId || !mongoose.isValidObjectId(accountId) || !phone) {
      throw new Error('UNAUTHORIZED');
    }

    return {
      accountId,
      phone,
    };
  }

  private isMongoDuplicateKeyError = (error: unknown): error is { code: number } => {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    );
  };

  registerToken = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const { accountId, phone } = this.getAuthenticatedCustomer(req);

      const token = normalizeToken(req.body.token);

      const platform = normalizePlatform(req.body.platform);

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Push token is required',
        });

        return;
      }

      if (!platform) {
        res.status(400).json({
          success: false,
          message: 'Push platform is invalid',
        });

        return;
      }

      const deviceId = normalizeOptionalString(req.body.deviceId, 200);

      const deviceName = normalizeOptionalString(req.body.deviceName, 200);

      const appVersion = normalizeOptionalString(req.body.appVersion, 50);

      const osVersion = normalizeOptionalString(req.body.osVersion, 100);

      /**
       * FCM token là duy nhất trên toàn hệ thống.
       *
       * Khi token được cấp lại cho tài khoản hoặc thiết bị,
       * document tương ứng sẽ được cập nhật và kích hoạt lại.
       */
      let pushToken;

      try {
        pushToken = await MobilePushToken.findOneAndUpdate(
          {
            token,
          },
          {
            $set: {
              accountId: new mongoose.Types.ObjectId(accountId),
              phone,
              token,
              platform,
              deviceId,
              deviceName,
              appVersion,
              osVersion,
              isActive: true,
              lastRegisteredAt: new Date(),
              deactivatedAt: null,
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            runValidators: true,
          }
        ).lean();
      } catch (error) {
        if (!this.isMongoDuplicateKeyError(error)) {
          throw error;
        }

        pushToken = await MobilePushToken.findOneAndUpdate(
          {
            token,
          },
          {
            $set: {
              accountId: new mongoose.Types.ObjectId(accountId),
              phone,
              platform,
              deviceId,
              deviceName,
              appVersion,
              osVersion,
              isActive: true,
              lastRegisteredAt: new Date(),
              deactivatedAt: null,
            },
          },
          {
            new: true,
            runValidators: true,
          }
        ).lean();
      }

      /**
       * Trường hợp cùng một thiết bị đã có token cũ:
       * vô hiệu hóa token cũ để tránh gửi trùng.
       */
      if (deviceId) {
        await MobilePushToken.updateMany(
          {
            _id: {
              $ne: pushToken?._id,
            },

            accountId: new mongoose.Types.ObjectId(accountId),

            deviceId,
            isActive: true,
          },
          {
            $set: {
              isActive: false,
              deactivatedAt: new Date(),
            },
          }
        );
      }

      res.status(200).json({
        success: true,
        message: 'Push token registered successfully',
        data: {
          pushToken: {
            id: pushToken ? String(pushToken._id) : null,

            platform,
            deviceId,
            isActive: true,
          },
        },
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể đăng ký push token');
    }
  };

  refreshToken = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const { accountId, phone } = this.getAuthenticatedCustomer(req);

      const oldToken = normalizeToken(req.body.oldToken);

      const newToken = normalizeToken(req.body.newToken);

      const platform = normalizePlatform(req.body.platform);

      if (!oldToken) {
        res.status(400).json({
          success: false,
          message: 'Old push token is required',
        });

        return;
      }

      if (!newToken) {
        res.status(400).json({
          success: false,
          message: 'New push token is required',
        });

        return;
      }

      if (!platform) {
        res.status(400).json({
          success: false,
          message: 'Push platform is invalid',
        });

        return;
      }

      if (oldToken === newToken) {
        await MobilePushToken.updateOne(
          {
            accountId: new mongoose.Types.ObjectId(accountId),
            token: oldToken,
          },
          {
            $set: {
              phone,
              platform,
              isActive: true,
              lastRegisteredAt: new Date(),
              deactivatedAt: null,
            },
          }
        );

        res.status(200).json({
          success: true,
          message: 'Push token is already current',
        });

        return;
      }

      const deviceId = normalizeOptionalString(req.body.deviceId, 200);

      const deviceName = normalizeOptionalString(req.body.deviceName, 200);

      const appVersion = normalizeOptionalString(req.body.appVersion, 50);

      const osVersion = normalizeOptionalString(req.body.osVersion, 100);

      const now = new Date();

      /**
       * Vô hiệu hóa token cũ trước.
       */
      await MobilePushToken.updateOne(
        {
          accountId: new mongoose.Types.ObjectId(accountId),
          token: oldToken,
        },
        {
          $set: {
            isActive: false,
            deactivatedAt: now,
          },
        }
      );

      /**
       * Upsert token mới.
       */
      const refreshedToken = await MobilePushToken.findOneAndUpdate(
        {
          token: newToken,
        },
        {
          $set: {
            accountId: new mongoose.Types.ObjectId(accountId),

            phone,
            token: newToken,
            platform,

            deviceId,
            deviceName,
            appVersion,
            osVersion,

            isActive: true,
            lastRegisteredAt: now,
            deactivatedAt: null,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      ).lean();

      if (deviceId) {
        await MobilePushToken.updateMany(
          {
            _id: {
              $ne: refreshedToken?._id,
            },

            accountId: new mongoose.Types.ObjectId(accountId),

            deviceId,
            isActive: true,
          },
          {
            $set: {
              isActive: false,
              deactivatedAt: now,
            },
          }
        );
      }

      res.status(200).json({
        success: true,
        message: 'Push token refreshed successfully',
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể cập nhật push token');
    }
  };

  unregisterToken = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const { accountId } = this.getAuthenticatedCustomer(req);

      const token = normalizeToken(req.body.token);

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Push token is required',
        });

        return;
      }

      const result = await MobilePushToken.updateOne(
        {
          accountId: new mongoose.Types.ObjectId(accountId),

          token,
          isActive: true,
        },
        {
          $set: {
            isActive: false,
            deactivatedAt: new Date(),
          },
        }
      );

      res.status(200).json({
        success: true,
        message: 'Push token unregistered successfully',
        data: {
          deactivated: result.modifiedCount > 0,
        },
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể hủy push token');
    }
  };

  unregisterAllTokens = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const { accountId } = this.getAuthenticatedCustomer(req);

      const result = await MobilePushToken.updateMany(
        {
          accountId: new mongoose.Types.ObjectId(accountId),

          isActive: true,
        },
        {
          $set: {
            isActive: false,
            deactivatedAt: new Date(),
          },
        }
      );

      res.status(200).json({
        success: true,
        message: 'All push tokens unregistered successfully',
        data: {
          deactivatedCount: result.modifiedCount,
        },
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể hủy toàn bộ push token');
    }
  };

  getMyTokens = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const { accountId } = this.getAuthenticatedCustomer(req);

      const tokens = await MobilePushToken.find({
        accountId: new mongoose.Types.ObjectId(accountId),
      })
        .select(
          [
            '_id',
            'platform',
            'deviceId',
            'deviceName',
            'appVersion',
            'osVersion',
            'isActive',
            'lastRegisteredAt',
            'deactivatedAt',
            'createdAt',
            'updatedAt',
          ].join(' ')
        )
        .sort({
          lastRegisteredAt: -1,
        })
        .lean();

      res.status(200).json({
        success: true,
        message: 'Push tokens retrieved successfully',
        data: {
          tokens: tokens.map(item => ({
            id: String(item._id),
            platform: item.platform,
            deviceId: item.deviceId ?? null,
            deviceName: item.deviceName ?? null,
            appVersion: item.appVersion ?? null,
            osVersion: item.osVersion ?? null,
            isActive: item.isActive,
            lastRegisteredAt: item.lastRegisteredAt,
            deactivatedAt: item.deactivatedAt ?? null,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          })),
        },
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể lấy danh sách push token');
    }
  };

  private handleError(error: unknown, res: Response, fallbackMessage: string): void {
    const isUnauthorized = error instanceof Error && error.message === 'UNAUTHORIZED';

    console.error('[MOBILE PUSH TOKEN ERROR]', error);

    res.status(isUnauthorized ? 401 : 500).json({
      success: false,

      message: isUnauthorized
        ? 'Customer not authenticated'
        : error instanceof Error
          ? error.message
          : fallbackMessage,
    });
  }
}
