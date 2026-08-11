import type { Response } from 'express';

import type { CustomerAuthRequest } from '@/middlewares/authenticate-customer-token.middleware';
import { MobileCustomerSecurityEventService } from '@/modules/mobile-customer/mobile-customer-security-event.service';

export class MobileCustomerSecurityEventController {
  constructor(private readonly securityEventService = new MobileCustomerSecurityEventService()) {}

  list = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const accountId = req.customer?.accountId || req.customer?.id;

      if (!accountId) {
        res.status(401).json({
          success: false,
          message: 'Customer not authenticated',
          code: 'ACCESS_TOKEN_REQUIRED',
        });
        return;
      }

      const result = await this.securityEventService.list(
        accountId,
        req.query.page,
        req.query.limit
      );

      res.status(200).json({
        success: true,
        message: 'Lấy lịch sử bảo mật thành công',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Không tải được lịch sử bảo mật',
      });
    }
  };
}
