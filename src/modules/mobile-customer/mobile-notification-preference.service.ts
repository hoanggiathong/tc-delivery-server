import mongoose, { type Types } from 'mongoose';

import type { MobileNotificationType } from '@/modules/mobile-customer/mobile-notification.model';
import { MobileNotificationPreference } from '@/modules/mobile-customer/mobile-notification-preference.model';

export interface MobileNotificationPreferenceValue {
  orderPushEnabled: boolean;
  moneyPushEnabled: boolean;
  promotionPushEnabled: boolean;

  /**
   * Thông báo hệ thống quan trọng luôn bật.
   */
  systemPushEnabled: true;
}

export interface UpdateMobileNotificationPreferenceInput {
  orderPushEnabled?: boolean;
  moneyPushEnabled?: boolean;
  promotionPushEnabled?: boolean;
}

type ConfigurableNotificationType = 'order' | 'money' | 'promotion';

type PreferenceField = 'orderPushEnabled' | 'moneyPushEnabled' | 'promotionPushEnabled';

const DEFAULT_PREFERENCE: MobileNotificationPreferenceValue = {
  orderPushEnabled: true,
  moneyPushEnabled: true,
  promotionPushEnabled: true,
  systemPushEnabled: true,
};

const FIELD_BY_TYPE: Record<ConfigurableNotificationType, PreferenceField> = {
  order: 'orderPushEnabled',
  money: 'moneyPushEnabled',
  promotion: 'promotionPushEnabled',
};

const getPreferenceField = (type?: MobileNotificationType): PreferenceField | null => {
  if (type === 'order' || type === 'money' || type === 'promotion') {
    return FIELD_BY_TYPE[type];
  }

  return null;
};

export class MobileNotificationPreferenceService {
  async get(accountId: string): Promise<MobileNotificationPreferenceValue> {
    if (!mongoose.isValidObjectId(accountId)) {
      return {
        ...DEFAULT_PREFERENCE,
      };
    }

    const preference = await MobileNotificationPreference.findOne({
      accountId: new mongoose.Types.ObjectId(accountId),
    })
      .select({
        _id: 0,
        orderPushEnabled: 1,
        moneyPushEnabled: 1,
        promotionPushEnabled: 1,
      })
      .lean<{
        orderPushEnabled?: boolean;
        moneyPushEnabled?: boolean;
        promotionPushEnabled?: boolean;
      }>();

    return {
      orderPushEnabled: preference?.orderPushEnabled !== false,
      moneyPushEnabled: preference?.moneyPushEnabled !== false,
      promotionPushEnabled: preference?.promotionPushEnabled !== false,
      systemPushEnabled: true,
    };
  }

  async update(
    accountId: string,
    input: UpdateMobileNotificationPreferenceInput
  ): Promise<MobileNotificationPreferenceValue> {
    if (!mongoose.isValidObjectId(accountId)) {
      throw new Error('Invalid mobile customer account ID');
    }

    const updateData: UpdateMobileNotificationPreferenceInput = {};

    if (input.orderPushEnabled !== undefined) {
      updateData.orderPushEnabled = input.orderPushEnabled;
    }

    if (input.moneyPushEnabled !== undefined) {
      updateData.moneyPushEnabled = input.moneyPushEnabled;
    }

    if (input.promotionPushEnabled !== undefined) {
      updateData.promotionPushEnabled = input.promotionPushEnabled;
    }

    await MobileNotificationPreference.updateOne(
      {
        accountId: new mongoose.Types.ObjectId(accountId),
      },
      {
        $set: updateData,
        $setOnInsert: {
          accountId: new mongoose.Types.ObjectId(accountId),
        },
      },
      {
        upsert: true,
        runValidators: true,
      }
    );

    return this.get(accountId);
  }

  async isPushEnabled(accountId: string, type?: MobileNotificationType): Promise<boolean> {
    /**
     * System hoặc type không xác định vẫn gửi.
     */
    const field = getPreferenceField(type);

    if (!field) {
      return true;
    }

    if (!mongoose.isValidObjectId(accountId)) {
      return true;
    }

    const preference = await MobileNotificationPreference.findOne({
      accountId: new mongoose.Types.ObjectId(accountId),
    })
      .select({
        _id: 0,
        [field]: 1,
      })
      .lean<Record<string, unknown>>();

    /**
     * Chưa có document preference => mặc định bật.
     */
    return preference?.[field] !== false;
  }

  async getDisabledAccountIds(type?: MobileNotificationType): Promise<Types.ObjectId[]> {
    const field = getPreferenceField(type);

    if (!field) {
      return [];
    }

    const documents = await MobileNotificationPreference.find({
      [field]: false,
    })
      .select({
        _id: 0,
        accountId: 1,
      })
      .lean<
        Array<{
          accountId: Types.ObjectId;
        }>
      >();

    return documents.map(item => item.accountId).filter(Boolean);
  }
}
