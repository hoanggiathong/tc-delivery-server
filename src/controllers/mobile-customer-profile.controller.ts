import bcrypt from 'bcryptjs';
import { Response } from 'express';

import type { CustomerAuthRequest } from '@/middlewares/authenticate-customer-token.middleware';
import { MobileCustomerAccount } from '@/modules/mobile-customer/mobile-customer-account.model';
import { MobileCustomerRefreshToken } from '@/modules/mobile-customer/mobile-customer-refresh-token.model';
import { MobilePushToken } from '@/modules/mobile-customer/mobile-push-token.model';
import {
  MobileCustomerSecurityEventService,
  MobileCustomerSecurityEventType,
} from '@/modules/mobile-customer/mobile-customer-security-event.service';
import { Customer } from '@/models/customer.model';
import Logger from '@/utils/logger';

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

const buildPhoneCandidates = (input: string): string[] => {
  const raw = String(input || '').trim();

  const digits = raw.replace(/\D/g, '');

  const values = new Set<string>();

  if (raw) {
    values.add(raw);
  }

  if (!digits) {
    return [...values];
  }

  values.add(digits);

  if (digits.startsWith('84') && digits.length >= 10) {
    const local = `0${digits.slice(2)}`;

    values.add(local);
    values.add(`+${digits}`);
  } else if (digits.startsWith('0')) {
    const intl = `84${digits.slice(1)}`;

    values.add(intl);
    values.add(`+${intl}`);
  }

  return [...values];
};

interface SerializedBank {
  id: string;
  name: string;
  bankName: string;
  bankAccount: string;
  bankBranch: string;
  bankAddress: string;
  qrCodeUrl: string;
}

interface SerializedIdentityImage {
  id: string;
  url: string;
  rotate: number;
}

export class MobileCustomerProfileController {
  private readonly securityEventService = new MobileCustomerSecurityEventService();

  getMe = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const account = await this.getAccount(req);

      const profile = await this.buildProfilePayload(account);

      res.status(200).json({
        success: true,
        message: 'Lấy thông tin tài khoản thành công',
        data: profile,
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
          code: 'PROFILE_NAME_REQUIRED',
        });
        return;
      }

      if (name.length > 100) {
        res.status(400).json({
          success: false,
          message: 'Họ tên không được vượt quá 100 ký tự',
          code: 'PROFILE_NAME_TOO_LONG',
        });
        return;
      }

      /**
       * Chỉ cập nhật tên account mobile.
       *
       * CCCD, địa chỉ nghiệp vụ và ngân hàng đang thuộc Customer
       * và chỉ hiển thị read-only ở mobile phase này.
       */
      account.name = name;

      await account.save();

      const profile = await this.buildProfilePayload(account);

      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin thành công',
        data: profile,
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

  private async buildProfilePayload(
    account: Awaited<ReturnType<MobileCustomerProfileController['getAccount']>>
  ) {
    const businessCustomer = await this.findBusinessCustomer(account.phone);

    const customerJson = businessCustomer
      ? (businessCustomer.toJSON() as Record<string, any>)
      : null;

    const bank = this.serializeBank(customerJson?.bankId);

    const identityImages = this.serializeImages(customerJson?.images);

    const identity = customerJson
      ? {
          name: String(customerJson.identityCardName || ''),

          number: String(customerJson.identityCardNumber || ''),

          issuedDate: customerJson.identityCardIssuedDate || null,

          address: String(customerJson.address || ''),

          images: identityImages,
        }
      : null;

    const accountPayload = {
      id: String(account._id),

      name: account.name,

      phone: account.phone,

      email: account.email || null,

      avatar: account.avatar || null,

      phoneVerifiedAt: account.phoneVerifiedAt || null,

      lastLoginAt: account.lastLoginAt || null,

      createdAt: account.createdAt || null,

      updatedAt: account.updatedAt || null,
    };

    const businessPayload = customerJson
      ? {
          id: String(customerJson.id || customerJson._id || ''),

          name: String(customerJson.name || ''),

          phone: String(customerJson.phone || ''),

          address: String(customerJson.address || ''),

          updatedAt: customerJson.updatedAt || null,
        }
      : null;

    /**
     * `customer` giữ backward compatibility cho app cũ.
     * App mới dùng account/businessCustomer/identity/bank.
     */
    return {
      account: accountPayload,

      businessCustomer: businessPayload,

      identity,

      bank,

      customer: {
        ...accountPayload,

        address: businessPayload?.address || '',

        identityCardName: identity?.name || '',

        identityCardNumber: identity?.number || '',

        identityCardIssuedDate: identity?.issuedDate || null,

        images: identityImages,

        bankId: bank,

        bank,
      },
    };
  }

  private async findBusinessCustomer(phone: string) {
    const populateBank = {
      path: 'bankId',

      select: [
        '_id',
        'name',
        'bankName',
        'bankAccount',
        'bankBranch',
        'bankAddress',
        'qrCodeUrl',
      ].join(' '),
    };

    /**
     * Ưu tiên exact match để tránh chọn nhầm
     * nếu DB lịch sử có nhiều format phone.
     */
    let customer = await Customer.findOne({
      phone,
    }).populate(populateBank);

    if (customer) {
      return customer;
    }

    const candidates = buildPhoneCandidates(phone);

    if (!candidates.length) {
      return null;
    }

    customer = await Customer.findOne({
      phone: {
        $in: candidates,
      },
    }).populate(populateBank);

    return customer;
  }

  private serializeBank(value: unknown): SerializedBank | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const bank = value as Record<string, unknown>;

    const bankAccount = String(bank.bankAccount || '').trim();

    const bankName = String(bank.bankName || '').trim();

    const accountName = String(bank.name || '').trim();

    if (!bankAccount && !bankName && !accountName) {
      return null;
    }

    return {
      id: String(bank.id || bank._id || ''),

      name: accountName,

      bankName,

      bankAccount,

      bankBranch: String(bank.bankBranch || ''),

      bankAddress: String(bank.bankAddress || ''),

      qrCodeUrl: String(bank.qrCodeUrl || ''),
    };
  }

  private serializeImages(value: unknown): SerializedIdentityImage[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item: any) => ({
        id: String(item?.id || item?._id || ''),

        url: String(item?.url || ''),

        rotate: Number(item?.rotate || 0),
      }))
      .filter(item => Boolean(item.url));
  }

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

      code: unauthorized ? 'ACCESS_TOKEN_REQUIRED' : 'PROFILE_ERROR',

      message: unauthorized
        ? 'Customer not authenticated'
        : error instanceof Error
          ? error.message
          : 'Không thể xử lý thông tin tài khoản',
    });
  }
}
