import { Router } from 'express';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { HomeDeliveryPriceController } from '@/controllers/home-delivery-price.controller';

const router = Router();
const homeDeliveryPriceController = new HomeDeliveryPriceController();

router.use(authenticateToken);

router.post('/calculate', homeDeliveryPriceController.calculate);

export default router;
