import { Router } from 'express';
import { authenticateCustomerToken } from '@/middlewares/authenticate-customer-token.middleware';
import { MobileCustomerMoneyDeliveryController } from '@/controllers/mobile-customer-money-delivery.controller';

const router = Router();
const controller = new MobileCustomerMoneyDeliveryController();

router.get('/sent', authenticateCustomerToken, controller.getSentMoneyDeliveries);
router.get('/received', authenticateCustomerToken, controller.getReceivedMoneyDeliveries);
router.get('/:fullCode', authenticateCustomerToken, controller.getMoneyDeliveryDetail);

export default router;
