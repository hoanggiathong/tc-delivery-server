import { TestController } from '@/controllers/test.controller';
import { Router } from 'express';

const router = Router();
const testController = new TestController();

// Public routes
router.get('/cron-job-calculate-debt', testController.cronJobCalculateDebt);

export default router;
