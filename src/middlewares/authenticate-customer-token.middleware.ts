import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import {
  MobileCustomerAccount,
  MobileCustomerDeletionStatus,
} from '@/modules/mobile-customer/mobile-customer-account.model';
import { MobileCustomerRefreshToken } from '@/modules/mobile-customer/mobile-customer-refresh-token.model';

interface CustomerJwtPayload {
  accountId?: string;
  customerId?: string;
  phone?: string;
  name?: string;
  tokenType?: string;
  deviceId?: string;
  iat?: number;
  exp?: number;
}

export interface CustomerAuthRequest extends Request {
  customer?: {
    id: string;
    accountId: string;
    phone: string;
    name?: string;
  };
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return secret;
};

const sendUnauthorized = (
  res: Response,
  message: string,
  code: string,
  data?: Record<string, unknown>
): void => {
  res.status(401).json({
    success: false,
    message,
    code,
    ...(data ? { data } : {}),
  });
};

export const authenticateCustomerToken = async (
  req: CustomerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!token) {
      sendUnauthorized(res, 'Customer not authenticated', 'ACCESS_TOKEN_REQUIRED');
      return;
    }

    const decoded = jwt.verify(token, getJwtSecret()) as CustomerJwtPayload;

    const accountId = decoded.accountId;
    const validTokenTypes = new Set([
      'MOBILE_CUSTOMER_ACCESS',
      // Cho phép token cũ trong giai đoạn deploy chuyển tiếp.
      'MOBILE_CUSTOMER',
    ]);

    if (!accountId || !decoded.tokenType || !validTokenTypes.has(decoded.tokenType)) {
      sendUnauthorized(res, 'Invalid customer token', 'INVALID_ACCESS_TOKEN');
      return;
    }

    const account = await MobileCustomerAccount.findById(accountId)
      .select('_id phone name isActive deletionStatus scheduledDeletionAt')
      .lean<{
        _id: unknown;
        phone: string;
        name: string;
        isActive: boolean;
        deletionStatus?: MobileCustomerDeletionStatus;
        scheduledDeletionAt?: Date | null;
      }>();

    if (!account) {
      sendUnauthorized(res, 'Customer account not found', 'MOBILE_ACCOUNT_NOT_FOUND');
      return;
    }

    if (account.deletionStatus === MobileCustomerDeletionStatus.PENDING) {
      sendUnauthorized(res, 'Tài khoản đang chờ xóa', 'ACCOUNT_PENDING_DELETION', {
        scheduledDeletionAt: account.scheduledDeletionAt || null,
      });
      return;
    }

    if (account.deletionStatus === MobileCustomerDeletionStatus.COMPLETED) {
      sendUnauthorized(res, 'Tài khoản đã được xóa', 'ACCOUNT_DELETED');
      return;
    }

    if (!account.isActive) {
      sendUnauthorized(res, 'Customer account not found or disabled', 'MOBILE_ACCOUNT_DISABLED');
      return;
    }

    const tokenDeviceId = String(decoded.deviceId || '').trim();

    /*
     * Token mới có deviceId và được kiểm tra với phiên refresh đang hoạt động.
     * Token cũ không có deviceId vẫn được chấp nhận trong giai đoạn chuyển tiếp.
     */
    if (tokenDeviceId) {
      const headerDeviceId = req.headers['x-device-id'];
      const requestDeviceId = String(
        Array.isArray(headerDeviceId) ? headerDeviceId[0] : headerDeviceId || ''
      ).trim();

      if (!requestDeviceId || requestDeviceId !== tokenDeviceId) {
        sendUnauthorized(
          res,
          'Access token does not belong to this device',
          'ACCESS_TOKEN_DEVICE_MISMATCH'
        );
        return;
      }

      const activeSession = await MobileCustomerRefreshToken.exists({
        accountId,
        deviceId: tokenDeviceId,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      });

      if (!activeSession) {
        sendUnauthorized(res, 'Device session has been revoked', 'DEVICE_SESSION_REVOKED');
        return;
      }
    }

    req.customer = {
      id: String(account._id),
      accountId: String(account._id),
      phone: account.phone,
      name: account.name,
    };

    next();
  } catch (error) {
    const errorName = error instanceof Error ? error.name : '';

    if (errorName === 'TokenExpiredError') {
      sendUnauthorized(res, 'Customer access token expired', 'ACCESS_TOKEN_EXPIRED');
      return;
    }

    sendUnauthorized(res, 'Invalid customer access token', 'INVALID_ACCESS_TOKEN');
  }
};
