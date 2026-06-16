import { Request, Response } from 'express';
import { ApiResponse } from '@/types';
import { VietQrService } from '@/services/vietqr.service';

export class VietQrController {
  private vietQrService: VietQrService;

  constructor() {
    this.vietQrService = new VietQrService();
  }

  generateQr = async (req: Request, res: Response): Promise<void> => {
    try {
      const qrBase64 = await this.vietQrService.generateQrBase64(req.body);

      const response: ApiResponse = {
        success: true,
        message: 'VietQR generated successfully',
        data: { qrBase64 },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Generate VietQR error:', error);

      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Không tạo được mã QR.',
      };

      res.status(400).json(response);
    }
  };
}
