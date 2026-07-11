import type { Types } from 'mongoose';

import type { EditHistoryEntity } from '@/models/edit-history.model';

export interface IEditHistoryChangeResponse {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface IEditHistoryResponse {
  id: string;
  employeeName?: string;
  fullCode?: string;
  receivedAt?: Date;
  editedAt?: Date;
  content?: string;
}

export interface IBaseEditHistoryPerson {
  name?: string;
  phone?: string;
}

export interface IRemovedDeliveryResponse {
  id: string;
  fullCode: string;
  createdAt?: Date;
  deletedAt?: Date;
  employeeName?: string;
  sender?: IBaseEditHistoryPerson;
  receiver?: IBaseEditHistoryPerson;
  address?: string;
  name?: string;
  quantity?: number;
  paymentType?: string;
  cost?: number;
  collectCost?: number;
  collectForCustomer?: number;
  content?: string;
  reason?: string;
}

export interface IRemovedMoneyDeliveryResponse {
  id: string;
  fullCode: string;
  createdAt?: Date;
  deletedAt?: Date;
  employeeName?: string;
  sender?: IBaseEditHistoryPerson;
  receiver?: IBaseEditHistoryPerson;
  address?: string;
  sendMoneyAmount?: number;
  sendCost?: number;
  totalCost?: number;
  transferType?: string;
  status?: string;
  type?: string;
  content?: string;
  reason?: string;
}

export interface ICreateEditHistoryParams {
  entityType: EditHistoryEntity;
  entityId: string | Types.ObjectId;
  editedBy: string | Types.ObjectId;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}
