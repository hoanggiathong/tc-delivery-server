import { PipelineStage, Types } from 'mongoose';
import { Customer } from '@/models/customer.model';
import { Delivery } from '@/models/delivery.model';
import {
  attachMobileDeliveryStatus,
  attachMobileDeliveryStatuses,
} from '@/modules/mobile-customer/mobile-delivery-status';

type DeliveryDirection = 'sent' | 'received';

interface ListDeliveryParams {
  phone: string;
  direction: DeliveryDirection;
  page?: number;
  limit?: number;
  keyword?: string;
}

interface CustomerLean {
  _id: Types.ObjectId;
}

interface ListDeliveryHistoryParams {
  phone: string;
  page?: number;
  limit?: number;
  keyword?: string;
}

export class MobileCustomerDeliveryService {
  private normalizePhone(phone: string): string {
    return String(phone || '').replace(/\D/g, '');
  }

  /**
   * Trả về các định dạng số điện thoại phổ biến đang có thể tồn tại trong DB.
   *
   * Ví dụ:
   * - 0901622659
   * - 84901622659
   * - +84901622659
   */
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

  /**
   * Hỗ trợ tìm kiếm theo SĐT ở cả người gửi và người nhận.
   * Query này chỉ chạy khi keyword có dạng số điện thoại.
   */
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

  async listByCustomerPhone(params: ListDeliveryParams) {
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
       * QUAN TRỌNG:
       * Match sender/receiver ngay đầu pipeline để MongoDB dùng index:
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

            /**
             * Chỉ lookup sau khi đã sort/skip/limit.
             * Như vậy mỗi request chỉ lookup tối đa 50 document.
             */
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

                name: 1,
                quantity: 1,
                cost: 1,
                homeDeliveryCost: 1,
                itemValue: 1,
                itemCost: 1,
                collectCost: 1,
                collectForCustomer: 1,
                collectForCustomerCost: 1,
                totalCost: 1,
                actualRevenue: 1,
                paymentType: 1,
                isFree: 1,
                isReturn: 1,
                upItems: 1,
                downItems: 1,
                quantityReturn: 1,
                dateReturn: 1,
                notes: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
          totalRows: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await Delivery.aggregate(pipeline).allowDiskUse(false);

    const items = attachMobileDeliveryStatuses(
      (result?.items || []) as Array<Record<string, unknown>>
    );
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

  async listHistoryByCustomerPhone(params: ListDeliveryHistoryParams) {
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

    const keyword = params.keyword?.trim();

    const initialMatch: Record<string, unknown> = {
      $or: [{ sender: customerId }, { receiver: customerId }],
    };

    if (keyword) {
      const keywordCustomerIds = await this.findCustomerIdsByPhoneKeyword(keyword);

      const keywordConditions: Record<string, unknown>[] = [
        {
          code: {
            $regex: keyword,
            $options: 'i',
          },
        },
        {
          fullCode: {
            $regex: keyword,
            $options: 'i',
          },
        },
        {
          senderName: {
            $regex: keyword,
            $options: 'i',
          },
        },
        {
          receiverName: {
            $regex: keyword,
            $options: 'i',
          },
        },
      ];

      if (keywordCustomerIds.length) {
        keywordConditions.push(
          {
            sender: {
              $in: keywordCustomerIds,
            },
          },
          {
            receiver: {
              $in: keywordCustomerIds,
            },
          }
        );
      }

      initialMatch.$and = [
        {
          $or: [{ sender: customerId }, { receiver: customerId }],
        },
        {
          $or: keywordConditions,
        },
      ];

      delete initialMatch.$or;
    }

    const pipeline: PipelineStage[] = [
      {
        $match: initialMatch,
      },
      {
        $facet: {
          items: [
            {
              $sort: {
                updatedAt: -1,
                createdAt: -1,
              },
            },
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },

            // Chỉ lookup sau khi phân trang
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

                id: {
                  $toString: '$_id',
                },

                code: 1,
                fullCode: 1,
                subCode: 1,

                direction: {
                  $cond: [
                    {
                      $eq: ['$sender._id', customerId],
                    },
                    'sent',
                    'received',
                  ],
                },

                sender: {
                  id: {
                    $cond: [
                      {
                        $ifNull: ['$sender._id', false],
                      },
                      {
                        $toString: '$sender._id',
                      },
                      null,
                    ],
                  },
                  name: '$senderName',
                  phone: '$sender.phone',
                },

                receiver: {
                  id: {
                    $cond: [
                      {
                        $ifNull: ['$receiver._id', false],
                      },
                      {
                        $toString: '$receiver._id',
                      },
                      null,
                    ],
                  },
                  name: '$receiverName',
                  phone: '$receiver.phone',
                },

                fromRoute: {
                  id: {
                    $cond: [
                      {
                        $ifNull: ['$fromRoute._id', false],
                      },
                      {
                        $toString: '$fromRoute._id',
                      },
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
                      {
                        $ifNull: ['$toRoute._id', false],
                      },
                      {
                        $toString: '$toRoute._id',
                      },
                      null,
                    ],
                  },
                  code: '$toRoute.code',
                  name: '$toRoute.name',
                  address: '$toRoute.address',
                  phone: '$toRoute.phone',
                  type: '$toRoute.type',
                },

                name: 1,
                quantity: 1,
                quantityReturn: 1,

                cost: 1,
                totalCost: 1,
                homeDeliveryCost: 1,
                collectCost: 1,
                collectForCustomer: 1,
                collectForCustomerCost: 1,

                paymentType: 1,
                isFree: 1,
                isReturn: 1,

                upItems: 1,
                downItems: 1,
                dateReturn: 1,

                notes: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],

          totalRows: [
            {
              $count: 'count',
            },
          ],
        },
      },
    ];

    const [result] = await Delivery.aggregate(pipeline).allowDiskUse(false);

    const items = attachMobileDeliveryStatuses(
      (result?.items || []) as Array<Record<string, unknown>>
    );
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

  private buildOwnedDeliveryDetailPipeline(
    customerId: Types.ObjectId,
    deliveryMatch: Record<string, unknown>
  ): PipelineStage[] {
    return [
      {
        $match: {
          ...deliveryMatch,
          $or: [{ sender: customerId }, { receiver: customerId }],
        },
      },
      {
        $limit: 1,
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

          direction: {
            $cond: [{ $eq: ['$sender._id', customerId] }, 'sent', 'received'],
          },

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

          name: 1,
          quantity: 1,
          quantityReturn: 1,

          cost: 1,
          homeDelivery: 1,
          homeDeliveryCost: 1,
          carryCost: 1,
          vehicleType: 1,
          itemValue: 1,
          itemCost: 1,
          collectCost: 1,
          collectForCustomer: 1,
          collectForCustomerCost: 1,
          collectForCustomerNote: 1,
          totalCost: 1,
          actualRevenue: 1,

          paymentType: 1,
          isFree: 1,
          isReturn: 1,

          upItems: 1,
          downItems: 1,
          dateReturn: 1,

          details: 1,
          notes: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];
  }

  async getByFullCodeForCustomer(
    phone: string,
    fullCode: string
  ): Promise<Record<string, unknown> | null> {
    const customerId = await this.findCustomerIdByPhone(phone);

    if (!customerId) {
      return null;
    }

    const normalizedFullCode = String(fullCode || '')
      .trim()
      .toUpperCase();

    if (!normalizedFullCode) {
      return null;
    }

    const [delivery] = await Delivery.aggregate(
      this.buildOwnedDeliveryDetailPipeline(customerId, {
        fullCode: normalizedFullCode,
      })
    ).allowDiskUse(false);

    return delivery ? attachMobileDeliveryStatus(delivery as Record<string, unknown>) : null;
  }

  async getByIdForCustomer(phone: string, id: string): Promise<Record<string, unknown> | null> {
    const customerId = await this.findCustomerIdByPhone(phone);

    if (!customerId) {
      return null;
    }

    if (!Types.ObjectId.isValid(id)) {
      throw new Error('ID vận đơn không hợp lệ');
    }

    const [delivery] = await Delivery.aggregate(
      this.buildOwnedDeliveryDetailPipeline(customerId, {
        _id: new Types.ObjectId(id),
      })
    ).allowDiskUse(false);

    return delivery ? attachMobileDeliveryStatus(delivery as Record<string, unknown>) : null;
  }

  async getByCodeForCustomer(phone: string, code: string): Promise<Record<string, unknown> | null> {
    const customerId = await this.findCustomerIdByPhone(phone);

    if (!customerId) {
      return null;
    }

    const normalizedCode = String(code || '')
      .trim()
      .toUpperCase();

    if (!normalizedCode) {
      return null;
    }

    const detailPipeline = this.buildOwnedDeliveryDetailPipeline(customerId, {
      $or: [{ code: normalizedCode }, { fullCode: normalizedCode }],
    });

    /*
     * Code ngắn có thể không duy nhất giữa nhiều thời điểm.
     * Sort mới nhất trước rồi lấy một document thuộc chính customer.
     */
    detailPipeline.splice(1, 0, {
      $sort: {
        createdAt: -1,
      },
    });

    const [delivery] = await Delivery.aggregate(detailPipeline).allowDiskUse(false);

    return delivery ? attachMobileDeliveryStatus(delivery as Record<string, unknown>) : null;
  }
}
