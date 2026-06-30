import mongoose from 'mongoose';
import { UserDevice } from '@/models/user-device.model';
import { User } from '@/models/user.model';
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

  private async getUserRole(userId: string): Promise<UserRole | null> {
    const user = await User.findById(userId).select('role').lean();

    return (user?.role as UserRole) || null;
  }

  private async saveBlockedLoginDevice(payload: TrackDevicePayload): Promise<void> {
    if (!payload.deviceId) {
      return;
    }

    const now = new Date();

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
          lastLogoutAt: now,
          forceLogout: true,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );
  }

  async trackLogin(payload: TrackDevicePayload): Promise<void> {
    if (!payload.deviceId) {
      throw new Error('Thiếu mã thiết bị đăng nhập. Vui lòng tải lại trang và đăng nhập lại.');
    }

    const now = new Date();
    const userObjectId = new mongoose.Types.ObjectId(payload.userId);

    const role = await this.getUserRole(payload.userId);

    /**
     * ADMIN / SUPERADMIN:
     * - Không cần cấp phép thiết bị.
     * - Thiết bị mới tự được ghi nhận là đã cấp phép.
     */
    if (role === UserRole.ADMIN || role === UserRole.SUPERADMIN) {
      await UserDevice.findOneAndUpdate(
        {
          userId: userObjectId,
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
            forceLogout: false,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

      return;
    }

    const existingDevice = await UserDevice.findOne({
      userId: userObjectId,
      deviceId: payload.deviceId,
    })
      .select('forceLogout')
      .lean();

    /**
     * Các role còn lại:
     * - Thiết bị mới chưa có record => lưu lại trạng thái chờ cấp phép và chặn login.
     * - Thiết bị đã bị khóa / chờ cấp phép => chặn login.
     * - Chỉ thiết bị forceLogout=false mới được login.
     */
    if (!existingDevice) {
      await this.saveBlockedLoginDevice(payload);

      throw new Error('Thiết bị này chưa được cấp phép đăng nhập. Vui lòng liên hệ quản trị viên.');
    }

    if (existingDevice.forceLogout) {
      throw new Error('Thiết bị này chưa được cấp phép đăng nhập. Vui lòng liên hệ quản trị viên.');
    }

    await UserDevice.findOneAndUpdate(
      {
        userId: userObjectId,
        deviceId: payload.deviceId,
      },
      {
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
        },
      }
    );
  }

  async unlockDevice(deviceId: string): Promise<void> {
    const targetDevice = await UserDevice.findById(deviceId).select('userId deviceId').lean();

    if (!targetDevice) {
      throw new Error('Không tìm thấy thiết bị.');
    }

    const role = await this.getUserRole(targetDevice.userId.toString());

    if (role === UserRole.USER) {
      const otherAuthorizedDevice = await UserDevice.findOne({
        _id: { $ne: targetDevice._id },
        userId: targetDevice.userId,
        forceLogout: { $ne: true },
      })
        .select('_id deviceName ipAddress lastActiveAt')
        .lean();

      if (otherAuthorizedDevice) {
        throw new Error(
          'Tài khoản user này vẫn còn thiết bị cũ đang được cấp quyền. Vui lòng khóa thiết bị cũ trước khi cấp phép thiết bị mới.'
        );
      }
    }

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

  async deleteLockedDevice(deviceId: string): Promise<void> {
    const device = await UserDevice.findById(deviceId).select('forceLogout userId deviceId').lean();

    if (!device) {
      throw new Error('Không tìm thấy thiết bị.');
    }

    if (!device.forceLogout) {
      throw new Error('Chỉ được xóa thiết bị đã khóa hoặc đang chờ cấp phép.');
    }

    await UserDevice.findByIdAndDelete(deviceId);
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
     * Các cảnh báo này chỉ dùng để hỗ trợ admin quan sát.
     * Nghiệp vụ khóa đăng nhập chính thức:
     * - ADMIN / SUPERADMIN không cần cấp phép thiết bị.
     * - Các role còn lại dựa trên userId + deviceId + forceLogout.
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
     * Đếm cảnh báo phụ để admin quan sát các phiên online đáng chú ý.
     * Không dùng các cảnh báo này để quyết định chặn/cho đăng nhập.
     * Quyết định đăng nhập nằm ở trackLogin() và trạng thái forceLogout.
     */
    const activeSessionKeysByUser = new Map<string, Set<string>>();

    /**
     * Đếm trường hợp cùng 1 deviceId nhưng nhiều user đang online.
     */
    const activeUserCountByDevice = new Map<string, Set<string>>();

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
      }
    }

    return (devices as any[]).map(device => {
      const userId = getUserIdString(device);
      const isOnline = isDeviceOnline(device);

      const activeSessionCount = activeSessionKeysByUser.get(userId)?.size || 0;
      const activeUsersOnDevice = activeUserCountByDevice.get(device.deviceId)?.size || 0;

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
          waitingAdminApproval: Boolean(device.forceLogout),
        },
      };
    });
  }

  canManageDevices(role: UserRole): boolean {
    return role === UserRole.ADMIN || role === UserRole.SUPERADMIN;
  }
}
