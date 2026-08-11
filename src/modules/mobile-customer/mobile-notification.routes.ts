import { Router } from 'express';

import { MobileNotificationController } from '@/controllers/mobile-notification.controller';
import { MobileNotificationPreferenceController } from '@/controllers/mobile-notification-preference.controller';
import { authenticateCustomerToken } from '@/middlewares/authenticate-customer-token.middleware';

const router = Router();

const controller = new MobileNotificationController();

const preferenceController = new MobileNotificationPreferenceController();

/**
 * GET /api/mobile/customer/notifications/unread-count
 */
router.get('/unread-count', authenticateCustomerToken, controller.getUnreadCount);

/**
 * PUT /api/mobile/customer/notifications/read-all
 */
router.put('/read-all', authenticateCustomerToken, controller.markAllNotificationsAsRead);

/**
 * GET /api/mobile/customer/notifications/preferences
 */
router.get('/preferences', authenticateCustomerToken, preferenceController.getPreferences);

/**
 * PUT /api/mobile/customer/notifications/preferences
 */
router.put('/preferences', authenticateCustomerToken, preferenceController.updatePreferences);

/**
 * PUT /api/mobile/customer/notifications/:notificationId/read
 */
router.put('/:notificationId/read', authenticateCustomerToken, controller.markNotificationAsRead);

/**
 * GET /api/mobile/customer/notifications/:notificationId
 */
router.get('/:notificationId', authenticateCustomerToken, controller.getNotificationById);

/**
 * GET /api/mobile/customer/notifications
 */
router.get('/', authenticateCustomerToken, controller.getNotifications);

export default router;
