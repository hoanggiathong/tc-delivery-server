import crypto from 'crypto';
import { Request, Response } from 'express';

import {
  MobileCustomerAuthError,
  MobileCustomerAuthService,
  MobileCustomerOtpError,
  type IMobileCustomerSessionContext,
} from '@/modules/mobile-customer/mobile-customer-auth.service';
import { MobileCustomerOtpService } from '@/modules/mobile-customer/mobile-customer-otp.service';
import type { MobileCustomerPlatform } from '@/modules/mobile-customer/mobile-customer-refresh-token.model';
import type { CustomerAuthRequest } from '@/middlewares/authenticate-customer-token.middleware';

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

  if (platform === 'android' || platform === 'ios' || platform === 'web') {
    return platform;
  }

  return 'unknown';
};

const buildLegacyDeviceId = (req: Request): string => {
  const source = [req.headers['user-agent'], getRequestIp(req)].filter(Boolean).join('|');

  return `legacy-${crypto
    .createHash('sha256')
    .update(source || 'unknown-device')
    .digest('hex')
    .slice(0, 32)}`;
};

const getSessionContext = (req: Request): IMobileCustomerSessionContext => {
  const headerDeviceId = req.headers['x-device-id'];
  const bodyDeviceId = req.body?.deviceId;
  const deviceId = String(
    bodyDeviceId ||
      (Array.isArray(headerDeviceId) ? headerDeviceId[0] : headerDeviceId) ||
      buildLegacyDeviceId(req)
  ).trim();

  return {
    deviceId,
    platform: normalizePlatform(req.body?.platform || req.headers['x-device-platform']),
    userAgent: req.headers['user-agent'],
    ip: getRequestIp(req),
  };
};

export class MobileCustomerAuthController {
  private readonly otpService = new MobileCustomerOtpService();
  private readonly authService = new MobileCustomerAuthService(this.otpService);

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.register(
        {
          name: req.body.name,
          phone: req.body.phone,
          password: req.body.password,
          confirmPassword: req.body.confirmPassword,
          otp: req.body.otp,
          acceptedTerms: Boolean(req.body.acceptedTerms),
        },
        getSessionContext(req)
      );

      res.status(201).json({
        success: true,
        message: 'Đăng ký thành công',
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, 'Đăng ký thất bại');
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.loginWithPassword(
        req.body.phone,
        req.body.password,
        getSessionContext(req)
      );

      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, 'Đăng nhập thất bại');
    }
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.refreshSession(
        req.body.refreshToken,
        getSessionContext(req)
      );

      res.status(200).json({
        success: true,
        message: 'Đã gia hạn phiên đăng nhập',
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể gia hạn phiên đăng nhập');
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.authService.logout(req.body.refreshToken, getSessionContext(req));

      res.status(200).json({
        success: true,
        message: 'Đăng xuất thành công',
      });
    } catch (error) {
      this.handleError(error, res, 'Đăng xuất thất bại');
    }
  };

  getSessions = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.customer?.accountId;

      if (!accountId) {
        throw new MobileCustomerAuthError(
          'Customer not authenticated',
          401,
          'ACCESS_TOKEN_REQUIRED'
        );
      }

      const sessions = await this.authService.listDeviceSessions(
        accountId,
        getSessionContext(req).deviceId
      );

      res.status(200).json({
        success: true,
        message: 'Lấy danh sách thiết bị thành công',
        data: {
          sessions,
          total: sessions.length,
        },
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể tải danh sách thiết bị');
    }
  };

  revokeSession = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.customer?.accountId;

      if (!accountId) {
        throw new MobileCustomerAuthError(
          'Customer not authenticated',
          401,
          'ACCESS_TOKEN_REQUIRED'
        );
      }

      const targetDeviceId = String(req.params.deviceId || '').trim();
      const currentDeviceId = getSessionContext(req).deviceId;

      const revokedCount = await this.authService.revokeDeviceSession(
        accountId,
        targetDeviceId,
        getSessionContext(req)
      );

      if (revokedCount === 0) {
        throw new MobileCustomerAuthError(
          'Không tìm thấy phiên đăng nhập đang hoạt động',
          404,
          'DEVICE_SESSION_NOT_FOUND'
        );
      }

      res.status(200).json({
        success: true,
        message: 'Đã đăng xuất thiết bị',
        data: {
          revokedCount,
          currentDeviceRevoked: targetDeviceId === currentDeviceId,
        },
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể đăng xuất thiết bị');
    }
  };

  logoutAll = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.customer?.accountId;

      if (!accountId) {
        throw new MobileCustomerAuthError(
          'Customer not authenticated',
          401,
          'ACCESS_TOKEN_REQUIRED'
        );
      }

      const keepCurrentDevice = req.body?.keepCurrentDevice === true;

      const revokedCount = await this.authService.revokeAllDeviceSessions(
        accountId,
        getSessionContext(req),
        keepCurrentDevice
      );

      res.status(200).json({
        success: true,
        message: keepCurrentDevice
          ? 'Đã đăng xuất các thiết bị khác'
          : 'Đã đăng xuất tất cả thiết bị',
        data: {
          revokedCount,
          currentDeviceRevoked: !keepCurrentDevice,
        },
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể đăng xuất các thiết bị');
    }
  };

  sendOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const purpose = await this.otpService.resolvePurpose(req.body.phone, req.body.purpose);

      const result = await this.otpService.requestOtp(req.body.phone, purpose, {
        ip: getRequestIp(req),
      });

      res.status(200).json({
        success: true,
        message: 'Đã gửi OTP',
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, 'Không thể gửi OTP');
    }
  };

  loginOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.loginWithOtp(
        req.body.phone,
        req.body.otp,
        getSessionContext(req)
      );

      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, 'Đăng nhập OTP thất bại');
    }
  };

  resetForgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.authService.resetForgotPassword(
        {
          phone: req.body.phone,
          otp: req.body.otp,
          password: req.body.password,
          confirmPassword: req.body.confirmPassword,
        },
        getSessionContext(req)
      );

      res.status(200).json({
        success: true,
        message: 'Đổi mật khẩu thành công',
      });
    } catch (error) {
      this.handleError(error, res, 'Đổi mật khẩu thất bại');
    }
  };

  private handleError(error: unknown, res: Response, fallbackMessage: string): void {
    if (error instanceof MobileCustomerAuthError || error instanceof MobileCustomerOtpError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
        ...(error instanceof MobileCustomerAuthError && error.data ? { data: error.data } : {}),
      });
      return;
    }

    const duplicate =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 11000;

    res.status(duplicate ? 409 : 500).json({
      success: false,
      message: duplicate
        ? 'Dữ liệu phiên đăng nhập đã tồn tại'
        : error instanceof Error
          ? error.message
          : fallbackMessage,
    });
  }
}
