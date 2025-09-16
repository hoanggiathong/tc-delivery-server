import { LoginRequest } from '@/schemas/auth.schema';
import { TestService } from '@/services/test.service';
import { ApiResponse } from '@/types';
import { Request, Response } from 'express';

export class TestController {
  private testService: TestService;

  constructor() {
    this.testService = new TestService();
  }

  /**
   * @swagger
   * /api/test/cron-job-calculate-debt:
   *   get:
   *     summary: api test calculate debt
   *     tags: [Test]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: calculate debt successful
   *       400:
   *         description: calculattion failed
   */
  cronJobCalculateDebt = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.testService.cronjobCalculateDebt();

      const response: ApiResponse = {
        success: true,
        message: 'calculate debt successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('calculattion error:', error);

      const message = error instanceof Error ? error.message : 'calculattion failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };
}
