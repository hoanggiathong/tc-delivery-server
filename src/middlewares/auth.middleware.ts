import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JWTPayload } from '@/types';
import { UserDeviceService } from '@/services/user-device.service';
import { User } from '@/models/user.model';

const userDeviceService = new UserDeviceService();

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access token is required',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    req.user = decoded;

    const deviceId = String(req.headers['x-device-id'] || '').trim();

    if (deviceId) {
      const isForceLogout = await userDeviceService.isForceLogout(decoded.userId, deviceId);

      if (isForceLogout) {
        res.status(401).json({
          success: false,
          message: 'Thiết bị này đã bị đăng xuất bởi quản trị viên.',
          code: 'DEVICE_FORCE_LOGOUT',
        });
        return;
      }

      const user = await User.findById(decoded.userId).select('selectedRouteId').lean();

      await userDeviceService.touchActive({
        userId: decoded.userId,
        deviceId,
        ipAddress:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          req.socket.remoteAddress ||
          '',
        userAgent: req.headers['user-agent'] || '',
        currentRouteId: user?.selectedRouteId?.toString() || null,
      });
    }

    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
    });
    return;
  }
};
