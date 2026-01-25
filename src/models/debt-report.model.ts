import mongoose, { Document, ObjectId, Schema } from 'mongoose';

export interface IDebtReport extends Document {
  _id: string;
  toRoute: ObjectId;
  openingBalance: number; // ton dau (co the am - bieu thi so du co hoac tra vuot)
  costFromRoute: number; // tien cuoc di
  feeCODToRoute: number; // no cuoc ve
  costToRoute: number; // tien cuoc ve
  feeCODFromRoute: number; // no cuoc di
  accountPayable: number; // chuyen tien (khoan phai tra)
  receivable: number; // thu tien (khoan phai thu)
  homeDeliveryFromRoute: number; // GTN di
  homeDeliveryToRoute: number; // GTN ve
  surchargeToRoute: number; // phu phi di
  surchargeFromRoute: number; // phu phi ve
  totalDebt: number; // cong no (co the am - bieu thi so du co hoac tra vuot)
  createdAt: Date;
  updatedAt: Date;
  dateDebtReport: Date;
}

const debtReportSchema = new Schema<IDebtReport>(
  {
    toRoute: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'To route is required'],
    },
    openingBalance: {
      type: Schema.Types.Number,
      required: false,
      default: 0,
      // Note: Can be negative (represents credit balance or overpayment)
    },
    costFromRoute: {
      type: Schema.Types.Number,
      required: false,
      default: 0,
    },
    feeCODToRoute: {
      type: Schema.Types.Number,
      required: false,
      default: 0,
    },
    costToRoute: {
      type: Schema.Types.Number,
      required: false,
      default: 0,
    },
    feeCODFromRoute: {
      type: Schema.Types.Number,
      required: false,
      default: 0,
    },
    accountPayable: {
      type: Schema.Types.Number,
      required: false,
      default: 0,
    },
    receivable: {
      type: Schema.Types.Number,
      required: false,
      default: 0,
    },
    homeDeliveryFromRoute: {
      type: Schema.Types.Number,
      required: false,
      default: 0,
    },
    homeDeliveryToRoute: {
      type: Schema.Types.Number,
      required: false,
      default: 0,
    },
    surchargeToRoute: {
      type: Schema.Types.Number,
      required: false,
      default: 0,
    },
    surchargeFromRoute: {
      type: Schema.Types.Number,
      required: false,
      default: 0,
    },
    totalDebt: {
      type: Schema.Types.Number,
      required: false,
      default: 0,
      // Note: Can be negative (represents credit balance or overpayment)
    },
    dateDebtReport: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'debt-reports',
    toJSON: {
      transform: function (_doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: _id, ...rest };
      },
    },
  }
);

debtReportSchema.index({ toRoute: 1, createdAt: -1 });
debtReportSchema.index({ toRoute: 1 });
debtReportSchema.index({ createdAt: -1 });

export const DebtReport = mongoose.model<IDebtReport>('DebtReport', debtReportSchema);
