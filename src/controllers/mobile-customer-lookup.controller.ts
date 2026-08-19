import type { Response } from 'express';

import type { CustomerAuthRequest } from '@/middlewares/authenticate-customer-token.middleware';
import {
  MobileCustomerLookupError,
  MobileCustomerLookupService,
} from '@/modules/mobile-customer/mobile-customer-lookup.service';

export class MobileCustomerLookupController {
  constructor(private readonly service = new MobileCustomerLookupService()) {}

  suggest = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const phone = req.customer?.phone;

      if (!phone) {
        throw new MobileCustomerLookupError(
          'Customer not authenticated',
          401,
          'CUSTOMER_NOT_AUTHENTICATED'
        );
      }

      const data = await this.service.suggest(
        phone,
        String(req.query.q || ''),
        Number(req.query.limit || 6)
      );

      res.status(200).json({
        success: true,
        message: 'Lấy gợi ý tra cứu thành công',
        data,
      });
    } catch (error) {
      this.handleError(error, res, 'LOOKUP_SUGGESTIONS_FAILED');
    }
  };

  lookupByFullCode = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const phone = req.customer?.phone;

      if (!phone) {
        throw new MobileCustomerLookupError(
          'Customer not authenticated',
          401,
          'CUSTOMER_NOT_AUTHENTICATED'
        );
      }

      const result = await this.service.lookupByFullCode(phone, req.params.fullCode);

      res.status(200).json({
        success: true,
        message: 'Tra cứu mã thành công',
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, 'TRACKING_LOOKUP_FAILED');
    }
  };

  private handleError(error: unknown, res: Response, fallbackCode: string): void {
    if (error instanceof MobileCustomerLookupError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });

      return;
    }

    res.status(500).json({
      success: false,
      message: 'Không thể tra cứu mã lúc này',
      code: fallbackCode,
    });
  }
}
