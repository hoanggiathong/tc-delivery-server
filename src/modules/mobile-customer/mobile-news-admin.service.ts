import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';

import { generateVersionedUrl } from '@/utils/image-url.utils';

import {
  MobileNewsArticle,
  type IMobileNewsArticle,
  type IMobileNewsBlock,
  type MobileNewsBlockType,
} from '@/modules/mobile-customer/mobile-news.model';
import { MobileNewsPublicationService } from '@/modules/mobile-customer/mobile-news-publication.service';

export type MobileNewsAdminStatus = 'all' | 'published' | 'draft' | 'scheduled';

export interface MobileNewsAdminListQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  status?: MobileNewsAdminStatus;
  featured?: boolean;
}

export interface MobileNewsThumbnailInput {
  buffer: Buffer;
  mimetype: string;
  originalName?: string;
  size?: number;
}

export interface MobileNewsThumbnailResult {
  url: string;
}

export interface MobileNewsAdminCreateInput {
  title: string;
  slug?: string;
  summary: string;
  coverImageUrl?: string;
  category?: string;
  content: IMobileNewsBlock[];
  publishedAt?: string | Date;
  isFeatured?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
}

export type MobileNewsAdminUpdateInput = Partial<MobileNewsAdminCreateInput>;

export class MobileNewsAdminError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'MobileNewsAdminError';
  }
}

const TITLE_MAX_LENGTH = 220;
const SUMMARY_MAX_LENGTH = 520;
const SLUG_MAX_LENGTH = 180;
const CATEGORY_MAX_LENGTH = 80;

const clampInteger = (value: unknown, min: number, max: number, fallback: number): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(parsed)));
};

const normalizeRequiredText = (value: unknown, fieldName: string, maxLength: number): string => {
  const text = String(value ?? '').trim();

  if (!text) {
    throw new MobileNewsAdminError(
      `${fieldName} không được để trống`,
      400,
      'NEWS_VALIDATION_FAILED'
    );
  }

  if (text.length > maxLength) {
    throw new MobileNewsAdminError(
      `${fieldName} không được vượt quá ${maxLength} ký tự`,
      400,
      'NEWS_VALIDATION_FAILED'
    );
  }

  return text;
};

const normalizeOptionalText = (value: unknown, maxLength?: number): string => {
  const text = String(value ?? '').trim();

  if (typeof maxLength === 'number' && text.length > maxLength) {
    throw new MobileNewsAdminError(
      `Nội dung không được vượt quá ${maxLength} ký tự`,
      400,
      'NEWS_VALIDATION_FAILED'
    );
  }

  return text;
};

const slugify = (value: unknown): string => {
  const normalized = String(value ?? '')
    .trim()
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (!normalized) {
    throw new MobileNewsAdminError('Slug không hợp lệ', 400, 'NEWS_INVALID_SLUG');
  }

  if (normalized.length > SLUG_MAX_LENGTH) {
    throw new MobileNewsAdminError(
      `Slug không được vượt quá ${SLUG_MAX_LENGTH} ký tự`,
      400,
      'NEWS_INVALID_SLUG'
    );
  }

  return normalized;
};

const normalizeDate = (value: unknown, fieldName: string): Date => {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new MobileNewsAdminError(`${fieldName} không hợp lệ`, 400, 'NEWS_VALIDATION_FAILED');
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new MobileNewsAdminError(`${fieldName} không hợp lệ`, 400, 'NEWS_VALIDATION_FAILED');
  }

  return date;
};

const normalizeBoolean = (value: unknown, fieldName: string): boolean => {
  if (typeof value !== 'boolean') {
    throw new MobileNewsAdminError(`${fieldName} phải là boolean`, 400, 'NEWS_VALIDATION_FAILED');
  }

  return value;
};

const normalizeSortOrder = (value: unknown): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new MobileNewsAdminError('sortOrder phải là số nguyên', 400, 'NEWS_VALIDATION_FAILED');
  }

  return parsed;
};

const normalizeBlockType = (value: unknown): MobileNewsBlockType => {
  if (value === 'paragraph' || value === 'heading' || value === 'bullets') {
    return value;
  }

  throw new MobileNewsAdminError(
    'Loại block nội dung không hợp lệ',
    400,
    'NEWS_INVALID_CONTENT_BLOCK'
  );
};

const normalizeContent = (value: unknown): IMobileNewsBlock[] => {
  if (!Array.isArray(value)) {
    throw new MobileNewsAdminError('content phải là một mảng', 400, 'NEWS_INVALID_CONTENT');
  }

  return value.map((rawBlock, index) => {
    if (!rawBlock || typeof rawBlock !== 'object') {
      throw new MobileNewsAdminError(
        `Block nội dung #${index + 1} không hợp lệ`,
        400,
        'NEWS_INVALID_CONTENT_BLOCK'
      );
    }

    const block = rawBlock as {
      type?: unknown;
      text?: unknown;
      items?: unknown;
    };

    const type = normalizeBlockType(block.type);

    if (type === 'paragraph' || type === 'heading') {
      const text = String(block.text ?? '').trim();

      if (!text) {
        throw new MobileNewsAdminError(
          `Block ${type} #${index + 1} phải có nội dung`,
          400,
          'NEWS_INVALID_CONTENT_BLOCK'
        );
      }

      return {
        type,
        text,
        items: [],
      };
    }

    if (!Array.isArray(block.items)) {
      throw new MobileNewsAdminError(
        `Block bullets #${index + 1} phải có danh sách items`,
        400,
        'NEWS_INVALID_CONTENT_BLOCK'
      );
    }

    const items = block.items.map(item => String(item ?? '').trim()).filter(Boolean);

    if (!items.length) {
      throw new MobileNewsAdminError(
        `Block bullets #${index + 1} phải có ít nhất một item`,
        400,
        'NEWS_INVALID_CONTENT_BLOCK'
      );
    }

    return {
      type,
      text: '',
      items,
    };
  });
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildPublishedDateExpression = (operator: '$lte' | '$gt', now: Date) => ({
  $expr: {
    [operator]: [
      {
        $convert: {
          input: '$publishedAt',
          to: 'date',
          onError: null,
          onNull: null,
        },
      },
      now,
    ],
  },
});

const getArticleStatus = (
  item: Pick<IMobileNewsArticle, 'isPublished' | 'publishedAt'>,
  now = new Date()
): Exclude<MobileNewsAdminStatus, 'all'> => {
  if (!item.isPublished) {
    return 'draft';
  }

  const publishedAt =
    item.publishedAt instanceof Date ? item.publishedAt : new Date(item.publishedAt);

  if (publishedAt.getTime() > now.getTime()) {
    return 'scheduled';
  }

  return 'published';
};

const mapAdminListItem = (item: any, now = new Date()) => ({
  id: String(item._id),
  slug: String(item.slug || ''),
  title: String(item.title || ''),
  summary: String(item.summary || ''),
  coverImageUrl: String(item.coverImageUrl || ''),
  category: String(item.category || 'Tin tức'),
  publishedAt: item.publishedAt,
  isFeatured: Boolean(item.isFeatured),
  isPublished: Boolean(item.isPublished),
  sortOrder: Number(item.sortOrder || 0),
  status: getArticleStatus(item, now),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const mapAdminDetail = (item: any) => ({
  ...mapAdminListItem(item),
  content: Array.isArray(item.content)
    ? item.content.map((block: any) => ({
        type: block.type,
        text: String(block.text || ''),
        items: Array.isArray(block.items)
          ? block.items.map((value: unknown) => String(value ?? '').trim()).filter(Boolean)
          : [],
      }))
    : [],
});

const assertObjectId = (idInput: string): Types.ObjectId => {
  const id = String(idInput || '').trim();

  if (!Types.ObjectId.isValid(id)) {
    throw new MobileNewsAdminError('ID bài viết không hợp lệ', 400, 'NEWS_INVALID_ID');
  }

  return new Types.ObjectId(id);
};

const buildCreatePayload = (input: MobileNewsAdminCreateInput) => {
  const title = normalizeRequiredText(input.title, 'Tiêu đề', TITLE_MAX_LENGTH);

  const summary = normalizeRequiredText(input.summary, 'Tóm tắt', SUMMARY_MAX_LENGTH);

  const slug = slugify(input.slug || title);

  const isPublished =
    input.isPublished === undefined ? true : normalizeBoolean(input.isPublished, 'isPublished');

  return {
    title,
    slug,
    summary,
    coverImageUrl: normalizeOptionalText(input.coverImageUrl),
    category:
      input.category === undefined
        ? 'Tin tức'
        : normalizeOptionalText(input.category, CATEGORY_MAX_LENGTH) || 'Tin tức',
    content: normalizeContent(input.content),
    publishedAt:
      input.publishedAt === undefined
        ? new Date()
        : normalizeDate(input.publishedAt, 'publishedAt'),
    isFeatured:
      input.isFeatured === undefined ? false : normalizeBoolean(input.isFeatured, 'isFeatured'),
    isPublished,
    publishNotificationPending: isPublished,
    sortOrder: input.sortOrder === undefined ? 0 : normalizeSortOrder(input.sortOrder),
    isDeleted: false,
  };
};

const buildUpdatePayload = (input: MobileNewsAdminUpdateInput): Record<string, unknown> => {
  const update: Record<string, unknown> = {};

  if (input.title !== undefined) {
    update.title = normalizeRequiredText(input.title, 'Tiêu đề', TITLE_MAX_LENGTH);
  }

  if (input.slug !== undefined) {
    update.slug = slugify(input.slug);
  }

  if (input.summary !== undefined) {
    update.summary = normalizeRequiredText(input.summary, 'Tóm tắt', SUMMARY_MAX_LENGTH);
  }

  if (input.coverImageUrl !== undefined) {
    update.coverImageUrl = normalizeOptionalText(input.coverImageUrl);
  }

  if (input.category !== undefined) {
    update.category = normalizeOptionalText(input.category, CATEGORY_MAX_LENGTH) || 'Tin tức';
  }

  if (input.content !== undefined) {
    update.content = normalizeContent(input.content);
  }

  if (input.publishedAt !== undefined) {
    update.publishedAt = normalizeDate(input.publishedAt, 'publishedAt');
  }

  if (input.isFeatured !== undefined) {
    update.isFeatured = normalizeBoolean(input.isFeatured, 'isFeatured');
  }

  if (input.isPublished !== undefined) {
    update.isPublished = normalizeBoolean(input.isPublished, 'isPublished');
  }

  if (input.sortOrder !== undefined) {
    update.sortOrder = normalizeSortOrder(input.sortOrder);
  }

  if (!Object.keys(update).length) {
    throw new MobileNewsAdminError('Không có dữ liệu cần cập nhật', 400, 'NEWS_UPDATE_EMPTY');
  }

  return update;
};

const isDuplicateKeyError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return (
    Number(
      (
        error as {
          code?: unknown;
        }
      ).code
    ) === 11000
  );
};

export class MobileNewsAdminService {
  constructor(private readonly publicationService = new MobileNewsPublicationService()) {}

  /**
   * Notification/push là side effect. Lỗi ở đây không được
   * rollback hoặc biến create/update News thành lỗi.
   */
  private async processPublicationSafely(articleId: string): Promise<void> {
    try {
      await this.publicationService.processArticleById(articleId);
    } catch (error) {
      console.error('[MOBILE NEWS ADMIN] Bài viết đã lưu nhưng chưa phát được notification:', {
        articleId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  private async syncNewsTargetCodeSafely(articleId: string, slug: string): Promise<void> {
    try {
      await this.publicationService.syncTargetCode(articleId, slug);
    } catch (error) {
      console.error('[MOBILE NEWS ADMIN] Không đồng bộ được slug vào notification News:', {
        articleId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  async uploadThumbnail(file: MobileNewsThumbnailInput): Promise<MobileNewsThumbnailResult> {
    if (!file?.buffer || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new MobileNewsAdminError('Vui lòng chọn ảnh thumbnail', 400, 'NEWS_THUMBNAIL_REQUIRED');
    }

    const mimeType = String(file.mimetype || '')
      .trim()
      .toLowerCase();

    const extensionByMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };

    const extension = extensionByMime[mimeType];

    if (!extension) {
      throw new MobileNewsAdminError(
        'Thumbnail chỉ chấp nhận ảnh JPG, PNG hoặc WebP',
        400,
        'NEWS_THUMBNAIL_INVALID'
      );
    }

    if (Number(file.size || file.buffer.length) > 5 * 1024 * 1024) {
      throw new MobileNewsAdminError(
        'Ảnh thumbnail không được vượt quá 5 MB',
        400,
        'NEWS_THUMBNAIL_TOO_LARGE'
      );
    }

    const now = new Date();

    const year = String(now.getUTCFullYear());

    const month = String(now.getUTCMonth() + 1).padStart(2, '0');

    const uploadDir = path.join('public', 'uploads', 'mobile-news', year, month);

    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, {
          recursive: true,
        });
      }

      const timestamp = Date.now();

      const random = randomBytes(6).toString('hex');

      const fileName = `news_${timestamp}_${random}${extension}`;

      const filePath = path.join(uploadDir, fileName);

      fs.writeFileSync(filePath, file.buffer);

      /**
       * Dùng path.posix để URL trong DB không phụ thuộc
       * Windows/Linux của server.
       *
       * Giữ cùng convention upload hiện có:
       * uploads/... + ?v=<timestamp>
       */
      const relativePath = path.posix.join('uploads', 'mobile-news', year, month, fileName);

      return {
        url: generateVersionedUrl(relativePath, timestamp),
      };
    } catch (error) {
      throw new MobileNewsAdminError(
        error instanceof Error
          ? `Không lưu được thumbnail: ${error.message}`
          : 'Không lưu được thumbnail',
        500,
        'NEWS_THUMBNAIL_UPLOAD_FAILED'
      );
    }
  }

  async list(input: MobileNewsAdminListQuery) {
    const page = clampInteger(input.page, 1, 100000, 1);

    const limit = clampInteger(input.limit, 1, 100, 20);

    const now = new Date();

    const filter: Record<string, unknown> = {
      isDeleted: {
        $ne: true,
      },
    };

    const keyword = String(input.keyword || '').trim();

    if (keyword) {
      const regex = new RegExp(escapeRegex(keyword), 'i');

      filter.$or = [
        {
          title: regex,
        },
        {
          slug: regex,
        },
        {
          summary: regex,
        },
        {
          category: regex,
        },
      ];
    }

    switch (input.status || 'all') {
      case 'published':
        filter.isPublished = true;

        Object.assign(filter, buildPublishedDateExpression('$lte', now));
        break;

      case 'scheduled':
        filter.isPublished = true;

        Object.assign(filter, buildPublishedDateExpression('$gt', now));
        break;

      case 'draft':
        filter.isPublished = false;
        break;

      case 'all':
      default:
        break;
    }

    if (typeof input.featured === 'boolean') {
      filter.isFeatured = input.featured;
    }

    const [rows, total] = await Promise.all([
      MobileNewsArticle.find(filter)
        .select(
          [
            '_id',
            'slug',
            'title',
            'summary',
            'coverImageUrl',
            'category',
            'publishedAt',
            'isFeatured',
            'isPublished',
            'sortOrder',
            'createdAt',
            'updatedAt',
          ].join(' ')
        )
        .sort({
          sortOrder: -1,
          publishedAt: -1,
          createdAt: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      MobileNewsArticle.countDocuments(filter),
    ]);

    return {
      items: rows.map(item => mapAdminListItem(item, now)),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async detail(idInput: string) {
    const id = assertObjectId(idInput);

    const row = await MobileNewsArticle.findOne({
      _id: id,

      isDeleted: {
        $ne: true,
      },
    }).lean();

    if (!row) {
      throw new MobileNewsAdminError('Không tìm thấy bài viết', 404, 'NEWS_NOT_FOUND');
    }

    return mapAdminDetail(row);
  }

  async create(input: MobileNewsAdminCreateInput) {
    const payload = buildCreatePayload(input);

    const slugExists = await MobileNewsArticle.exists({
      slug: payload.slug,
    });

    if (slugExists) {
      throw new MobileNewsAdminError('Slug đã tồn tại', 409, 'NEWS_SLUG_EXISTS');
    }

    try {
      const created = await MobileNewsArticle.create(payload);

      const row = await MobileNewsArticle.findById(created._id).lean();

      if (!row) {
        throw new MobileNewsAdminError(
          'Không đọc lại được bài viết vừa tạo',
          500,
          'NEWS_CREATE_FAILED'
        );
      }

      await this.processPublicationSafely(String(row._id));

      return mapAdminDetail(row);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new MobileNewsAdminError('Slug đã tồn tại', 409, 'NEWS_SLUG_EXISTS');
      }

      throw error;
    }
  }

  async update(idInput: string, input: MobileNewsAdminUpdateInput) {
    const id = assertObjectId(idInput);

    const update = buildUpdatePayload(input);

    const currentRow = await MobileNewsArticle.findOne({
      _id: id,
      isDeleted: {
        $ne: true,
      },
    })
      .select('_id isPublished publishNotificationPending')
      .lean();

    if (!currentRow) {
      throw new MobileNewsAdminError('Không tìm thấy bài viết', 404, 'NEWS_NOT_FOUND');
    }

    const nextIsPublished =
      typeof update.isPublished === 'boolean'
        ? update.isPublished
        : Boolean(currentRow.isPublished);

    if (!nextIsPublished) {
      update.publishNotificationPending = false;
    } else if (!currentRow.isPublished && nextIsPublished) {
      /**
       * Chỉ queue khi có transition Draft -> Published.
       * Sửa một bài đã publish không tạo push mới.
       */
      update.publishNotificationPending = true;
    }

    if (typeof update.slug === 'string') {
      const slugExists = await MobileNewsArticle.exists({
        _id: {
          $ne: id,
        },

        slug: update.slug,
      });

      if (slugExists) {
        throw new MobileNewsAdminError('Slug đã tồn tại', 409, 'NEWS_SLUG_EXISTS');
      }
    }

    try {
      const row = await MobileNewsArticle.findOneAndUpdate(
        {
          _id: id,

          isDeleted: {
            $ne: true,
          },
        },
        {
          $set: update,
        },
        {
          new: true,
          runValidators: true,
        }
      ).lean();

      if (!row) {
        throw new MobileNewsAdminError('Không tìm thấy bài viết', 404, 'NEWS_NOT_FOUND');
      }

      await this.processPublicationSafely(String(row._id));

      await this.syncNewsTargetCodeSafely(String(row._id), String(row.slug || ''));

      return mapAdminDetail(row);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new MobileNewsAdminError('Slug đã tồn tại', 409, 'NEWS_SLUG_EXISTS');
      }

      throw error;
    }
  }

  async remove(idInput: string): Promise<{
    id: string;
  }> {
    const id = assertObjectId(idInput);

    const row = await MobileNewsArticle.findOneAndUpdate(
      {
        _id: id,

        isDeleted: {
          $ne: true,
        },
      },
      {
        $set: {
          isDeleted: true,

          isPublished: false,

          isFeatured: false,

          publishNotificationPending: false,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .select('_id')
      .lean();

    if (!row) {
      throw new MobileNewsAdminError('Không tìm thấy bài viết', 404, 'NEWS_NOT_FOUND');
    }

    return {
      id: String(row._id),
    };
  }
}
