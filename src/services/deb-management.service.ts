import {
  DEBT_MANAGEMENT_TYPE,
  DEBT_MANAGEMENT_TYPE_REPORT,
  SORT_BY,
} from '@/const/debt-management.const';
import { DebtManagement } from '@/models/debt-management.model';
import { Debt, type IDebt } from '@/models/debt.model';
import { Route } from '@/models/route.model';
import {
  ICreateDebtManagementRequest,
  IDebtManagement,
  IGetListPaymentDebtManagementResponse,
  IGetListReceiptDebtManagementResponse,
} from '@/types/debt-management.type';
import { IExportReportTotalDebtResponse, IGetListDebtResponse } from '@/types/debt.type';
import { Request } from 'express';
import mongoose, { Types } from 'mongoose';
import { DebtReportService } from './debt-report.service';
import { DebtService } from './debt.service';
import { UserService } from './user.service';

const VN_UTC_OFFSET_HOURS = 7;

function getTodayVn(): { year: number; month: number; date: number } {
  const now = new Date();
  const vnMs = now.getTime() + VN_UTC_OFFSET_HOURS * 60 * 60 * 1000;
  const vnDate = new Date(vnMs);
  return {
    year: vnDate.getUTCFullYear(),
    month: vnDate.getUTCMonth(),
    date: vnDate.getUTCDate(),
  };
}

function vnDateToDebtDateUtc(year: number, month: number, date: number): Date {
  return new Date(Date.UTC(year, month, date - 1, 17, 0, 0, 0));
}

function vnDateToUtcRange(year: number, month: number, date: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month, date - 1, 17, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, date, 16, 59, 59, 999));
  return { start, end };
}

export interface ICreateDebtClearingRequest {
  fromRoute: string;
  toRoute: string;
  pivotRoute?: string;
  content: string;
  cash: number;
  cashDate: Date;
}

type DebtPairResult = {
  forward: {
    _id: any;
    receivable: number;
    totalDebt: number;
  };
  reverse: {
    _id: any;
    accountPayable: number;
    totalDebt: number;
  };
};
type DebtClearingDirection = 'FORWARD' | 'REVERSE';
type DebtPairDirection = 'FORWARD' | 'REVERSE';

type DebtClearingPlan = {
  direction: DebtClearingDirection;

  sourceRouteIdObj: Types.ObjectId;
  pivotRouteIdObj: Types.ObjectId;
  targetRouteIdObj: Types.ObjectId;

  sourcePivotDirection: DebtPairDirection;
  pivotTargetDirection: DebtPairDirection;
};

export class DebtManagementService {
  private userService: UserService;
  private debtReportService: DebtReportService;
  private debtService: DebtService;

  constructor() {
    this.userService = new UserService();
    this.debtReportService = new DebtReportService();
    this.debtService = new DebtService();
  }

  async getListPaymentDebtMangement(
    req: Request,
    userId: string
  ): Promise<IGetListPaymentDebtManagementResponse> {
    const { startDate, endDate, keySort, toRouteId } = req.query;
    const { typeSort } = req.query;

    const startOfDate = new Date(String(startDate));
    const endOfDate = new Date(String(endDate));
    const start = new Date(
      startOfDate.getFullYear(),
      startOfDate.getMonth(),
      startOfDate.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfDay = new Date(
      endOfDate.getFullYear(),
      endOfDate.getMonth(),
      endOfDate.getDate(),
      23,
      59,
      59,
      999
    );

    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);
    const fromRouteRootId = await this.getRootRouteIdNoSession(
      new Types.ObjectId(String(selectedRouteId))
    );

    let sort: Record<string, 1 | -1> = {};

    let typeSortValue: 1 | -1 | undefined = undefined;
    if (typeSort) {
      const numValue = Number(typeSort);
      if (numValue === 1 || numValue === -1) {
        typeSortValue = numValue;
      }
    }

    if (keySort) {
      if (!typeSortValue) {
        typeSortValue = 1;
      }

      switch (keySort) {
        case SORT_BY.CASH_DATE:
          sort = { cashDate: typeSortValue };
          break;
        case SORT_BY.CASH:
          sort = { cash: typeSortValue };
          break;
        case SORT_BY.TO_ROUTE:
          sort = { 'toRoute.name': typeSortValue };
          break;
        default:
          sort = { 'toRoute.name': 1, createdAt: 1 };
          break;
      }
    } else {
      sort = { 'toRoute.name': 1, createdAt: 1 };
    }

    try {
      const matchStage: Record<string, unknown> = {
        fromRoute: fromRouteRootId,
        type: DEBT_MANAGEMENT_TYPE.PAYMENT,
        createdAt: { $gte: start, $lte: endOfDay },
        deleted: false,
      };

      if (toRouteId) {
        const toRouteRootId = await this.getRootRouteIdNoSession(
          new Types.ObjectId(String(toRouteId))
        );
        matchStage.toRoute = toRouteRootId;
      }

      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'routes',
            localField: 'fromRoute',
            foreignField: '_id',
            as: 'fromRoute',
          },
        },
        { $unwind: { path: '$fromRoute', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'routes',
            localField: 'toRoute',
            foreignField: '_id',
            as: 'toRoute',
          },
        },
        { $unwind: { path: '$toRoute', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'routes',
            localField: 'pivotRoute',
            foreignField: '_id',
            as: 'pivotRoute',
          },
        },
        { $unwind: { path: '$pivotRoute', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdBy',
          },
        },
        { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            id: '$_id',
            fromRoute: { id: '$fromRoute._id', name: '$fromRoute.name' },
            toRoute: { id: '$toRoute._id', name: '$toRoute.name' },
            pivotRoute: {
              id: '$pivotRoute._id',
              name: '$pivotRoute.name',
            },
            content: 1,
            type: 1,
            cash: 1,
            cashDate: 1,
            deleted: 1,
            reason: 1,
            createdAt: 1,
            updatedAt: 1,
            createdBy: {
              id: '$createdBy._id',
              username: '$createdBy.username',
              name: '$createdBy.name',
            },
          },
        },
        { $sort: sort },
      ];

      const result = (await DebtManagement.aggregate(pipeline).exec()) as IDebtManagement[];

      return { data: result };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list payment debt management failed');
    }
  }

  private async rebuildDebtPairFromActiveManagements(
    fromRouteId: Types.ObjectId,
    toRouteId: Types.ObjectId,
    dateDebtExact: Date,
    session: mongoose.ClientSession
  ): Promise<void> {
    const todayVn = getTodayVn();
    const todayRange = vnDateToUtcRange(todayVn.year, todayVn.month, todayVn.date);

    const records = await DebtManagement.find({
      createdAt: { $gte: todayRange.start, $lte: todayRange.end },
      deleted: false,
      type: DEBT_MANAGEMENT_TYPE.CLEARING,
      $or: [
        {
          fromRoute: fromRouteId,
          toRoute: toRouteId,
        },
        {
          fromRoute: toRouteId,
          toRoute: fromRouteId,
        },

        {
          fromRoute: fromRouteId,
          pivotRoute: toRouteId,
        },
        {
          pivotRoute: fromRouteId,
          toRoute: toRouteId,
        },

        {
          fromRoute: toRouteId,
          pivotRoute: fromRouteId,
        },
        {
          pivotRoute: toRouteId,
          toRoute: fromRouteId,
        },
      ],
    })
      .session(session)
      .lean();

    // paymentAmount không còn dùng để rebuild debt
    let clearingAmount = 0;

    const isSamePair = (effectFrom: unknown, effectTo: unknown) =>
      String(effectFrom) === String(fromRouteId) && String(effectTo) === String(toRouteId);

    const addClearingEffect = (effectFrom: unknown, effectTo: unknown, cash: number) => {
      if (isSamePair(effectFrom, effectTo)) {
        clearingAmount += cash;
      }
    };

    for (const record of records as any[]) {
      const cash = Number(record.cash || 0);

      if (record.type === DEBT_MANAGEMENT_TYPE.CLEARING) {
        if (!record.pivotRoute) {
          continue;
        }

        const sourceRoute = record.fromRoute;
        const targetRoute = record.toRoute;
        const pivotRoute = record.pivotRoute;

        const related =
          isSamePair(sourceRoute, targetRoute) ||
          isSamePair(targetRoute, sourceRoute) ||
          isSamePair(sourceRoute, pivotRoute) ||
          isSamePair(pivotRoute, sourceRoute) ||
          isSamePair(pivotRoute, targetRoute) ||
          isSamePair(targetRoute, pivotRoute);

        if (!related) {
          continue;
        }

        const pairEffect = isSamePair(sourceRoute, targetRoute)
          ? cash
          : isSamePair(targetRoute, sourceRoute)
            ? -cash
            : 0;

        clearingAmount += pairEffect;

        if (record.sourcePivotDirection === 'FORWARD') {
          addClearingEffect(sourceRoute, pivotRoute, -cash);
        } else {
          addClearingEffect(pivotRoute, sourceRoute, -cash);
        }

        if (record.pivotTargetDirection === 'FORWARD') {
          addClearingEffect(pivotRoute, targetRoute, -cash);
        } else {
          addClearingEffect(targetRoute, pivotRoute, -cash);
        }
      }
    }

    const { currentDebt1, currentDebt2 } = await this.getDebtPair(
      fromRouteId,
      toRouteId,
      dateDebtExact,
      session
    );

    if (!currentDebt1 || !currentDebt2) {
      throw new Error('Debt record not found for rebuild');
    }

    // clearing pair có thể âm do rollback trung gian
    const normalizedClearingAmount = clearingAmount;

    const totalDebt1 = this.calcTotalDebtForForward(
      currentDebt1,
      currentDebt1.receivable ?? 0,
      currentDebt1.accountPayable ?? 0,
      normalizedClearingAmount,
      0
    );

    const totalDebt2 = this.calcTotalDebtForReverse(
      currentDebt2,
      currentDebt2.accountPayable ?? 0,
      currentDebt2.receivable ?? 0,
      currentDebt2.clearingReceivable ?? 0,
      normalizedClearingAmount
    );

    const updatedDebt1 = await Debt.findOneAndUpdate(
      {
        _id: currentDebt1._id,
        $or: [
          { clearingReceivable: currentDebt1.clearingReceivable ?? 0 },
          { clearingReceivable: { $exists: false } },
        ],
      },
      {
        clearingReceivable: normalizedClearingAmount,
        clearingAccountPayable: 0,
        totalDebt: totalDebt1,
      },
      { session, new: true, runValidators: true }
    );

    if (!updatedDebt1) {
      throw new Error('Debt was changed by another request. Please retry.');
    }

    const updatedDebt2 = await Debt.findOneAndUpdate(
      {
        _id: currentDebt2._id,
        $or: [
          { clearingAccountPayable: currentDebt2.clearingAccountPayable ?? 0 },
          { clearingAccountPayable: { $exists: false } },
        ],
      },
      {
        clearingAccountPayable: normalizedClearingAmount,
        clearingReceivable: 0,
        totalDebt: totalDebt2,
      },
      { session, new: true, runValidators: true }
    );

    if (!updatedDebt2) {
      throw new Error('Debt was changed by another request. Please retry.');
    }
  }

  async getListReceiptDebtMangement(
    req: Request,
    userId: string
  ): Promise<IGetListReceiptDebtManagementResponse> {
    const { startDate, endDate, keySort, typeSort, fromRouteId } = req.query;

    const startOfDate = new Date(String(startDate));
    const endOfDate = new Date(String(endDate));
    const start = new Date(
      startOfDate.getFullYear(),
      startOfDate.getMonth(),
      startOfDate.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfDay = new Date(
      endOfDate.getFullYear(),
      endOfDate.getMonth(),
      endOfDate.getDate(),
      23,
      59,
      59,
      999
    );

    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);
    const toRouteRootId = await this.getRootRouteIdNoSession(
      new Types.ObjectId(String(selectedRouteId))
    );

    let sort: Record<string, 1 | -1> = {};

    let typeSortValue: 1 | -1 | undefined = undefined;
    if (typeSort) {
      const numValue = Number(typeSort);
      if (numValue === 1 || numValue === -1) {
        typeSortValue = numValue;
      }
    }

    if (keySort) {
      if (!typeSortValue) {
        typeSortValue = 1;
      }

      switch (keySort) {
        case SORT_BY.CASH_DATE:
          sort = { cashDate: typeSortValue };
          break;
        case SORT_BY.CASH:
          sort = { cash: typeSortValue };
          break;
        case SORT_BY.TO_ROUTE:
          sort = { 'toRoute.name': typeSortValue };
          break;
        default:
          sort = { 'toRoute.name': 1, createdAt: 1 };
          break;
      }
    } else {
      sort = { 'toRoute.name': 1, createdAt: 1 };
    }

    try {
      const matchStage: Record<string, unknown> = {
        toRoute: toRouteRootId,
        type: DEBT_MANAGEMENT_TYPE.RECEIPT,
        createdAt: { $gte: start, $lte: endOfDay },
        deleted: false,
      };

      if (fromRouteId) {
        const fromRouteRootId = await this.getRootRouteIdNoSession(
          new Types.ObjectId(String(fromRouteId))
        );
        matchStage.fromRoute = fromRouteRootId;
      }

      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'routes',
            localField: 'fromRoute',
            foreignField: '_id',
            as: 'fromRoute',
          },
        },
        { $unwind: { path: '$fromRoute', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'routes',
            localField: 'toRoute',
            foreignField: '_id',
            as: 'toRoute',
          },
        },
        { $unwind: { path: '$toRoute', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'routes',
            localField: 'pivotRoute',
            foreignField: '_id',
            as: 'pivotRoute',
          },
        },
        { $unwind: { path: '$pivotRoute', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdBy',
          },
        },
        { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            id: '$_id',
            fromRoute: { id: '$fromRoute._id', name: '$fromRoute.name' },
            toRoute: { id: '$toRoute._id', name: '$toRoute.name' },
            pivotRoute: {
              id: '$pivotRoute._id',
              name: '$pivotRoute.name',
            },
            content: 1,
            type: 1,
            cash: 1,
            cashDate: 1,
            deleted: 1,
            reason: 1,
            createdAt: 1,
            updatedAt: 1,
            createdBy: {
              id: '$createdBy._id',
              username: '$createdBy.username',
              name: '$createdBy.name',
            },
          },
        },
        { $sort: sort },
      ];

      const result = (await DebtManagement.aggregate(pipeline).exec()) as IDebtManagement[];

      return { data: result };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list receipt debt management failed');
    }
  }

  private getDateDebtExactToday() {
    const todayVn = getTodayVn();
    return {
      todayVn,
      dateDebtExact: vnDateToDebtDateUtc(todayVn.year, todayVn.month, todayVn.date),
    };
  }

  private async getDebtPair(
    fromRouteId: Types.ObjectId,
    toRouteId: Types.ObjectId,
    dateDebtExact: Date,
    session: mongoose.ClientSession
  ) {
    const [currentDebt1, currentDebt2] = await Promise.all([
      Debt.findOne({
        fromRoute: fromRouteId,
        toRoute: toRouteId,
        dateDebt: dateDebtExact,
      })
        .sort({ createdAt: -1 })
        .session(session)
        .lean<IDebt>(),
      Debt.findOne({
        fromRoute: toRouteId,
        toRoute: fromRouteId,
        dateDebt: dateDebtExact,
      })
        .sort({ createdAt: -1 })
        .session(session)
        .lean<IDebt>(),
    ]);

    return { currentDebt1, currentDebt2 };
  }

  private calcTotalDebtForForward(
    currentDebt: any,
    nextReceivable: number,
    nextAccountPayable?: number,
    nextClearingReceivable?: number,
    nextClearingAccountPayable?: number
  ): number {
    const costFromRoute = currentDebt.costFromRoute ?? 0;
    const feeCODToRoute = currentDebt.feeCODToRoute ?? 0;
    const homeDeliveryFromRoute = currentDebt.homeDeliveryFromRoute ?? 0;
    const surchargeFromRoute = currentDebt.surchargeFromRoute ?? 0;

    const costToRoute = currentDebt.costToRoute ?? 0;
    const feeCODFromRoute = currentDebt.feeCODFromRoute ?? 0;
    const homeDeliveryToRoute = currentDebt.homeDeliveryToRoute ?? 0;
    const surchargeToRoute = currentDebt.surchargeToRoute ?? 0;

    const accountPayable =
      nextAccountPayable !== undefined ? nextAccountPayable : (currentDebt.accountPayable ?? 0);

    const clearingReceivable =
      nextClearingReceivable !== undefined
        ? nextClearingReceivable
        : (currentDebt.clearingReceivable ?? 0);

    const clearingAccountPayable =
      nextClearingAccountPayable !== undefined
        ? nextClearingAccountPayable
        : (currentDebt.clearingAccountPayable ?? 0);

    const openingBalance =
      currentDebt.openingBalance !== null && currentDebt.openingBalance !== undefined
        ? currentDebt.openingBalance
        : 0;

    const A =
      costFromRoute +
      feeCODToRoute +
      homeDeliveryFromRoute +
      surchargeFromRoute +
      nextReceivable +
      clearingReceivable;

    const B =
      costToRoute +
      feeCODFromRoute +
      homeDeliveryToRoute +
      surchargeToRoute +
      accountPayable +
      clearingAccountPayable;

    return A - B + openingBalance;
  }

  private calcTotalDebtForReverse(
    currentDebt: any,
    nextAccountPayable: number,
    nextReceivable?: number,
    nextClearingReceivable?: number,
    nextClearingAccountPayable?: number
  ): number {
    const costFromRoute = currentDebt.costFromRoute ?? 0;
    const feeCODToRoute = currentDebt.feeCODToRoute ?? 0;
    const homeDeliveryFromRoute = currentDebt.homeDeliveryFromRoute ?? 0;
    const surchargeFromRoute = currentDebt.surchargeFromRoute ?? 0;

    const receivable =
      nextReceivable !== undefined ? nextReceivable : (currentDebt.receivable ?? 0);

    const costToRoute = currentDebt.costToRoute ?? 0;
    const feeCODFromRoute = currentDebt.feeCODFromRoute ?? 0;
    const homeDeliveryToRoute = currentDebt.homeDeliveryToRoute ?? 0;
    const surchargeToRoute = currentDebt.surchargeToRoute ?? 0;

    const clearingReceivable =
      nextClearingReceivable !== undefined
        ? nextClearingReceivable
        : (currentDebt.clearingReceivable ?? 0);

    const clearingAccountPayable =
      nextClearingAccountPayable !== undefined
        ? nextClearingAccountPayable
        : (currentDebt.clearingAccountPayable ?? 0);

    const openingBalance =
      currentDebt.openingBalance !== null && currentDebt.openingBalance !== undefined
        ? currentDebt.openingBalance
        : 0;

    const A =
      costFromRoute +
      feeCODToRoute +
      homeDeliveryFromRoute +
      surchargeFromRoute +
      receivable +
      clearingReceivable;

    const B =
      costToRoute +
      feeCODFromRoute +
      homeDeliveryToRoute +
      surchargeToRoute +
      nextAccountPayable +
      clearingAccountPayable;

    return A - B + openingBalance;
  }

  private async applyDebtPairDelta(
    fromRouteId: Types.ObjectId,
    toRouteId: Types.ObjectId,
    dateDebtExact: Date,
    cash: number,
    session: mongoose.ClientSession
  ): Promise<DebtPairResult> {
    const { currentDebt1, currentDebt2 } = await this.getDebtPair(
      fromRouteId,
      toRouteId,
      dateDebtExact,
      session
    );

    const todayVn = getTodayVn();
    const todayVnLabel = `${todayVn.year}-${String(todayVn.month + 1).padStart(2, '0')}-${String(todayVn.date).padStart(2, '0')}`;

    if (!currentDebt1 || !currentDebt2) {
      throw new Error(
        `Debt record not found for the day. Please ensure cronjob has run for today (${todayVnLabel} VN).`
      );
    }

    const receivable1 = (currentDebt1.receivable ?? 0) + cash;

    const totalDebt1 = this.calcTotalDebtForForward(
      currentDebt1,
      receivable1,
      undefined,
      currentDebt1.clearingReceivable ?? 0,
      currentDebt1.clearingAccountPayable ?? 0
    );

    const accountPayable2 = (currentDebt2.accountPayable ?? 0) + cash;

    const totalDebt2 = this.calcTotalDebtForReverse(
      currentDebt2,
      accountPayable2,
      undefined,
      currentDebt2.clearingReceivable ?? 0,
      currentDebt2.clearingAccountPayable ?? 0
    );

    const updatedDebt1 = await Debt.findOneAndUpdate(
      {
        _id: currentDebt1._id,
        receivable: currentDebt1.receivable ?? 0,
        clearingReceivable: currentDebt1.clearingReceivable ?? 0,
      },
      {
        totalDebt: totalDebt1,
        receivable: receivable1,
        accountPayable: 0,
      },
      { session, new: true, runValidators: true }
    );

    if (!updatedDebt1) {
      throw new Error('Debt was changed by another request. Please retry.');
    }

    const updatedDebt2 = await Debt.findOneAndUpdate(
      {
        _id: currentDebt2._id,
        accountPayable: currentDebt2.accountPayable ?? 0,
        clearingAccountPayable: currentDebt2.clearingAccountPayable ?? 0,
      },
      {
        totalDebt: totalDebt2,
        accountPayable: accountPayable2,
        receivable: 0,
      },
      { session, new: true, runValidators: true }
    );

    if (!updatedDebt2) {
      throw new Error('Debt was changed by another request. Please retry.');
    }

    return {
      forward: { _id: currentDebt1._id, receivable: receivable1, totalDebt: totalDebt1 },
      reverse: { _id: currentDebt2._id, accountPayable: accountPayable2, totalDebt: totalDebt2 },
    };
  }

  private async rollbackDebtPairDelta(
    fromRouteId: Types.ObjectId,
    toRouteId: Types.ObjectId,
    dateDebtExact: Date,
    cash: number,
    session: mongoose.ClientSession,
    allowNegative = false
  ): Promise<DebtPairResult> {
    const { currentDebt1, currentDebt2 } = await this.getDebtPair(
      fromRouteId,
      toRouteId,
      dateDebtExact,
      session
    );

    const todayVn = getTodayVn();
    const todayVnLabel = `${todayVn.year}-${String(todayVn.month + 1).padStart(2, '0')}-${String(todayVn.date).padStart(2, '0')}`;

    if (!currentDebt1 || !currentDebt2) {
      throw new Error(
        `Debt record not found for the day. Please ensure cronjob has run for today (${todayVnLabel} VN).`
      );
    }

    const rawReceivable1 = (currentDebt1.receivable ?? 0) - cash;
    const rawAccountPayable2 = (currentDebt2.accountPayable ?? 0) - cash;
    if (!allowNegative && rawReceivable1 < 0) {
      throw new Error('Số tiền thu vượt quá khoản phải thu hiện tại.');
    }
    if (!allowNegative && rawAccountPayable2 < 0) {
      throw new Error('Số tiền thu vượt quá khoản phải trả hiện tại.');
    }
    const receivable1 = rawReceivable1;
    const accountPayable2 = rawAccountPayable2;

    const totalDebt1 = this.calcTotalDebtForForward(
      currentDebt1,
      receivable1,
      undefined,
      currentDebt1.clearingReceivable ?? 0,
      currentDebt1.clearingAccountPayable ?? 0
    );

    const totalDebt2 = this.calcTotalDebtForReverse(
      currentDebt2,
      accountPayable2,
      undefined,
      currentDebt2.clearingReceivable ?? 0,
      currentDebt2.clearingAccountPayable ?? 0
    );

    const updatedDebt1 = await Debt.findOneAndUpdate(
      {
        _id: currentDebt1._id,
        receivable: currentDebt1.receivable ?? 0,
        clearingReceivable: currentDebt1.clearingReceivable ?? 0,
      },
      {
        totalDebt: totalDebt1,
        receivable: receivable1,
        accountPayable: 0,
      },
      { session, new: true, runValidators: true }
    );

    if (!updatedDebt1) {
      throw new Error('Debt was changed by another request. Please retry.');
    }

    const updatedDebt2 = await Debt.findOneAndUpdate(
      {
        _id: currentDebt2._id,
        accountPayable: currentDebt2.accountPayable ?? 0,
        clearingAccountPayable: currentDebt2.clearingAccountPayable ?? 0,
      },
      {
        totalDebt: totalDebt2,
        accountPayable: accountPayable2,
        receivable: 0,
      },
      { session, new: true, runValidators: true }
    );

    if (!updatedDebt2) {
      throw new Error('Debt was changed by another request. Please retry.');
    }

    return {
      forward: { _id: currentDebt1._id, receivable: receivable1, totalDebt: totalDebt1 },
      reverse: { _id: currentDebt2._id, accountPayable: accountPayable2, totalDebt: totalDebt2 },
    };
  }

  async createDebtManagement(
    data: ICreateDebtManagementRequest,
    userId: string
  ): Promise<IDebtManagement[]> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);

      const fromRouteIdObjRaw = new Types.ObjectId(String(data.fromRoute));
      const toRouteIdObjRaw = new Types.ObjectId(String(selectedRouteId));

      const fromRouteIdObj = await this.getRootRouteId(fromRouteIdObjRaw, session);
      const toRouteIdObj = await this.getRootRouteId(toRouteIdObjRaw, session);

      const [fromRoute, toRoute] = await Promise.all([
        Route.findById(fromRouteIdObj).session(session),
        Route.findById(toRouteIdObj).session(session),
      ]);

      if (!fromRoute) {
        throw new Error('From route not found');
      }

      if (!toRoute) {
        throw new Error('To route not found');
      }

      if (fromRouteIdObj.equals(toRouteIdObj)) {
        throw new Error('Cannot create debt management for the same route');
      }

      const { dateDebtExact } = this.getDateDebtExactToday();

      const { currentDebt1, currentDebt2 } = await this.getDebtPair(
        fromRouteIdObj,
        toRouteIdObj,
        dateDebtExact,
        session
      );

      if (!currentDebt1 || !currentDebt2) {
        throw new Error('Không tìm thấy công nợ hôm nay. Vui lòng chạy cron công nợ trước.');
      }

      const currentTotalDebt = currentDebt1.totalDebt ?? 0;
      const absDebt = Math.abs(currentTotalDebt);

      if (absDebt <= 0) {
        throw new Error('Tuyến này hiện không còn công nợ để thu.');
      }

      if (data.cash > absDebt) {
        throw new Error(
          `Số tiền thu vượt quá công nợ hiện tại. Công nợ còn ${absDebt.toLocaleString('vi-VN')}đ.`
        );
      }

      const debtEffectAction = currentTotalDebt > 0 ? 'ROLLBACK' : 'APPLY';

      const receiptDebtManagement = new DebtManagement({
        fromRoute: fromRouteIdObj,
        toRoute: toRouteIdObj,
        cash: data.cash,
        cashDate: data.cashDate,
        content: data.content,
        type: DEBT_MANAGEMENT_TYPE.RECEIPT,
        createdBy: userId,
        debtEffectAction,
      });

      const paymentDebtManagement = new DebtManagement({
        fromRoute: fromRouteIdObj,
        toRoute: toRouteIdObj,
        cash: data.cash,
        cashDate: data.cashDate,
        content: data.content,
        type: DEBT_MANAGEMENT_TYPE.PAYMENT,
        createdBy: userId,
        debtEffectAction,
      });

      const receiptResult = await receiptDebtManagement.save({ session });
      const paymentResult = await paymentDebtManagement.save({ session });

      if (currentTotalDebt > 0) {
        await this.rollbackDebtPairDelta(
          fromRouteIdObj,
          toRouteIdObj,
          dateDebtExact,
          data.cash,
          session,
          true
        );
      } else {
        await this.applyDebtPairDelta(
          fromRouteIdObj,
          toRouteIdObj,
          dateDebtExact,
          data.cash,
          session
        );
      }

      await this.debtReportService.updateDebtReport(
        String(toRouteIdObj),
        dateDebtExact,
        data.cash,
        session,
        false,
        true
      );

      await this.debtReportService.updateDebtReport(
        String(fromRouteIdObj),
        dateDebtExact,
        data.cash,
        session,
        true,
        false
      );

      await receiptResult.populate('fromRoute', 'name');
      await receiptResult.populate('toRoute', 'name');
      await receiptResult.populate('createdBy', 'username name');

      await paymentResult.populate('fromRoute', 'name');
      await paymentResult.populate('toRoute', 'name');
      await paymentResult.populate('createdBy', 'username name');

      await session.commitTransaction();
      await session.endSession();

      const transformDebtManagement = (result: any): IDebtManagement => {
        const populatedResult = result.toObject();
        const fromRouteObj = populatedResult.fromRoute as
          | { _id?: unknown; name?: string }
          | unknown;
        const fromRouteIdValue = (fromRouteObj as { _id?: unknown })?._id || fromRouteObj;
        const fromRouteNameValue = (fromRouteObj as { name?: string })?.name || '';
        const toRouteObj = populatedResult.toRoute as { _id?: unknown; name?: string } | unknown;
        const toRouteIdValue = (toRouteObj as { _id?: unknown })?._id || toRouteObj;
        const toRouteNameValue = (toRouteObj as { name?: string })?.name || '';

        const createdByObj = populatedResult.createdBy as
          | { _id?: unknown; username?: string; name?: string }
          | unknown;

        const createdByIdValue = (createdByObj as { _id?: unknown })?._id || createdByObj;
        const createdByUsernameValue = (createdByObj as { username?: string })?.username || '';
        const createdByNameValue = (createdByObj as { name?: string })?.name || '';

        return {
          id: String(populatedResult._id),
          fromRoute: {
            id: String(fromRouteIdValue),
            name: fromRouteNameValue,
          },
          toRoute: {
            id: String(toRouteIdValue),
            name: toRouteNameValue,
          },
          content: populatedResult.content,
          type: populatedResult.type,
          cash: populatedResult.cash,
          cashDate: populatedResult.cashDate,
          deleted: populatedResult.deleted,
          createdAt: populatedResult.createdAt,
          updatedAt: populatedResult.updatedAt,
          deletedAt: populatedResult.deletedAt,
          __v: populatedResult.__v,
          createdBy: {
            id: String(createdByIdValue),
            username: createdByUsernameValue,
            name: createdByNameValue,
          },
        };
      };

      return [transformDebtManagement(receiptResult), transformDebtManagement(paymentResult)];
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('create debt management failed');
    }
  }

  private async getRootRouteId(routeId: Types.ObjectId, session: mongoose.ClientSession) {
    let current = await Route.findById(routeId).session(session).lean();

    if (!current) {
      throw new Error('Route not found');
    }

    while (current.parentRouteId) {
      const parent = await Route.findById(current.parentRouteId).session(session).lean();
      if (!parent) {
        break;
      }
      current = parent as typeof current;
    }

    return new Types.ObjectId(String(current._id));
  }

  private async getRootRouteIdNoSession(routeId: Types.ObjectId) {
    let current = await Route.findById(routeId).lean();

    if (!current) {
      throw new Error('Route not found');
    }

    while (current.parentRouteId) {
      const parent = await Route.findById(current.parentRouteId).lean();
      if (!parent) {
        break;
      }
      current = parent as typeof current;
    }

    return new Types.ObjectId(String(current._id));
  }

  private async validateDebtClearingBeforeCreate(
    sourceRouteIdObj: Types.ObjectId,
    pivotRouteIdObj: Types.ObjectId,
    targetRouteIdObj: Types.ObjectId,
    cash: number,
    dateDebtExact: Date,
    session: mongoose.ClientSession
  ): Promise<DebtClearingPlan> {
    if (cash <= 0) {
      throw new Error('Số tiền gặt phải lớn hơn 0');
    }

    if (
      sourceRouteIdObj.equals(pivotRouteIdObj) ||
      sourceRouteIdObj.equals(targetRouteIdObj) ||
      pivotRouteIdObj.equals(targetRouteIdObj)
    ) {
      throw new Error('Trạm nguồn, trạm trung gian và trạm đích phải khác nhau');
    }

    const [sourcePivotPair, pivotTargetPair, targetPivotPair, pivotSourcePair] = await Promise.all([
      this.getDebtPair(sourceRouteIdObj, pivotRouteIdObj, dateDebtExact, session),
      this.getDebtPair(pivotRouteIdObj, targetRouteIdObj, dateDebtExact, session),
      this.getDebtPair(targetRouteIdObj, pivotRouteIdObj, dateDebtExact, session),
      this.getDebtPair(pivotRouteIdObj, sourceRouteIdObj, dateDebtExact, session),
    ]);

    const getDebtAmount = (
      pair: Awaited<ReturnType<typeof this.getDebtPair>>
    ): {
      debt: number;
      direction: 'FORWARD' | 'REVERSE';
    } | null => {
      if (!pair.currentDebt1 || !pair.currentDebt2) {
        return null;
      }

      const debt1 = pair.currentDebt1.totalDebt ?? 0;
      const debt2 = pair.currentDebt2.totalDebt ?? 0;

      if (debt1 > 0 && debt2 > 0) {
        throw new Error(
          `Debt pair invalid: both directions have positive debt (${debt1} / ${debt2})`
        );
      }

      if (debt1 > 0) {
        return {
          debt: debt1,
          direction: 'FORWARD',
        };
      }

      if (debt2 > 0) {
        return {
          debt: debt2,
          direction: 'REVERSE',
        };
      }

      return null;
    };

    /**
     * Case thuận:
     * source nợ pivot
     * pivot nợ target
     *
     * Ví dụ:
     * RS nợ TD: 20k
     * TD nợ SG: 40k
     * => Gặt RS qua SG
     * => RS nợ SG: 20k
     */
    const sourceToPivotDebt = getDebtAmount(sourcePivotPair);
    const pivotToTargetDebt = getDebtAmount(pivotTargetPair);

    /**
     * Case ngược:
     * target nợ pivot
     * pivot nợ source
     *
     * Ví dụ:
     * TM nợ TA: 100
     * TP nợ TM: 200
     * Người dùng chọn: Gặt TA qua TP, pivot là TM
     * Bản chất đúng là:
     * TP -> TM -> TA
     * => TP nợ TA: 100
     */
    const targetToPivotDebt = getDebtAmount(targetPivotPair);
    const pivotToSourceDebt = getDebtAmount(pivotSourcePair);

    const canForward =
      sourceToPivotDebt !== null &&
      pivotToTargetDebt !== null &&
      sourceToPivotDebt.direction === 'FORWARD' &&
      pivotToTargetDebt.direction === 'FORWARD' &&
      sourceToPivotDebt.debt > 0 &&
      pivotToTargetDebt.debt > 0;

    const canReverse =
      targetToPivotDebt !== null &&
      pivotToSourceDebt !== null &&
      targetToPivotDebt.direction === 'FORWARD' &&
      pivotToSourceDebt.direction === 'FORWARD' &&
      targetToPivotDebt.debt > 0 &&
      pivotToSourceDebt.debt > 0;

    if (canForward && cash <= sourceToPivotDebt.debt && cash <= pivotToTargetDebt.debt) {
      const sourcePivot = sourceToPivotDebt;
      const pivotTarget = pivotToTargetDebt;

      return {
        direction: 'FORWARD',
        sourceRouteIdObj,
        pivotRouteIdObj,
        targetRouteIdObj,
        sourcePivotDirection: sourcePivot.direction,
        pivotTargetDirection: pivotTarget.direction,
      };
    }

    if (canReverse && cash <= targetToPivotDebt.debt && cash <= pivotToSourceDebt.debt) {
      const targetPivot = targetToPivotDebt;
      const pivotSource = pivotToSourceDebt;

      return {
        direction: 'REVERSE',
        sourceRouteIdObj: targetRouteIdObj,
        pivotRouteIdObj,
        targetRouteIdObj: sourceRouteIdObj,
        sourcePivotDirection: targetPivot.direction,
        pivotTargetDirection: pivotSource.direction,
      };
    }

    if (canForward) {
      if (cash > sourceToPivotDebt.debt) {
        throw new Error(
          `Số tiền gặt vượt quá công nợ từ trạm nguồn đến trạm trung gian (${sourceToPivotDebt.debt.toLocaleString('vi-VN')}đ)`
        );
      }

      if (cash > pivotToTargetDebt.debt) {
        throw new Error(
          `Số tiền gặt vượt quá công nợ từ trạm trung gian đến trạm đích (${pivotToTargetDebt.debt.toLocaleString('vi-VN')}đ)`
        );
      }
    }

    if (canReverse) {
      if (cash > targetToPivotDebt.debt) {
        throw new Error(
          `Số tiền gặt vượt quá công nợ từ trạm đích đến trạm trung gian (${targetToPivotDebt.debt.toLocaleString('vi-VN')}đ)`
        );
      }

      if (cash > pivotToSourceDebt.debt) {
        throw new Error(
          `Số tiền gặt vượt quá công nợ từ trạm trung gian đến trạm nguồn (${pivotToSourceDebt.debt.toLocaleString('vi-VN')}đ)`
        );
      }
    }

    throw new Error(
      'Không thể tạo phiếu gặt. Công nợ không đúng chuỗi trung gian. Chỉ hỗ trợ dạng A nợ B, B nợ C hoặc C nợ B, B nợ A.'
    );
  }

  private async applyDebtReportPairDelta(
    fromRouteId: Types.ObjectId,
    toRouteId: Types.ObjectId,
    dateDebtExact: Date,
    cash: number,
    session: mongoose.ClientSession
  ): Promise<void> {
    await this.debtReportService.updateDebtReport(
      String(toRouteId),
      dateDebtExact,
      cash,
      session,
      false,
      true
    );

    await this.debtReportService.updateDebtReport(
      String(fromRouteId),
      dateDebtExact,
      cash,
      session,
      true,
      false
    );
  }

  private async rollbackDebtReportPairDelta(
    fromRouteId: Types.ObjectId,
    toRouteId: Types.ObjectId,
    dateDebtExact: Date,
    cash: number,
    session: mongoose.ClientSession
  ): Promise<void> {
    await this.debtReportService.updateDebtReport(
      String(toRouteId),
      dateDebtExact,
      -cash,
      session,
      false,
      true
    );

    await this.debtReportService.updateDebtReport(
      String(fromRouteId),
      dateDebtExact,
      -cash,
      session,
      true,
      false
    );
  }

  async createDebtClearing(
    data: ICreateDebtClearingRequest,
    userId: string
  ): Promise<IDebtManagement> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const selectedPivotRouteId =
        data.pivotRoute || (await this.userService.getUserSelectedRouteId(userId));

      const sourceRouteIdObjRaw = new Types.ObjectId(String(data.fromRoute));
      const pivotRouteIdObjRaw = new Types.ObjectId(String(selectedPivotRouteId));
      const targetRouteIdObjRaw = new Types.ObjectId(String(data.toRoute));

      const sourceRouteIdObj = await this.getRootRouteId(sourceRouteIdObjRaw, session);
      const pivotRouteIdObj = await this.getRootRouteId(pivotRouteIdObjRaw, session);
      const targetRouteIdObj = await this.getRootRouteId(targetRouteIdObjRaw, session);

      if (
        sourceRouteIdObj.equals(pivotRouteIdObj) ||
        sourceRouteIdObj.equals(targetRouteIdObj) ||
        pivotRouteIdObj.equals(targetRouteIdObj)
      ) {
        throw new Error('Routes in clearing slip must be different');
      }

      const [sourceRoute, pivotRoute, targetRoute] = await Promise.all([
        Route.findById(sourceRouteIdObj).session(session),
        Route.findById(pivotRouteIdObj).session(session),
        Route.findById(targetRouteIdObj).session(session),
      ]);

      if (!sourceRoute || !pivotRoute || !targetRoute) {
        throw new Error('Route not found');
      }

      const { dateDebtExact } = this.getDateDebtExactToday();

      const clearingPlan = await this.validateDebtClearingBeforeCreate(
        sourceRouteIdObj,
        pivotRouteIdObj,
        targetRouteIdObj,
        data.cash,
        dateDebtExact,
        session
      );

      const actualSourceRouteIdObj = clearingPlan.sourceRouteIdObj;
      const actualPivotRouteIdObj = clearingPlan.pivotRouteIdObj;
      const actualTargetRouteIdObj = clearingPlan.targetRouteIdObj;

      const rollbackSourceRoute1 =
        clearingPlan.sourcePivotDirection === 'FORWARD'
          ? actualSourceRouteIdObj
          : actualPivotRouteIdObj;

      const rollbackTargetRoute1 =
        clearingPlan.sourcePivotDirection === 'FORWARD'
          ? actualPivotRouteIdObj
          : actualSourceRouteIdObj;

      const rollbackSourceRoute2 =
        clearingPlan.pivotTargetDirection === 'FORWARD'
          ? actualPivotRouteIdObj
          : actualTargetRouteIdObj;

      const rollbackTargetRoute2 =
        clearingPlan.pivotTargetDirection === 'FORWARD'
          ? actualTargetRouteIdObj
          : actualPivotRouteIdObj;

      await this.rollbackDebtReportPairDelta(
        rollbackSourceRoute1,
        rollbackTargetRoute1,
        dateDebtExact,
        data.cash,
        session
      );

      await this.rollbackDebtReportPairDelta(
        rollbackSourceRoute2,
        rollbackTargetRoute2,
        dateDebtExact,
        data.cash,
        session
      );

      await this.applyDebtReportPairDelta(
        actualSourceRouteIdObj,
        actualTargetRouteIdObj,
        dateDebtExact,
        data.cash,
        session
      );

      const clearing = new DebtManagement({
        fromRoute: actualSourceRouteIdObj,
        toRoute: actualTargetRouteIdObj,
        pivotRoute: actualPivotRouteIdObj,

        sourcePivotDirection: clearingPlan.sourcePivotDirection,
        pivotTargetDirection: clearingPlan.pivotTargetDirection,

        cash: data.cash,
        cashDate: data.cashDate,
        content: data.content,
        type: DEBT_MANAGEMENT_TYPE.CLEARING,
        createdBy: userId,
      });

      const result = await clearing.save({ session });

      await this.rebuildDebtPairFromActiveManagements(
        actualSourceRouteIdObj,
        actualTargetRouteIdObj,
        dateDebtExact,
        session
      );

      await this.rebuildDebtPairFromActiveManagements(
        rollbackSourceRoute1,
        rollbackTargetRoute1,
        dateDebtExact,
        session
      );

      await this.rebuildDebtPairFromActiveManagements(
        rollbackSourceRoute2,
        rollbackTargetRoute2,
        dateDebtExact,
        session
      );

      await result.populate('fromRoute', 'name');
      await result.populate('toRoute', 'name');
      await result.populate('pivotRoute', 'name');
      await result.populate('createdBy', 'username name');

      await session.commitTransaction();
      await session.endSession();

      const obj = result.toObject() as any;

      return {
        id: String(obj._id),
        fromRoute: {
          id: String(obj.fromRoute?._id || obj.fromRoute),
          name: obj.fromRoute?.name || '',
        },
        toRoute: {
          id: String(obj.toRoute?._id || obj.toRoute),
          name: obj.toRoute?.name || '',
        },
        pivotRoute: obj.pivotRoute
          ? {
              id: String(obj.pivotRoute?._id || obj.pivotRoute),
              name: obj.pivotRoute?.name || '',
            }
          : undefined,
        content: obj.content,
        type: obj.type,
        cash: obj.cash,
        cashDate: obj.cashDate,
        deleted: obj.deleted,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
        deletedAt: obj.deletedAt,
        __v: obj.__v,
        createdBy: {
          id: String(obj.createdBy?._id || obj.createdBy),
          username: obj.createdBy?.username || '',
          name: obj.createdBy?.name || '',
        },
      };
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('create debt clearing failed');
    }
  }

  async getListClearingDebtManagement(
    req: Request,
    userId: string
  ): Promise<IGetListPaymentDebtManagementResponse> {
    const source = req.method === 'POST' ? req.body : req.query;
    const { startDate, endDate, keySort, typeSort, fromRouteId, toRouteId, routeId } = source as {
      startDate?: string;
      endDate?: string;
      keySort?: string;
      typeSort?: string;
      fromRouteId?: string;
      toRouteId?: string;
      routeId?: string;
    };

    if (!startDate || !endDate) {
      throw new Error('startDate and endDate are required');
    }

    const startOfDate = new Date(String(startDate));
    const endOfDate = new Date(String(endDate));

    const start = new Date(
      startOfDate.getFullYear(),
      startOfDate.getMonth(),
      startOfDate.getDate(),
      0,
      0,
      0,
      0
    );

    const endOfDay = new Date(
      endOfDate.getFullYear(),
      endOfDate.getMonth(),
      endOfDate.getDate(),
      23,
      59,
      59,
      999
    );

    const selectedPivotRouteId = routeId || (await this.userService.getUserSelectedRouteId(userId));
    const pivotRouteId = await this.getRootRouteIdNoSession(
      new Types.ObjectId(String(selectedPivotRouteId))
    );

    let sort: Record<string, 1 | -1> = {};
    let typeSortValue: 1 | -1 | undefined = undefined;

    if (typeSort) {
      const numValue = Number(typeSort);
      if (numValue === 1 || numValue === -1) {
        typeSortValue = numValue;
      }
    }

    if (keySort) {
      if (!typeSortValue) {
        typeSortValue = 1;
      }

      switch (keySort) {
        case SORT_BY.CASH_DATE:
          sort = { cashDate: typeSortValue };
          break;
        case SORT_BY.CASH:
          sort = { cash: typeSortValue };
          break;
        default:
          sort = { createdAt: -1 };
          break;
      }
    } else {
      sort = { createdAt: -1 };
    }

    try {
      const matchStage: Record<string, unknown> = {
        type: DEBT_MANAGEMENT_TYPE.CLEARING,
        createdAt: { $gte: start, $lte: endOfDay },
        deleted: false,
        $or: [{ fromRoute: pivotRouteId }, { pivotRoute: pivotRouteId }, { toRoute: pivotRouteId }],
      };

      if (fromRouteId) {
        const fromRoot = await this.getRootRouteIdNoSession(
          new Types.ObjectId(String(fromRouteId))
        );
        matchStage.fromRoute = fromRoot;
      }

      if (toRouteId) {
        const toRoot = await this.getRootRouteIdNoSession(new Types.ObjectId(String(toRouteId)));
        matchStage.toRoute = toRoot;
      }

      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'routes',
            localField: 'fromRoute',
            foreignField: '_id',
            as: 'fromRoute',
          },
        },
        { $unwind: { path: '$fromRoute', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'routes',
            localField: 'toRoute',
            foreignField: '_id',
            as: 'toRoute',
          },
        },
        { $unwind: { path: '$toRoute', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'routes',
            localField: 'pivotRoute',
            foreignField: '_id',
            as: 'pivotRoute',
          },
        },
        { $unwind: { path: '$pivotRoute', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdBy',
          },
        },
        { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            id: '$_id',
            fromRoute: { id: '$fromRoute._id', name: '$fromRoute.name' },
            toRoute: { id: '$toRoute._id', name: '$toRoute.name' },
            pivotRoute: { id: '$pivotRoute._id', name: '$pivotRoute.name' },
            content: 1,
            type: 1,
            cash: 1,
            cashDate: 1,
            deleted: 1,
            reason: 1,
            createdAt: 1,
            updatedAt: 1,
            createdBy: {
              id: '$createdBy._id',
              username: '$createdBy.username',
              name: '$createdBy.name',
            },
          },
        },
        { $sort: sort },
      ];

      const result = (await DebtManagement.aggregate(pipeline).exec()) as IDebtManagement[];

      return { data: result };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list clearing debt management failed');
    }
  }

  async deleteDebtManagement(id: string, reason: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const debtManagement = await DebtManagement.findById(id).session(session);

      if (!debtManagement) {
        throw new Error('Debt Management not found');
      }

      if (debtManagement.deleted) {
        throw new Error('Debt Management already deleted');
      }

      const todayVn = getTodayVn();
      const todayVnRange = vnDateToUtcRange(todayVn.year, todayVn.month, todayVn.date);

      const createdAt = new Date(debtManagement.createdAt);
      if (createdAt < todayVnRange.start || createdAt > todayVnRange.end) {
        const todayVnLabel = `${todayVn.year}-${String(todayVn.month + 1).padStart(2, '0')}-${String(todayVn.date).padStart(2, '0')}`;
        throw new Error(
          `Cannot delete debt management records from previous days. Only today's records (${todayVnLabel} VN) can be deleted.`
        );
      }

      const cash = debtManagement.cash;
      const fromRoute = debtManagement.fromRoute;
      const toRoute = debtManagement.toRoute;
      const cashDate = debtManagement.cashDate;
      const type = debtManagement.type as string;
      const sourcePivotDirection = (debtManagement as any).sourcePivotDirection;
      const pivotTargetDirection = (debtManagement as any).pivotTargetDirection;

      const dateDebtExact = vnDateToDebtDateUtc(todayVn.year, todayVn.month, todayVn.date);

      if (type === DEBT_MANAGEMENT_TYPE.CLEARING) {
        const pivotRoute = (debtManagement as any).pivotRoute;

        if (!pivotRoute) {
          throw new Error('Clearing slip missing pivotRoute');
        }

        const sourceRouteIdObj = await this.getRootRouteId(
          new Types.ObjectId(String(fromRoute)),
          session
        );

        const targetRouteIdObj = await this.getRootRouteId(
          new Types.ObjectId(String(toRoute)),
          session
        );

        const pivotRouteIdObj = await this.getRootRouteId(
          new Types.ObjectId(String(pivotRoute)),
          session
        );

        const restoreSourceRoute1 =
          sourcePivotDirection === 'FORWARD' ? sourceRouteIdObj : pivotRouteIdObj;

        const restoreTargetRoute1 =
          sourcePivotDirection === 'FORWARD' ? pivotRouteIdObj : sourceRouteIdObj;

        const restoreSourceRoute2 =
          pivotTargetDirection === 'FORWARD' ? pivotRouteIdObj : targetRouteIdObj;

        const restoreTargetRoute2 =
          pivotTargetDirection === 'FORWARD' ? targetRouteIdObj : pivotRouteIdObj;

        await this.rollbackDebtReportPairDelta(
          sourceRouteIdObj,
          targetRouteIdObj,
          dateDebtExact,
          cash,
          session
        );

        await this.applyDebtReportPairDelta(
          restoreSourceRoute1,
          restoreTargetRoute1,
          dateDebtExact,
          cash,
          session
        );

        await this.applyDebtReportPairDelta(
          restoreSourceRoute2,
          restoreTargetRoute2,
          dateDebtExact,
          cash,
          session
        );

        debtManagement.deleted = true;
        debtManagement.reason = reason;
        debtManagement.deletedAt = new Date();

        await debtManagement.save({ session });

        await this.rebuildDebtPairFromActiveManagements(
          sourceRouteIdObj,
          targetRouteIdObj,
          dateDebtExact,
          session
        );

        await this.rebuildDebtPairFromActiveManagements(
          restoreSourceRoute1,
          restoreTargetRoute1,
          dateDebtExact,
          session
        );

        await this.rebuildDebtPairFromActiveManagements(
          restoreSourceRoute2,
          restoreTargetRoute2,
          dateDebtExact,
          session
        );

        await session.commitTransaction();
        await session.endSession();

        return;
      }

      const oppositeType =
        type === DEBT_MANAGEMENT_TYPE.RECEIPT
          ? DEBT_MANAGEMENT_TYPE.PAYMENT
          : DEBT_MANAGEMENT_TYPE.RECEIPT;

      await DebtManagement.updateMany(
        {
          _id: {
            $in: [
              debtManagement._id,
              ...(await DebtManagement.find({
                fromRoute,
                toRoute,
                cash,
                cashDate,
                type: oppositeType,
                deleted: false,
              })
                .session(session)
                .distinct('_id')),
            ],
          },
        },
        {
          $set: {
            deleted: true,
            deletedAt: new Date(),
            reason,
          },
        },
        { session }
      );

      const fromRouteIdObj = new Types.ObjectId(String(fromRoute));
      const toRouteIdObj = new Types.ObjectId(String(toRoute));

      let debtEffectAction = (debtManagement as any).debtEffectAction;

      if (!debtEffectAction) {
        const { currentDebt1 } = await this.getDebtPair(
          fromRouteIdObj,
          toRouteIdObj,
          dateDebtExact,
          session
        );

        const currentTotalDebt = currentDebt1?.totalDebt ?? 0;

        debtEffectAction = currentTotalDebt >= 0 ? 'ROLLBACK' : 'APPLY';
      }

      if (debtEffectAction === 'ROLLBACK') {
        await this.applyDebtPairDelta(fromRouteIdObj, toRouteIdObj, dateDebtExact, cash, session);
      } else if (debtEffectAction === 'APPLY') {
        await this.rollbackDebtPairDelta(
          fromRouteIdObj,
          toRouteIdObj,
          dateDebtExact,
          cash,
          session,
          true
        );
      } else {
        throw new Error('Không xác định được chiều hoàn công nợ của phiếu thu.');
      }

      await this.debtReportService.updateDebtReport(
        toRoute.toString(),
        dateDebtExact,
        -cash,
        session,
        false,
        true
      );

      await this.debtReportService.updateDebtReport(
        fromRoute.toString(),
        dateDebtExact,
        -cash,
        session,
        true,
        false
      );

      await session.commitTransaction();
      await session.endSession();
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('delete debt management failed');
    }
  }

  async exportReportDebtAndDebtManagement(
    startDate: Date,
    endDate: Date,
    type: string,
    userId: string,
    routeId?: string
  ): Promise<
    | IGetListPaymentDebtManagementResponse
    | IGetListReceiptDebtManagementResponse
    | IGetListDebtResponse
    | IExportReportTotalDebtResponse
  > {
    try {
      if (routeId && !Types.ObjectId.isValid(routeId)) {
        throw new Error('Invalid routeId format');
      }

      const mockReq = {
        query: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          ...(routeId && type === DEBT_MANAGEMENT_TYPE_REPORT.PAYMENT && { toRouteId: routeId }),
          ...(routeId && type === DEBT_MANAGEMENT_TYPE_REPORT.RECEIPT && { fromRouteId: routeId }),
          ...(routeId && type === DEBT_MANAGEMENT_TYPE_REPORT.DEBT && { fromRouteId: routeId }),
        },
      } as unknown as Request;

      switch (type) {
        case DEBT_MANAGEMENT_TYPE_REPORT.PAYMENT:
          return await this.getListPaymentDebtMangement(mockReq, userId);

        case DEBT_MANAGEMENT_TYPE_REPORT.RECEIPT:
          return await this.getListReceiptDebtMangement(mockReq, userId);

        case DEBT_MANAGEMENT_TYPE_REPORT.DEBT:
          return await this.debtService.getListDebt(mockReq, userId);

        case DEBT_MANAGEMENT_TYPE_REPORT.TOTAL: {
          const exportReportTotalDebt = await this.debtService.exportReportTotalDebt(
            mockReq,
            userId
          );
          const dataListReceiptDebtManagement = await this.getListReceiptDebtMangement(
            mockReq,
            userId
          );
          const dataListPaymentDebtManagement = await this.getListPaymentDebtMangement(
            mockReq,
            userId
          );

          const result: IExportReportTotalDebtResponse = {
            data: exportReportTotalDebt.data,
            total: exportReportTotalDebt.total,
            dataListReceiptDebtManagement: dataListReceiptDebtManagement.data,
            dataListPaymentDebtManagement: dataListPaymentDebtManagement.data,
          };

          return result;
        }

        default:
          throw new Error(`Invalid type: ${type}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('export report debt and debt management failed');
    }
  }
}
