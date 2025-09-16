import { Router } from 'express';
import { TestController } from '@/controllers/test.controller';

const router = Router();
const testController = new TestController();

// Public routes
router.get('/cron-job-calculate-debt', testController.cronJobCalculateDebt);

export default router;
