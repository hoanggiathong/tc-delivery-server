import { Router } from 'express';

import { authenticateCustomerToken } from '@/middlewares/authenticate-customer-token.middleware';
import { MobileCustomerLookupController } from '@/controllers/mobile-customer-lookup.controller';

const router = Router();

const controller = new MobileCustomerLookupController();

/**
 * PHẢI đứng trước /:fullCode.
 * Nếu đặt sau, "suggestions" sẽ bị Express hiểu thành fullCode.
 */
router.get('/suggestions', authenticateCustomerToken, controller.suggest);

router.get('/:fullCode', authenticateCustomerToken, controller.lookupByFullCode);

export default router;
