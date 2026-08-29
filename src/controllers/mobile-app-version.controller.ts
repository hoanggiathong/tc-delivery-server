import type { Request, Response } from 'express';

import {
  MobileAppVersionError,
  MobileAppVersionService,
} from '@/modules/mobile-customer/mobile-app-version.service';
import Logger from '@/utils/logger';

export class MobileAppVersionController {
  constructor(private readonly service = new MobileAppVersionService()) {}

  getPublicConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.service.getPublicConfig(req.query.platform);

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      this.handleError(error, res, 'MOBILE_APP_VERSION_GET_FAILED');
    }
  };

  getAdminConfigs = async (_req: Request, res: Response): Promise<void> => {
    try {
      const items = await this.service.getAdminConfigs();

      res.status(200).json({
        success: true,
        data: { items },
      });
    } catch (error) {
      this.handleError(error, res, 'MOBILE_APP_VERSION_ADMIN_GET_FAILED');
    }
  };

  updateAdminConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const item = await this.service.updateConfig(req.params.platform, req.body || {});

      res.status(200).json({
        success: true,
        message: 'Cập nhật phiên bản ứng dụng thành công',
        data: { item },
      });
    } catch (error) {
      this.handleError(error, res, 'MOBILE_APP_VERSION_ADMIN_UPDATE_FAILED');
    }
  };

  private handleError(error: unknown, res: Response, fallbackCode: string): void {
    if (error instanceof MobileAppVersionError) {
      res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message,
      });
      return;
    }

    Logger.error('[MOBILE APP VERSION] Unexpected error', {
      error: error instanceof Error ? error.message : error,
      code: fallbackCode,
    });

    res.status(500).json({
      success: false,
      code: fallbackCode,
      message: 'Không thể xử lý cấu hình phiên bản ứng dụng',
    });
  }
}
