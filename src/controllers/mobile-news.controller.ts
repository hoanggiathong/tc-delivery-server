import type { Response } from 'express';

import type { CustomerAuthRequest } from '@/middlewares/authenticate-customer-token.middleware';
import { MobileNewsService } from '@/modules/mobile-customer/mobile-news.service';

export class MobileNewsController {
  constructor(private readonly service = new MobileNewsService()) {}

  list = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const data = await this.service.list({
        page: Number(req.query.page || 1),

        limit: Number(req.query.limit || 20),

        featured: String(req.query.featured || '').toLowerCase() === 'true',
      });

      res.status(200).json({
        success: true,
        data,
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
        data,
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
