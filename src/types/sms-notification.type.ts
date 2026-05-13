/**
 * SMS Notification Types
 */

/**
 * SMSStatus - Trạng thái gửi tin của delivery
 */
export enum SMSStatus {
  PHONE_ERROR = -3, // Lỗi SĐT
  WAITING_APP = -2, // Đang chờ nhắn App
  WAITING_ZALO_SMS = -1, // Đang chờ nhắn Zalo, SMS
  NOT_SENT = 0, // Chưa nhắn tin (default)
  SENT = 1, // Đã nhắn tin
}

/**
 * SMSType - Loại tin nhắn đã gửi thành công
 */
export enum SMSType {
  ZALO = 'zalo', // Gửi qua Zalo ZNS
  SMS = 'sms', // Gửi qua SMS
  APP = 'app', // Gửi qua App notification
}

/**
 * SMSLogStatus - Trạng thái log gửi tin
 */
export enum SMSLogStatus {
  PENDING = 'pending', // Đang chờ xử lý
  SUCCESS = 'success', // Gửi thành công
  FAILED = 'failed', // Gửi thất bại
}

/**
 * SMS Send Result
 */
export interface ISMSSendResult {
  success: boolean;
  deliveryId: string;
  phone: string;
  messageType?: SMSType;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * SMS Bulk Send Result
 */
export interface ISMSBulkSendResult {
  totalCount: number;
  successCount: number;
  failedCount: number;
  results: ISMSSendResult[];
}

/**
 * YourSales API Request Params
 */
export interface IYourSalesZNSParams {
  phone: string;
  templateId: number;
  templateData: {
    ten_khach_hang: string;
    chi_nhanh: string;
    ma_van_don: string;
    nguoi_gui: string;
    buu_pham: string;
    trang_thai: string;
    gia: string;
    hinh_thuc: string;
    dia_chi: string;
    link_cta: string;
  };
}

/**
 * YourSales API Response
 */
export interface IYourSalesAPIResponse {
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  data?: {
    msg_id?: string;
    [key: string]: unknown;
  };
}

/**
 * SMS Log Response
 */
export interface ISMSLogResponse {
  _id: string;
  deliveryId: string;
  phone: string;
  messageType: SMSType;
  templateId: string;
  status: SMSLogStatus;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  sentAt?: Date;
  sentBy: {
    _id: string;
    username: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Eligible Delivery for SMS
 */
export interface IEligibleDeliveryForSMS {
  _id: string;
  fullCode: string;
  receiverName: string;
  receiverPhone: string;
  senderName: string;
  senderPhone: string;
  name: string;
  collectCost: number;
  homeDeliveryCost: number;
  downItems?: string;
  toRoute: {
    _id: string;
    code: string;
    name: string;
    address?: string;
    phone?: string;
  };
  isReturn: boolean;
  smsStatus: SMSStatus;
  smsType?: SMSType;
  messageTime?: Date;
  createdAt: Date;
}

/**
 * Incomplete Quantity Delivery for SMS (kiểm kê số lượng)
 * Delivery where quantityReturn < quantity
 */
export interface IIncompleteQuantityDeliveryForSMS extends IEligibleDeliveryForSMS {
  quantity: number;
  quantityReturn: number;
}

/**
 * Populated Delivery for SMS notification (lean query result)
 */
export interface IDeliveryForSMSLean {
  _id: string;
  fullCode: string;
  name: string;
  collectCost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  downItems?: string;
  isReturn: boolean;
  smsStatus: SMSStatus;
  smsType?: SMSType;
  createdAt: Date;
  quantity: number;
  quantityReturn: number;
  totalCost: number;
  actualRevenue: number;
  senderName: string;
  receiverName: string;
  sender: {
    _id: string;
    name: string;
    phone: string;
  };
  receiver: {
    _id: string;
    name: string;
    phone: string;
  };
  toRoute: {
    _id: string;
    code: string;
    name: string;
    address?: string;
    phone?: string;
  };
}

/**
 * Populated receiver for SMS notification
 */
export interface IPopulatedReceiver {
  _id: string;
  phone: string;
}

/**
 * Populated route for SMS notification
 */
export interface IPopulatedRoute {
  _id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
}

/**
 * YourSales API data response structure
 */
export interface IYourSalesAPIData {
  message?: string;
  data?: {
    msg_id?: string;
  };
  success?: boolean;
  error_code?: string;
  [key: string]: unknown;
}

/**
 * SMS Log lean populated result
 */
export interface ISMSLogLeanPopulated {
  _id: string;
  deliveryId: string;
  phone: string;
  messageType: SMSType;
  templateId: string;
  status: SMSLogStatus;
  errorCode?: string;
  errorMessage?: string;
  apiResponse?: Record<string, unknown>;
  retryCount: number;
  sentAt?: Date;
  sentBy: {
    _id: string;
    username: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
