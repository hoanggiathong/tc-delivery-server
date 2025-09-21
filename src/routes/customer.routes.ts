import { Router } from 'express';
import { CustomerController } from '@/controllers/customer.controller';
import { validate } from '@/middlewares/validation.middleware';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { UserRole } from '@/types/user.type';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerParamsSchema,
  uploadImageSchema,
  updateImageRotationSchema,
  deleteImageSchema,
  updateCustomerBankSchema,
} from '@/schemas/customer.schema';
import { uploadMiddleware } from '@/middlewares/upload.middleware';

const router = Router();
const customerController = new CustomerController();

// Routes that allow USER role access - must be defined before global role middleware

/**
 * @swagger
 * /api/customer/bank-info:
 *   put:
 *     summary: Update customer bank information and/or upload image(s)
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - type
 *             properties:
 *               phone:
 *                 type: string
 *                 pattern: '^\\+?[1-9]\\d{1,14}$'
 *                 example: '+84912345678'
 *                 description: Customer phone number
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: 'Nguyễn Văn A'
 *                 description: Customer name (required when creating new customer)
 *               type:
 *                 type: string
 *                 enum: [delivery, money]
 *                 default: delivery
 *                 description: Customer type
 *               bankInfo:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: 'Nguyễn Văn A'
 *                     description: Bank account holder name
 *                   bankName:
 *                     type: string
 *                     example: 'Vietcombank'
 *                     description: Bank name
 *                   bankAccount:
 *                     type: string
 *                     example: '0071000123456'
 *                     description: Bank account number
 *                   bankBranch:
 *                     type: string
 *                     example: 'Chi nhánh Tân Bình'
 *                     description: Bank branch (optional)
 *                   bankAddress:
 *                     type: string
 *                     example: '285 Cách Mạng Tháng 8'
 *                     description: Bank address (optional)
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - type
 *             properties:
 *               phone:
 *                 type: string
 *                 pattern: '^\\+?[1-9]\\d{1,14}$'
 *                 example: '+84912345678'
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: 'Nguyễn Văn A'
 *               type:
 *                 type: string
 *                 enum: [delivery, money]
 *                 default: delivery
 *               bankInfo[name]:
 *                 type: string
 *                 example: 'Nguyễn Văn A'
 *               bankInfo[bankName]:
 *                 type: string
 *                 example: 'Vietcombank'
 *               bankInfo[bankAccount]:
 *                 type: string
 *                 example: '0071000123456'
 *               bankInfo[bankBranch]:
 *                 type: string
 *                 example: 'Chi nhánh Tân Bình'
 *               bankInfo[bankAddress]:
 *                 type: string
 *                 example: '285 Cách Mạng Tháng 8'
 *               # Multiple images support (up to 5 images)
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *                 description: Array of image files to upload (optional, max 5)
 *               images[0][index]:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 1
 *                 description: Index for first image (1-5)
 *               images[0][rotate]:
 *                 type: integer
 *                 enum: [0, 90, 180, 270]
 *                 default: 0
 *                 description: Rotation angle for first image
 *               images[1][index]:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 2
 *                 description: Index for second image (1-5)
 *               images[1][rotate]:
 *                 type: integer
 *                 enum: [0, 90, 180, 270]
 *                 default: 0
 *                 description: Rotation angle for second image
 *     responses:
 *       200:
 *         description: Bank info updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Bank info updated successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     customer:
 *                       $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Validation error or business logic error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   examples:
 *                     validation:
 *                       value: 'Validation failed: Please enter a valid phone number'
 *                     missing_name:
 *                       value: 'Name is required when creating new customer'
 *                     no_route:
 *                       value: 'User must have a selected route'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: 'Unauthorized'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: 'Internal server error'
 */
// Update customer bank info and/or upload image(s)
router.put(
  '/bank-info',
  authenticateToken,
  requireRole([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]),
  uploadMiddleware.fields([
    { name: 'images', maxCount: 5 }, // Multiple images
  ]),
  validate(updateCustomerBankSchema),
  customerController.updateBankInfo
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       required:
 *         - name
 *         - phone
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the customer
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Name of the customer
 *         phone:
 *           type: string
 *           pattern: ^\+?[1-9]\d{1,14}$
 *           description: Phone number of the customer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateCustomerRequest:
 *       type: object
 *       required:
 *         - name
 *         - phone
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Name of the customer
 *         phone:
 *           type: string
 *           pattern: ^\+?[1-9]\d{1,14}$
 *           description: Phone number of the customer
 *     UpdateCustomerRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Name of the customer
 *         phone:
 *           type: string
 *           pattern: ^\+?[1-9]\d{1,14}$
 *           description: Phone number of the customer
 */

// All customer routes require authentication and manager/admin/superadmin roles
router.use(authenticateToken);
router.use(requireRole([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]));

// Customer routes
router.post('/', validate(createCustomerSchema), customerController.createCustomer);
router.put(
  '/:id',
  validate(customerParamsSchema),
  validate(updateCustomerSchema),
  customerController.updateCustomer
);
router.get('/:id', validate(customerParamsSchema), customerController.getCustomerById);

// Upload image with auto-create customer
router.post(
  '/upload-image',
  authenticateToken,
  requireRole([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]),
  uploadMiddleware.single('image'),
  validate(uploadImageSchema),
  customerController.uploadImage
);

// Upload image for existing customer by ID
router.post(
  '/:id/upload-image',
  authenticateToken,
  requireRole([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]),
  uploadMiddleware.single('image'),
  validate(customerParamsSchema),
  customerController.uploadImageById
);

// Update image rotation
router.patch(
  '/:id/image/:index/rotate',
  authenticateToken,
  requireRole([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(updateImageRotationSchema),
  customerController.updateImageRotation
);

// Delete image
router.delete(
  '/:id/image/:index',
  authenticateToken,
  requireRole([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(deleteImageSchema),
  customerController.deleteImage
);

export default router;
