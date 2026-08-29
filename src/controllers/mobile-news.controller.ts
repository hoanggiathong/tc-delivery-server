import type { Response } from 'express';

import type { CustomerAuthRequest } from '@/middlewares/authenticate-customer-token.middleware';
import { MobileNewsService } from '@/modules/mobile-customer/mobile-news.service';

export class MobileNewsController {
  constructor(private readonly service = new MobileNewsService()) {}

  /**
   * DB giữ coverImageUrl dạng relative path để không khóa dữ liệu
   * vào UAT/PROD domain.
   *
   * chuyển relative path thành absolute URL theo request hiện tại.
   */
  private resolvePublicAssetUrl(req: CustomerAuthRequest, value: string): string {
    const url = String(value || '').trim();

    if (!url || /^https?:\/\//i.test(url) || url.startsWith('data:')) {
      return url;
    }

    const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
      .split(',')[0]
      .trim();

    const forwardedHost = String(req.headers['x-forwarded-host'] || '')
      .split(',')[0]
      .trim();

    const protocol = forwardedProto || req.protocol || 'http';
    const host = forwardedHost || req.get('host') || '';

    if (!host) {
      return url;
    }

    const normalizedPath = url.startsWith('/') ? url : `/${url}`;

    return `${protocol}://${host}${normalizedPath}`;
  }

  list = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const data = await this.service.list({
        page: Number(req.query.page || 1),

        limit: Number(req.query.limit || 20),

        featured: String(req.query.featured || '').toLowerCase() === 'true',
      });

      res.status(200).json({
        success: true,
        data: {
          ...data,
          items: data.items.map(item => ({
            ...item,
            coverImageUrl: this.resolvePublicAssetUrl(req, String(item.coverImageUrl || '')),
          })),
        },
      });
    } catch {
      res.status(500).json({
        success: false,
        code: 'NEWS_LIST_FAILED',
        message: 'Không tải được tin tức lúc này',
      });
    }
  };

  detail = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const data = await this.service.detail(req.params.slug);

      if (!data) {
        res.status(404).json({
          success: false,
          code: 'NEWS_NOT_FOUND',
          message: 'Không tìm thấy bài viết',
        });

        return;
      }

      res.status(200).json({
        success: true,
        data: {
          ...data,
          coverImageUrl: this.resolvePublicAssetUrl(req, String(data.coverImageUrl || '')),
        },
      });
    } catch {
      res.status(500).json({
        success: false,
        code: 'NEWS_DETAIL_FAILED',
        message: 'Không tải được bài viết lúc này',
      });
    }
  };
}
