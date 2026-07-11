import mongoose, { Document, Schema } from 'mongoose';

export enum EditHistoryEntity {
  DELIVERY = 'delivery',
  MONEY_DELIVERY = 'money-delivery',
}

export interface IEditHistoryChange {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface IEditHistory extends Document {
  _id: string;
  entityType: EditHistoryEntity;
  entityId: mongoose.Types.ObjectId;
  fromRoute: mongoose.Types.ObjectId;
  fullCode: string;
  receivedAt: Date;
  editedBy: mongoose.Types.ObjectId;
  changes: IEditHistoryChange[];
  content: string;
  editedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const editHistoryChangeSchema = new Schema<IEditHistoryChange>(
  {
    field: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    oldValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const editHistorySchema = new Schema<IEditHistory>(
  {
    entityType: {
      type: String,
      enum: Object.values(EditHistoryEntity),
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    fromRoute: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      required: true,
      index: true,
    },
    fullCode: {
      type: String,
      required: true,
      trim: true,
    },
    receivedAt: {
      type: Date,
      required: true,
    },
    editedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Edited by user is required'],
    },
    changes: {
      type: [editHistoryChangeSchema],
      required: true,
      default: [],
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    editedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'editHistories',
    toJSON: {
      transform: function (_doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: _id, ...rest };
      },
    },
  }
);

editHistorySchema.index({ entityType: 1, fromRoute: 1, editedAt: -1 });
editHistorySchema.index({ entityType: 1, fullCode: 1, editedAt: -1 });
editHistorySchema.index({ entityType: 1, entityId: 1, editedAt: -1 });
editHistorySchema.index({ editedBy: 1, editedAt: -1 });

export const EditHistory = mongoose.model<IEditHistory>('EditHistory', editHistorySchema);
