import { Router } from 'express';
import { authenticateCustomerToken } from '@/middlewares/authenticate-customer-token.middleware';
import { MobileCustomerRouteController } from '@/controllers/mobile-customer-route.controller';

const router = Router();
const controller = new MobileCustomerRouteController();

router.get('/', authenticateCustomerToken, controller.getRoutes);

export default router;
