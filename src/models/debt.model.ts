import mongoose, { Document, ObjectId, Schema } from 'mongoose';

export interface IDebt extends Document {
  _id: string;
  fromRoute: ObjectId; // tram account dang su dung
  toRoute: ObjectId;
  openingBalance: number; // ton dau (co the am - bieu thi so du co hoac tra vuot)
  costFromRoute: number; // tien di
  feeCODToRoute: number; // no cuoc ve
  costToRoute: number; // tien ve
  feeCODFromRoute: number; // no cuoc di
  accountPayable: number; // chuyen tien (khoan phai tra)
  receivable: number; // thu tien (khoan phai thu)
  homeDeliveryFromRoute: number; // GTN di
  homeDeliveryToRoute: number; // GTN ve
  surchargeToRoute: number; // phu phi ve
  surchargeFromRoute: number; // phu phi di
  revenueHomeDelivery: number; // DT GTN NỘP (+)
  revenueSurcharge: number; // DT PHỤ PHÍ NỘP (+)
  revenueTotal: number; // DOANH THU
  totalDebt: number; // cong no (co the am - bieu thi so du co hoac tra vuot)
  createdAt: Date;
  updatedAt: Date;
  dateDebt: Date;
}

const debtSchema = new Schema<IDebt>(
  {
    fromRoute: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'From route is required'],
    },
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
    revenueHomeDelivery: {
      type: Schema.Types.Number,
      required: false,
      default: 0,
    },

    revenueSurcharge: {
      type: Schema.Types.Number,
      required: false,
      default: 0,
    },

    revenueTotal: {
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
    dateDebt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'debts',
    toJSON: {
      transform: function (_doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: _id, ...rest };
      },
    },
  }
);

// Business logic validation
// debtSchema.pre('save', async function (next) {
//   try {
//     const session = this.$session?.();

//     // find one debt and get totalDebt to assign to openingBalance
//     let lastDebt;

//     if (session) {
//       lastDebt = await Debt.findOne({ fromRoute: this.fromRoute, toRoute: this.toRoute })
//         .sort({
//           createdAt: -1,
//         })
//         .session(session);
//     } else {
//       lastDebt = await Debt.findOne({ fromRoute: this.fromRoute, toRoute: this.toRoute }).sort({
//         createdAt: -1,
//       });
//     }

//     console.log('fromRoute :>> ', this.fromRoute);
//     console.log('toRoute :>> ', this.toRoute);
//     console.log('lastDebt :>> ', lastDebt);
//     // assign value to openingBalance
//     if (lastDebt) {
//       if (lastDebt.totalDebt === 0) {
//         this.openingBalance = 0;
//       } else {
//         this.openingBalance = lastDebt.totalDebt;
//       }
//     } else {
//       this.openingBalance = 0;
//     }

//     // handle two field: accountPayable and receivable
//     if (this.openingBalance == 0) {
//       this.accountPayable = 0;
//       this.receivable = 0;
//     } else if (this.openingBalance > 0) {
//       this.accountPayable = +this.openingBalance;
//     } else if (this.openingBalance < 0) {
//       this.receivable = +this.openingBalance;
//     }

//     // calculate totalDebt
//     if (lastDebt) {
//       this.totalDebt =
//         this.costFromRoute +
//         this.feeCODToRoute +
//         this.homeDeliveryFromRoute -
//         (this.costToRoute + this.feeCODFromRoute + this.homeDeliveryToRoute) +
//         lastDebt.paymentDebt;
//     } else {
//       this.totalDebt =
//         this.costFromRoute +
//         this.feeCODToRoute +
//         this.homeDeliveryFromRoute -
//         (this.costToRoute + this.feeCODFromRoute + this.homeDeliveryToRoute);
//     }
//   } catch (error) {
//     throw new Error('Error calculating totalDebt: ' + (error as Error).message);
//   }
// });

// Optimized indexes (removed redundant ones)
debtSchema.index({ fromRoute: 1, toRoute: 1, createdAt: -1 });
debtSchema.index({ fromRoute: 1, createdAt: -1 });
debtSchema.index({ toRoute: 1, createdAt: -1 });
debtSchema.index({ toRoute: 1, createdAt: -1, fromRoute: 1 });
debtSchema.index({ toRoute: 1, dateDebt: 1, fromRoute: 1 });
debtSchema.index({ fromRoute: 1, dateDebt: 1 });
debtSchema.index({ toRoute: 1, dateDebt: 1 });
debtSchema.index({ createdAt: -1 });
debtSchema.index({ dateDebt: 1 });

// UNIQUE constraint to prevent duplicate (fromRoute, toRoute, dateDebt)
debtSchema.index({ fromRoute: 1, toRoute: 1, dateDebt: 1 }, { unique: true });

export const Debt = mongoose.model<IDebt>('Debt', debtSchema);
