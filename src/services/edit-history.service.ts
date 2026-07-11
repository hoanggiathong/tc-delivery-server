import { isEqual } from 'lodash';
import { Types } from 'mongoose';

import {
  EditHistory,
  EditHistoryEntity,
  type IEditHistoryChange,
} from '@/models/edit-history.model';
import { RemovedDelivery } from '@/models/delivery-removed.model';
import { RemovedMoneyDelivery } from '@/models/money-delivery-removed.model';
import { Route } from '@/models/route.model';
import type { EditHistoryDateRangeQuery } from '@/schemas/edit-history.schema';
import type {
  ICreateEditHistoryParams,
  IEditHistoryResponse,
  IRemovedDeliveryResponse,
  IRemovedMoneyDeliveryResponse,
} from '@/types/edit-history.type';
import { UserService } from '@/services/user.service';

const DELIVERY_AUDIT_FIELDS = [
  'senderName',
  'senderPhone',
  'receiverName',
  'receiverPhone',
  'toRoute',
  'code',
  'fullCode',
  'subCode',
  'name',
  'nameProductAndAdditionalInformation',
  'quantity',
  'cost',
  'homeDelivery',
  'homeDeliveryCost',
  'carryCost',
  'homeDeliveryCostTotal',
  'vehicleType',
  'itemValue',
  'itemCost',
  'collectCost',
  'collectForCustomer',
  'collectForCustomerCost',
  'collectForCustomerNote',
  'details',
  'notes',
  'paymentType',
  'isFree',
  'totalCost',
  'actualRevenue',
] as const;

const MONEY_DELIVERY_AUDIT_FIELDS = [
  'senderName',
  'senderPhone',
  'receiverName',
  'receiverPhone',
  'toRoute',
  'code',
  'fullCode',
  'subCode',
  'sendMoneyAmount',
  'sendCost',
  'totalCost',
  'transferType',
  'isFree',
  'notes',
  'status',
  'type',
  'deliveryId',
] as const;

type DeliveryAuditField = (typeof DELIVERY_AUDIT_FIELDS)[number];
type MoneyDeliveryAuditField = (typeof MONEY_DELIVERY_AUDIT_FIELDS)[number];
type AuditField = DeliveryAuditField | MoneyDeliveryAuditField;

interface IRawEditHistoryChange extends IEditHistoryChange {
  field: AuditField;
}

const FIELD_LABELS: Record<string, string> = {
  senderName: 'Người gửi',
  senderPhone: 'SĐT gửi',
  receiverName: 'Người nhận',
  receiverPhone: 'SĐT nhận',
  toRoute: 'Tuyến',
  code: 'Mã tiếp nhận',
  fullCode: 'Mã hàng',
  subCode: 'Mã phụ',
  name: 'Tên hàng hóa',
  nameProductAndAdditionalInformation: 'Thông tin hàng hóa',
  quantity: 'SL',
  cost: 'Cước phí',
  homeDelivery: 'Đc gtn',
  homeDeliveryCost: 'Phí gtn',
  carryCost: 'Phí bốc xếp',
  homeDeliveryCostTotal: 'Tổng phí gtn',
  vehicleType: 'Loại phương tiện',
  itemValue: 'Trị giá',
  itemCost: 'Phí trị giá',
  collectCost: 'Thu hộ',
  collectForCustomer: 'Thu dùm',
  collectForCustomerCost: 'Phụ phí',
  collectForCustomerNote: 'Nội dung phụ phí',
  details: 'Chi tiết hàng hóa',
  notes: 'Ghi chú',
  paymentType: 'Hình thức thanh toán',
  isFree: 'Miễn phí',
  totalCost: 'Tổng cước',
  actualRevenue: 'Tổng thực thu',
  sendMoneyAmount: 'Số tiền gửi',
  sendCost: 'Cước gửi tiền',
  transferType: 'Hình thức gửi tiền',
  status: 'Trạng thái',
  type: 'Loại mã tiền',
  deliveryId: 'Mã hàng liên kết',
};

const CURRENCY_FIELDS = new Set([
  'cost',
  'homeDeliveryCost',
  'carryCost',
  'homeDeliveryCostTotal',
  'itemValue',
  'itemCost',
  'collectCost',
  'collectForCustomer',
  'collectForCustomerCost',
  'totalCost',
  'actualRevenue',
  'sendMoneyAmount',
  'sendCost',
]);

interface IUserLean {
  _id: string | Types.ObjectId;
  name?: string;
  username?: string;
}

interface ICustomerLean {
  phone?: string;
}

interface IRouteLean {
  _id?: string | Types.ObjectId;
  code?: string;
  name?: string;
  address?: string;
}

interface IEditHistoryLean {
  _id: string | Types.ObjectId;
  fullCode?: string;
  receivedAt?: Date;
  editedAt?: Date;
  content?: string;
  editedBy?: IUserLean;
}

interface IRemovedDeliveryLean {
  _id: string | Types.ObjectId;
  fullCode: string;
  senderName?: string;
  receiverName?: string;
  sender?: ICustomerLean;
  receiver?: ICustomerLean;
  toRoute?: IRouteLean;
  homeDelivery?: string;
  //address?: string;
  name?: string;
  quantity?: number;
  paymentType?: string;
  cost?: number;
  collectCost?: number;
  collectForCustomer?: number;
  notes?: string;
  content?: string;
  reason?: string;
  originalCreatedAt?: Date;
  originalUpdatedAt?: Date;
  deletedAt?: Date;
  deletedBy?: IUserLean;
}

interface IRemovedMoneyDeliveryLean {
  _id: string | Types.ObjectId;
  fullCode: string;
  senderName?: string;
  receiverName?: string;
  sender?: ICustomerLean;
  receiver?: ICustomerLean;
  toRoute?: IRouteLean;
  sendMoneyAmount?: number;
  sendCost?: number;
  totalCost?: number;
  transferType?: string;
  status?: string;
  type?: string;
  notes?: string;
  content?: string;
  reason?: string;
  originalCreatedAt?: Date;
  originalUpdatedAt?: Date;
  deletedAt?: Date;
  deletedBy?: IUserLean;
}

interface IRouteValue {
  _id?: unknown;
  id?: unknown;
  code?: unknown;
  name?: unknown;
}

interface IReferenceValue {
  _id?: unknown;
  id?: unknown;
}

const getReferenceId = (value: unknown): string | null => {
  if (value instanceof Types.ObjectId) {
    return value.toHexString();
  }

  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const reference = value as IReferenceValue;
  const id = reference._id ?? reference.id;

  if (id === value) {
    return null;
  }

  return getReferenceId(id);
};

const normalizeValue = (value: unknown): unknown => {
  if (value === undefined || value === null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Types.ObjectId) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(item => normalizeValue(item));
  }

  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;

    return Object.entries(source).reduce<Record<string, unknown>>((result, [key, item]) => {
      if (!['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) {
        result[key] = normalizeValue(item);
      }

      return result;
    }, {});
  }

  return value;
};

const getEmployeeName = (user?: IUserLean): string | undefined =>
  user?.name?.trim() || user?.username?.trim() || undefined;

const getIdString = (value: unknown): string => {
  if (value instanceof Types.ObjectId) {
    return value.toHexString();
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

const getRouteIdFromValue = (value: unknown): string | null => {
  if (value instanceof Types.ObjectId) {
    return value.toHexString();
  }

  if (typeof value === 'string') {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const route = value as IRouteValue;
  const id = route._id ?? route.id;

  if (id instanceof Types.ObjectId) {
    return id.toHexString();
  }

  if (typeof id === 'string') {
    return id;
  }

  return null;
};

const getRouteLabelFromValue = (value: unknown): string | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const route = value as IRouteValue;

  const code = typeof route.code === 'string' ? route.code.trim() : '';

  const name = typeof route.name === 'string' ? route.name.trim() : '';

  if (code && name) {
    return `${code} - ${name}`;
  }

  return code || name || null;
};

export class EditHistoryService {
  private readonly userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  private async getSelectedRouteObjectId(userId: string): Promise<Types.ObjectId> {
    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

    if (!Types.ObjectId.isValid(selectedRouteId)) {
      throw new Error('User selected route is invalid');
    }

    return new Types.ObjectId(selectedRouteId);
  }

  async getDeliveryEditLogs(
    query: EditHistoryDateRangeQuery,
    userId: string
  ): Promise<IEditHistoryResponse[]> {
    const fromRoute = await this.getSelectedRouteObjectId(userId);

    return this.getEditLogs(EditHistoryEntity.DELIVERY, query, fromRoute);
  }

  async getMoneyEditLogs(
    query: EditHistoryDateRangeQuery,
    userId: string
  ): Promise<IEditHistoryResponse[]> {
    const fromRoute = await this.getSelectedRouteObjectId(userId);

    return this.getEditLogs(EditHistoryEntity.MONEY_DELIVERY, query, fromRoute);
  }

  async getRemovedDeliveries(
    query: EditHistoryDateRangeQuery,
    userId: string
  ): Promise<IRemovedDeliveryResponse[]> {
    const fromRoute = await this.getSelectedRouteObjectId(userId);

    const rows = (await RemovedDelivery.find({
      fromRoute,

      deletedAt: {
        $gte: query.startDate,
        $lte: query.endDate,
      },
    })
      .populate([
        {
          path: 'sender',
          select: '_id phone',
        },
        {
          path: 'receiver',
          select: '_id phone',
        },
        { path: 'toRoute', select: '_id code name address' },
        {
          path: 'deletedBy',
          select: '_id username name',
        },
      ])
      .sort({
        deletedAt: -1,
        _id: -1,
      })
      .lean()) as unknown as IRemovedDeliveryLean[];

    return rows.map(
      (row: IRemovedDeliveryLean): IRemovedDeliveryResponse => ({
        id: getIdString(row._id),
        fullCode: row.fullCode,
        createdAt: row.originalCreatedAt,
        deletedAt: row.deletedAt,
        employeeName: getEmployeeName(row.deletedBy),
        sender: {
          name: row.senderName,
          phone: row.sender?.phone,
        },
        receiver: {
          name: row.receiverName,
          phone: row.receiver?.phone,
        },
        address: row.toRoute?.address,
        name: row.name,
        quantity: row.quantity,
        paymentType: row.paymentType,
        cost: row.cost,
        collectCost: row.collectCost,
        collectForCustomer: row.collectForCustomer,
        content: row.content || row.notes,
        reason: row.reason,
      })
    );
  }

  async getRemovedMoneyDeliveries(
    query: EditHistoryDateRangeQuery,
    userId: string
  ): Promise<IRemovedMoneyDeliveryResponse[]> {
    const fromRoute = await this.getSelectedRouteObjectId(userId);

    const rows = (await RemovedMoneyDelivery.find({
      fromRoute,

      deletedAt: {
        $gte: query.startDate,
        $lte: query.endDate,
      },
    })
      .populate([
        {
          path: 'sender',
          select: '_id phone',
        },
        {
          path: 'receiver',
          select: '_id phone',
        },
        { path: 'toRoute', select: '_id code name address' },
        {
          path: 'deletedBy',
          select: '_id username name',
        },
      ])
      .sort({
        deletedAt: -1,
        _id: -1,
      })
      .lean()) as unknown as IRemovedMoneyDeliveryLean[];

    return rows.map(
      (row: IRemovedMoneyDeliveryLean): IRemovedMoneyDeliveryResponse => ({
        id: getIdString(row._id),
        fullCode: row.fullCode,
        createdAt: row.originalCreatedAt,
        deletedAt: row.deletedAt,
        employeeName: getEmployeeName(row.deletedBy),
        sender: {
          name: row.senderName,
          phone: row.sender?.phone,
        },
        receiver: {
          name: row.receiverName,
          phone: row.receiver?.phone,
        },
        address: row.toRoute?.address,
        sendMoneyAmount: row.sendMoneyAmount,
        sendCost: row.sendCost,
        totalCost: row.totalCost,
        transferType: row.transferType,
        status: row.status,
        type: row.type,
        content: row.content || row.notes,
        reason: row.reason,
      })
    );
  }

  async createEditHistory(params: ICreateEditHistoryParams): Promise<void> {
    const entityId = params.entityId.toString();
    const editedBy = params.editedBy.toString();

    if (!Types.ObjectId.isValid(entityId)) {
      throw new Error('Invalid edit history entity ID');
    }

    if (!Types.ObjectId.isValid(editedBy)) {
      throw new Error('Invalid edit history user ID');
    }

    const fromRouteId =
      getReferenceId(params.before.fromRoute) ?? getReferenceId(params.after.fromRoute);

    if (!fromRouteId || !Types.ObjectId.isValid(fromRouteId)) {
      throw new Error('Invalid edit history from route ID');
    }

    const fields: readonly AuditField[] =
      params.entityType === EditHistoryEntity.DELIVERY
        ? DELIVERY_AUDIT_FIELDS
        : MONEY_DELIVERY_AUDIT_FIELDS;

    const rawChanges = fields.reduce<IRawEditHistoryChange[]>((result, field) => {
      const change: IRawEditHistoryChange = {
        field,
        label: FIELD_LABELS[field] || field,
        oldValue: normalizeValue(params.before[field]),
        newValue: normalizeValue(params.after[field]),
      };

      if (!isEqual(change.oldValue, change.newValue)) {
        result.push(change);
      }

      return result;
    }, []);

    if (rawChanges.length === 0) {
      return;
    }

    const routeCache = new Map<string, string>();
    const contentParts: string[] = [];
    const changes: IEditHistoryChange[] = [];

    for (const change of rawChanges) {
      const [oldDisplayValue, newDisplayValue] = await Promise.all([
        this.formatDisplayValue(change.field, change.oldValue, routeCache),
        this.formatDisplayValue(change.field, change.newValue, routeCache),
      ]);

      changes.push(change);
      contentParts.push(`${change.label}: ${oldDisplayValue} → ${newDisplayValue}`);
    }

    const fullCode = String(params.after.fullCode || params.before.fullCode || '').trim();
    const receivedAtValue = params.before.createdAt || params.after.createdAt;
    const receivedAt = receivedAtValue ? new Date(String(receivedAtValue)) : new Date();

    await EditHistory.create({
      entityType: params.entityType,
      entityId: new Types.ObjectId(entityId),

      // Trạm tạo đơn, dùng để phân quyền xem.
      fromRoute: new Types.ObjectId(fromRouteId),

      fullCode,
      receivedAt,
      editedBy: new Types.ObjectId(editedBy),
      changes,
      content: contentParts.join('; '),
      editedAt: new Date(),
    });
  }

  private async getEditLogs(
    entityType: EditHistoryEntity,
    query: EditHistoryDateRangeQuery,
    fromRoute: Types.ObjectId
  ): Promise<IEditHistoryResponse[]> {
    const rows = (await EditHistory.find({
      entityType,
      fromRoute,

      editedAt: {
        $gte: query.startDate,
        $lte: query.endDate,
      },
    })
      .populate({
        path: 'editedBy',
        select: '_id username name',
      })
      .sort({
        editedAt: -1,
        _id: -1,
      })
      .lean()) as unknown as IEditHistoryLean[];

    return rows.map(
      (row: IEditHistoryLean): IEditHistoryResponse => ({
        id: getIdString(row._id),
        employeeName: getEmployeeName(row.editedBy),
        fullCode: row.fullCode,
        receivedAt: row.receivedAt,
        editedAt: row.editedAt,
        content: row.content,
      })
    );
  }

  private async formatDisplayValue(
    field: string,
    value: unknown,
    routeCache: Map<string, string>
  ): Promise<string> {
    if (value === null || value === undefined || value === '') {
      return 'Trống';
    }

    if (field === 'toRoute') {
      const populatedRouteLabel = getRouteLabelFromValue(value);

      if (populatedRouteLabel) {
        return populatedRouteLabel;
      }

      const routeId = getRouteIdFromValue(value);

      if (!routeId) {
        return 'Trống';
      }

      const cached = routeCache.get(routeId);

      if (cached) {
        return cached;
      }

      if (!Types.ObjectId.isValid(routeId)) {
        return routeId;
      }

      const route = await Route.findById(routeId).select('code name').lean();

      if (!route) {
        return routeId;
      }

      const routeName = `${route.code} - ${route.name}`;

      routeCache.set(routeId, routeName);

      return routeName;
    }

    if (typeof value === 'boolean') {
      return value ? 'Có' : 'Không';
    }

    if (typeof value === 'number') {
      if (CURRENCY_FIELDS.has(field)) {
        return `${value.toLocaleString('vi-VN')} đ`;
      }
      return value.toLocaleString('vi-VN');
    }

    if (field === 'paymentType') {
      return value === 'debt' ? 'Nợ cước' : 'Đã trả';
    }

    if (field === 'vehicleType') {
      const vehicleLabels: Record<string, string> = {
        motorbike: 'Xe máy',
        'small-truck': 'Xe tải nhỏ',
        'large-truck': 'Xe tải lớn',
      };
      return vehicleLabels[String(value)] || String(value);
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }
}
