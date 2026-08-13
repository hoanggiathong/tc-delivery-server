import { Router } from 'express';

import authRoutes from './auth.routes';
import customerRoutes from './customer.routes';
import customerAddressHistoryRoutes from './customer-address-history.routes';
import debtManagementRoutes from './debt-management.route';
import debtRoutes from './debt.routes';
import deliveryRoutes from './delivery.routes';
import draftDeliveryRoutes from './draft-delivery.routes';
import editHistoryRoutes from './edit-history.routes';
import homeDeliveryCalculatorRoutes from './home-delivery-calculator.routes';
import homeDeliveryPriceRoutes from './home-delivery-price.routes';
import moneyDeliveryRoutes from './money-delivery.routes';
import reportRoutes from './report.routes';
import returnDeliveriesRoutes from './return-deliveries.route';
import returnMoneyDeliveriesRoutes from './return-money-deliveries.route';
import routeRoutes from './route.routes';
import settingsRoutes from './settings.routes';
import shipmentLogRoutes from './shipment-log.routes';
import smsNotificationRoutes from './sms-notification.routes';
import testRoutes from './test.routes';
import userDeviceRoutes from './user-device.routes';
import userRouteRoutes from './user-route.routes';
import userRoutes from './user.route';
import vietQrRoutes from './vietqr.routes';

import mobileCustomerAccountDeletionRoutes from '@/modules/mobile-customer/mobile-customer-account-deletion.routes';
import mobileCustomerAuthRoutes from '@/modules/mobile-customer/mobile-customer-auth.routes';
import mobileCustomerDeliveryRoutes from '@/modules/mobile-customer/mobile-customer-delivery.routes';
import mobileCustomerMoneyDeliveryRoutes from '@/modules/mobile-customer/mobile-customer-money-delivery.routes';
import mobileCustomerLookupRoutes from '@/modules/mobile-customer/mobile-customer-lookup.routes';
import mobileCustomerNewsRoutes from '@/modules/mobile-customer/mobile-news.routes';
import mobileCustomerProfileRoutes from '@/modules/mobile-customer/mobile-customer-profile.routes';
import mobileCustomerRouteRoutes from '@/modules/mobile-customer/mobile-customer-route.routes';
import mobileNotificationAdminRoutes from '@/modules/mobile-customer/mobile-notification-admin.routes';
import mobileNotificationRoutes from '@/modules/mobile-customer/mobile-notification.routes';
import mobilePushTokenRoutes from '@/modules/mobile-customer/mobile-push-token.routes';

const router = Router();

/**
 * Internal / web application routes
 */
router.use('/test', testRoutes);
router.use('/auth', authRoutes);
router.use('/customer', customerRoutes);
router.use('/customer-address-history', customerAddressHistoryRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/money-deliveries', moneyDeliveryRoutes);
router.use('/route', routeRoutes);
router.use('/user-route', userRouteRoutes);
router.use('/user', userRoutes);
router.use('/settings', settingsRoutes);
router.use('/edit-history', editHistoryRoutes);
router.use('/draft-deliveries', draftDeliveryRoutes);
router.use('/debt-management', debtManagementRoutes);
router.use('/debt', debtRoutes);
router.use('/return-deliveries', returnDeliveriesRoutes);
router.use('/return-money-deliveries', returnMoneyDeliveriesRoutes);
router.use('/report', reportRoutes);
router.use('/sms', smsNotificationRoutes);
router.use('/shipment-logs', shipmentLogRoutes);
router.use('/home-delivery-prices', homeDeliveryPriceRoutes);
router.use('/home-delivery-calculator', homeDeliveryCalculatorRoutes);
router.use('/vietqr', vietQrRoutes);
router.use('/user-devices', userDeviceRoutes);
router.use('/mobile-notifications', mobileNotificationAdminRoutes);

/**
 * GP Customer mobile routes
 */
router.use('/mobile/customer/auth', mobileCustomerAuthRoutes);

router.use('/mobile/customer/profile', mobileCustomerProfileRoutes);

router.use('/mobile/customer/routes', mobileCustomerRouteRoutes);

router.use('/mobile/customer/deliveries', mobileCustomerDeliveryRoutes);

router.use('/mobile/customer/money-deliveries', mobileCustomerMoneyDeliveryRoutes);

router.use('/mobile/customer/lookup', mobileCustomerLookupRoutes);

router.use('/mobile/customer/news', mobileCustomerNewsRoutes);
router.use('/mobile/customer/notifications', mobileNotificationRoutes);

router.use('/mobile/customer/push-tokens', mobilePushTokenRoutes);

router.use('/mobile/customer/account-deletion', mobileCustomerAccountDeletionRoutes);

export default router;
