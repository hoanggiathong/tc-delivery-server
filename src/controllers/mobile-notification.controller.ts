import type { Response } from 'express';
import mongoose, { type FilterQuery } from 'mongoose';

import type { CustomerAuthRequest } from '@/middlewares/authenticate-customer-token.middleware';
import {
  MobileNotification,
  type IMobileNotification,
  type MobileNotificationTargetType,
  type MobileNotificationType,
} from '@/modules/mobile-customer/mobile-notification.model';
import { MobileNotificationRead } from '@/modules/mobile-customer/mobile-notification-read.model';
import {
  MobilePushNotificationService,
  type IMobilePushSendResult,
} from '@/modules/mobile-customer/mobile-push-notification.service';
import type { AuthRequest } from '@/types';

const ADMIN_NOTIFICATION_TYPES = new Set<MobileNotificationType>(['system', 'promotion']);

const parseAdminNotificationType = (value: unknown): MobileNotificationType | null => {
  const type = String(value || '')
    .trim()
    .toLowerCase() as MobileNotificationType;
  return ADMIN_NOTIFICATION_TYPES.has(type) ? type : null;
};

const getCustomerAccountId = (req: CustomerAuthRequest): string | null => {
  const accountId = req.customer?.accountId?.trim();
  return accountId && mongoose.isValidObjectId(accountId) ? accountId : null;
};

const parsePositiveInteger = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
};

const buildCustomerNotificationFilter = (accountId: string): FilterQuery<IMobileNotification> => {
  const accountObjectId = new mongoose.Types.ObjectId(accountId);

  return {
    isActive: true,
    $or: [
      { audience: 'global' },
      { audience: { $exists: false } },
      {
        audience: 'account',
        recipientAccountId: accountObjectId,
      },
    ],
  };
};

const countUnreadNotifications = async (accountId: string): Promise<number> => {
  const accountObjectId = new mongoose.Types.ObjectId(accountId);
  const notificationFilter = buildCustomerNotificationFilter(accountId);

  const [result] = await MobileNotification.aggregate<{ count: number }>([
    { $match: notificationFilter },
    {
      $lookup: {
        from: MobileNotificationRead.collection.name,
        let: { notificationId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$notificationId', '$$notificationId'] },
                  { $eq: ['$accountId', accountObjectId] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: 'readState',
      },
    },
    {
      $match: {
        'readState.0': { $exists: false },
      },
    },
    { $count: 'count' },
  ]);

  return Number(result?.count) || 0;
};

const mapNotificationItem = (
  notification: {
    _id: unknown;
    title: string;
    content: string;
    type: MobileNotificationType;
    targetType?: MobileNotificationTargetType;
    targetId?: string;
    targetCode?: string;
    targetDeviceId?: string;
    createdAt: Date;
  },
  readAt: Date | null
) => ({
  id: String(notification._id),
  title: notification.title,
  content: notification.content,
  type: notification.type,
  targetType: notification.targetType ?? 'notification',
  targetId: notification.targetId || null,
  targetCode: notification.targetCode || null,
  targetDeviceId: notification.targetDeviceId || null,
  createdAt: notification.createdAt,
  isRead: Boolean(readAt),
  readAt,
});

export class MobileNotificationController {
  private readonly pushService = new MobilePushNotificationService();

  getNotifications = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const accountId = getCustomerAccountId(req);

      if (!accountId) {
        res.status(401).json({ success: false, message: 'Customer not authenticated' });
        return;
      }

      const page = parsePositiveInteger(req.query.page, 1, 1_000_000);
      const limit = parsePositiveInteger(req.query.limit, 20, 50);
      const skip = (page - 1) * limit;
      const notificationFilter = buildCustomerNotificationFilter(accountId);

      const [notifications, totalCount, unreadCount] = await Promise.all([
        MobileNotification.find(notificationFilter)
          .sort({ createdAt: -1, _id: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        MobileNotification.countDocuments(notificationFilter),
        countUnreadNotifications(accountId),
      ]);

      const notificationIds = notifications.map(item => item._id);
      const readDocuments = notificationIds.length
        ? await MobileNotificationRead.find({
            accountId: new mongoose.Types.ObjectId(accountId),
            notificationId: { $in: notificationIds },
          })
            .select({ _id: 0, notificationId: 1, readAt: 1 })
            .lean()
        : [];

      const readMap = new Map<string, Date>();
      for (const document of readDocuments) {
        readMap.set(String(document.notificationId), document.readAt);
      }

      const items = notifications.map(item =>
        mapNotificationItem(item, readMap.get(String(item._id)) ?? null)
      );

      const totalPages = Math.ceil(totalCount / limit);

      res.status(200).json({
        success: true,
        message: 'Notifications retrieved successfully',
        data: {
          items,
          totalCount,
          unreadCount,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Không tải được thông báo',
      });
    }
  };

  getNotificationById = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const accountId = getCustomerAccountId(req);
      const notificationId = String(req.params.notificationId || '').trim();

      if (!accountId) {
        res.status(401).json({ success: false, message: 'Customer not authenticated' });
        return;
      }

      if (!mongoose.isValidObjectId(notificationId)) {
        res.status(400).json({ success: false, message: 'Notification ID is invalid' });
        return;
      }

      const notification = await MobileNotification.findOne({
        _id: notificationId,
        ...buildCustomerNotificationFilter(accountId),
      }).lean();

      if (!notification) {
        res.status(404).json({ success: false, message: 'Notification not found' });
        return;
      }

      const readDocument = await MobileNotificationRead.findOne({
        accountId: new mongoose.Types.ObjectId(accountId),
        notificationId: notification._id,
      })
        .select({ _id: 0, readAt: 1 })
        .lean();

      res.status(200).json({
        success: true,
        message: 'Notification retrieved successfully',
        data: {
          item: mapNotificationItem(notification, readDocument?.readAt ?? null),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Không tải được thông báo',
      });
    }
  };

  markNotificationAsRead = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const accountId = getCustomerAccountId(req);
      const notificationId = String(req.params.notificationId || '').trim();

      if (!accountId) {
        res.status(401).json({ success: false, message: 'Customer not authenticated' });
        return;
      }

      if (!mongoose.isValidObjectId(notificationId)) {
        res.status(400).json({ success: false, message: 'Notification ID is invalid' });
        return;
      }

      const notificationExists = await MobileNotification.exists({
        _id: notificationId,
        ...buildCustomerNotificationFilter(accountId),
      });

      if (!notificationExists) {
        res.status(404).json({ success: false, message: 'Notification not found' });
        return;
      }

      const now = new Date();
      const result = await MobileNotificationRead.updateOne(
        {
          accountId: new mongoose.Types.ObjectId(accountId),
          notificationId: new mongoose.Types.ObjectId(notificationId),
        },
        {
          $setOnInsert: {
            accountId: new mongoose.Types.ObjectId(accountId),
            notificationId: new mongoose.Types.ObjectId(notificationId),
            readAt: now,
          },
        },
        { upsert: true }
      );

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: {
          notificationId,
          isRead: true,
          newlyMarked: result.upsertedCount > 0,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Không cập nhật được thông báo',
      });
    }
  };

  markAllNotificationsAsRead = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const accountId = getCustomerAccountId(req);

      if (!accountId) {
        res.status(401).json({ success: false, message: 'Customer not authenticated' });
        return;
      }

      const notifications = await MobileNotification.find(
        buildCustomerNotificationFilter(accountId)
      )
        .select({ _id: 1 })
        .lean();

      if (!notifications.length) {
        res.status(200).json({
          success: true,
          message: 'No notification available',
          data: { markedCount: 0, unreadCount: 0 },
        });
        return;
      }

      const accountObjectId = new mongoose.Types.ObjectId(accountId);
      const now = new Date();
      const result = await MobileNotificationRead.bulkWrite(
        notifications.map(notification => ({
          updateOne: {
            filter: {
              accountId: accountObjectId,
              notificationId: notification._id,
            },
            update: {
              $setOnInsert: {
                accountId: accountObjectId,
                notificationId: notification._id,
                readAt: now,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false }
      );

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        data: {
          markedCount: result.upsertedCount,
          unreadCount: 0,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Không cập nhật được thông báo',
      });
    }
  };

  getUnreadCount = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const accountId = getCustomerAccountId(req);

      if (!accountId) {
        res.status(401).json({ success: false, message: 'Customer not authenticated' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          unreadCount: await countUnreadNotifications(accountId),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Không lấy được số thông báo chưa đọc',
      });
    }
  };

  createNotification = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const authenticatedUser = req.user;

      if (!authenticatedUser || !mongoose.isValidObjectId(authenticatedUser.userId)) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const title = String(req.body.title || '').trim();
      const content = String(req.body.content || '').trim();
      const type = parseAdminNotificationType(req.body.type);
      const requestedTargetType = String(req.body.targetType || 'notification')
        .trim()
        .toLowerCase();

      if (!title || !content) {
        res.status(400).json({ success: false, message: 'Title and content are required' });
        return;
      }

      if (title.length > 150) {
        res.status(400).json({
          success: false,
          message: 'Title must not exceed 150 characters',
        });
        return;
      }

      if (content.length > 1000) {
        res.status(400).json({
          success: false,
          message: 'Content must not exceed 1000 characters',
        });
        return;
      }

      if (!type) {
        res.status(400).json({
          success: false,
          message: 'Admin can only create system or promotion notifications',
        });
        return;
      }

      if (requestedTargetType !== 'notification') {
        res.status(400).json({
          success: false,
          message: 'Admin notifications cannot link to deliveries or money deliveries',
        });
        return;
      }

      const notification = await MobileNotification.create({
        title,
        content,
        type,
        targetType: 'notification',
        targetId: '',
        targetCode: '',
        targetDeviceId: '',
        audience: 'global',
        recipientAccountId: null,
        recipientRole: null,
        source: 'admin',
        isActive: true,
        createdBy: {
          userId: new mongoose.Types.ObjectId(authenticatedUser.userId),
          username: authenticatedUser.username,
          role: authenticatedUser.role,
        },
        pushResult: {
          status: 'pending',
          attempted: 0,
          success: 0,
          failure: 0,
          invalidTokens: 0,
        },
        sentAt: null,
      });

      let pushResult: IMobilePushSendResult;

      try {
        pushResult = await this.pushService.sendToAllCustomers({
          title: notification.title,
          body: notification.content,
          type: notification.type,
          notificationId: String(notification._id),
          targetType: 'notification',
          source: 'admin',
        });
      } catch (pushError) {
        console.error('[MOBILE NOTIFICATION] Notification created but push failed:', pushError);
        pushResult = {
          status: 'failed',
          attempted: 0,
          success: 0,
          failure: 0,
          invalidTokens: 0,
        };
      }

      const sentAt = new Date();
      let updatedAt = notification.updatedAt;

      try {
        const updatedNotification = await MobileNotification.findByIdAndUpdate(
          notification._id,
          { $set: { pushResult, sentAt } },
          { new: true, runValidators: true }
        ).lean();

        if (updatedNotification?.updatedAt) {
          updatedAt = updatedNotification.updatedAt;
        }
      } catch (historyError) {
        console.error('[MOBILE NOTIFICATION] Không lưu được kết quả push:', historyError);
      }

      const responseMessage =
        pushResult.status === 'completed'
          ? 'Notification created and pushed successfully'
          : pushResult.status === 'skipped'
            ? 'Notification created but no active push tokens were found'
            : pushResult.status === 'partial'
              ? 'Notification created and partially pushed'
              : 'Notification created but push delivery failed';

      res.status(201).json({
        success: true,
        message: responseMessage,
        data: {
          item: {
            id: String(notification._id),
            title: notification.title,
            content: notification.content,
            type: notification.type,
            targetType: 'notification',
            targetId: null,
            targetCode: null,
            audience: 'global',
            source: 'admin',
            isActive: notification.isActive,
            createdBy: {
              userId: authenticatedUser.userId,
              username: authenticatedUser.username,
              role: authenticatedUser.role,
            },
            pushResult,
            sentAt,
            createdAt: notification.createdAt,
            updatedAt,
          },
          push: pushResult,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Không tạo được thông báo',
      });
    }
  };
}
