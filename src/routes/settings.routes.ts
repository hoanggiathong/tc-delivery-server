import { Router } from 'express';
import {
  createSettings,
  getAllSettings,
  getSettingsByName,
  updateSettings,
  deleteSettings,
  calculateShippingFee,
  getShippingRates,
  updateShippingRates,
  getProductList,
  updateProductList,
} from '@/controllers/settings.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { validate } from '@/middlewares/validation.middleware';
import { UserRole } from '@/types/user.type';
import {
  createSettingsSchema,
  updateSettingsSchema,
  getSettingsByNameSchema,
  deleteSettingsSchema,
  calculateShippingFeeSchema,
} from '@/schemas/settings.schema';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ShippingRate:
 *       type: object
 *       required:
 *         - fromAmount
 *         - toAmount
 *         - regularShippingFee
 *         - expressShippingFee
 *       properties:
 *         fromAmount:
 *           type: number
 *           minimum: 0
 *           description: Starting amount for this rate range
 *         toAmount:
 *           type: number
 *           minimum: 0
 *           description: Ending amount for this rate range
 *         regularShippingFee:
 *           type: number
 *           minimum: 0
 *           description: Regular shipping fee for this range
 *         expressShippingFee:
 *           type: number
 *           minimum: 0
 *           description: Express shipping fee for this range
 *     Settings:
 *       type: object
 *       required:
 *         - name
 *         - metadata
 *       properties:
 *         _id:
 *           type: string
 *           description: Settings ID
 *         name:
 *           type: string
 *           enum: [shipping_rates, other_settings]
 *           description: Settings name identifier
 *         metadata:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ShippingRate'
 *           description: Array of shipping rate configurations
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/settings:
 *   post:
 *     summary: Create new settings (Admin/Superadmin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - metadata
 *             properties:
 *               name:
 *                 type: string
 *                 enum: [shipping_rates, other_settings]
 *               metadata:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ShippingRate'
 *     responses:
 *       201:
 *         description: Settings created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Settings already exists
 */
router.post(
  '/',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(createSettingsSchema),
  createSettings
);

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get all settings (Admin/Superadmin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  '/',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  getAllSettings
);

/**
 * @swagger
 * /api/settings/{name}:
 *   get:
 *     summary: Get settings by name
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *           enum: [shipping_rates, other_settings]
 *         description: Settings name
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Settings not found
 */
router.get('/:name', authenticateToken, validate(getSettingsByNameSchema), getSettingsByName);

/**
 * @swagger
 * /api/settings/{name}:
 *   put:
 *     summary: Update settings (Admin/Superadmin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *           enum: [shipping_rates, other_settings]
 *         description: Settings name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - metadata
 *             properties:
 *               metadata:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ShippingRate'
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Settings not found
 */
router.put(
  '/:name',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(updateSettingsSchema),
  updateSettings
);

/**
 * @swagger
 * /api/settings/{name}:
 *   delete:
 *     summary: Delete settings (Superadmin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *           enum: [shipping_rates, other_settings]
 *         description: Settings name
 *     responses:
 *       200:
 *         description: Settings deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Settings not found
 */
router.delete(
  '/:name',
  authenticateToken,
  requireRole([UserRole.SUPERADMIN]),
  validate(deleteSettingsSchema),
  deleteSettings
);

/**
 * @swagger
 * /api/settings/calculate-shipping-fee:
 *   post:
 *     summary: Calculate shipping fee based on amount
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 description: Amount to calculate shipping fee for
 *                 example: 1000000
 *               isExpress:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to calculate express shipping fee
 *                 example: false
 *           examples:
 *             regular:
 *               summary: Regular shipping fee
 *               value:
 *                 amount: 1000000
 *                 isExpress: false
 *             express:
 *               summary: Express shipping fee
 *               value:
 *                 amount: 1000000
 *                 isExpress: true
 *     responses:
 *       200:
 *         description: Shipping fee calculated successfully
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
 *                   example: "Shipping fee calculated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     amount:
 *                       type: number
 *                       description: The amount used for calculation
 *                       example: 1000000
 *                     isExpress:
 *                       type: boolean
 *                       description: Whether express fee was calculated
 *                       example: false
 *                     shippingFee:
 *                       type: number
 *                       description: The calculated shipping fee
 *                       example: 15000
 *             examples:
 *               regularFee:
 *                 summary: Regular shipping fee response
 *                 value:
 *                   success: true
 *                   message: "Shipping fee calculated successfully"
 *                   data:
 *                     amount: 1000000
 *                     isExpress: false
 *                     shippingFee: 15000
 *               expressFee:
 *                 summary: Express shipping fee response
 *                 value:
 *                   success: true
 *                   message: "Shipping fee calculated successfully"
 *                   data:
 *                     amount: 1000000
 *                     isExpress: true
 *                     shippingFee: 30000
 *               percentageFee:
 *                 summary: Percentage-based fee response
 *                 value:
 *                   success: true
 *                   message: "Shipping fee calculated successfully"
 *                   data:
 *                     amount: 10000000
 *                     isExpress: false
 *                     shippingFee: 100000
 *       400:
 *         description: Invalid input data
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
 *                   example: "Validation error: Amount must be a positive number"
 *       401:
 *         description: Unauthorized
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
 *                   example: "No token provided"
 *       404:
 *         description: No shipping rate found for amount
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
 *                   example: "No shipping rate found for amount 999999999"
 */
router.post(
  '/calculate-shipping-fee',
  authenticateToken,
  validate(calculateShippingFeeSchema),
  calculateShippingFee
);

/**
 * @swagger
 * /api/settings/shipping_rates:
 *   get:
 *     summary: Get shipping rates
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shipping rates retrieved successfully
 */
router.get('/shipping_rates', authenticateToken, getShippingRates);

/**
 * @swagger
 * /api/settings/shipping_rates:
 *   put:
 *     summary: Update shipping rates with default units (Admin/Superadmin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rates:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Shipping rates updated successfully
 */
router.put(
  '/shipping_rates',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  updateShippingRates
);

/**
 * @swagger
 * /api/settings/products:
 *   get:
 *     summary: Get product list
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product list retrieved successfully
 */
router.get('/products', authenticateToken, getProductList);

/**
 * @swagger
 * /api/settings/products:
 *   put:
 *     summary: Update product list (Admin/Superadmin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     cost:
 *                       type: number
 *     responses:
 *       200:
 *         description: Product list updated successfully
 */
router.put(
  '/products',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  updateProductList
);

export default router;
