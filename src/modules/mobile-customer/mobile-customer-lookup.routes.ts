import { Router } from 'express';

import { authenticateCustomerToken } from '@/middlewares/authenticate-customer-token.middleware';
import { MobileCustomerLookupController } from '@/controllers/mobile-customer-lookup.controller';

const router = Router();

const controller = new MobileCustomerLookupController();

router.get('/:fullCode', authenticateCustomerToken, controller.lookupByFullCode);

export default router;
