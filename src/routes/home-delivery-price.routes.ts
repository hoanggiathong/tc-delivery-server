import { Router } from 'express';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { HomeDeliveryPriceController } from '@/controllers/home-delivery-price.controller';

const router = Router();
const homeDeliveryPriceController = new HomeDeliveryPriceController();

router.use(authenticateToken);

router.get('/', homeDeliveryPriceController.getList);
router.get('/by-route/:routeId', homeDeliveryPriceController.getListByRouteId);
router.post('/', homeDeliveryPriceController.create);
router.put('/:id', homeDeliveryPriceController.update);
router.delete('/:id', homeDeliveryPriceController.delete);

export default router;
