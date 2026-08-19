import { Router } from 'express';

import { authenticateCustomerToken } from '@/middlewares/authenticate-customer-token.middleware';
import { MobileNewsController } from '@/controllers/mobile-news.controller';

const router = Router();

const controller = new MobileNewsController();

router.get('/', authenticateCustomerToken, controller.list);

router.get('/:slug', authenticateCustomerToken, controller.detail);

export default router;
