import mongoose, { type FilterQuery } from 'mongoose';
import type { Request, Response } from 'express';

import {
  MobileNotification,
  type IMobileNotification,
  type MobileNotificationType,
} from '@/modules/mobile-customer/mobile-notification.model';

type NotificationStatusFilter = 'all' | 'active' | 'inactive';

const ALLOWED_TYPES = new Set<MobileNotificationType>(['system', 'promotion']);

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePositiveInteger = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
};

const parseType = (value: unknown): MobileNotificationType | null => {
  const type = String(value || '')
    .trim()
    .toLowerCase() as MobileNotificationType;
  return ALLOWED_TYPES.has(type) ? type : null;
};

const parseStatus = (value: unknown): NotificationStatusFilter => {
  const status = String(value || 'all')
    .trim()
    .toLowerCase();
  return status === 'active' || status === 'inactive' ? status : 'all';
};

const normalizePushResult = (notification: IMobileNotification) => ({
  status: notification.pushResult?.status ?? 'pending',
  attempted: Number(notification.pushResult?.attempted) || 0,
  success: Number(notification.pushResult?.success) || 0,
  failure: Number(notification.pushResult?.failure) || 0,
  invalidTokens: Number(notification.pushResult?.invalidTokens) || 0,
});

const adminScope: FilterQuery<IMobileNotification> = {
  $and: [
    {
      $or: [{ source: 'admin' }, { source: { $exists: false } }],
    },
    {
      $or: [{ audience: 'global' }, { audience: { $exists: false } }],
    },
  ],
};

export class MobileNotificationAdminController {
  getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parsePositiveInteger(req.query.page, 1, 1_000_000);
      const limit = parsePositiveInteger(req.query.limit, 20, 100);
      const keyword = String(req.query.keyword || '').trim();
      const type = parseType(req.query.type);
      const status = parseStatus(req.query.status);

      const andFilters: FilterQuery<IMobileNotification>[] = [
        ...(adminScope.$and as FilterQuery<IMobileNotification>[]),
      ];

      if (type) {
        andFilters.push({ type });
      }

      if (status === 'active') {
        andFilters.push({ isActive: true });
      } else if (status === 'inactive') {
        andFilters.push({ isActive: false });
      }

      if (keyword) {
        const regex = new RegExp(escapeRegex(keyword), 'i');
        andFilters.push({
          $or: [{ title: regex }, { content: regex }],
        });
      }

      const filter: FilterQuery<IMobileNotification> = { $and: andFilters };
      const skip = (page - 1) * limit;

      const activeScope: FilterQuery<IMobileNotification> = {
        $and: [...andFilters.filter(item => !('isActive' in item)), { isActive: true }],
      };
      const inactiveScope: FilterQuery<IMobileNotification> = {
        $and: [...andFilters.filter(item => !('isActive' in item)), { isActive: false }],
      };

      const [notifications, totalCount, activeCount, inactiveCount] = await Promise.all([
        MobileNotification.find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        MobileNotification.countDocuments(filter),
        MobileNotification.countDocuments(activeScope),
        MobileNotification.countDocuments(inactiveScope),
      ]);

      const items = notifications.map(item => ({
        id: String(item._id),
        title: item.title,
        content: item.content,
        type: item.type,
        targetType: item.targetType ?? 'notification',
        targetId: item.targetId || null,
        targetCode: item.targetCode || null,
        audience: item.audience ?? 'global',
        source: item.source ?? 'admin',
        isActive: item.isActive,
        createdBy: item.createdBy?.userId
          ? {
              userId: String(item.createdBy.userId),
              username: item.createdBy.username || '',
              role: item.createdBy.role || '',
            }
          : null,
        pushResult: normalizePushResult(item as IMobileNotification),
        sentAt: item.sentAt ?? null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      const totalPages = Math.max(1, Math.ceil(totalCount / limit));

      res.status(200).json({
        success: true,
        message: 'Notifications retrieved successfully',
        data: {
          items,
          summary: {
            totalCount: activeCount + inactiveCount,
            activeCount,
            inactiveCount,
          },
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
          filters: { keyword, type, status },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Không tải được danh sách thông báo',
      });
    }
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const notificationId = String(req.params.notificationId || '').trim();

      if (!mongoose.isValidObjectId(notificationId)) {
        res.status(400).json({ success: false, message: 'Notification ID is invalid' });
        return;
      }

      if (typeof req.body.isActive !== 'boolean') {
        res.status(400).json({ success: false, message: 'isActive must be a boolean' });
        return;
      }

      const notification = await MobileNotification.findOneAndUpdate(
        {
          _id: notificationId,
          ...adminScope,
        },
        { $set: { isActive: req.body.isActive } },
        { new: true, runValidators: true }
      ).lean();

      if (!notification) {
        res.status(404).json({ success: false, message: 'Notification not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: notification.isActive
          ? 'Notification activated successfully'
          : 'Notification deactivated successfully',
        data: {
          item: {
            id: String(notification._id),
            title: notification.title,
            content: notification.content,
            type: notification.type,
            targetType: notification.targetType ?? 'notification',
            targetId: notification.targetId || null,
            targetCode: notification.targetCode || null,
            audience: notification.audience ?? 'global',
            source: notification.source ?? 'admin',
            isActive: notification.isActive,
            createdAt: notification.createdAt,
            updatedAt: notification.updatedAt,
            createdBy: notification.createdBy?.userId
              ? {
                  userId: String(notification.createdBy.userId),
                  username: notification.createdBy.username || '',
                  role: notification.createdBy.role || '',
                }
              : null,
            pushResult: normalizePushResult(notification as IMobileNotification),
            sentAt: notification.sentAt ?? null,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Không cập nhật được thông báo',
      });
    }
  };
}
