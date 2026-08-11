import bcrypt from 'bcryptjs';
import { Response } from 'express';

import type { CustomerAuthRequest } from '@/middlewares/authenticate-customer-token.middleware';
import { MobileCustomerAccount } from '@/modules/mobile-customer/mobile-customer-account.model';
import { MobileCustomerRefreshToken } from '@/modules/mobile-customer/mobile-customer-refresh-token.model';
import { MobilePushToken } from '@/modules/mobile-customer/mobile-push-token.model';
import Logger from '@/utils/logger';
import {
  MobileCustomerSecurityEventService,
  MobileCustomerSecurityEventType,
} from '@/modules/mobile-customer/mobile-customer-security-event.service';

const getRequestIp = (req: CustomerAuthRequest): string | undefined => {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim();
  }

  if (Array.isArray(forwarded)) {
    return forwarded[0]?.split(',')[0]?.trim();
  }

  return req.ip || req.socket.remoteAddress;
};

const getRequestDeviceId = (req: CustomerAuthRequest): string => {
  const value = req.headers['x-device-id'];

  return String(Array.isArray(value) ? value[0] : value || '').trim();
};

export class MobileCustomerProfileController {
  private readonly securityEventService = new MobileCustomerSecurityEventService();
  getMe = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const account = await this.getAccount(req);

      res.status(200).json({
        success: true,
        message: 'Lấy thông tin tài khoản thành công',
        data: {
          customer: {
            id: String(account._id),
            name: account.name,
            phone: account.phone,
            phoneVerifiedAt: account.phoneVerifiedAt,
            lastLoginAt: account.lastLoginAt,
          },
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  updateMe = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const account = await this.getAccount(req);
      const name = String(req.body.name || '').trim();

      if (!name) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng nhập họ tên',
        });
        return;
      }

      if (name.length > 100) {
        res.status(400).json({
          success: false,
          message: 'Họ tên không được vượt quá 100 ký tự',
        });
        return;
      }

      account.name = name;
      await account.save();

      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin thành công',
        data: {
          customer: {
            id: String(account._id),
            name: account.name,
            phone: account.phone,
          },
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  changePassword = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const account = await this.getAccount(req, true);

      const currentPassword = String(req.body.currentPassword || '');

      const newPassword = String(req.body.newPassword || '');

      const confirmPassword = String(req.body.confirmPassword || '');

      const currentDeviceId = getRequestDeviceId(req);

      if (!currentDeviceId) {
        res.status(400).json({
          success: false,
          message: 'Không xác định được thiết bị hiện tại',
          code: 'DEVICE_ID_REQUIRED',
        });
        return;
      }

      if (!currentPassword) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng nhập mật khẩu hiện tại',
          code: 'CURRENT_PASSWORD_REQUIRED',
        });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({
          success: false,
          message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
          code: 'PASSWORD_TOO_SHORT',
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'Mật khẩu xác nhận không khớp',
          code: 'PASSWORD_CONFIRMATION_MISMATCH',
        });
        return;
      }

      const currentPasswordValid = await bcrypt.compare(currentPassword, account.passwordHash);

      if (!currentPasswordValid) {
        res.status(401).json({
          success: false,
          message: 'Mật khẩu hiện tại không đúng',
          code: 'INVALID_CURRENT_PASSWORD',
        });
        return;
      }

      const reusesCurrentPassword = await bcrypt.compare(newPassword, account.passwordHash);

      if (reusesCurrentPassword) {
        res.status(400).json({
          success: false,
          message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
          code: 'PASSWORD_REUSED',
        });
        return;
      }

      account.passwordHash = await bcrypt.hash(newPassword, 12);

      await account.save();

      const now = new Date();

      /**
       * Đổi mật khẩu chỉ giữ phiên của thiết bị hiện tại.
       * Tất cả thiết bị khác phải đăng nhập lại.
       */
      const revokedSessions = await MobileCustomerRefreshToken.updateMany(
        {
          accountId: account._id,
          deviceId: {
            $ne: currentDeviceId,
          },
          revokedAt: null,
          expiresAt: {
            $gt: now,
          },
        },
        {
          $set: {
            revokedAt: now,
            lastUsedAt: now,
          },
        }
      );

      /**
       * Thiết bị khác đã bị thu hồi phiên cũng không
       * được tiếp tục nhận push notification.
       */
      const deactivatedPushTokens = await MobilePushToken.updateMany(
        {
          accountId: account._id,
          deviceId: {
            $ne: currentDeviceId,
          },
          isActive: true,
        },
        {
          $set: {
            isActive: false,
            deactivatedAt: now,
          },
        }
      );

      await this.securityEventService.recordSafely({
        accountId: account._id,
        type: MobileCustomerSecurityEventType.PASSWORD_CHANGED,
        deviceId: currentDeviceId,
        platform: String(req.headers['x-device-platform'] || ''),
        userAgent: req.headers['user-agent'],
        ip: getRequestIp(req),
        metadata: {
          revokedSessionCount: Number(revokedSessions.modifiedCount || 0),
        },
      });

      res.status(200).json({
        success: true,
        message: 'Đổi mật khẩu thành công',
        data: {
          revokedSessionCount: Number(revokedSessions.modifiedCount || 0),
          deactivatedPushTokenCount: Number(deactivatedPushTokens.modifiedCount || 0),
          currentDeviceKept: true,
        },
      });
    } catch (error) {
      Logger.error('Không thể đổi mật khẩu tài khoản mobile', {
        accountId: req.customer?.accountId || req.customer?.id,
        error: error instanceof Error ? error.message : error,
      });

      this.handleError(error, res);
    }
  };

  private async getAccount(req: CustomerAuthRequest, withPassword = false) {
    const accountId = req.customer?.accountId || req.customer?.id;

    if (!accountId) {
      throw new Error('UNAUTHORIZED');
    }

    const query = MobileCustomerAccount.findById(accountId);

    if (withPassword) {
      query.select('+passwordHash');
    }

    const account = await query;

    if (!account || !account.isActive) {
      throw new Error('UNAUTHORIZED');
    }

    return account;
  }

  private handleError(error: unknown, res: Response): void {
    const unauthorized = error instanceof Error && error.message === 'UNAUTHORIZED';

    res.status(unauthorized ? 401 : 500).json({
      success: false,
      message: unauthorized
        ? 'Customer not authenticated'
        : error instanceof Error
          ? error.message
          : 'Không thể xử lý thông tin tài khoản',
    });
  }
}
