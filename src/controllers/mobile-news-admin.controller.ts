import type { Request, Response } from 'express';

import {
  MobileNewsAdminError,
  MobileNewsAdminService,
  type MobileNewsAdminStatus,
} from '@/modules/mobile-customer/mobile-news-admin.service';

const ALLOWED_STATUSES = new Set<MobileNewsAdminStatus>(['all', 'published', 'draft', 'scheduled']);

const parseOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  throw new MobileNewsAdminError('featured phải là true hoặc false', 400, 'NEWS_INVALID_FILTER');
};

const parseStatus = (value: unknown): MobileNewsAdminStatus => {
  const normalized = String(value || 'all')
    .trim()
    .toLowerCase() as MobileNewsAdminStatus;

  if (!ALLOWED_STATUSES.has(normalized)) {
    throw new MobileNewsAdminError('status không hợp lệ', 400, 'NEWS_INVALID_FILTER');
  }

  return normalized;
};

export class MobileNewsAdminController {
  constructor(private readonly service = new MobileNewsAdminService()) {}

  uploadThumbnail = async (req: Request, res: Response): Promise<void> => {
    try {
      const uploadedFile = (
        req as Request & {
          file?: {
            buffer: Buffer;
            mimetype: string;
            originalname?: string;
            size?: number;
          };
        }
      ).file;

      if (!uploadedFile) {
        throw new MobileNewsAdminError(
          'Vui lòng chọn ảnh thumbnail',
          400,
          'NEWS_THUMBNAIL_REQUIRED'
        );
      }

      const data = await this.service.uploadThumbnail({
        buffer: uploadedFile.buffer,
        mimetype: uploadedFile.mimetype,
        originalName: uploadedFile.originalname,
        size: uploadedFile.size,
      });

      res.status(201).json({
        success: true,
        message: 'Upload thumbnail thành công',
        data,
      });
    } catch (error) {
      this.handleError(error, res, 'NEWS_THUMBNAIL_UPLOAD_FAILED');
    }
  };

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.service.list({
        page: Number(req.query.page || 1),

        limit: Number(req.query.limit || 20),

        keyword: String(req.query.keyword || ''),

        status: parseStatus(req.query.status),

        featured: parseOptionalBoolean(req.query.featured),
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      this.handleError(error, res, 'NEWS_ADMIN_LIST_FAILED');
    }
  };

  detail = async (req: Request, res: Response): Promise<void> => {
    try {
      const item = await this.service.detail(req.params.id);

      res.status(200).json({
        success: true,
        data: {
          item,
        },
      });
    } catch (error) {
      this.handleError(error, res, 'NEWS_ADMIN_DETAIL_FAILED');
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const item = await this.service.create(req.body);

      res.status(201).json({
        success: true,
        message: 'Tạo bài viết thành công',
        data: {
          item,
        },
      });
    } catch (error) {
      this.handleError(error, res, 'NEWS_ADMIN_CREATE_FAILED');
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const item = await this.service.update(req.params.id, req.body);

      res.status(200).json({
        success: true,
        message: 'Cập nhật bài viết thành công',
        data: {
          item,
        },
      });
    } catch (error) {
      this.handleError(error, res, 'NEWS_ADMIN_UPDATE_FAILED');
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.service.remove(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Xóa bài viết thành công',
        data,
      });
    } catch (error) {
      this.handleError(error, res, 'NEWS_ADMIN_DELETE_FAILED');
    }
  };

  private handleError(error: unknown, res: Response, fallbackCode: string): void {
    if (error instanceof MobileNewsAdminError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });

      return;
    }

    console.error('[MOBILE NEWS ADMIN]', error);

    res.status(500).json({
      success: false,
      message: 'Không thể xử lý bài viết lúc này',
      code: fallbackCode,
    });
  }
}
