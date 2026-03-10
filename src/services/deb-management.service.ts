import {
  DEBT_MANAGEMENT_TYPE,
  DEBT_MANAGEMENT_TYPE_REPORT,
  SORT_BY,
} from '@/const/debt-management.const';
import { DebtManagement } from '@/models/debt-management.model';
import { Debt } from '@/models/debt.model';
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

    const fromRouteId = await this.userService.getUserSelectedRouteId(userId);
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
        fromRoute: new Types.ObjectId(fromRouteId),
        type: DEBT_MANAGEMENT_TYPE.PAYMENT,
        createdAt: { $gte: start, $lte: endOfDay },
        deleted: false,
      };

      if (toRouteId) {
        matchStage.toRoute = new Types.ObjectId(String(toRouteId));
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

    const toRouteId = await this.userService.getUserSelectedRouteId(userId);
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
      const toRouteIdObj = new Types.ObjectId(toRouteId);

      const matchStage: Record<string, unknown> = {
        toRoute: toRouteIdObj,
        type: DEBT_MANAGEMENT_TYPE.RECEIPT,
        cashDate: { $gte: start, $lte: endOfDay },
        deleted: false,
      };

      if (fromRouteId) {
        matchStage.fromRoute = new Types.ObjectId(String(fromRouteId));
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
        .lean(),
      Debt.findOne({
        fromRoute: toRouteId,
        toRoute: fromRouteId,
        dateDebt: dateDebtExact,
      })
        .sort({ createdAt: -1 })
        .session(session)
        .lean(),
    ]);

    return { currentDebt1, currentDebt2 };
  }

  private calcTotalDebtForForward(
    currentDebt: any,
    nextReceivable: number,
    nextAccountPayable?: number
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

    const openingBalance =
      currentDebt.openingBalance !== null && currentDebt.openingBalance !== undefined
        ? currentDebt.openingBalance
        : 0;

    const A =
      costFromRoute + feeCODToRoute + homeDeliveryFromRoute + surchargeFromRoute + nextReceivable;

    const B =
      costToRoute + feeCODFromRoute + homeDeliveryToRoute + surchargeToRoute + accountPayable;

    return A - B + openingBalance;
  }

  private calcTotalDebtForReverse(
    currentDebt: any,
    nextAccountPayable: number,
    nextReceivable?: number
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

    const openingBalance =
      currentDebt.openingBalance !== null && currentDebt.openingBalance !== undefined
        ? currentDebt.openingBalance
        : 0;

    const A =
      costFromRoute + feeCODToRoute + homeDeliveryFromRoute + surchargeFromRoute + receivable;

    const B =
      costToRoute + feeCODFromRoute + homeDeliveryToRoute + surchargeToRoute + nextAccountPayable;

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
    const totalDebt1 = this.calcTotalDebtForForward(currentDebt1, receivable1);

    const accountPayable2 = (currentDebt2.accountPayable ?? 0) + cash;
    const totalDebt2 = this.calcTotalDebtForReverse(currentDebt2, accountPayable2);

    await Debt.findOneAndUpdate(
      { _id: currentDebt1._id },
      { totalDebt: totalDebt1, receivable: receivable1 },
      { session, new: true, runValidators: true }
    );

    await Debt.findOneAndUpdate(
      { _id: currentDebt2._id },
      { totalDebt: totalDebt2, accountPayable: accountPayable2 },
      { session, new: true, runValidators: true }
    );

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

    const receivable1 = Math.max(0, (currentDebt1.receivable ?? 0) - cash);
    const totalDebt1 = this.calcTotalDebtForForward(currentDebt1, receivable1);

    const accountPayable2 = Math.max(0, (currentDebt2.accountPayable ?? 0) - cash);
    const totalDebt2 = this.calcTotalDebtForReverse(currentDebt2, accountPayable2);

    await Debt.findOneAndUpdate(
      { _id: currentDebt1._id },
      { totalDebt: totalDebt1, receivable: receivable1 },
      { session, new: true, runValidators: true }
    );

    await Debt.findOneAndUpdate(
      { _id: currentDebt2._id },
      { totalDebt: totalDebt2, accountPayable: accountPayable2 },
      { session, new: true, runValidators: true }
    );

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
      const toRouteId = await this.userService.getUserSelectedRouteId(userId);

      const [fromRoute, toRoute] = await Promise.all([
        Route.findById(data.fromRoute),
        Route.findById(toRouteId),
      ]);

      if (!fromRoute) {
        throw new Error('From route not found');
      }

      if (!toRoute) {
        throw new Error('To route not found');
      }

      if (data.fromRoute.toString() === toRouteId.toString()) {
        throw new Error('Cannot create debt management for the same route');
      }

      const fromRouteIdObj = new Types.ObjectId(String(data.fromRoute));
      const toRouteIdObj = new Types.ObjectId(String(toRouteId));

      const receiptDebtManagement = new DebtManagement({
        fromRoute: data.fromRoute,
        toRoute: toRouteId,
        cash: data.cash,
        cashDate: data.cashDate,
        content: data.content,
        type: DEBT_MANAGEMENT_TYPE.RECEIPT,
        createdBy: userId,
      });

      const paymentDebtManagement = new DebtManagement({
        fromRoute: data.fromRoute,
        toRoute: toRouteId,
        cash: data.cash,
        cashDate: data.cashDate,
        content: data.content,
        type: DEBT_MANAGEMENT_TYPE.PAYMENT,
        createdBy: userId,
      });

      const receiptResult = await receiptDebtManagement.save({ session });
      const paymentResult = await paymentDebtManagement.save({ session });

      const { dateDebtExact } = this.getDateDebtExactToday();

      await this.applyDebtPairDelta(
        fromRouteIdObj,
        toRouteIdObj,
        dateDebtExact,
        data.cash,
        session
      );

      await this.debtReportService.updateDebtReport(
        toRouteId,
        dateDebtExact,
        data.cash,
        session,
        false,
        true
      );

      await this.debtReportService.updateDebtReport(
        data.fromRoute,
        dateDebtExact,
        data.cash,
        session,
        true,
        false
      );

      await receiptResult.populate('fromRoute', 'name');
      await receiptResult.populate('toRoute', 'name');
      await paymentResult.populate('fromRoute', 'name');
      await paymentResult.populate('toRoute', 'name');

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

        return {
          id: populatedResult._id,
          fromRoute: {
            id: fromRouteIdValue,
            name: fromRouteNameValue,
          },
          toRoute: {
            id: toRouteIdValue,
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
        } as IDebtManagement;
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
  ): Promise<void> {
    if (cash <= 0) {
      throw new Error('Cash amount must be greater than 0');
    }

    if (
      sourceRouteIdObj.equals(pivotRouteIdObj) ||
      sourceRouteIdObj.equals(targetRouteIdObj) ||
      pivotRouteIdObj.equals(targetRouteIdObj)
    ) {
      throw new Error('Routes in clearing slip must be different');
    }

    const [sourcePivotPair, pivotTargetPair] = await Promise.all([
      this.getDebtPair(sourceRouteIdObj, pivotRouteIdObj, dateDebtExact, session),
      this.getDebtPair(pivotRouteIdObj, targetRouteIdObj, dateDebtExact, session),
    ]);

    if (!sourcePivotPair.currentDebt1 || !sourcePivotPair.currentDebt2) {
      throw new Error('Debt pair source -> pivot not found');
    }

    if (!pivotTargetPair.currentDebt1 || !pivotTargetPair.currentDebt2) {
      throw new Error('Debt pair pivot -> target not found');
    }

    const sourceToPivotDebt = Math.max(0, sourcePivotPair.currentDebt1.receivable ?? 0);
    const pivotToTargetDebt = Math.max(0, pivotTargetPair.currentDebt1.receivable ?? 0);

    if (sourceToPivotDebt <= 0) {
      throw new Error('Source route does not owe pivot route');
    }

    if (pivotToTargetDebt <= 0) {
      throw new Error('Pivot route does not owe target route');
    }

    if (cash > sourceToPivotDebt) {
      throw new Error(`Clearing amount exceeds source -> pivot debt (${sourceToPivotDebt})`);
    }

    if (cash > pivotToTargetDebt) {
      throw new Error(`Clearing amount exceeds pivot -> target debt (${pivotToTargetDebt})`);
    }
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

      await this.validateDebtClearingBeforeCreate(
        sourceRouteIdObj,
        pivotRouteIdObj,
        targetRouteIdObj,
        data.cash,
        dateDebtExact,
        session
      );

      await this.rollbackDebtPairDelta(
        pivotRouteIdObj,
        targetRouteIdObj,
        dateDebtExact,
        data.cash,
        session
      );

      await this.rollbackDebtPairDelta(
        sourceRouteIdObj,
        pivotRouteIdObj,
        dateDebtExact,
        data.cash,
        session
      );

      await this.applyDebtPairDelta(
        sourceRouteIdObj,
        targetRouteIdObj,
        dateDebtExact,
        data.cash,
        session
      );

      await this.debtReportService.updateDebtReport(
        targetRouteIdObj,
        dateDebtExact,
        -data.cash,
        session,
        false,
        true
      );

      await this.debtReportService.updateDebtReport(
        pivotRouteIdObj,
        dateDebtExact,
        -data.cash,
        session,
        true,
        false
      );

      await this.debtReportService.updateDebtReport(
        pivotRouteIdObj,
        dateDebtExact,
        -data.cash,
        session,
        false,
        true
      );

      await this.debtReportService.updateDebtReport(
        sourceRouteIdObj,
        dateDebtExact,
        -data.cash,
        session,
        true,
        false
      );

      await this.debtReportService.updateDebtReport(
        targetRouteIdObj,
        dateDebtExact,
        data.cash,
        session,
        false,
        true
      );

      await this.debtReportService.updateDebtReport(
        sourceRouteIdObj,
        dateDebtExact,
        data.cash,
        session,
        true,
        false
      );

      const clearing = new DebtManagement({
        fromRoute: sourceRouteIdObj,
        toRoute: targetRouteIdObj,
        pivotRoute: pivotRouteIdObj,
        cash: data.cash,
        cashDate: data.cashDate,
        content: data.content,
        type: DEBT_MANAGEMENT_TYPE.CLEARING,
        createdBy: userId,
      });

      const result = await clearing.save({ session });
      await result.populate('fromRoute', 'name');
      await result.populate('toRoute', 'name');
      await result.populate('pivotRoute', 'name');
      await result.populate('createdBy', 'username name');

      await session.commitTransaction();
      await session.endSession();

      const obj = result.toObject() as any;

      const response: IDebtManagement = {
        id: obj._id,
        fromRoute: {
          id: obj.fromRoute?._id || obj.fromRoute,
          name: obj.fromRoute?.name || '',
        },
        toRoute: {
          id: obj.toRoute?._id || obj.toRoute,
          name: obj.toRoute?.name || '',
        },
        pivotRoute: obj.pivotRoute
          ? {
              id: obj.pivotRoute?._id || obj.pivotRoute,
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
          id: obj.createdBy?._id || obj.createdBy,
          username: obj.createdBy?.username || '',
          name: obj.createdBy?.name || '',
        },
      };

      return response;
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
        pivotRoute: pivotRouteId,
        type: DEBT_MANAGEMENT_TYPE.CLEARING,
        cashDate: { $gte: start, $lte: endOfDay },
        deleted: false,
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

        await DebtManagement.updateOne(
          { _id: debtManagement._id, deleted: false },
          {
            deleted: true,
            deletedAt: new Date(),
            reason,
          },
          { session }
        );

        await this.rollbackDebtPairDelta(
          sourceRouteIdObj,
          targetRouteIdObj,
          dateDebtExact,
          cash,
          session
        );

        await this.applyDebtPairDelta(
          sourceRouteIdObj,
          pivotRouteIdObj,
          dateDebtExact,
          cash,
          session
        );

        await this.applyDebtPairDelta(
          pivotRouteIdObj,
          targetRouteIdObj,
          dateDebtExact,
          cash,
          session
        );

        await this.debtReportService.updateDebtReport(
          targetRouteIdObj,
          dateDebtExact,
          -cash,
          session,
          false,
          true
        );

        await this.debtReportService.updateDebtReport(
          sourceRouteIdObj,
          dateDebtExact,
          -cash,
          session,
          true,
          false
        );

        await this.debtReportService.updateDebtReport(
          pivotRouteIdObj,
          dateDebtExact,
          cash,
          session,
          false,
          true
        );

        await this.debtReportService.updateDebtReport(
          sourceRouteIdObj,
          dateDebtExact,
          cash,
          session,
          true,
          false
        );

        await this.debtReportService.updateDebtReport(
          targetRouteIdObj,
          dateDebtExact,
          cash,
          session,
          false,
          true
        );

        await this.debtReportService.updateDebtReport(
          pivotRouteIdObj,
          dateDebtExact,
          cash,
          session,
          true,
          false
        );

        await session.commitTransaction();
        await session.endSession();
        return;
      }

      const debtManagementRecords = await DebtManagement.find({
        fromRoute,
        toRoute,
        cash,
        cashDate,
        deleted: false,
      })
        .session(session)
        .lean();

      if (debtManagementRecords.length === 0) {
        throw new Error('No matching Debt Management records found');
      }

      await DebtManagement.updateMany(
        {
          fromRoute,
          toRoute,
          cash,
          cashDate,
          deleted: false,
        },
        {
          deleted: true,
          deletedAt: new Date(),
          reason,
        },
        { session }
      );

      const fromRouteIdObj = new Types.ObjectId(String(fromRoute));
      const toRouteIdObj = new Types.ObjectId(String(toRoute));

      await this.rollbackDebtPairDelta(fromRouteIdObj, toRouteIdObj, dateDebtExact, cash, session);

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
