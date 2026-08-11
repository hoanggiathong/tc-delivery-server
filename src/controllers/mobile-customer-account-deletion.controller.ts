import type { Request, Response } from 'express';

import type { CustomerAuthRequest } from '@/middlewares/authenticate-customer-token.middleware';
import type { MobileCustomerPlatform } from '@/modules/mobile-customer/mobile-customer-refresh-token.model';
import type { IMobileCustomerSessionContext } from '@/modules/mobile-customer/mobile-customer-auth.service';
import { MobileCustomerOtpError } from '@/modules/mobile-customer/mobile-customer-otp.service';
import {
  MobileCustomerAccountDeletionError,
  MobileCustomerAccountDeletionService,
} from '@/modules/mobile-customer/mobile-customer-account-deletion.service';

const getRequestIp = (req: Request): string | undefined => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0]?.split(',')[0]?.trim();
  }
  return req.ip || req.socket.remoteAddress;
};

const normalizePlatform = (value: unknown): MobileCustomerPlatform => {
  const platform = String(value || '')
    .trim()
    .toLowerCase();
  return platform === 'android' || platform === 'ios' || platform === 'web' ? platform : 'unknown';
};

const getSessionContext = (req: Request): IMobileCustomerSessionContext => {
  const header = req.headers['x-device-id'];
  return {
    deviceId: String(
      req.body?.deviceId ||
        (Array.isArray(header) ? header[0] : header) ||
        'account-deletion-public'
    ).trim(),
    platform: normalizePlatform(req.body?.platform || req.headers['x-device-platform']),
    userAgent: req.headers['user-agent'],
    ip: getRequestIp(req),
  };
};

export class MobileCustomerAccountDeletionController {
  constructor(private readonly service = new MobileCustomerAccountDeletionService()) {}

  sendRequestOtp = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.customer?.accountId;
      if (!accountId) {
        throw new MobileCustomerAccountDeletionError(
          'Customer not authenticated',
          401,
          'ACCESS_TOKEN_REQUIRED'
        );
      }

      const result = await this.service.sendRequestOtp(
        accountId,
        req.body.currentPassword,
        getSessionContext(req)
      );

      res.status(200).json({
        success: true,
        message: 'Đã gửi OTP xác nhận xóa tài khoản',
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể gửi OTP xác nhận');
    }
  };

  requestDeletion = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.customer?.accountId;
      if (!accountId) {
        throw new MobileCustomerAccountDeletionError(
          'Customer not authenticated',
          401,
          'ACCESS_TOKEN_REQUIRED'
        );
      }

      const result = await this.service.requestDeletion(
        accountId,
        {
          currentPassword: req.body.currentPassword,
          otp: req.body.otp,
          confirmation: req.body.confirmation,
          reason: req.body.reason,
        },
        getSessionContext(req)
      );

      res.status(200).json({
        success: true,
        message: 'Đã tạo yêu cầu xóa tài khoản',
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể tạo yêu cầu xóa tài khoản');
    }
  };

  getStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.getStatusByToken(req.body.deletionToken);
      res.status(200).json({
        success: true,
        message: 'Lấy trạng thái xóa tài khoản thành công',
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể tải trạng thái xóa tài khoản');
    }
  };

  sendCancelOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.sendCancelOtp(
        req.body.deletionToken,
        getSessionContext(req)
      );
      res.status(200).json({
        success: true,
        message: 'Đã gửi OTP hủy yêu cầu xóa',
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể gửi OTP hủy yêu cầu xóa');
    }
  };

  cancelDeletion = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.cancelDeletion(
        req.body.deletionToken,
        req.body.otp,
        getSessionContext(req)
      );
      res.status(200).json({
        success: true,
        message: 'Đã hủy yêu cầu xóa tài khoản',
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể hủy yêu cầu xóa tài khoản');
    }
  };

  sendRecoveryOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.sendRecoveryOtp(req.body.phone, getSessionContext(req));
      res.status(200).json({
        success: true,
        message: 'Nếu số điện thoại có yêu cầu xóa còn hiệu lực, OTP sẽ được gửi',
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể gửi OTP khôi phục');
    }
  };

  cancelByRecoveryOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.cancelDeletionByPhone(
        req.body.phone,
        req.body.otp,
        getSessionContext(req)
      );
      res.status(200).json({
        success: true,
        message: 'Đã hủy yêu cầu xóa tài khoản',
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể hủy yêu cầu xóa tài khoản');
    }
  };

  private handleError(error: unknown, res: Response, fallback: string): void {
    if (
      error instanceof MobileCustomerAccountDeletionError ||
      error instanceof MobileCustomerOtpError
    ) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : fallback,
    });
  }
}
