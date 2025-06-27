import { Router } from 'express';
import authRoutes from './auth.routes';
import customerRoutes from './customer.routes';
import deliveryRoutes from './delivery.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customer', customerRoutes);
router.use('/delivery', deliveryRoutes);

export default router;