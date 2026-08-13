import { MobileNewsArticle } from '@/modules/mobile-customer/mobile-news.model';

export interface MobileNewsListQuery {
  page?: number;
  limit?: number;
  featured?: boolean;
}

const clampInteger = (value: unknown, min: number, max: number, fallback: number): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(parsed)));
};

const normalizeSlug = (value: string): string =>
  String(value || '')
    .trim()
    .toLowerCase();

export class MobileNewsService {
  async list(input: MobileNewsListQuery) {
    const page = clampInteger(input.page, 1, 100000, 1);

    const limit = clampInteger(input.limit, 1, 30, 20);

    const now = new Date();

    const filter: {
      isPublished: boolean;
      publishedAt: {
        $lte: Date;
      };
      isFeatured?: boolean;
    } = {
      isPublished: true,

      publishedAt: {
        $lte: now,
      },
    };

    if (input.featured === true) {
      filter.isFeatured = true;
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
          ].join(' ')
        )
        .sort({
          sortOrder: -1,
          publishedAt: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      MobileNewsArticle.countDocuments(filter),
    ]);

    return {
      items: rows.map(item => ({
        id: String(item._id),
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        coverImageUrl: item.coverImageUrl || '',
        category: item.category || 'Tin tức',
        publishedAt: item.publishedAt,
        isFeatured: Boolean(item.isFeatured),
      })),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async detail(slugInput: string) {
    const slug = normalizeSlug(slugInput);

    if (!slug) {
      return null;
    }

    const row = await MobileNewsArticle.findOne({
      slug,
      isPublished: true,
      publishedAt: {
        $lte: new Date(),
      },
    }).lean();

    if (!row) {
      return null;
    }

    return {
      id: String(row._id),
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      coverImageUrl: row.coverImageUrl || '',
      category: row.category || 'Tin tức',
      publishedAt: row.publishedAt,
      content: Array.isArray(row.content)
        ? row.content.map(block => ({
            type: block.type,
            text: String(block.text || ''),
            items: Array.isArray(block.items)
              ? block.items.map(item => String(item)).filter(Boolean)
              : [],
          }))
        : [],
    };
  }
}
