import {
  MOBILE_NOTIFICATION_EVENT_DEFAULTS,
  type MobileNotificationEventDefault,
} from '@/modules/mobile-customer/mobile-notification-event.constants';
import {
  MobileNotificationEventSetting,
  type MobileNotificationEventModule,
} from '@/modules/mobile-customer/mobile-notification-event-setting.model';

export interface ResolvedMobileNotificationEventSetting extends MobileNotificationEventDefault {}

const normalizeEventCode = (value: string): string =>
  String(value || '')
    .trim()
    .toUpperCase();

export class MobileNotificationEventSettingService {
  async resolve(
    module: MobileNotificationEventModule,
    eventCodeInput: string
  ): Promise<ResolvedMobileNotificationEventSetting> {
    const eventCode = normalizeEventCode(eventCodeInput);

    const defaultSetting = MOBILE_NOTIFICATION_EVENT_DEFAULTS.find(
      item => item.module === module && item.eventCode === eventCode
    );

    const databaseSetting = await MobileNotificationEventSetting.findOne({
      module,
      eventCode,
    }).lean();

    if (!databaseSetting) {
      return (
        defaultSetting || {
          module,
          eventCode,
          enabled: false,
          sendToSender: true,
          sendToReceiver: true,
          senderTitleTemplate: '',
          senderContentTemplate: '',
          receiverTitleTemplate: '',
          receiverContentTemplate: '',
        }
      );
    }

    return {
      module,
      eventCode,
      enabled: Boolean(databaseSetting.enabled),
      sendToSender: Boolean(databaseSetting.sendToSender),
      sendToReceiver: Boolean(databaseSetting.sendToReceiver),
      senderTitleTemplate:
        databaseSetting.senderTitleTemplate || defaultSetting?.senderTitleTemplate || '',
      senderContentTemplate:
        databaseSetting.senderContentTemplate || defaultSetting?.senderContentTemplate || '',
      receiverTitleTemplate:
        databaseSetting.receiverTitleTemplate || defaultSetting?.receiverTitleTemplate || '',
      receiverContentTemplate:
        databaseSetting.receiverContentTemplate || defaultSetting?.receiverContentTemplate || '',
    };
  }

  async seedDefaults(): Promise<void> {
    await MobileNotificationEventSetting.bulkWrite(
      MOBILE_NOTIFICATION_EVENT_DEFAULTS.map(item => ({
        updateOne: {
          filter: {
            module: item.module,
            eventCode: item.eventCode,
          },
          update: {
            $setOnInsert: item,
          },
          upsert: true,
        },
      })),
      {
        ordered: false,
      }
    );
  }
}
