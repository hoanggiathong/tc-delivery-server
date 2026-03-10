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
