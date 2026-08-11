import { Response } from 'express';
import { ApiResponse } from '@/types';
import { MobileCustomerDeliveryService } from '@/modules/mobile-customer/mobile-customer-delivery.service';
import type { CustomerAuthRequest } from '@/middlewares/authenticate-customer-token.middleware';

export class MobileCustomerDeliveryController {
  private service = new MobileCustomerDeliveryService();

  private getCustomerPhone(req: CustomerAuthRequest): string {
    const phone = req.customer?.phone;

    if (!phone) {
      throw new Error('Customer phone not found');
    }

    return phone;
  }

  getSentDeliveries = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const phone = this.getCustomerPhone(req);

      const result = await this.service.listByCustomerPhone({
        phone,
        direction: 'sent',
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 20),
        keyword: req.query.keyword as string | undefined,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Customer sent deliveries retrieved successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get customer sent deliveries';

      res.status(message.includes('phone') ? 401 : 500).json({
        success: false,
        message,
      });
    }
  };

  getReceivedDeliveries = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const phone = this.getCustomerPhone(req);

      const result = await this.service.listByCustomerPhone({
        phone,
        direction: 'received',
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 20),
        keyword: req.query.keyword as string | undefined,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Customer received deliveries retrieved successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get customer received deliveries';

      res.status(message.includes('phone') ? 401 : 500).json({
        success: false,
        message,
      });
    }
  };

  getHistoryDeliveries = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    const startedAt = Date.now();

    try {
      const phone = req.customer?.phone;

      if (!phone) {
        res.status(401).json({
          success: false,
          message: 'Customer not authenticated',
        });
        return;
      }

      const page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 50);

      const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : undefined;

      const result = await this.service.listHistoryByCustomerPhone({
        phone,
        page,
        limit,
        keyword,
      });

      res.status(200).json({
        success: true,
        message: 'Lấy lịch sử vận đơn thành công',
        data: result,
      });

      console.log('[MOBILE DELIVERY HISTORY]', {
        phone,
        page,
        limit,
        total: result.pagination.total,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      console.error('[MOBILE DELIVERY HISTORY ERROR]', {
        durationMs: Date.now() - startedAt,
        error,
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Không tải được lịch sử vận đơn',
      });
    }
  };

  searchByFullCode = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const phone = this.getCustomerPhone(req);
      const fullCode = String(req.params.fullCode || '')
        .trim()
        .toUpperCase();

      if (!fullCode) {
        res.status(400).json({
          success: false,
          message: 'Mã vận đơn không hợp lệ',
        });
        return;
      }

      const delivery = await this.service.getByFullCodeForCustomer(phone, fullCode);

      if (!delivery) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy vận đơn thuộc tài khoản này',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Tra cứu vận đơn thành công',
        data: {
          delivery,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tra cứu vận đơn';

      res.status(message.includes('phone') ? 401 : 500).json({
        success: false,
        message,
      });
    }
  };

  getDeliveryById = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const phone = this.getCustomerPhone(req);
      const id = String(req.params.id || '').trim();

      const delivery = await this.service.getByIdForCustomer(phone, id);

      if (!delivery) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy vận đơn thuộc tài khoản này',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Lấy chi tiết vận đơn thành công',
        data: {
          delivery,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không tải được chi tiết vận đơn';

      const statusCode = message.includes('phone')
        ? 401
        : message.includes('ObjectId') || message.includes('không hợp lệ')
          ? 400
          : 500;

      res.status(statusCode).json({
        success: false,
        message,
      });
    }
  };

  getDeliveryByCode = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const phone = this.getCustomerPhone(req);
      const code = String(req.params.code || '')
        .trim()
        .toUpperCase();

      if (!code) {
        res.status(400).json({
          success: false,
          message: 'Mã vận đơn không hợp lệ',
        });
        return;
      }

      const delivery = await this.service.getByCodeForCustomer(phone, code);

      if (!delivery) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy vận đơn thuộc tài khoản này',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Lấy vận đơn thành công',
        data: {
          delivery,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không tải được vận đơn';

      res.status(message.includes('phone') ? 401 : 500).json({
        success: false,
        message,
      });
    }
  };
}
