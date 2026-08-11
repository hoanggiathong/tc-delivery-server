import type { Response } from 'express';
import mongoose from 'mongoose';

import type { CustomerAuthRequest } from '@/middlewares/authenticate-customer-token.middleware';
import {
  MobileNotificationPreferenceService,
  type UpdateMobileNotificationPreferenceInput,
} from '@/modules/mobile-customer/mobile-notification-preference.service';

const getCustomerAccountId = (req: CustomerAuthRequest): string | null => {
  const accountId = req.customer?.accountId?.trim();

  return accountId && mongoose.isValidObjectId(accountId) ? accountId : null;
};

const parseOptionalBoolean = (value: unknown, fieldName: string): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean`);
  }

  return value;
};

export class MobileNotificationPreferenceController {
  constructor(private readonly preferenceService = new MobileNotificationPreferenceService()) {}

  getPreferences = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const accountId = getCustomerAccountId(req);

      if (!accountId) {
        res.status(401).json({
          success: false,
          message: 'Customer not authenticated',
        });
        return;
      }

      const preferences = await this.preferenceService.get(accountId);

      res.status(200).json({
        success: true,
        message: 'Notification preferences retrieved successfully',
        data: {
          preferences,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Không tải được cài đặt thông báo',
      });
    }
  };

  updatePreferences = async (req: CustomerAuthRequest, res: Response): Promise<void> => {
    try {
      const accountId = getCustomerAccountId(req);

      if (!accountId) {
        res.status(401).json({
          success: false,
          message: 'Customer not authenticated',
        });
        return;
      }

      const input: UpdateMobileNotificationPreferenceInput = {
        orderPushEnabled: parseOptionalBoolean(req.body.orderPushEnabled, 'orderPushEnabled'),

        moneyPushEnabled: parseOptionalBoolean(req.body.moneyPushEnabled, 'moneyPushEnabled'),

        promotionPushEnabled: parseOptionalBoolean(
          req.body.promotionPushEnabled,
          'promotionPushEnabled'
        ),
      };

      const preferences = await this.preferenceService.update(accountId, input);

      res.status(200).json({
        success: true,
        message: 'Cập nhật cài đặt thông báo thành công',
        data: {
          preferences,
        },
      });
    } catch (error) {
      const isValidationError =
        error instanceof Error && error.message.includes('must be a boolean');

      res.status(isValidationError ? 400 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Không cập nhật được cài đặt thông báo',
      });
    }
  };
}
