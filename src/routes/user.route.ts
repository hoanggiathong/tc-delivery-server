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
 *                     selected:
 *                       type: boolean
 *                       example: false
 *                       description: Optional - If not provided or all false, first item will be auto-selected
 *           examples:
 *             withoutSelected:
 *               summary: Update without selected field (auto-select first item)
 *               value:
 *                 additionalInformationProductList:
 *                   - content: "Hàng dễ vỡ"
 *                     position: 1
 *                   - content: "Hàng nặng"
 *                     position: 2
 *                   - content: "Hàng cồng kềnh"
 *                     position: 3
 *                   - content: "Hàng có mùi"
 *                     position: 4
 *                   - content: "Hàng có chất lỏng"
 *                     position: 5
 *                   - content: "Hàng quý giá"
 *                     position: 6
 *             withSelected:
 *               summary: Update with specific selected item
 *               value:
 *                 additionalInformationProductList:
 *                   - content: "Hàng dễ vỡ"
 *                     position: 1
 *                     selected: false
 *                   - content: "Hàng nặng"
 *                     position: 2
 *                     selected: false
 *                   - content: "Hàng cồng kềnh"
 *                     position: 3
 *                     selected: true
 *                   - content: "Hàng có mùi"
 *                     position: 4
 *                     selected: false
 *                   - content: "Hàng có chất lỏng"
 *                     position: 5
 *                     selected: false
 *                   - content: "Hàng quý giá"
 *                     position: 6
 *                     selected: false
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
 *                   example: "Additional information product updated successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "507f1f77bcf86cd799439011"
 *                       content:
 *                         type: string
 *                         example: "Hàng dễ vỡ"
 *                       position:
 *                         type: number
 *                         example: 1
 *                       selected:
 *                         type: boolean
 *                         example: true
 *             examples:
 *               autoSelectedFirst:
 *                 summary: Auto-selected first item (no selected in request)
 *                 value:
 *                   success: true
 *                   message: "Additional information product updated successfully"
 *                   data:
 *                     - id: "507f1f77bcf86cd799439011"
 *                       content: "Hàng dễ vỡ"
 *                       position: 1
 *                       selected: true
 *                     - id: "507f1f77bcf86cd799439012"
 *                       content: "Hàng nặng"
 *                       position: 2
 *                       selected: false
 *                     - id: "507f1f77bcf86cd799439013"
 *                       content: "Hàng cồng kềnh"
 *                       position: 3
 *                       selected: false
 *                     - id: "507f1f77bcf86cd799439014"
 *                       content: "Hàng có mùi"
 *                       position: 4
 *                       selected: false
 *                     - id: "507f1f77bcf86cd799439015"
 *                       content: "Hàng có chất lỏng"
 *                       position: 5
 *                       selected: false
 *                     - id: "507f1f77bcf86cd799439016"
 *                       content: "Hàng quý giá"
 *                       position: 6
 *                       selected: false
 *               specificSelected:
 *                 summary: Specific item selected (position 3)
 *                 value:
 *                   success: true
 *                   message: "Additional information product updated successfully"
 *                   data:
 *                     - id: "507f1f77bcf86cd799439011"
 *                       content: "Hàng dễ vỡ"
 *                       position: 1
 *                       selected: false
 *                     - id: "507f1f77bcf86cd799439012"
 *                       content: "Hàng nặng"
 *                       position: 2
 *                       selected: false
 *                     - id: "507f1f77bcf86cd799439013"
 *                       content: "Hàng cồng kềnh"
 *                       position: 3
 *                       selected: true
 *                     - id: "507f1f77bcf86cd799439014"
 *                       content: "Hàng có mùi"
 *                       position: 4
 *                       selected: false
 *                     - id: "507f1f77bcf86cd799439015"
 *                       content: "Hàng có chất lỏng"
 *                       position: 5
 *                       selected: false
 *                     - id: "507f1f77bcf86cd799439016"
 *                       content: "Hàng quý giá"
 *                       position: 6
 *                       selected: false
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
 *                   example: "Validation failed"
 *             examples:
 *               emptyList:
 *                 summary: Empty array validation error
 *                 value:
 *                   success: false
 *                   message: "Validation failed: additionalInformationProductList must have at least 1 item"
 *               missingContent:
 *                 summary: Missing content field
 *                 value:
 *                   success: false
 *                   message: "Validation failed: content is required"
 *       401:
 *         description: Unauthorized - Missing or invalid token
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
 *                   example: "Unauthorized"
 *       404:
 *         description: User not found
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
 *                   example: "User not found"
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
 *                   example: "Failed to update additional information product"
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
 *     description: Retrieve the user's additional information product list with selected status. If no item is marked as selected, the first item will be automatically selected.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Additional information product list retrieved successfully
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
 *                   example: "additional information product list retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "507f1f77bcf86cd799439011"
 *                       content:
 *                         type: string
 *                         example: "Hàng dễ vỡ"
 *                       position:
 *                         type: number
 *                         example: 1
 *                       selected:
 *                         type: boolean
 *                         example: true
 *             examples:
 *               withData:
 *                 summary: User has product information list
 *                 value:
 *                   success: true
 *                   message: "additional information product list retrieved successfully"
 *                   data:
 *                     - id: "507f1f77bcf86cd799439011"
 *                       content: "Hàng dễ vỡ"
 *                       position: 1
 *                       selected: true
 *                     - id: "507f1f77bcf86cd799439012"
 *                       content: "Hàng nặng"
 *                       position: 2
 *                       selected: false
 *                     - id: "507f1f77bcf86cd799439013"
 *                       content: "Hàng cồng kềnh"
 *                       position: 3
 *                       selected: false
 *                     - id: "507f1f77bcf86cd799439014"
 *                       content: "Hàng có mùi"
 *                       position: 4
 *                       selected: false
 *                     - id: "507f1f77bcf86cd799439015"
 *                       content: "Hàng có chất lỏng"
 *                       position: 5
 *                       selected: false
 *                     - id: "507f1f77bcf86cd799439016"
 *                       content: "Hàng quý giá"
 *                       position: 6
 *                       selected: false
 *               emptyList:
 *                 summary: User has no product information
 *                 value:
 *                   success: true
 *                   message: "additional information product list retrieved successfully"
 *                   data: []
 *       401:
 *         description: Unauthorized - Missing or invalid token
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
 *                   example: "Unauthorized"
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
 *                   example: "Failed to get additional information product list"
 */
router.get(
  '/additional-information-product-by-account',
  authenticateToken,
  userController.getListAdditionalInformationProductByAccount
);

export default router;
