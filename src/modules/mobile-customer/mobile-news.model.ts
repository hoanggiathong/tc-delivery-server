import { Schema, model } from 'mongoose';

export type MobileNewsBlockType = 'paragraph' | 'heading' | 'bullets';

export interface IMobileNewsBlock {
  type: MobileNewsBlockType;
  text?: string;
  items?: string[];
}

export interface IMobileNewsArticle {
  slug: string;
  title: string;
  summary: string;
  coverImageUrl?: string;
  category?: string;
  content: IMobileNewsBlock[];
  publishedAt: Date;
  isFeatured: boolean;
  isPublished: boolean;
  isDeleted: boolean;
  publishNotificationPending: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const MobileNewsBlockSchema = new Schema<IMobileNewsBlock>(
  {
    type: {
      type: String,
      enum: ['paragraph', 'heading', 'bullets'],
      required: true,
    },

    text: {
      type: String,
      trim: true,
      default: '',
    },

    items: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  }
);

const MobileNewsArticleSchema = new Schema<IMobileNewsArticle>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 180,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220,
    },

    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 520,
    },

    coverImageUrl: {
      type: String,
      trim: true,
      default: '',
    },

    category: {
      type: String,
      trim: true,
      default: 'Tin tức',
      maxlength: 80,
    },

    content: {
      type: [MobileNewsBlockSchema],
      default: [],
    },

    publishedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    /**
     * Chỉ những bài được publish/re-publish sau khi feature này
     * được triển khai mới được đưa vào hàng chờ notification.
     * Default false giúp không phát notification hàng loạt cho
     * dữ liệu News cũ khi deploy.
     */
    publishNotificationPending: {
      type: Boolean,
      default: false,
    },

    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'mobile_news_articles',
  }
);

MobileNewsArticleSchema.index({
  isPublished: 1,
  isFeatured: 1,
  sortOrder: -1,
  publishedAt: -1,
});

export const MobileNewsArticle = model<IMobileNewsArticle>(
  'MobileNewsArticle',
  MobileNewsArticleSchema
);
