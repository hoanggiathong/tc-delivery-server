import { Response } from 'express';
import { AuthRequest, ApiResponse, UserRole } from '@/types';
import { UserDeviceService } from '@/services/user-device.service';

export class UserDeviceController {
  private userDeviceService: UserDeviceService;

  constructor() {
    this.userDeviceService = new UserDeviceService();
  }

  getList = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      if (!this.userDeviceService.canManageDevices(req.user.role as UserRole)) {
        res.status(403).json({
          success: false,
          message: 'Bạn không có quyền quản lý thiết bị.',
        });
        return;
      }

      const devices = await this.userDeviceService.getAdminDeviceList();

      const response: ApiResponse = {
        success: true,
        message: 'Get user devices successful',
        data: devices,
      };

      res.status(200).json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Get user devices failed';

      res.status(500).json({
        success: false,
        message,
      });
    }
  };

  forceLogout = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      if (!this.userDeviceService.canManageDevices(req.user.role as UserRole)) {
        res.status(403).json({
          success: false,
          message: 'Bạn không có quyền đăng xuất thiết bị.',
        });
        return;
      }

      const { id } = req.params;

      await this.userDeviceService.forceLogoutDevice(id);

      res.status(200).json({
        success: true,
        message: 'Đã đăng xuất thiết bị.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Force logout device failed';

      res.status(500).json({
        success: false,
        message,
      });
    }
  };

  unlockDevice = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      if (!this.userDeviceService.canManageDevices(req.user.role as UserRole)) {
        res.status(403).json({
          success: false,
          message: 'Bạn không có quyền cấp phép thiết bị.',
        });
        return;
      }

      const { id } = req.params;

      await this.userDeviceService.unlockDevice(id);

      res.status(200).json({
        success: true,
        message: 'Đã cấp phép thiết bị.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cấp phép thiết bị thất bại.';

      res.status(400).json({
        success: false,
        message,
      });
    }
  };

  deleteLockedDevice = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      if (!this.userDeviceService.canManageDevices(req.user.role as UserRole)) {
        res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa thiết bị.',
        });
        return;
      }

      const { id } = req.params;

      await this.userDeviceService.deleteLockedDevice(id);

      res.status(200).json({
        success: true,
        message: 'Đã xóa thiết bị.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Xóa thiết bị thất bại.';

      res.status(400).json({
        success: false,
        message,
      });
    }
  };
}
