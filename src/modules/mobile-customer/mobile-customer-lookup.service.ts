import { Customer } from '@/models/customer.model';
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

interface LookupDocument {
  _id: unknown;
  fullCode?: string | null;
  sender?: unknown;
  receiver?: unknown;
  createdAt?: Date | string | null;
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

const SUGGESTION_PATTERN = /^[A-Z0-9_-]{2,80}$/;

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

const normalizeSuggestionKeyword = (input: string): string => {
  const keyword = String(input || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();

  if (!keyword || !SUGGESTION_PATTERN.test(keyword)) {
    return '';
  }

  return keyword;
};

const objectIdKey = (value: unknown): string => String(value || '');

const resolveRelationByCustomerIds = (
  senderId: unknown,
  receiverId: unknown,
  customerIdSet: ReadonlySet<string>
): MobileCustomerLookupRelation | null => {
  const senderMatch = customerIdSet.has(objectIdKey(senderId));

  const receiverMatch = customerIdSet.has(objectIdKey(receiverId));

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

const mapSuggestion = (
  type: MobileCustomerLookupType,
  document: LookupDocument,
  customerIdSet: ReadonlySet<string>
):
  | (MobileCustomerLookupResult & {
      createdAt: number;
    })
  | null => {
  const relation = resolveRelationByCustomerIds(document.sender, document.receiver, customerIdSet);

  if (!relation) {
    return null;
  }

  const createdAt = document.createdAt ? new Date(document.createdAt).getTime() : 0;

  return {
    type,
    id: String(document._id),
    fullCode: String(document.fullCode || ''),
    relation,
    createdAt: Number.isFinite(createdAt) ? createdAt : 0,
  };
};

const clampLimit = (value: unknown, fallback = 6): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(8, Math.max(1, Math.floor(parsed)));
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
        .lean<any>(),

      MoneyDelivery.findOne({
        fullCode: exactFullCode,
        deleted: {
          $ne: true,
        },
      })
        .select('_id fullCode sender receiver')
        .populate('sender', '_id phone')
        .populate('receiver', '_id phone')
        .lean<any>(),
    ]);

    const resolvePopulated = (
      type: MobileCustomerLookupType,
      document: any
    ): MobileCustomerLookupResult | null => {
      if (!document) {
        return null;
      }

      const senderMatch = normalizeVietnamPhoneKey(document.sender?.phone) === accountPhoneKey;

      const receiverMatch = normalizeVietnamPhoneKey(document.receiver?.phone) === accountPhoneKey;

      const relation: MobileCustomerLookupRelation | null =
        senderMatch && receiverMatch
          ? 'both'
          : senderMatch
            ? 'sender'
            : receiverMatch
              ? 'receiver'
              : null;

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

    const authorizedDelivery = resolvePopulated('delivery', delivery);

    if (authorizedDelivery) {
      return authorizedDelivery;
    }

    const authorizedMoney = resolvePopulated('money-delivery', moneyDelivery);

    if (authorizedMoney) {
      return authorizedMoney;
    }

    throw new MobileCustomerLookupError(
      'Không tìm thấy thông tin phù hợp',
      404,
      'TRACKING_NOT_FOUND'
    );
  }

  async suggest(
    accountPhoneInput: string,
    queryInput: string,
    requestedLimit = 6
  ): Promise<MobileCustomerLookupResult[]> {
    const accountPhoneKey = normalizeVietnamPhoneKey(accountPhoneInput);

    if (!accountPhoneKey) {
      throw new MobileCustomerLookupError(
        'Không tìm thấy số điện thoại tài khoản',
        401,
        'CUSTOMER_PHONE_NOT_FOUND'
      );
    }

    const query = normalizeSuggestionKeyword(queryInput);

    if (!query) {
      return [];
    }

    const limit = clampLimit(requestedLimit);

    /**
     * Chỉ resolve Customer IDs thuộc đúng số điện thoại tài khoản.
     *
     * Regex suffix 9 số dùng cùng quy tắc normalize hiện tại:
     * 0901..., 84901..., +84901... đều cùng một account phone key.
     *
     * Sau đó query Delivery/MoneyDelivery trực tiếp bằng sender/receiver
     * IDs nên suggestions KHÔNG bao giờ trả mã thuộc khách khác.
     */
    const phoneSuffix = new RegExp(`${escapeRegex(accountPhoneKey)}$`);

    const customerRows = await Customer.find({
      phone: phoneSuffix,
    })
      .select('_id')
      .lean<
        Array<{
          _id: unknown;
        }>
      >();

    const customerIds = customerRows.map(item => item._id);

    if (!customerIds.length) {
      return [];
    }

    const customerIdSet = new Set(customerIds.map(objectIdKey));

    const prefix = new RegExp(`^${escapeRegex(query)}`, 'i');

    const fetchLimit = Math.max(8, limit * 2);

    const commonFilter = {
      fullCode: prefix,

      deleted: {
        $ne: true,
      },

      $or: [
        {
          sender: {
            $in: customerIds,
          },
        },
        {
          receiver: {
            $in: customerIds,
          },
        },
      ],
    };

    const [deliveries, moneyDeliveries] = await Promise.all([
      Delivery.find(commonFilter)
        .select('_id fullCode sender receiver createdAt')
        .sort({
          createdAt: -1,
        })
        .limit(fetchLimit)
        .lean<LookupDocument[]>(),

      MoneyDelivery.find(commonFilter)
        .select('_id fullCode sender receiver createdAt')
        .sort({
          createdAt: -1,
        })
        .limit(fetchLimit)
        .lean<LookupDocument[]>(),
    ]);

    const mapped = [
      ...deliveries.map(item => mapSuggestion('delivery', item, customerIdSet)),
      ...moneyDeliveries.map(item => mapSuggestion('money-delivery', item, customerIdSet)),
    ]
      .filter(
        (
          item
        ): item is MobileCustomerLookupResult & {
          createdAt: number;
        } => Boolean(item)
      )
      .sort((left, right) => {
        const leftExact = left.fullCode.toUpperCase() === query;

        const rightExact = right.fullCode.toUpperCase() === query;

        if (leftExact !== rightExact) {
          return leftExact ? -1 : 1;
        }

        if (left.fullCode.length !== right.fullCode.length) {
          return left.fullCode.length - right.fullCode.length;
        }

        return right.createdAt - left.createdAt;
      });

    const seen = new Set<string>();

    const result: MobileCustomerLookupResult[] = [];

    for (const item of mapped) {
      const key = `${item.type}:${item.fullCode}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);

      result.push({
        type: item.type,
        id: item.id,
        fullCode: item.fullCode,
        relation: item.relation,
      });

      if (result.length >= limit) {
        break;
      }
    }

    return result;
  }
}
