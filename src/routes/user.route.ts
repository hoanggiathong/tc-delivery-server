import { UserController } from '@/controllers/user.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validation.middleware';
import { updateAdditionalInformationProductConfigSchema } from '@/schemas/user.schema';
import { Router } from 'express';

const router = Router();
const userController = new UserController();

// Protected routes

/**
 * @swagger
 * /api/user/additional-information-product-by-account:
 *   put:
 *     summary: Update additional information product by account
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - additionalInformationProductList
 *             properties:
 *               additionalInformationProductList:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: string
 *                       example: "Hàng dễ vỡ"
 *                     position:
 *                       type: number
 *                       example: 1
 *           examples:
 *             createProducts:
 *               summary: Update additional information product by account example
 *               value:
 *                 additionalInformationProductList:
 *                   - content: "Hàng dễ vỡ"
 *                     position: 1
 *                   - content: "Hàng dễ vỡ"
 *                     position: 2
 *                   - content: "Hàng dễ vỡ"
 *                     position: 3
 *                   - content: "Hàng dễ vỡ"
 *                     position: 4
 *                   - content: "Hàng dễ vỡ"
 *                     position: 5
 *                   - content: "Hàng dễ vỡ"
 *                     position: 6
 *     responses:
 *       201:
 *         description: Additional information product by account updated successfully
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
 *                   example: "Additional information product by account updated successfully"
 *       400:
 *         description: Invalid request data or validation errors
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient privileges
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
 *                   example: "Internal server error"
 */
router.put(
  '/additional-information-product-by-account',
  authenticateToken,
  validate(updateAdditionalInformationProductConfigSchema),
  userController.updateAdditionalInformationProductWithDefaults
);

/**
 * @swagger
 * /api/user/additional-information-product-by-account:
 *   get:
 *     summary: Get additional information product by account
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Additional information product by account retrieved successfully
 */
router.get(
  '/additional-information-product-by-account',
  authenticateToken,
  userController.getListAdditionalInformationProductByAccount
);

export default router;
