import { Router } from 'express';
import { ShipmentLogController } from '@/controllers/shipment-log.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';

const router = Router();
const shipmentLogController = new ShipmentLogController();

router.get('/search-on-vehicle/:keyword', authenticateToken, shipmentLogController.searchOnVehicle);

export default router;
