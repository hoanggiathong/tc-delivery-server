import { DEBT_MANAGEMENT_TYPE, SORT_BY } from '@/const/debt-management.const';
import { DebtManagement } from '@/models/debt-management.model';
import { Debt } from '@/models/debt.model';
import { Route } from '@/models/route.model';
import {
  ICreateDebtManagementRequest,
  IDebtManagement,
  IGetListPaymentDebtManagementResponse,
  IGetListReceiptDebtManagementResponse,
} from '@/types/debt-management.type';
import { Request } from 'express';
import mongoose, { Types } from 'mongoose';
import { DebtReportService } from './debt-report.service';
import { UserService } from './user.service';

export class DebtManagementService {
  private userService: UserService;
  private debtReportService: DebtReportService;
  constructor() {
    this.userService = new UserService();
    this.debtReportService = new DebtReportService();
  }

  async getListPaymentDebtMangement(
    req: Request,
    userId: string
  ): Promise<IGetListPaymentDebtManagementResponse> {
    const { startDate, endDate, keySort, toRouteId } = req.query;

    const { typeSort } = req.query;

    const start = new Date(String(startDate));
    start.setHours(0, 0, 0, 0);

    const endOfDay = new Date(String(endDate));
    endOfDay.setHours(23, 59, 59, 999);

    const fromRouteId = await this.userService.getUserSelectedRouteId(userId);
    let sort: Record<string, 1 | -1> = {};

    let typeSortValue: 1 | -1 | undefined = undefined;
    if (typeSort) {
      const numValue = Number(typeSort);
      if (numValue === 1 || numValue === -1) {
        typeSortValue = numValue;
      }
    }

    //handle sort
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
      // const result = await DebtManagement.find({
      //   fromRoute: fromId,
      //   type: DEBT_MANAGEMENT_TYPE.RECEIPT,
      //   cashDate: {
      //     $gte: start,
      //     $lte: endOfDay,
      //   },
      // })
      //   .select({
      //     _id: 1,
      //     fromRoute: 1,
      //     toRoute: 1,
      //     content: 1,
      //     type: 1,
      //     cash: 1,
      //     cashDate: 1,
      //     createdAt: 1,
      //     updatedAt: 1,
      //   })
      //   .sort(sort)
      //   .populate([
      //     {
      //       path: 'fromRoute',
      //       select: {
      //         _id: 1,
      //         name: 1,
      //       },
      //     },
      //     {
      //       path: 'toRoute',
      //       select: {
      //         _id: 1,
      //         name: 1,
      //       },
      //     },
      //   ])
      //   .lean();

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
        {
          $match: matchStage,
        },
        // join fromRoute
        {
          $lookup: {
            from: 'routes',
            localField: 'fromRoute',
            foreignField: '_id',
            as: 'fromRoute',
          },
        },
        { $unwind: { path: '$fromRoute', preserveNullAndEmptyArrays: true } },
        // join toRoute
        {
          $lookup: {
            from: 'routes',
            localField: 'toRoute',
            foreignField: '_id',
            as: 'toRoute',
          },
        },
        { $unwind: { path: '$toRoute', preserveNullAndEmptyArrays: true } },
        // project các field cần trả
        {
          $project: {
            id: '$_id',
            fromRoute: { id: '$fromRoute._id', name: '$fromRoute.name' },
            toRoute: { id: '$toRoute._id', name: '$toRoute.name' },
            content: 1,
            type: 1,
            cash: 1,
            cashDate: 1,
            deleted: 1,
            reason: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
        { $sort: sort },
      ];
      const result = (await DebtManagement.aggregate(pipeline).exec()) as IDebtManagement[];

      return {
        data: result,
      };
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

    const start = new Date(String(startDate));
    start.setHours(0, 0, 0, 0);

    const endOfDay = new Date(String(endDate));
    endOfDay.setHours(23, 59, 59, 999);

    const toRouteId = await this.userService.getUserSelectedRouteId(userId);
    let sort: Record<string, 1 | -1> = {};

    let typeSortValue: 1 | -1 | undefined = undefined;
    if (typeSort) {
      const numValue = Number(typeSort);
      if (numValue === 1 || numValue === -1) {
        typeSortValue = numValue;
      }
    }

    //handle sort
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
        toRoute: toRouteId,
        type: DEBT_MANAGEMENT_TYPE.RECEIPT,
        cashDate: { $gte: start, $lte: endOfDay },
        deleted: false,
      };

      // Add fromRoute filter if fromRouteId is provided
      if (fromRouteId) {
        matchStage.fromRoute = new Types.ObjectId(String(fromRouteId));
      }

      const pipeline = [
        {
          $match: matchStage,
        },
        // join fromRoute
        {
          $lookup: {
            from: 'routes',
            localField: 'fromRoute',
            foreignField: '_id',
            as: 'fromRoute',
          },
        },
        { $unwind: { path: '$fromRoute', preserveNullAndEmptyArrays: true } },
        // join toRoute
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
          $project: {
            id: '$_id',
            fromRoute: { id: '$fromRoute._id', name: '$fromRoute.name' },
            toRoute: { id: '$toRoute._id', name: '$toRoute.name' },
            content: 1,
            type: 1,
            cash: 1,
            cashDate: 1,
            deleted: 1,
            reason: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
        { $sort: sort },
      ];

      const result = (await DebtManagement.aggregate(pipeline).exec()) as IDebtManagement[];

      return {
        data: result,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list receipt debt management failed');
    }
  }

  async createDebtManagement(
    data: ICreateDebtManagementRequest,
    userId: string
  ): Promise<IDebtManagement[]> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const toRouteId = await this.userService.getUserSelectedRouteId(userId);

      // Validate fromRoute and toRoute exist
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

      // Create 2 records: RECEIPT and PAYMENT
      const receiptDebtManagement = new DebtManagement({
        fromRoute: data.fromRoute,
        toRoute: toRouteId,
        cash: data.cash,
        cashDate: data.cashDate,
        content: data.content,
        type: DEBT_MANAGEMENT_TYPE.RECEIPT,
      });

      const paymentDebtManagement = new DebtManagement({
        fromRoute: data.fromRoute,
        toRoute: toRouteId,
        cash: data.cash,
        cashDate: data.cashDate,
        content: data.content,
        type: DEBT_MANAGEMENT_TYPE.PAYMENT,
      });

      const [receiptResult, paymentResult] = await Promise.all([
        receiptDebtManagement.save({ session: session }),
        paymentDebtManagement.save({ session: session }),
      ]);

      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        0,
        0,
        0,
        0
      );
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999
      );

      const [currentDebt1, currentDebt2] = await Promise.all([
        Debt.findOne({
          fromRoute: data.fromRoute,
          toRoute: toRouteId,
          createdAt: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        })
          .sort({ createdAt: -1 })
          .session(session)
          .lean(),
        Debt.findOne({
          fromRoute: toRouteId,
          toRoute: data.fromRoute,
          createdAt: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        })
          .sort({ createdAt: -1 })
          .session(session)
          .lean(),
      ]);

      if (!currentDebt1 || !currentDebt2) {
        throw new Error('Debt record not found for the day. Please ensure cronjob has run.');
      }

      // Calculate totalDebt for first debt record (fromRoute -> toRoute)
      // Formula: (A - B) + C
      // A = Tiền đi + NC về + GTN đi + Phụ phí đi + Thu
      // B = Tiền về + NC đi + GTN về + Phụ phí về + Chi
      // C = Tồn đầu
      const costFromRoute1 = currentDebt1.costFromRoute ?? 0;
      const feeCODToRoute1 = currentDebt1.feeCODToRoute ?? 0;
      const homeDeliveryFromRoute1 = currentDebt1.homeDeliveryFromRoute ?? 0;
      const surchargeToRoute1 = currentDebt1.surchargeToRoute ?? 0;
      const receivable1 = (currentDebt1.receivable ?? 0) + data.cash; // Thu increases
      const costToRoute1 = currentDebt1.costToRoute ?? 0;
      const feeCODFromRoute1 = currentDebt1.feeCODFromRoute ?? 0;
      const homeDeliveryToRoute1 = currentDebt1.homeDeliveryToRoute ?? 0; // GTN về
      const surchargeFromRoute1 = currentDebt1.surchargeFromRoute ?? 0;
      const accountPayable1 = currentDebt1.accountPayable ?? 0;

      const openingBalance1 =
        currentDebt1.openingBalance !== null && currentDebt1.openingBalance !== undefined
          ? currentDebt1.openingBalance
          : 0;

      const A1 =
        costFromRoute1 + feeCODToRoute1 + homeDeliveryFromRoute1 + surchargeToRoute1 + receivable1;
      const B1 =
        costToRoute1 +
        feeCODFromRoute1 +
        homeDeliveryToRoute1 +
        surchargeFromRoute1 +
        accountPayable1;
      const totalDebt1 = A1 - B1 + openingBalance1;

      // Calculate totalDebt for second debt record (toRoute -> fromRoute)
      const costFromRoute2 = currentDebt2.costFromRoute ?? 0;
      const feeCODToRoute2 = currentDebt2.feeCODToRoute ?? 0;
      const homeDeliveryFromRoute2 = currentDebt2.homeDeliveryFromRoute ?? 0;
      const surchargeToRoute2 = currentDebt2.surchargeToRoute ?? 0;
      const receivable2 = currentDebt2.receivable ?? 0;
      const costToRoute2 = currentDebt2.costToRoute ?? 0;
      const feeCODFromRoute2 = currentDebt2.feeCODFromRoute ?? 0;
      const homeDeliveryToRoute2 = currentDebt2.homeDeliveryToRoute ?? 0; // GTN về
      const surchargeFromRoute2 = currentDebt2.surchargeFromRoute ?? 0;
      const accountPayable2 = (currentDebt2.accountPayable ?? 0) + data.cash; // Chi increases

      const openingBalance2 =
        currentDebt2.openingBalance !== null && currentDebt2.openingBalance !== undefined
          ? currentDebt2.openingBalance
          : 0;

      const A2 =
        costFromRoute2 + feeCODToRoute2 + homeDeliveryFromRoute2 + surchargeToRoute2 + receivable2;
      const B2 =
        costToRoute2 +
        feeCODFromRoute2 +
        homeDeliveryToRoute2 +
        surchargeFromRoute2 +
        accountPayable2;
      const totalDebt2 = A2 - B2 + openingBalance2;

      // Update debt records for the day (cronjob ensures they exist)
      await Promise.all([
        Debt.findOneAndUpdate(
          {
            _id: currentDebt1._id,
          },
          {
            totalDebt: totalDebt1,
            receivable: receivable1,
          },
          {
            session: session,
            new: true,
            runValidators: true,
          }
        ),
        Debt.findOneAndUpdate(
          {
            _id: currentDebt2._id,
          },
          {
            totalDebt: totalDebt2,
            accountPayable: accountPayable2,
          },
          {
            session: session,
            new: true,
            runValidators: true,
          }
        ),
      ]);

      // Update debt report service
      // Update both accountPayable and receivable
      await Promise.all([
        this.debtReportService.updateDebtReport(toRouteId, today, data.cash, session, false, true),
        this.debtReportService.updateDebtReport(
          data.fromRoute,
          today,
          data.cash,
          session,
          true,
          false
        ),
      ]);

      // Populate routes before committing transaction
      await Promise.all([
        receiptResult.populate('fromRoute', 'name'),
        receiptResult.populate('toRoute', 'name'),
        paymentResult.populate('fromRoute', 'name'),
        paymentResult.populate('toRoute', 'name'),
      ]);

      await session.commitTransaction();
      await session.endSession();

      // Transform both results
      const transformDebtManagement = (result: {
        toObject: () => {
          _id: unknown;
          fromRoute: { _id?: unknown; name?: string } | unknown;
          toRoute: { _id?: unknown; name?: string } | unknown;
          content: string;
          type: string;
          cash: number;
          cashDate: Date;
          deleted: boolean;
          createdAt: Date;
          updatedAt: Date;
          deletedAt?: Date;
          __v?: number;
        };
      }): IDebtManagement => {
        const populatedResult = result.toObject();
        const fromRouteObj = populatedResult.fromRoute as
          | { _id?: unknown; name?: string }
          | unknown;
        const fromRouteIdValue =
          (fromRouteObj as { _id?: unknown })?._id || (fromRouteObj as unknown);
        const fromRouteNameValue = (fromRouteObj as { name?: string })?.name || '';
        const toRouteObj = populatedResult.toRoute as { _id?: unknown; name?: string } | unknown;
        const toRouteIdValue = (toRouteObj as { _id?: unknown })?._id || (toRouteObj as unknown);
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
      session.endSession();

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('create debt management failed');
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

      const cash = debtManagement.cash;
      const fromRoute = debtManagement.fromRoute;
      const toRoute = debtManagement.toRoute;
      const cashDate = debtManagement.cashDate;

      // Check if createdAt is today - only allow deletion of today's records
      const today = new Date();
      const startOfToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        0,
        0,
        0,
        0
      );
      const endOfToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999
      );

      const createdAt = new Date(debtManagement.createdAt);
      if (createdAt < startOfToday || createdAt > endOfToday) {
        throw new Error(
          "Cannot delete debt management records from previous days. Only today's records can be deleted."
        );
      }

      // Find all DebtManagement records with the same cash, fromRoute, toRoute, and cashDate
      // This matches the logic where createDebtManagement creates 2 records (RECEIPT and PAYMENT)
      const debtManagementRecords = await DebtManagement.find({
        cash: cash,
        fromRoute: fromRoute,
        toRoute: toRoute,
        cashDate: cashDate,
        deleted: false,
      })
        .session(session)
        .lean();

      if (debtManagementRecords.length === 0) {
        throw new Error('No matching Debt Management records found');
      }

      // Mark all matching records as deleted
      await DebtManagement.updateMany(
        {
          cash: cash,
          fromRoute: fromRoute,
          toRoute: toRoute,
          cashDate: cashDate,
          deleted: false,
        },
        {
          deleted: true,
          deletedAt: new Date(),
          reason: reason,
        },
        {
          session: session,
        }
      );

      // Find the same two debt records as in createDebtManagement
      const [currentDebt1, currentDebt2] = await Promise.all([
        Debt.findOne({
          fromRoute: fromRoute,
          toRoute: toRoute,
          createdAt: {
            $gte: startOfToday,
            $lte: endOfToday,
          },
        })
          .sort({ createdAt: -1 })
          .session(session)
          .lean(),
        Debt.findOne({
          fromRoute: toRoute,
          toRoute: fromRoute,
          createdAt: {
            $gte: startOfToday,
            $lte: endOfToday,
          },
        })
          .sort({ createdAt: -1 })
          .session(session)
          .lean(),
      ]);

      if (!currentDebt1 || !currentDebt2) {
        throw new Error('Debt record not found for the day. Please ensure cronjob has run.');
      }

      const costFromRoute1 = currentDebt1.costFromRoute ?? 0;
      const feeCODToRoute1 = currentDebt1.feeCODToRoute ?? 0;
      const homeDeliveryFromRoute1 = currentDebt1.homeDeliveryFromRoute ?? 0;
      const surchargeToRoute1 = currentDebt1.surchargeToRoute ?? 0;
      const receivable1 = Math.max(0, (currentDebt1.receivable ?? 0) - cash); // Decrease receivable
      const costToRoute1 = currentDebt1.costToRoute ?? 0;
      const feeCODFromRoute1 = currentDebt1.feeCODFromRoute ?? 0;
      const homeDeliveryToRoute1 = currentDebt1.homeDeliveryToRoute ?? 0;
      const surchargeFromRoute1 = currentDebt1.surchargeFromRoute ?? 0;
      const accountPayable1 = currentDebt1.accountPayable ?? 0;

      const openingBalance1 =
        currentDebt1.openingBalance !== null && currentDebt1.openingBalance !== undefined
          ? currentDebt1.openingBalance
          : 0;

      const A1 =
        costFromRoute1 + feeCODToRoute1 + homeDeliveryFromRoute1 + surchargeToRoute1 + receivable1;
      const B1 =
        costToRoute1 +
        feeCODFromRoute1 +
        homeDeliveryToRoute1 +
        surchargeFromRoute1 +
        accountPayable1;
      const totalDebt1 = A1 - B1 + openingBalance1;

      const costFromRoute2 = currentDebt2.costFromRoute ?? 0;
      const feeCODToRoute2 = currentDebt2.feeCODToRoute ?? 0;
      const homeDeliveryFromRoute2 = currentDebt2.homeDeliveryFromRoute ?? 0;
      const surchargeToRoute2 = currentDebt2.surchargeToRoute ?? 0;
      const receivable2 = currentDebt2.receivable ?? 0;
      const costToRoute2 = currentDebt2.costToRoute ?? 0;
      const feeCODFromRoute2 = currentDebt2.feeCODFromRoute ?? 0;
      const homeDeliveryToRoute2 = currentDebt2.homeDeliveryToRoute ?? 0;
      const surchargeFromRoute2 = currentDebt2.surchargeFromRoute ?? 0;
      const accountPayable2 = Math.max(0, (currentDebt2.accountPayable ?? 0) - cash); // Decrease accountPayable

      const openingBalance2 =
        currentDebt2.openingBalance !== null && currentDebt2.openingBalance !== undefined
          ? currentDebt2.openingBalance
          : 0;

      const A2 =
        costFromRoute2 + feeCODToRoute2 + homeDeliveryFromRoute2 + surchargeToRoute2 + receivable2;
      const B2 =
        costToRoute2 +
        feeCODFromRoute2 +
        homeDeliveryToRoute2 +
        surchargeFromRoute2 +
        accountPayable2;
      const totalDebt2 = A2 - B2 + openingBalance2;

      // Update debt records (reverse the changes)
      await Promise.all([
        Debt.findOneAndUpdate(
          {
            _id: currentDebt1._id,
          },
          {
            totalDebt: totalDebt1,
            receivable: receivable1,
          },
          {
            session: session,
            new: true,
            runValidators: true,
          }
        ),
        Debt.findOneAndUpdate(
          {
            _id: currentDebt2._id,
          },
          {
            totalDebt: totalDebt2,
            accountPayable: accountPayable2,
          },
          {
            session: session,
            new: true,
            runValidators: true,
          }
        ),
      ]);

      // Reverse the debt report service updates (subtract instead of add)
      await Promise.all([
        this.debtReportService.updateDebtReport(
          toRoute.toString(),
          cashDate,
          -cash,
          session,
          false,
          true
        ),
        this.debtReportService.updateDebtReport(
          fromRoute.toString(),
          cashDate,
          -cash,
          session,
          true,
          false
        ),
      ]);

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('delete debt management failed');
    }
  }
}
