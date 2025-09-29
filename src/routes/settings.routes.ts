import { Router } from 'express';
import { SettingsController } from '@/controllers/settings.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { validate } from '@/middlewares/validation.middleware';
import { UserRole } from '@/types/user.type';
import {
  calculateShippingFeeSchema,
  updateShippingRatesSchema,
  updateProductListSchema,
  deleteShippingRateSchema,
  updateShippingRateByIdSchema,
  deleteProductSchema,
  updateProductByIdSchema,
  updateBankListSchema,
} from '@/schemas/settings.schema';

const router = Router();
const settingsController = new SettingsController();

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

// Generic CRUD routes for settings
router.post(
  '/',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  settingsController.createSettings
);

router.get(
  '/',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  settingsController.getAllSettings
);

/**
 * @swagger
 * /api/settings/calculate-shipping-fee:
 *   post:
 *     summary: Calculate shipping fee based on amount
 *     tags: [Settings - shipping-rates]
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
 *               isFree:
 *                 type: boolean
 *                 default: false
 *                 description: Whether the shipping is free (returns 0 fee regardless of amount/type)
 *                 example: false
 *           examples:
 *             regular:
 *               summary: Regular shipping fee
 *               value:
 *                 amount: 1000000
 *                 isExpress: false
 *                 isFree: false
 *             express:
 *               summary: Express shipping fee
 *               value:
 *                 amount: 1000000
 *                 isExpress: true
 *                 isFree: false
 *             free:
 *               summary: Free shipping
 *               value:
 *                 amount: 1000000
 *                 isExpress: false
 *                 isFree: true
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
 *                     isFree:
 *                       type: boolean
 *                       description: Whether the shipping was free
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
 *                     isFree: false
 *                     shippingFee: 15000
 *               expressFee:
 *                 summary: Express shipping fee response
 *                 value:
 *                   success: true
 *                   message: "Shipping fee calculated successfully"
 *                   data:
 *                     amount: 1000000
 *                     isExpress: true
 *                     isFree: false
 *                     shippingFee: 30000
 *               percentageFee:
 *                 summary: Percentage-based fee response
 *                 value:
 *                   success: true
 *                   message: "Shipping fee calculated successfully"
 *                   data:
 *                     amount: 10000000
 *                     isExpress: false
 *                     isFree: false
 *                     shippingFee: 100000
 *               freeFee:
 *                 summary: Free shipping response
 *                 value:
 *                   success: true
 *                   message: "Shipping fee calculated successfully"
 *                   data:
 *                     amount: 1000000
 *                     isExpress: false
 *                     isFree: true
 *                     shippingFee: 0
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
  settingsController.calculateShippingFee
);

/**
 * @swagger
 * /api/settings/shipping-rates:
 *   get:
 *     summary: Get shipping rates
 *     tags: [Settings - shipping-rates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shipping rates retrieved successfully
 */
router.get('/shipping-rates', authenticateToken, settingsController.getShippingRates);

/**
 * @swagger
 * /api/settings/shipping-rates:
 *   put:
 *     summary: Append new shipping rates to existing ones (Admin/Superadmin only)
 *     tags: [Settings - shipping-rates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rates
 *             properties:
 *               rates:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   $ref: '#/components/schemas/ShippingRate'
 *                 description: Array of new shipping rate configurations to append (with default units VND)
 *           examples:
 *             appendRates:
 *               summary: Append shipping rates example
 *               value:
 *                 rates:
 *                   - fromAmount: 0
 *                     toAmount: 500000
 *                     regularShippingFee: 10000
 *                     expressShippingFee: 20000
 *                   - fromAmount: 500001
 *                     toAmount: 1000000
 *                     regularShippingFee: 15000
 *                     expressShippingFee: 30000
 *                   - fromAmount: 1000001
 *                     toAmount: 2000000
 *                     regularShippingFee: 0.02
 *                     expressShippingFee: 0.04
 *                     regularShippingFeeUnit: "%"
 *                     expressShippingFeeUnit: "%"
 *     responses:
 *       200:
 *         description: Shipping rates updated successfully
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
 *                   example: "Shipping rates appended successfully"
 *             examples:
 *               success:
 *                 summary: Successful append
 *                 value:
 *                   success: true
 *                   message: "Shipping rates appended successfully"
 *               failure:
 *                 summary: Append failure
 *                 value:
 *                   success: false
 *                   message: "Failed to append shipping rates"
 *       400:
 *         description: Invalid request data or validation errors
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
 *                   example: "Validation error: At least one shipping rate is required"
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
 *       403:
 *         description: Insufficient privileges
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
 *                   example: "Access denied. Admin role required"
 */
/**
 * @swagger
 * /api/settings/shipping-rates:
 *   post:
 *     summary: Create new shipping rates (replace all existing rates) (Admin/Superadmin only)
 *     tags: [Settings - shipping-rates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rates
 *             properties:
 *               rates:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   $ref: '#/components/schemas/ShippingRate'
 *                 description: Array of shipping rate configurations to replace all existing rates
 *           examples:
 *             createRates:
 *               summary: Create shipping rates example
 *               value:
 *                 rates:
 *                   - fromAmount: 0
 *                     toAmount: 500000
 *                     regularShippingFee: 10000
 *                     expressShippingFee: 20000
 *                   - fromAmount: 500001
 *                     toAmount: 1000000
 *                     regularShippingFee: 15000
 *                     expressShippingFee: 30000
 *     responses:
 *       201:
 *         description: Shipping rates created successfully
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
 *                   example: "Shipping rates created successfully"
 *       400:
 *         description: Invalid request data or validation errors
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient privileges
 */
router.post(
  '/shipping-rates',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(updateShippingRatesSchema),
  settingsController.createShippingRates
);

router.put(
  '/shipping-rates',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(updateShippingRatesSchema),
  settingsController.updateShippingRates
);

/**
 * @swagger
 * /api/settings/products:
 *   get:
 *     summary: Get product list
 *     tags: [Settings - products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product list retrieved successfully
 */
router.get('/products', authenticateToken, settingsController.getProductList);

/**
 * @swagger
 * /api/settings/banks:
 *   get:
 *     summary: Get banks list
 *     tags: [Settings - banks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bank list retrieved successfully
 */
router.get('/banks', authenticateToken, settingsController.getBankList);

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
/**
 * @swagger
 * /api/settings/products:
 *   post:
 *     summary: Create new products (replace all existing products) (Admin/Superadmin only)
 *     tags: [Settings - products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - products
 *             properties:
 *               products:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Bánh mì"
 *                     cost:
 *                       type: number
 *                       example: 25000
 *           examples:
 *             createProducts:
 *               summary: Create products example
 *               value:
 *                 products:
 *                   - name: "Bánh mì"
 *                     cost: 25000
 *                   - name: "Phở"
 *                     cost: 50000
 *                   - name: "Cà phê"
 *                     cost: 30000
 *     responses:
 *       201:
 *         description: Products created successfully
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
 *                   example: "Products created successfully"
 *       400:
 *         description: Invalid request data or validation errors
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient privileges
 */
router.post(
  '/products',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(updateProductListSchema),
  settingsController.createProducts
);

/**
 * @swagger
 * /api/settings/banks:
 *   post:
 *     summary: Create new banks (replace all existing banks) (Admin/Superadmin only)
 *     tags: [Settings - banks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - banks
 *             properties:
 *               banks:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Vietcombank (VCB)"
 *           examples:
 *             createProducts:
 *               summary: Create products example
 *               value:
 *                 banks:
 *                   - name: "Vietcombank (VCB)"
 *                   - name: "VietinBank (CTG)"
 *                   - name: "VPBank (VPB)"
 *                   - name: "Techcombank (TCB)"
 *     responses:
 *       201:
 *         description: Banks created successfully
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
 *                   example: "Banks created successfully"
 *       400:
 *         description: Invalid request data or validation errors
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient privileges
 */
router.post(
  '/banks',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(updateBankListSchema),
  settingsController.createBanks
);

/**
 * @swagger
 * /api/settings/products:
 *   put:
 *     summary: Append new products to existing ones (Admin/Superadmin only)
 *     tags: [Settings - products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - products
 *             properties:
 *               products:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Nước chanh"
 *                     cost:
 *                       type: number
 *                       example: 20000
 *                 description: Array of new products to append to existing products
 *           examples:
 *             appendProducts:
 *               summary: Append products example
 *               value:
 *                 products:
 *                   - name: "Nước chanh"
 *                     cost: 20000
 *                   - name: "Trà đá"
 *                     cost: 15000
 *     responses:
 *       200:
 *         description: Products appended successfully
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
 *                   example: "Products appended successfully"
 *       400:
 *         description: Invalid request data or validation errors
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient privileges
 */
router.put(
  '/products',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(updateProductListSchema),
  settingsController.updateProductList
);

/**
 * @swagger
 * /api/settings/shipping-rates/{id}:
 *   delete:
 *     summary: Delete a specific shipping rate by ID (Admin/Superadmin only)
 *     tags: [Settings - shipping-rates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the shipping rate to delete
 *         example: "68a160568473a7fad9b29821"
 *     responses:
 *       200:
 *         description: Shipping rate deleted successfully
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
 *                   example: "Shipping rate deleted successfully"
 *       400:
 *         description: Invalid ObjectId format
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
 *                   example: "Invalid ObjectId format"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Shipping rate not found
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
 *                   example: 'Shipping rate with id "68a160568473a7fad9b29821" not found'
 *   put:
 *     summary: Update a specific shipping rate by ID (Admin/Superadmin only)
 *     tags: [Settings - shipping-rates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the shipping rate to update
 *         example: "68a160568473a7fad9b29821"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fromAmount:
 *                 type: number
 *                 minimum: 0
 *                 description: Starting amount for this rate range
 *                 example: 0
 *               toAmount:
 *                 type: number
 *                 minimum: 0
 *                 description: Ending amount for this rate range
 *                 example: 1000000
 *               regularShippingFee:
 *                 type: number
 *                 minimum: 0
 *                 description: Regular shipping fee for this range
 *                 example: 15000
 *               expressShippingFee:
 *                 type: number
 *                 minimum: 0
 *                 description: Express shipping fee for this range
 *                 example: 25000
 *               fromAmountUnit:
 *                 type: string
 *                 enum: [VND, USD, '%']
 *                 description: Unit for fromAmount
 *                 example: "VND"
 *               toAmountUnit:
 *                 type: string
 *                 enum: [VND, USD, '%']
 *                 description: Unit for toAmount
 *                 example: "VND"
 *               regularShippingFeeUnit:
 *                 type: string
 *                 enum: [VND, USD, '%']
 *                 description: Unit for regular shipping fee
 *                 example: "VND"
 *               expressShippingFeeUnit:
 *                 type: string
 *                 enum: [VND, USD, '%']
 *                 description: Unit for express shipping fee
 *                 example: "VND"
 *             description: At least one field must be provided
 *           examples:
 *             updateAmounts:
 *               summary: Update amount range
 *               value:
 *                 fromAmount: 0
 *                 toAmount: 2000000
 *             updateFees:
 *               summary: Update shipping fees
 *               value:
 *                 regularShippingFee: 20000
 *                 expressShippingFee: 35000
 *             updateUnits:
 *               summary: Update to percentage-based fees
 *               value:
 *                 regularShippingFee: 2.5
 *                 expressShippingFee: 4.0
 *                 regularShippingFeeUnit: "%"
 *                 expressShippingFeeUnit: "%"
 *     responses:
 *       200:
 *         description: Shipping rate updated successfully
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
 *                   example: "Shipping rate updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Shipping rate ID
 *                       example: "68a160568473a7fad9b29821"
 *                     fromAmount:
 *                       type: number
 *                       example: 0
 *                     toAmount:
 *                       type: number
 *                       example: 2000000
 *                     regularShippingFee:
 *                       type: number
 *                       example: 20000
 *                     expressShippingFee:
 *                       type: number
 *                       example: 35000
 *                     fromAmountUnit:
 *                       type: string
 *                       example: "VND"
 *                     toAmountUnit:
 *                       type: string
 *                       example: "VND"
 *                     regularShippingFeeUnit:
 *                       type: string
 *                       example: "VND"
 *                     expressShippingFeeUnit:
 *                       type: string
 *                       example: "VND"
 *       400:
 *         description: Invalid input data or ObjectId format
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
 *                   example: "At least one field must be provided for update"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Shipping rate not found
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
 *                   example: 'Shipping rate with id "68a160568473a7fad9b29821" not found'
 */
router.put(
  '/shipping-rates/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(updateShippingRateByIdSchema),
  settingsController.updateShippingRate
);

router.delete(
  '/shipping-rates/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(deleteShippingRateSchema),
  settingsController.deleteShippingRate
);

/**
 * @swagger
 * /api/settings/products/{id}:
 *   put:
 *     summary: Update a specific product by ID (Admin/Superadmin only)
 *     tags: [Settings - products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the product to update
 *         example: "68a160568473a7fad9b29821"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 description: Updated product name
 *                 example: "Bánh mì thịt"
 *               cost:
 *                 type: number
 *                 minimum: 0
 *                 description: Updated product cost
 *                 example: 30000
 *             description: At least one field (name or cost) must be provided
 *           examples:
 *             updateName:
 *               summary: Update product name only
 *               value:
 *                 name: "Bánh mì thịt nướng"
 *             updateCost:
 *               summary: Update product cost only
 *               value:
 *                 cost: 35000
 *             updateBoth:
 *               summary: Update both name and cost
 *               value:
 *                 name: "Bánh mì đặc biệt"
 *                 cost: 40000
 *     responses:
 *       200:
 *         description: Product updated successfully
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
 *                   example: "Product updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Product ID
 *                       example: "68a160568473a7fad9b29821"
 *                     name:
 *                       type: string
 *                       description: Updated product name
 *                       example: "Bánh mì đặc biệt"
 *                     cost:
 *                       type: number
 *                       description: Updated product cost
 *                       example: 40000
 *             examples:
 *               success:
 *                 summary: Successful update response
 *                 value:
 *                   success: true
 *                   message: "Product updated successfully"
 *                   data:
 *                     id: "68a160568473a7fad9b29821"
 *                     name: "Bánh mì đặc biệt"
 *                     cost: 40000
 *       400:
 *         description: Invalid input data or ObjectId format
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
 *                   example: "At least one field (name or cost) must be provided for update"
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
 *       403:
 *         description: Insufficient privileges
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
 *                   example: "Access denied. Admin role required"
 *       404:
 *         description: Product not found
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
 *                   example: 'Product with id "68a160568473a7fad9b29821" not found'
 *   delete:
 *     summary: Delete a specific product by ID (Admin/Superadmin only)
 *     tags: [Settings - products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the product to delete
 *         example: "68a160568473a7fad9b29821"
 *     responses:
 *       200:
 *         description: Product deleted successfully
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
 *                   example: "Product deleted successfully"
 *       400:
 *         description: Invalid ObjectId format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Product not found
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
 *                   example: 'Product with id "68a160568473a7fad9b29821" not found'
 */
router.put(
  '/products/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(updateProductByIdSchema),
  settingsController.updateProduct
);

router.delete(
  '/products/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(deleteProductSchema),
  settingsController.deleteProduct
);

// Generic routes for backward compatibility with tests
router.put(
  '/:name',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  settingsController.updateSettingsByName
);

router.delete(
  '/:name',
  authenticateToken,
  requireRole([UserRole.SUPERADMIN]),
  settingsController.deleteSettingsByName
);

export default router;
