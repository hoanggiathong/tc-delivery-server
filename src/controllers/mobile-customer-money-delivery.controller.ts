import { Request, Response } from 'express';
import { ApiResponse } from '@/types';
import { MoneyDeliveryStatus, MoneyDeliveryType } from '@/models/money-delivery.model';
import { MobileCustomerMoneyDeliveryService } from '@/modules/mobile-customer/mobile-customer-money-delivery.service';

interface CustomerAuthRequest extends Request {
  customer?: {
    id?: string;
    phone: string;
    name?: string;
  };
}

export class MobileCustomerMoneyDeliveryController {
  private service: MobileCustomerMoneyDeliveryService;

  constructor() {
    this.service = new MobileCustomerMoneyDeliveryService();
  }

  private getCustomerPhone(req: CustomerAuthRequest): string {
    const phone = req.customer?.phone;

    if (!phone) {
      throw new Error('Customer phone not found');
    }

    return phone;
  }

  getSentMoneyDeliveries = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const phone = this.getCustomerPhone(req);

      const result = await this.service.listByCustomerPhone({
        phone,
        direction: 'sent',
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 20),
        keyword: req.query.keyword as string | undefined,
        status: req.query.status as MoneyDeliveryStatus | undefined,
        type: req.query.type as MoneyDeliveryType | undefined,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Customer sent money deliveries retrieved successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get customer sent money deliveries';

      res.status(message.includes('phone') ? 401 : 500).json({
        success: false,
        message,
      });
    }
  };

  getReceivedMoneyDeliveries = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const phone = this.getCustomerPhone(req);

      const result = await this.service.listByCustomerPhone({
        phone,
        direction: 'received',
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 20),
        keyword: req.query.keyword as string | undefined,
        status: req.query.status as MoneyDeliveryStatus | undefined,
        type: req.query.type as MoneyDeliveryType | undefined,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Customer received money deliveries retrieved successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get customer received money deliveries';

      res.status(message.includes('phone') ? 401 : 500).json({
        success: false,
        message,
      });
    }
  };

  getMoneyDeliveryDetail = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const phone = this.getCustomerPhone(req);
      const { fullCode } = req.params;

      const result = await this.service.getDetailByFullCode(phone, fullCode);

      if (!result) {
        res.status(404).json({
          success: false,
          message: 'Money delivery not found',
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Customer money delivery detail retrieved successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get customer money delivery detail';

      res.status(message.includes('phone') ? 401 : 500).json({
        success: false,
        message,
      });
    }
  };
}
