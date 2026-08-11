import { PipelineStage, Types } from 'mongoose';
import { Customer } from '@/models/customer.model';
import {
  MoneyDelivery,
  MoneyDeliveryStatus,
  MoneyDeliveryType,
} from '@/models/money-delivery.model';

type MoneyDeliveryDirection = 'sent' | 'received';

interface ListMoneyDeliveryParams {
  phone: string;
  direction: MoneyDeliveryDirection;
  page?: number;
  limit?: number;
  keyword?: string;
  status?: MoneyDeliveryStatus;
  type?: MoneyDeliveryType;
}

interface CustomerLean {
  _id: Types.ObjectId;
}

export class MobileCustomerMoneyDeliveryService {
  private normalizePhone(phone: string): string {
    return String(phone || '').replace(/\D/g, '');
  }

  private buildPhoneCandidates(phone: string): string[] {
    const normalized = this.normalizePhone(phone);
    const candidates = new Set<string>();

    if (!normalized) {
      return [];
    }

    candidates.add(normalized);

    if (normalized.startsWith('0') && normalized.length === 10) {
      const international = `84${normalized.slice(1)}`;
      candidates.add(international);
      candidates.add(`+${international}`);
    }

    if (normalized.startsWith('84') && normalized.length === 11) {
      candidates.add(`+${normalized}`);
      candidates.add(`0${normalized.slice(2)}`);
    }

    return [...candidates];
  }

  private async findCustomerIdByPhone(phone: string): Promise<Types.ObjectId | null> {
    const phoneCandidates = this.buildPhoneCandidates(phone);

    if (!phoneCandidates.length) {
      return null;
    }

    const customer = await Customer.findOne({
      phone: { $in: phoneCandidates },
    })
      .select('_id')
      .lean<CustomerLean>();

    return customer?._id || null;
  }

  private async findCustomerIdsByPhoneKeyword(keyword: string): Promise<Types.ObjectId[]> {
    const normalized = this.normalizePhone(keyword);

    if (normalized.length < 4) {
      return [];
    }

    const customers = await Customer.find({
      phone: {
        $regex: normalized,
        $options: 'i',
      },
    })
      .select('_id')
      .limit(100)
      .lean<CustomerLean[]>();

    return customers.map(item => item._id);
  }

  private buildCustomerLookup(
    localField: 'sender' | 'receiver',
    as: 'sender' | 'receiver'
  ): PipelineStage.Lookup {
    return {
      $lookup: {
        from: 'customers',
        let: {
          customerId: `$${localField}`,
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$_id', '$$customerId'],
              },
            },
          },
          {
            $project: {
              _id: 1,
              phone: 1,
            },
          },
        ],
        as,
      },
    };
  }

  private buildRouteLookup(
    localField: 'fromRoute' | 'toRoute',
    as: 'fromRoute' | 'toRoute'
  ): PipelineStage.Lookup {
    return {
      $lookup: {
        from: 'routes',
        let: {
          routeId: `$${localField}`,
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$_id', '$$routeId'],
              },
            },
          },
          {
            $project: {
              _id: 1,
              code: 1,
              name: 1,
              address: 1,
              phone: 1,
              type: 1,
            },
          },
        ],
        as,
      },
    };
  }

  async listByCustomerPhone(params: ListMoneyDeliveryParams) {
    const page = Math.max(Number(params.page || 1), 1);
    const limit = Math.min(Math.max(Number(params.limit || 20), 1), 50);
    const skip = (page - 1) * limit;

    const customerId = await this.findCustomerIdByPhone(params.phone);

    if (!customerId) {
      return {
        items: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const localField = params.direction === 'sent' ? 'sender' : 'receiver';
    const keyword = params.keyword?.trim();

    const initialMatch: Record<string, unknown> = {
      [localField]: customerId,
    };

    if (params.status) {
      initialMatch.status = params.status;
    }

    if (params.type) {
      initialMatch.type = params.type;
    }

    if (keyword) {
      const keywordCustomerIds = await this.findCustomerIdsByPhoneKeyword(keyword);

      initialMatch.$or = [
        { code: { $regex: keyword, $options: 'i' } },
        { fullCode: { $regex: keyword, $options: 'i' } },
        { senderName: { $regex: keyword, $options: 'i' } },
        { receiverName: { $regex: keyword, $options: 'i' } },
        ...(keywordCustomerIds.length
          ? [{ sender: { $in: keywordCustomerIds } }, { receiver: { $in: keywordCustomerIds } }]
          : []),
      ];
    }

    const pipeline: PipelineStage[] = [
      /**
       * Match theo sender/receiver ngay đầu pipeline.
       * Cần index:
       * - { sender: 1, createdAt: -1 }
       * - { receiver: 1, createdAt: -1 }
       */
      {
        $match: initialMatch,
      },
      {
        $facet: {
          items: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },

            this.buildCustomerLookup('sender', 'sender'),
            this.buildCustomerLookup('receiver', 'receiver'),
            this.buildRouteLookup('fromRoute', 'fromRoute'),
            this.buildRouteLookup('toRoute', 'toRoute'),

            {
              $unwind: {
                path: '$sender',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $unwind: {
                path: '$receiver',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $unwind: {
                path: '$fromRoute',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $unwind: {
                path: '$toRoute',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 0,
                id: { $toString: '$_id' },
                code: 1,
                fullCode: 1,
                subCode: 1,

                sender: {
                  id: {
                    $cond: [
                      { $ifNull: ['$sender._id', false] },
                      { $toString: '$sender._id' },
                      null,
                    ],
                  },
                  name: '$senderName',
                  phone: '$sender.phone',
                },
                receiver: {
                  id: {
                    $cond: [
                      { $ifNull: ['$receiver._id', false] },
                      { $toString: '$receiver._id' },
                      null,
                    ],
                  },
                  name: '$receiverName',
                  phone: '$receiver.phone',
                },

                fromRoute: {
                  id: {
                    $cond: [
                      { $ifNull: ['$fromRoute._id', false] },
                      { $toString: '$fromRoute._id' },
                      null,
                    ],
                  },
                  code: '$fromRoute.code',
                  name: '$fromRoute.name',
                  address: '$fromRoute.address',
                  phone: '$fromRoute.phone',
                  type: '$fromRoute.type',
                },
                toRoute: {
                  id: {
                    $cond: [
                      { $ifNull: ['$toRoute._id', false] },
                      { $toString: '$toRoute._id' },
                      null,
                    ],
                  },
                  code: '$toRoute.code',
                  name: '$toRoute.name',
                  address: '$toRoute.address',
                  phone: '$toRoute.phone',
                  type: '$toRoute.type',
                },

                sendMoneyAmount: 1,
                sendCost: 1,
                totalCost: 1,
                transferType: 1,
                isFree: 1,
                notes: 1,
                status: 1,
                type: 1,
                deliveryId: {
                  $cond: [{ $ifNull: ['$deliveryId', false] }, { $toString: '$deliveryId' }, null],
                },
                dateReturn: 1,
                contentReturn: 1,
                images: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
          totalRows: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await MoneyDelivery.aggregate(pipeline).allowDiskUse(false);

    const items = result?.items || [];
    const total = result?.totalRows?.[0]?.count || 0;

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDetailByFullCode(phone: string, fullCode: string) {
    const customerId = await this.findCustomerIdByPhone(phone);

    if (!customerId) {
      return null;
    }

    const pipeline: PipelineStage[] = [
      /**
       * Match fullCode + quyền sở hữu trước khi lookup.
       * Nhờ đó MongoDB chỉ xử lý tối đa một document.
       */
      {
        $match: {
          fullCode,
          $or: [{ sender: customerId }, { receiver: customerId }],
        },
      },

      this.buildCustomerLookup('sender', 'sender'),
      this.buildCustomerLookup('receiver', 'receiver'),
      this.buildRouteLookup('fromRoute', 'fromRoute'),
      this.buildRouteLookup('toRoute', 'toRoute'),

      {
        $unwind: {
          path: '$sender',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$receiver',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$fromRoute',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$toRoute',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          id: { $toString: '$_id' },
          code: 1,
          fullCode: 1,
          subCode: 1,

          sender: {
            id: {
              $cond: [{ $ifNull: ['$sender._id', false] }, { $toString: '$sender._id' }, null],
            },
            name: '$senderName',
            phone: '$sender.phone',
          },
          receiver: {
            id: {
              $cond: [{ $ifNull: ['$receiver._id', false] }, { $toString: '$receiver._id' }, null],
            },
            name: '$receiverName',
            phone: '$receiver.phone',
          },

          fromRoute: {
            id: {
              $cond: [
                { $ifNull: ['$fromRoute._id', false] },
                { $toString: '$fromRoute._id' },
                null,
              ],
            },
            code: '$fromRoute.code',
            name: '$fromRoute.name',
            address: '$fromRoute.address',
            phone: '$fromRoute.phone',
            type: '$fromRoute.type',
          },
          toRoute: {
            id: {
              $cond: [{ $ifNull: ['$toRoute._id', false] }, { $toString: '$toRoute._id' }, null],
            },
            code: '$toRoute.code',
            name: '$toRoute.name',
            address: '$toRoute.address',
            phone: '$toRoute.phone',
            type: '$toRoute.type',
          },

          sendMoneyAmount: 1,
          sendCost: 1,
          totalCost: 1,
          transferType: 1,
          isFree: 1,
          notes: 1,
          status: 1,
          type: 1,
          deliveryId: {
            $cond: [{ $ifNull: ['$deliveryId', false] }, { $toString: '$deliveryId' }, null],
          },
          dateReturn: 1,
          contentReturn: 1,
          images: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];

    const [item] = await MoneyDelivery.aggregate(pipeline).allowDiskUse(false);

    return item || null;
  }
}
