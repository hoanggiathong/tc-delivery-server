import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

export const uploadMiddleware = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter,
});

export const uploadMultipleImages = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter,
}).fields([{ name: 'images', maxCount: 5 }]);

export const uploadReturnDeliveryImagesFields = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter,
}).fields([
  { name: 'customerImages', maxCount: 5 },
  { name: 'returnDeliveryImages', maxCount: 5 },
]);

export const uploadMoneyDeliveryImagesFields = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter,
}).fields([{ name: 'images', maxCount: 5 }]);

export const uploadMoneyDeliveryDualImagesFields = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter,
}).fields([
  { name: 'customerImages', maxCount: 5 },
  { name: 'moneyImages', maxCount: 5 },
]);
