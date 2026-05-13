import { Request, Response } from 'express';
import { ApiResponse } from '@/types';
import { ShipmentLogService } from '../services/shipment-log.service';

export class ShipmentLogController {
  private shipmentLogService: ShipmentLogService;

  constructor() {
    this.shipmentLogService = new ShipmentLogService();
  }

  searchOnVehicle = async (req: Request, res: Response): Promise<void> => {
    try {
      const { keyword } = req.params;

      if (!keyword?.trim()) {
        const response: ApiResponse = {
          success: false,
          message: 'Vui lòng nhập mã hàng cần tìm',
        };

        res.status(400).json(response);
        return;
      }

      const data = await this.shipmentLogService.searchOnVehicle(keyword);

      const response: ApiResponse = {
        success: true,
        message: 'Tìm kiếm lịch sử lên/xuống hàng thành công',
        data,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Search shipment log on vehicle error:', error);

      const message =
        error instanceof Error ? error.message : 'Không tìm thấy lịch sử mã hàng trên xe';

      const statusCode = message.includes('Không tìm thấy') ? 404 : 500;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };
}
