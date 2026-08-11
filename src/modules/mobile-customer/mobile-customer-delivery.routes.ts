import { Router } from 'express';
import { authenticateCustomerToken } from '@/middlewares/authenticate-customer-token.middleware';
import { MobileCustomerDeliveryController } from '@/controllers/mobile-customer-delivery.controller';

const router = Router();
const controller = new MobileCustomerDeliveryController();

router.use(authenticateCustomerToken);

router.get('/sent', controller.getSentDeliveries);
router.get('/received', controller.getReceivedDeliveries);
router.get('/history', controller.getHistoryDeliveries);

// Các route cụ thể phải đặt trước /:id.
router.get('/search/:fullCode', controller.searchByFullCode);
router.get('/code/:code', controller.getDeliveryByCode);

// Route động đặt cuối cùng để không bắt nhầm "search", "code", "history".
router.get('/:id', controller.getDeliveryById);

export default router;
