import { Types } from 'mongoose';

import { MobileNewsArticle } from '@/modules/mobile-customer/mobile-news.model';
import { MobileCustomerNotificationService } from '@/modules/mobile-customer/mobile-customer-notification.service';

export interface MobileNewsPublicationProcessResult {
  status: 'created' | 'duplicate' | 'not-due';
}

export interface MobileNewsPublicationBatchResult {
  scanned: number;
  processed: number;
  duplicate: number;
  failed: number;
}

const normalizeLimit = (value: unknown): number => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 20;
  }

  return Math.min(parsed, 100);
};

export class MobileNewsPublicationService {
  constructor(private readonly notificationService = new MobileCustomerNotificationService()) {}

  async processArticleById(
    idInput: string | Types.ObjectId
  ): Promise<MobileNewsPublicationProcessResult> {
    const id =
      idInput instanceof Types.ObjectId
        ? idInput
        : Types.ObjectId.isValid(String(idInput || ''))
          ? new Types.ObjectId(String(idInput))
          : null;

    if (!id) {
      return {
        status: 'not-due',
      };
    }

    const now = new Date();

    /**
     * Chỉ xử lý bài được đánh dấu pending một cách tường minh.
     * Document News cũ không có field này sẽ không bao giờ bị
     * quét/gửi notification ngoài ý muốn sau khi deploy.
     */
    const article = await MobileNewsArticle.findOne({
      _id: id,
      isDeleted: {
        $ne: true,
      },
      isPublished: true,
      publishNotificationPending: true,
      publishedAt: {
        $lte: now,
      },
    })
      .select('_id slug title publishedAt publishNotificationPending')
      .lean();

    if (!article) {
      return {
        status: 'not-due',
      };
    }

    const result = await this.notificationService.emitNewsPublished({
      articleId: String(article._id),
      slug: String(article.slug || ''),
      title: String(article.title || ''),
    });

    /**
     * created: notification đã tồn tại, dù FCM có failed/partial.
     * duplicate: một worker khác đã claim eventKey trước.
     * Cả hai trường hợp đều không được tạo/gửi lại notification.
     */
    if (result.status === 'created' || result.status === 'duplicate') {
      await MobileNewsArticle.updateOne(
        {
          _id: article._id,
          publishNotificationPending: true,
        },
        {
          $set: {
            publishNotificationPending: false,
          },
        }
      );
    }

    return {
      status: result.status,
    };
  }

  async processDue(limitInput = 20): Promise<MobileNewsPublicationBatchResult> {
    const limit = normalizeLimit(limitInput);

    const rows = await MobileNewsArticle.find({
      isDeleted: {
        $ne: true,
      },
      isPublished: true,
      publishNotificationPending: true,
      publishedAt: {
        $lte: new Date(),
      },
    })
      .select('_id')
      .sort({
        publishedAt: 1,
        _id: 1,
      })
      .limit(limit)
      .lean();

    let processed = 0;
    let duplicate = 0;
    let failed = 0;

    /**
     * Chạy tuần tự để tránh bắn một lượng lớn FCM đồng thời.
     * Nhiều PM2 worker vẫn an toàn nhờ eventKey unique.
     */
    for (const row of rows) {
      try {
        const result = await this.processArticleById(String(row._id));

        if (result.status === 'created') {
          processed += 1;
        } else if (result.status === 'duplicate') {
          duplicate += 1;
        }
      } catch (error) {
        failed += 1;

        console.error('[MOBILE NEWS] Không phát được notification bài đã đến lịch:', {
          articleId: String(row._id),
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    return {
      scanned: rows.length,
      processed,
      duplicate,
      failed,
    };
  }

  async syncTargetCode(articleId: string, slug: string): Promise<void> {
    await this.notificationService.syncNewsTargetCode(articleId, slug);
  }
}
