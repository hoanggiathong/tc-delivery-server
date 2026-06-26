import mongoose from 'mongoose';
import { UserDevice } from '@/models/user-device.model';
//import { User } from '@/models/user.model';
import { UserRoute } from '@/models/user-route.model';
import { UserRole } from '@/types/user.type';

export interface TrackDevicePayload {
  userId: string;
  deviceId?: string;
  deviceName?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  userAgent?: string;
  currentRouteId?: string | null;
}

export class UserDeviceService {
  private readonly ONLINE_WINDOW_MINUTES = 10;

  async trackLogin(payload: TrackDevicePayload): Promise<void> {
    if (!payload.deviceId) {
      return;
    }

    const now = new Date();

    const existingDevice = await UserDevice.findOne({
      userId: new mongoose.Types.ObjectId(payload.userId),
      deviceId: payload.deviceId,
    })
      .select('forceLogout')
      .lean();

    if (existingDevice?.forceLogout) {
      throw new Error('Thiết bị này đã bị khóa bởi quản trị viên.');
    }

    await UserDevice.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(payload.userId),
        deviceId: payload.deviceId,
      },
      {
        $setOnInsert: {
          firstLoginAt: now,
        },
        $set: {
          deviceName: payload.deviceName || '',
          browser: payload.browser || '',
          os: payload.os || '',
          ipAddress: payload.ipAddress || '',
          userAgent: payload.userAgent || '',
          currentRouteId: payload.currentRouteId
            ? new mongoose.Types.ObjectId(payload.currentRouteId)
            : null,
          lastLoginAt: now,
          lastActiveAt: now,
          lastLogoutAt: null,
          //forceLogout: false,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );
  }

  async unlockDevice(deviceId: string): Promise<void> {
    await UserDevice.findByIdAndUpdate(deviceId, {
      $set: {
        forceLogout: false,
        lastLogoutAt: null,
      },
    });
  }

  async touchActive(payload: TrackDevicePayload): Promise<void> {
    if (!payload.deviceId) {
      return;
    }

    await UserDevice.updateOne(
      {
        userId: new mongoose.Types.ObjectId(payload.userId),
        deviceId: payload.deviceId,
      },
      {
        $set: {
          lastActiveAt: new Date(),
          ipAddress: payload.ipAddress || '',
          userAgent: payload.userAgent || '',
          ...(payload.currentRouteId !== undefined && {
            currentRouteId: payload.currentRouteId
              ? new mongoose.Types.ObjectId(payload.currentRouteId)
              : null,
          }),
        },
      }
    );
  }

  async isForceLogout(userId: string, deviceId?: string): Promise<boolean> {
    if (!deviceId) {
      return false;
    }

    const device = await UserDevice.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      deviceId,
    })
      .select('forceLogout')
      .lean();

    return Boolean(device?.forceLogout);
  }

  async forceLogoutDevice(deviceId: string): Promise<void> {
    await UserDevice.findByIdAndUpdate(deviceId, {
      $set: {
        forceLogout: true,
        lastLogoutAt: new Date(),
      },
    });
  }

  async getAdminDeviceList() {
    const onlineSince = new Date(Date.now() - this.ONLINE_WINDOW_MINUTES * 60 * 1000);

    const devices = await UserDevice.find({})
      .populate([
        { path: 'userId', select: '_id username name role selectedRouteId' },
        { path: 'currentRouteId', select: '_id code name' },
      ])
      .sort({ lastActiveAt: -1 })
      .lean();

    const isDeviceOnline = (device: any): boolean => {
      return Boolean(
        !device.forceLogout &&
          !device.lastLogoutAt &&
          device.lastActiveAt &&
          new Date(device.lastActiveAt) >= onlineSince
      );
    };

    const getObjectIdString = (value: any): string => {
      if (!value) {
        return '';
      }

      if (typeof value === 'string') {
        return value;
      }

      if (value._id) {
        return value._id.toString();
      }

      return value.toString?.() || '';
    };

    const getUserIdString = (device: any): string => {
      return getObjectIdString(device.userId?._id || device.userId);
    };

    /**
     * Đếm theo "phiên thiết bị vật lý tương đối":
     * - Cùng user + IP + userAgent + OS + deviceName => xem như cùng 1 máy/phiên.
     * - Khác key này mới tính là tài khoản đang ở nhiều thiết bị/môi trường.
     */

    const getSameInfoKey = (device: any): string => {
      const userId = getUserIdString(device);

      return [
        userId,
        device.ipAddress || '',
        device.userAgent || device.browser || '',
        device.os || '',
        device.deviceName || '',
      ].join('|');
    };

    const userIds = [...new Set(devices.map((d: any) => getUserIdString(d)).filter(Boolean))];

    const userRoutes = await UserRoute.find({
      userId: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) },
    })
      .populate({ path: 'routeId', select: '_id code name' })
      .lean();

    const allowedRouteMap = new Map<string, any[]>();

    for (const item of userRoutes as any[]) {
      const key = item.userId.toString();

      const route = item.routeId
        ? {
            id: item.routeId._id.toString(),
            code: item.routeId.code,
            name: item.routeId.name,
          }
        : null;

      if (!route) {
        continue;
      }

      if (!allowedRouteMap.has(key)) {
        allowedRouteMap.set(key, []);
      }

      const existingRoutes = allowedRouteMap.get(key) || [];
      existingRoutes.push(route);
      allowedRouteMap.set(key, existingRoutes);
    }

    /**
     * Đếm theo "phiên thiết bị vật lý tương đối":
     * - Cùng user + IP + userAgent + OS + deviceName + currentRoute => xem như cùng 1 máy/phiên.
     * - Khác key này mới tính là tài khoản thật sự đang ở nhiều thiết bị/môi trường.
     */
    const activeSessionKeysByUser = new Map<string, Set<string>>();

    /**
     * Đếm trường hợp cùng 1 deviceId nhưng nhiều user đang online.
     */
    const activeUserCountByDevice = new Map<string, Set<string>>();

    /**
     * Đếm trường hợp cùng thông tin máy nhưng phát sinh nhiều deviceId.
     * Đây là dấu hiệu FE bị tạo lại x-device-id.
     */
    const activeDeviceIdsBySameInfo = new Map<string, Set<string>>();

    for (const device of devices as any[]) {
      const userId = getUserIdString(device);
      const isOnline = isDeviceOnline(device);

      if (!userId || !isOnline) {
        continue;
      }

      const sameInfoKey = getSameInfoKey(device);

      if (!activeSessionKeysByUser.has(userId)) {
        activeSessionKeysByUser.set(userId, new Set<string>());
      }

      activeSessionKeysByUser.get(userId)?.add(sameInfoKey);

      if (device.deviceId) {
        if (!activeUserCountByDevice.has(device.deviceId)) {
          activeUserCountByDevice.set(device.deviceId, new Set<string>());
        }

        activeUserCountByDevice.get(device.deviceId)?.add(userId);

        if (!activeDeviceIdsBySameInfo.has(sameInfoKey)) {
          activeDeviceIdsBySameInfo.set(sameInfoKey, new Set<string>());
        }

        activeDeviceIdsBySameInfo.get(sameInfoKey)?.add(device.deviceId);
      }
    }

    return (devices as any[]).map(device => {
      const userId = getUserIdString(device);
      const isOnline = isDeviceOnline(device);
      const sameInfoKey = getSameInfoKey(device);

      const activeSessionCount = activeSessionKeysByUser.get(userId)?.size || 0;
      const activeUsersOnDevice = activeUserCountByDevice.get(device.deviceId)?.size || 0;
      const sameInfoDeviceCount = activeDeviceIdsBySameInfo.get(sameInfoKey)?.size || 0;

      return {
        id: device._id.toString(),
        user: device.userId
          ? {
              id: device.userId._id.toString(),
              username: device.userId.username,
              name: device.userId.name,
              role: device.userId.role,
            }
          : null,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        browser: device.browser,
        os: device.os,
        ipAddress: device.ipAddress,
        currentRoute: device.currentRouteId
          ? {
              id: device.currentRouteId._id.toString(),
              code: device.currentRouteId.code,
              name: device.currentRouteId.name,
            }
          : null,
        allowedRoutes: allowedRouteMap.get(userId) || [],
        firstLoginAt: device.firstLoginAt,
        lastLoginAt: device.lastLoginAt,
        lastActiveAt: device.lastActiveAt,
        lastLogoutAt: device.lastLogoutAt,
        forceLogout: device.forceLogout,
        isOnline,
        warnings: {
          multipleDevicesBySameUser: isOnline && activeSessionCount > 1,
          sameDeviceMultipleUsers: isOnline && activeUsersOnDevice > 1,
          sameInfoDifferentDeviceId: isOnline && sameInfoDeviceCount > 1,
        },
      };
    });
  }

  canManageDevices(role: UserRole): boolean {
    return role === UserRole.ADMIN || role === UserRole.SUPERADMIN;
  }
}
