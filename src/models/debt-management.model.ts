import { DEBT_MANAGEMENT_TYPE } from '@/const/debt-management.const';
import mongoose, { Document, ObjectId, Schema } from 'mongoose';

export interface IDebtManagement extends Document {
  _id: string;
  fromRoute: ObjectId; // tram tra tien
  toRoute: ObjectId; // tram nhan tien
  content: string;
  type: string;
  cash: number; // so tien
  deleted: boolean;
  cashDate: Date; // ngay thu tien
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}

const debtManagementSchema = new Schema<IDebtManagement>(
  {
    fromRoute: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      required: false,
    },
    toRoute: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      required: false,
    },
    type: {
      type: String,
      enum: Object.values(DEBT_MANAGEMENT_TYPE),
      default: DEBT_MANAGEMENT_TYPE.PAYMENT,
    },
    content: {
      type: String,
      trim: true,
    },
    cash: {
      type: Schema.Types.Number,
      required: true,
      default: 0,
    },
    cashDate: {
      type: Date,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null
    },
  },
  {
    timestamps: true,
    collection: 'debtManagements',
    toJSON: {
      transform: function (_doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: _id, ...rest };
      },
    },
  }
);

// Index is already created by unique: true in the field definition
debtManagementSchema.index({ fromRoute: 1, toRoute: 1, type: 1, createdAt: -1 });
debtManagementSchema.index({ fromRoute: 1, toRoute: 1, createdAt: -1 });
debtManagementSchema.index({ fromRoute: 1, type: 1, createdAt: -1 });
debtManagementSchema.index({ fromRoute: 1, type: 1 });
debtManagementSchema.index({ createdAt: -1 });

export const DebtManagement = mongoose.model<IDebtManagement>(
  'DebtManagement',
  debtManagementSchema
);
