import { Router } from 'express';
import authRoutes from './auth.routes';
import customerRoutes from './customer.routes';
import deliveryRoutes from './delivery.routes';
import moneyDeliveryRoutes from './money-delivery.routes';
import routeRoutes from './route.routes';
import userRouteRoutes from './user-route.routes';
import settingsRoutes from './settings.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customer', customerRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/money-deliveries', moneyDeliveryRoutes);
router.use('/route', routeRoutes);
router.use('/user-route', userRouteRoutes);
router.use('/settings', settingsRoutes);

export default router;
