import { Router } from 'express';
import { SMSNotificationController } from '@/controllers/sms-notification.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole, ROLES } from '@/middlewares/role.middleware';
import { validate } from '@/middlewares/validation.middleware';
import {
  getEligibleDeliveriesSchema,
  sendNotificationsSchema,
  retryNotificationSchema,
  updateSMSStatusSchema,
  getSMSLogsByDeliverySchema,
  getAllSMSLogsSchema,
} from '@/schemas/sms-notification.schema';

const router = Router();
const smsController = new SMSNotificationController();

/**
 * @swagger
 * tags:
 *   name: SMS Notifications
 *   description: SMS/Zalo ZNS notification management
 */

/**
 * @swagger
 * /api/sms/eligible:
 *   get:
 *     summary: Get deliveries eligible for SMS notification
 *     tags: [SMS Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: routeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID to filter deliveries
 *     responses:
 *       200:
 *         description: List of eligible deliveries
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get(
  '/eligible',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  validate(getEligibleDeliveriesSchema),
  smsController.getEligibleDeliveries
);

/**
 * @swagger
 * /api/sms/send:
 *   post:
 *     summary: Send notifications to selected deliveries
 *     tags: [SMS Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deliveryIds
 *             properties:
 *               deliveryIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *     responses:
 *       200:
 *         description: Notifications sent successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.post(
  '/send',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  validate(sendNotificationsSchema),
  smsController.sendNotifications
);

/**
 * @swagger
 * /api/sms/retry/{deliveryId}:
 *   post:
 *     summary: Retry failed notification for a delivery
 *     tags: [SMS Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification retried successfully
 *       400:
 *         description: Cannot retry or validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.post(
  '/retry/:deliveryId',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  validate(retryNotificationSchema),
  smsController.retryNotification
);

/**
 * @swagger
 * /api/sms/update-status/{deliveryId}:
 *   put:
 *     summary: Update SMS status manually
 *     tags: [SMS Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - smsStatus
 *             properties:
 *               smsStatus:
 *                 type: number
 *                 enum: [-3, -2, -1, 0, 1]
 *                 description: "-3=Phone Error, -2=Waiting App, -1=Waiting Zalo/SMS, 0=Not Sent, 1=Sent"
 *     responses:
 *       200:
 *         description: SMS status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Delivery not found
 */
router.put(
  '/update-status/:deliveryId',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  validate(updateSMSStatusSchema),
  smsController.updateSMSStatus
);

/**
 * @swagger
 * /api/sms/logs/{deliveryId}:
 *   get:
 *     summary: Get SMS logs for a specific delivery
 *     tags: [SMS Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SMS logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get(
  '/logs/:deliveryId',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  validate(getSMSLogsByDeliverySchema),
  smsController.getSMSLogsByDelivery
);

/**
 * @swagger
 * /api/sms/logs:
 *   get:
 *     summary: Get all SMS logs with filters
 *     tags: [SMS Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, success, failed]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: SMS logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get(
  '/logs',
  authenticateToken,
  requireRole(ROLES.ADMIN),
  validate(getAllSMSLogsSchema),
  smsController.getAllSMSLogs
);

export default router;
