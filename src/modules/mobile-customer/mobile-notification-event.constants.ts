import type { MobileNotificationEventModule } from '@/modules/mobile-customer/mobile-notification-event-setting.model';

export type DeliveryNotificationEventCode =
  | 'CREATED'
  | 'ARRIVED_DESTINATION'
  | 'DELIVERED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'RETURNED'
  | 'ISSUE';

export type MoneyNotificationEventCode =
  | 'CREATED'
  | 'ARRIVED_DESTINATION'
  | 'COMPLETED'
  | 'IN_TRANSIT'
  | 'RETURNED'
  | 'ISSUE';

export interface MobileNotificationEventDefault {
  module: MobileNotificationEventModule;
  eventCode: string;
  enabled: boolean;
  sendToSender: boolean;
  sendToReceiver: boolean;
  senderTitleTemplate: string;
  senderContentTemplate: string;
  receiverTitleTemplate: string;
  receiverContentTemplate: string;
}

export const DELIVERY_NOTIFICATION_EVENT_DEFAULTS: ReadonlyArray<MobileNotificationEventDefault> = [
  {
    module: 'delivery',
    eventCode: 'CREATED',
    enabled: true,
    sendToSender: true,
    sendToReceiver: true,
    senderTitleTemplate: 'Tạo vận đơn thành công',
    senderContentTemplate: 'Vận đơn {{fullCode}} của bạn đã được tiếp nhận.',
    receiverTitleTemplate: 'Bạn có một vận đơn mới',
    receiverContentTemplate: 'Vận đơn {{fullCode}} đang được gửi đến bạn.',
  },
  {
    module: 'delivery',
    eventCode: 'ARRIVED_DESTINATION',
    enabled: true,
    sendToSender: true,
    sendToReceiver: true,
    senderTitleTemplate: 'Vận đơn đã đến trạm đích',
    senderContentTemplate: 'Vận đơn {{fullCode}} đã đến trạm giao hàng.',
    receiverTitleTemplate: 'Vận đơn đã đến nơi',
    receiverContentTemplate: 'Vận đơn {{fullCode}} của bạn đã đến trạm giao hàng.',
  },
  {
    module: 'delivery',
    eventCode: 'DELIVERED',
    enabled: true,
    sendToSender: true,
    sendToReceiver: true,
    senderTitleTemplate: 'Giao hàng thành công',
    senderContentTemplate: 'Vận đơn {{fullCode}} đã được giao thành công.',
    receiverTitleTemplate: 'Đã giao hàng thành công',
    receiverContentTemplate: 'Vận đơn {{fullCode}} đã được giao thành công.',
  },
  {
    module: 'delivery',
    eventCode: 'IN_TRANSIT',
    enabled: false,
    sendToSender: true,
    sendToReceiver: true,
    senderTitleTemplate: 'Vận đơn đang vận chuyển',
    senderContentTemplate: 'Vận đơn {{fullCode}} đang được vận chuyển.',
    receiverTitleTemplate: 'Vận đơn đang vận chuyển',
    receiverContentTemplate: 'Vận đơn {{fullCode}} đang được vận chuyển đến bạn.',
  },
  {
    module: 'delivery',
    eventCode: 'OUT_FOR_DELIVERY',
    enabled: false,
    sendToSender: true,
    sendToReceiver: true,
    senderTitleTemplate: 'Vận đơn đang giao',
    senderContentTemplate: 'Vận đơn {{fullCode}} đang được giao đến người nhận.',
    receiverTitleTemplate: 'Vận đơn đang giao',
    receiverContentTemplate: 'Vận đơn {{fullCode}} đang được giao đến bạn.',
  },
  {
    module: 'delivery',
    eventCode: 'RETURNED',
    enabled: false,
    sendToSender: true,
    sendToReceiver: true,
    senderTitleTemplate: 'Vận đơn được hoàn',
    senderContentTemplate: 'Vận đơn {{fullCode}} đã chuyển sang trạng thái hoàn.',
    receiverTitleTemplate: 'Vận đơn được hoàn',
    receiverContentTemplate: 'Vận đơn {{fullCode}} đã chuyển sang trạng thái hoàn.',
  },
  {
    module: 'delivery',
    eventCode: 'ISSUE',
    enabled: false,
    sendToSender: true,
    sendToReceiver: true,
    senderTitleTemplate: 'Vận đơn cần kiểm tra',
    senderContentTemplate: 'Vận đơn {{fullCode}} có cập nhật cần kiểm tra.',
    receiverTitleTemplate: 'Vận đơn cần kiểm tra',
    receiverContentTemplate: 'Vận đơn {{fullCode}} có cập nhật cần kiểm tra.',
  },
];

export const MONEY_NOTIFICATION_EVENT_DEFAULTS: ReadonlyArray<MobileNotificationEventDefault> = [
  {
    module: 'money-delivery',
    eventCode: 'CREATED',
    enabled: true,
    sendToSender: true,
    sendToReceiver: true,
    senderTitleTemplate: 'Tạo phiếu tiền thành công',
    senderContentTemplate: 'Phiếu tiền {{fullCode}} đã được tiếp nhận.',
    receiverTitleTemplate: 'Bạn có một phiếu tiền mới',
    receiverContentTemplate: 'Phiếu tiền {{fullCode}} đang được gửi đến bạn.',
  },
  {
    module: 'money-delivery',
    eventCode: 'ARRIVED_DESTINATION',
    enabled: true,
    sendToSender: true,
    sendToReceiver: true,
    senderTitleTemplate: 'Phiếu tiền đã đến trạm đích',
    senderContentTemplate: 'Phiếu tiền {{fullCode}} đã đến trạm nhận.',
    receiverTitleTemplate: 'Phiếu tiền đã đến nơi',
    receiverContentTemplate: 'Phiếu tiền {{fullCode}} đã đến trạm nhận.',
  },
  {
    module: 'money-delivery',
    eventCode: 'COMPLETED',
    enabled: true,
    sendToSender: true,
    sendToReceiver: true,
    senderTitleTemplate: 'Phiếu tiền đã hoàn tất',
    senderContentTemplate: 'Phiếu tiền {{fullCode}} đã được nhận thành công.',
    receiverTitleTemplate: 'Đã nhận phiếu tiền',
    receiverContentTemplate: 'Phiếu tiền {{fullCode}} đã hoàn tất.',
  },
  {
    module: 'money-delivery',
    eventCode: 'IN_TRANSIT',
    enabled: false,
    sendToSender: true,
    sendToReceiver: true,
    senderTitleTemplate: 'Phiếu tiền đang vận chuyển',
    senderContentTemplate: 'Phiếu tiền {{fullCode}} đang được vận chuyển.',
    receiverTitleTemplate: 'Phiếu tiền đang vận chuyển',
    receiverContentTemplate: 'Phiếu tiền {{fullCode}} đang được vận chuyển đến bạn.',
  },
  {
    module: 'money-delivery',
    eventCode: 'RETURNED',
    enabled: false,
    sendToSender: true,
    sendToReceiver: true,
    senderTitleTemplate: 'Phiếu tiền được hoàn',
    senderContentTemplate: 'Phiếu tiền {{fullCode}} đã chuyển sang trạng thái hoàn.',
    receiverTitleTemplate: 'Phiếu tiền được hoàn',
    receiverContentTemplate: 'Phiếu tiền {{fullCode}} đã chuyển sang trạng thái hoàn.',
  },
  {
    module: 'money-delivery',
    eventCode: 'ISSUE',
    enabled: false,
    sendToSender: true,
    sendToReceiver: true,
    senderTitleTemplate: 'Phiếu tiền cần kiểm tra',
    senderContentTemplate: 'Phiếu tiền {{fullCode}} có cập nhật cần kiểm tra.',
    receiverTitleTemplate: 'Phiếu tiền cần kiểm tra',
    receiverContentTemplate: 'Phiếu tiền {{fullCode}} có cập nhật cần kiểm tra.',
  },
];

export const MOBILE_NOTIFICATION_EVENT_DEFAULTS: ReadonlyArray<MobileNotificationEventDefault> = [
  ...DELIVERY_NOTIFICATION_EVENT_DEFAULTS,
  ...MONEY_NOTIFICATION_EVENT_DEFAULTS,
];
