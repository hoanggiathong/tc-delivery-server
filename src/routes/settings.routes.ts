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
  settingsController.calculateShippingFee
);

/**
 * @swagger
 * /api/settings/shipping-rates:
 *   get:
 *     summary: Get shipping rates
 *     tags: [Settings]
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
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product list retrieved successfully
 */
router.get('/products', authenticateToken, settingsController.getProductList);

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
  validate(updateProductListSchema),
  settingsController.updateProductList
);

/**
 * @swagger
 * /api/settings/shipping-rates/{id}:
 *   delete:
 *     summary: Delete a specific shipping rate by ID (Admin/Superadmin only)
 *     tags: [Settings]
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
 */
router.delete(
  '/shipping-rates/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(deleteShippingRateSchema),
  settingsController.deleteShippingRate
);

export default router;
