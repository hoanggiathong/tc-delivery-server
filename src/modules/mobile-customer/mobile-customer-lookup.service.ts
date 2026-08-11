import { Delivery } from '@/models/delivery.model';
import { MoneyDelivery } from '@/models/money-delivery.model';

export type MobileCustomerLookupType = 'delivery' | 'money-delivery';

export type MobileCustomerLookupRelation = 'sender' | 'receiver' | 'both';

export interface MobileCustomerLookupResult {
  type: MobileCustomerLookupType;
  id: string;
  fullCode: string;
  relation: MobileCustomerLookupRelation;
}

interface PopulatedCustomer {
  _id?: unknown;
  phone?: string | null;
}

interface LookupDocument {
  _id: unknown;
  fullCode?: string | null;
  sender?: PopulatedCustomer | null;
  receiver?: PopulatedCustomer | null;
}

export class MobileCustomerLookupError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'MobileCustomerLookupError';
  }
}

const FULL_CODE_PATTERN = /^[A-Z0-9_-]{4,80}$/;

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Chuẩn hóa về 9 chữ số thuê bao cuối.
 *
 * Các dạng:
 * - 0901234567
 * - 84901234567
 * - +84901234567
 *
 * đều trở thành:
 * - 901234567
 */
export const normalizeVietnamPhoneKey = (phoneInput?: string | null): string => {
  const digits = String(phoneInput || '').replace(/\D/g, '');

  if (digits.length < 9) {
    return '';
  }

  return digits.slice(-9);
};

export const normalizeLookupFullCode = (fullCodeInput: string): string => {
  const fullCode = String(fullCodeInput || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();

  if (!fullCode || !FULL_CODE_PATTERN.test(fullCode)) {
    throw new MobileCustomerLookupError('Mã tra cứu không hợp lệ', 400, 'INVALID_TRACKING_CODE');
  }

  return fullCode;
};

const resolveRelation = (
  accountPhoneKey: string,
  senderPhone?: string | null,
  receiverPhone?: string | null
): MobileCustomerLookupRelation | null => {
  const senderMatch = normalizeVietnamPhoneKey(senderPhone) === accountPhoneKey;

  const receiverMatch = normalizeVietnamPhoneKey(receiverPhone) === accountPhoneKey;

  if (senderMatch && receiverMatch) {
    return 'both';
  }

  if (senderMatch) {
    return 'sender';
  }

  if (receiverMatch) {
    return 'receiver';
  }

  return null;
};

const mapAuthorizedDocument = (
  type: MobileCustomerLookupType,
  document: LookupDocument | null,
  accountPhoneKey: string
): MobileCustomerLookupResult | null => {
  if (!document) {
    return null;
  }

  const relation = resolveRelation(
    accountPhoneKey,
    document.sender?.phone,
    document.receiver?.phone
  );

  if (!relation) {
    return null;
  }

  return {
    type,
    id: String(document._id),
    fullCode: String(document.fullCode || ''),
    relation,
  };
};

export class MobileCustomerLookupService {
  async lookupByFullCode(
    accountPhoneInput: string,
    fullCodeInput: string
  ): Promise<MobileCustomerLookupResult> {
    const accountPhoneKey = normalizeVietnamPhoneKey(accountPhoneInput);

    if (!accountPhoneKey) {
      throw new MobileCustomerLookupError(
        'Không tìm thấy số điện thoại tài khoản',
        401,
        'CUSTOMER_PHONE_NOT_FOUND'
      );
    }

    const fullCode = normalizeLookupFullCode(fullCodeInput);

    const exactFullCode = new RegExp(`^${escapeRegex(fullCode)}$`, 'i');

    /**
     * Tìm song song để một mã thuộc phiếu tiền
     * vẫn được trả về kể cả collection vận đơn
     * có document trùng mã nhưng không thuộc account.
     */
    const [delivery, moneyDelivery] = await Promise.all([
      Delivery.findOne({
        fullCode: exactFullCode,
        deleted: {
          $ne: true,
        },
      })
        .select('_id fullCode sender receiver')
        .populate('sender', '_id phone')
        .populate('receiver', '_id phone')
        .lean<LookupDocument | null>(),

      MoneyDelivery.findOne({
        fullCode: exactFullCode,
        deleted: {
          $ne: true,
        },
      })
        .select('_id fullCode sender receiver')
        .populate('sender', '_id phone')
        .populate('receiver', '_id phone')
        .lean<LookupDocument | null>(),
    ]);

    const authorizedDelivery = mapAuthorizedDocument('delivery', delivery, accountPhoneKey);

    if (authorizedDelivery) {
      return authorizedDelivery;
    }

    const authorizedMoney = mapAuthorizedDocument('money-delivery', moneyDelivery, accountPhoneKey);

    if (authorizedMoney) {
      return authorizedMoney;
    }

    /**
     * Không phân biệt:
     * - mã không tồn tại;
     * - mã tồn tại nhưng thuộc tài khoản khác.
     *
     * Tránh làm lộ dữ liệu khách hàng khác.
     */
    throw new MobileCustomerLookupError(
      'Không tìm thấy thông tin phù hợp',
      404,
      'TRACKING_NOT_FOUND'
    );
  }
}
