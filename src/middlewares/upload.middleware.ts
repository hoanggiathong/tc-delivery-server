import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

const fileFilter = (_req: any, file: any, cb: any) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
  ];

  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

  const hasValidMime = allowedMimeTypes.includes(file.mimetype);
  const hasValidExt = !ext || allowedExt.includes(ext);

  if (hasValidMime && hasValidExt) {
    return cb(null, true);
  }

  return cb(new Error(`Only image files are allowed. Received: ${file.mimetype}`));
};

export const uploadMiddleware = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter,
});

export const uploadMultipleImages = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter,
}).fields([{ name: 'images', maxCount: 5 }]);

export const uploadReturnDeliveryImagesFields = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter,
}).fields([
  { name: 'customerImages', maxCount: 5 },
  { name: 'returnDeliveryImages', maxCount: 5 },
]);

export const uploadMoneyDeliveryImagesFields = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter,
}).fields([{ name: 'images', maxCount: 5 }]);

export const uploadMoneyDeliveryDualImagesFields = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter,
}).fields([
  { name: 'customerImages', maxCount: 5 },
  { name: 'moneyImages', maxCount: 5 },
]);

/*
export const uploadMoneyDeliveryDualImagesFields = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    fieldSize: 5 * 1024 * 1024, // Tăng cái này để chứa được các chuỗi text dài
    fields: 100,
  },
  fileFilter: fileFilter,
}).any(); // Chấp nhận tất cả các field name
*/

const NEWS_THUMBNAIL_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const NEWS_THUMBNAIL_ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const newsThumbnailFileFilter = (_req: any, file: any, cb: any) => {
  const mimeType = String(file?.mimetype || '').toLowerCase();
  const extension = path.extname(file?.originalname || '').toLowerCase();

  const hasValidMime = NEWS_THUMBNAIL_ALLOWED_MIME_TYPES.includes(mimeType);
  const hasValidExtension = !extension || NEWS_THUMBNAIL_ALLOWED_EXTENSIONS.includes(extension);

  if (hasValidMime && hasValidExtension) {
    cb(null, true);
    return;
  }

  cb(new Error('Thumbnail chỉ chấp nhận ảnh JPG, PNG hoặc WebP'));
};

const newsThumbnailMulter = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: newsThumbnailFileFilter,
}).single('thumbnail');

/**
 * Upload thumbnail riêng cho Mobile News.
 *
 * Không dùng fileFilter chung vì News không cần GIF/BMP.
 * Middleware tự trả 400 cho lỗi file để controller chỉ xử lý
 */
export const uploadNewsThumbnail = (req: any, res: any, next: any) => {
  newsThumbnailMulter(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        code: 'NEWS_THUMBNAIL_TOO_LARGE',
        message: 'Ảnh thumbnail không được vượt quá 5 MB',
      });
      return;
    }

    res.status(400).json({
      success: false,
      code: 'NEWS_THUMBNAIL_INVALID',
      message: error instanceof Error ? error.message : 'Ảnh thumbnail không hợp lệ',
    });
  });
};
