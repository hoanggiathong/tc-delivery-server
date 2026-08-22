import {
  MobileAppVersion,
  type IMobileAppVersion,
  type MobileAppPlatform,
} from './mobile-app-version.model';

export interface MobileAppVersionConfig {
  platform: MobileAppPlatform;
  latestVersion: string;
  latestBuild: number;
  minimumVersion: string;
  minimumBuild: number;
  storeUrl: string;
  message: string;
  enabled: boolean;
  updatedAt: Date | null;
}

export interface UpdateMobileAppVersionInput {
  latestVersion?: unknown;
  latestBuild?: unknown;
  minimumVersion?: unknown;
  minimumBuild?: unknown;
  storeUrl?: unknown;
  message?: unknown;
  enabled?: unknown;
}

export class MobileAppVersionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'MobileAppVersionError';
  }
}

const DEFAULT_MESSAGE =
  'Đã có phiên bản mới của Gia Phước Express. Vui lòng cập nhật để có trải nghiệm tốt nhất.';

const DEFAULT_CONFIG: Record<MobileAppPlatform, MobileAppVersionConfig> = {
  android: {
    platform: 'android',
    latestVersion: '1.0.0',
    latestBuild: 1,
    minimumVersion: '1.0.0',
    minimumBuild: 1,
    storeUrl: '',
    message: DEFAULT_MESSAGE,
    enabled: false,
    updatedAt: null,
  },
  ios: {
    platform: 'ios',
    latestVersion: '1.0.0',
    latestBuild: 1,
    minimumVersion: '1.0.0',
    minimumBuild: 1,
    storeUrl: '',
    message: DEFAULT_MESSAGE,
    enabled: false,
    updatedAt: null,
  },
};

const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z._+-]{0,31}$/;
const ALLOWED_STORE_PROTOCOLS = new Set(['https:', 'market:', 'itms-apps:']);

export class MobileAppVersionService {
  normalizePlatform(value: unknown): MobileAppPlatform {
    const platform = String(value || '')
      .trim()
      .toLowerCase();

    if (platform !== 'android' && platform !== 'ios') {
      throw new MobileAppVersionError(
        'Platform không hợp lệ. Chỉ hỗ trợ android hoặc ios.',
        400,
        'MOBILE_APP_PLATFORM_INVALID'
      );
    }

    return platform;
  }

  async getAdminConfigs(): Promise<MobileAppVersionConfig[]> {
    const documents = await MobileAppVersion.find({
      _id: { $in: ['android', 'ios'] },
    }).lean();

    const byPlatform = new Map<MobileAppPlatform, IMobileAppVersion>();

    for (const document of documents) {
      const platform = this.normalizePlatform(document._id);
      byPlatform.set(platform, document as IMobileAppVersion);
    }

    return (['android', 'ios'] as MobileAppPlatform[]).map(platform => {
      const document = byPlatform.get(platform);
      return document ? this.toConfig(document) : { ...DEFAULT_CONFIG[platform] };
    });
  }

  async getPublicConfig(platformInput: unknown): Promise<MobileAppVersionConfig> {
    const platform = this.normalizePlatform(platformInput);

    const document = await MobileAppVersion.findById(platform).lean();

    if (!document) {
      return { ...DEFAULT_CONFIG[platform] };
    }

    return this.toConfig(document as IMobileAppVersion);
  }

  async updateConfig(
    platformInput: unknown,
    input: UpdateMobileAppVersionInput
  ): Promise<MobileAppVersionConfig> {
    const platform = this.normalizePlatform(platformInput);

    const currentDocument = await MobileAppVersion.findById(platform).lean();
    const current = currentDocument
      ? this.toConfig(currentDocument as IMobileAppVersion)
      : { ...DEFAULT_CONFIG[platform] };

    const next: MobileAppVersionConfig = {
      platform,
      latestVersion:
        input.latestVersion === undefined
          ? current.latestVersion
          : this.normalizeVersion(input.latestVersion, 'latestVersion'),
      latestBuild:
        input.latestBuild === undefined
          ? current.latestBuild
          : this.normalizeBuild(input.latestBuild, 'latestBuild'),
      minimumVersion:
        input.minimumVersion === undefined
          ? current.minimumVersion
          : this.normalizeVersion(input.minimumVersion, 'minimumVersion'),
      minimumBuild:
        input.minimumBuild === undefined
          ? current.minimumBuild
          : this.normalizeBuild(input.minimumBuild, 'minimumBuild'),
      storeUrl:
        input.storeUrl === undefined ? current.storeUrl : this.normalizeStoreUrl(input.storeUrl),
      message: input.message === undefined ? current.message : this.normalizeMessage(input.message),
      enabled:
        input.enabled === undefined
          ? current.enabled
          : this.normalizeBoolean(input.enabled, 'enabled'),
      updatedAt: current.updatedAt,
    };

    if (next.latestBuild < next.minimumBuild) {
      throw new MobileAppVersionError(
        'latestBuild phải lớn hơn hoặc bằng minimumBuild.',
        400,
        'MOBILE_APP_BUILD_RANGE_INVALID'
      );
    }

    if (next.enabled && !next.storeUrl) {
      throw new MobileAppVersionError(
        'Store URL là bắt buộc khi bật kiểm tra cập nhật.',
        400,
        'MOBILE_APP_STORE_URL_REQUIRED'
      );
    }

    const updated = await MobileAppVersion.findByIdAndUpdate(
      platform,
      {
        $set: {
          latestVersion: next.latestVersion,
          latestBuild: next.latestBuild,
          minimumVersion: next.minimumVersion,
          minimumBuild: next.minimumBuild,
          storeUrl: next.storeUrl,
          message: next.message,
          enabled: next.enabled,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    if (!updated) {
      throw new MobileAppVersionError(
        'Không thể cập nhật cấu hình phiên bản ứng dụng.',
        500,
        'MOBILE_APP_VERSION_UPDATE_FAILED'
      );
    }

    return this.toConfig(updated as IMobileAppVersion);
  }

  private toConfig(document: IMobileAppVersion): MobileAppVersionConfig {
    const platform = this.normalizePlatform(document._id);

    return {
      platform,
      latestVersion: String(document.latestVersion || DEFAULT_CONFIG[platform].latestVersion),
      latestBuild: Number(document.latestBuild || DEFAULT_CONFIG[platform].latestBuild),
      minimumVersion: String(document.minimumVersion || DEFAULT_CONFIG[platform].minimumVersion),
      minimumBuild: Number(document.minimumBuild || DEFAULT_CONFIG[platform].minimumBuild),
      storeUrl: String(document.storeUrl || ''),
      message: String(document.message || DEFAULT_MESSAGE),
      enabled: Boolean(document.enabled),
      updatedAt: document.updatedAt ? new Date(document.updatedAt) : null,
    };
  }

  private normalizeVersion(value: unknown, field: string): string {
    const version = String(value || '').trim();

    if (!VERSION_PATTERN.test(version)) {
      throw new MobileAppVersionError(
        `${field} không hợp lệ. Ví dụ hợp lệ: 1.0.0`,
        400,
        'MOBILE_APP_VERSION_INVALID'
      );
    }

    return version;
  }

  private normalizeBuild(value: unknown, field: string): number {
    const build = Number(value);

    if (!Number.isInteger(build) || build < 1) {
      throw new MobileAppVersionError(
        `${field} phải là số nguyên lớn hơn hoặc bằng 1.`,
        400,
        'MOBILE_APP_BUILD_INVALID'
      );
    }

    return build;
  }

  private normalizeBoolean(value: unknown, field: string): boolean {
    if (typeof value !== 'boolean') {
      throw new MobileAppVersionError(
        `${field} phải là boolean.`,
        400,
        'MOBILE_APP_BOOLEAN_INVALID'
      );
    }

    return value;
  }

  private normalizeStoreUrl(value: unknown): string {
    const storeUrl = String(value || '').trim();

    if (!storeUrl) {
      return '';
    }

    if (storeUrl.length > 1000) {
      throw new MobileAppVersionError(
        'Store URL không được vượt quá 1000 ký tự.',
        400,
        'MOBILE_APP_STORE_URL_INVALID'
      );
    }

    try {
      const parsed = new URL(storeUrl);

      if (!ALLOWED_STORE_PROTOCOLS.has(parsed.protocol)) {
        throw new Error('unsupported protocol');
      }
    } catch {
      throw new MobileAppVersionError(
        'Store URL không hợp lệ. Dùng https://, market:// hoặc itms-apps://.',
        400,
        'MOBILE_APP_STORE_URL_INVALID'
      );
    }

    return storeUrl;
  }

  private normalizeMessage(value: unknown): string {
    const message = String(value || '').trim();

    if (!message) {
      return DEFAULT_MESSAGE;
    }

    if (message.length > 500) {
      throw new MobileAppVersionError(
        'Nội dung thông báo không được vượt quá 500 ký tự.',
        400,
        'MOBILE_APP_MESSAGE_TOO_LONG'
      );
    }

    return message;
  }
}
