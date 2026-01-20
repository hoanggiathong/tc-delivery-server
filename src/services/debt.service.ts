import { SORT_BY_DEBT } from '@/const/debt.const';
import { Debt } from '@/models/debt.model';
import { IDebtRow, IDebtTotal, IGetListDebtResponse } from '@/types/debt.type';
import { Request } from 'express';
import { PipelineStage, Types } from 'mongoose';
import { DebtReportService } from './debt-report.service';
import { UserService } from './user.service';

export class DebtService {
  private userService: UserService;
  private debtReportService: DebtReportService;
  constructor() {
    this.userService = new UserService();
    this.debtReportService = new DebtReportService();
  }

  async getListDebt(req: Request, userId: string): Promise<IGetListDebtResponse> {
    const { startDate, endDate, keySort, key } = req.query;

    let typeSort: 1 | -1 | undefined = undefined;
    if (req.query.typeSort) {
      const typeSortValue = Number(req.query.typeSort);
      if (typeSortValue === 1 || typeSortValue === -1) {
        typeSort = typeSortValue;
      }
    }

    const toRouteId = await this.userService.getUserSelectedRouteId(userId);

    const start = new Date(String(startDate));
    start.setHours(0, 0, 0, 0);

    // Set end date to end of day
    const endOfDay = new Date(String(endDate));
    endOfDay.setHours(23, 59, 59, 999);

    let sort: Record<string, 1 | -1> = {};

    // Handle sort
    if (keySort) {
      if (!typeSort) {
        typeSort = 1;
      }

      switch (keySort) {
        case SORT_BY_DEBT.TOTAL_COST:
          sort = { totalDebt: typeSort };
          break;
        case SORT_BY_DEBT.TO_ROUTE:
          sort = { 'toRoute.name': typeSort };
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
        createdAt: { $gte: start, $lte: endOfDay },
      };

      const pipeline: PipelineStage[] = [
        {
          $match: matchStage,
        },
        // Join fromRoute
        {
          $lookup: {
            from: 'routes',
            localField: 'fromRoute',
            foreignField: '_id',
            as: 'fromRoute',
          },
        },
        { $unwind: { path: '$fromRoute', preserveNullAndEmptyArrays: true } },
        // Join toRoute
        {
          $lookup: {
            from: 'routes',
            localField: 'toRoute',
            foreignField: '_id',
            as: 'toRoute',
          },
        },
        { $unwind: { path: '$toRoute', preserveNullAndEmptyArrays: true } },
      ];

      // Add search filter if key is provided
      if (key && typeof key === 'string' && key.trim()) {
        const searchKey = key.trim();
        pipeline.push({
          $match: {
            $or: [
              { 'fromRoute.name': { $regex: searchKey, $options: 'i' } },
              { 'toRoute.name': { $regex: searchKey, $options: 'i' } },
            ],
          },
        } as PipelineStage);
      }

      // Project return fields
      pipeline.push({
        $project: {
          id: '$_id',
          fromRoute: { id: '$fromRoute._id', name: '$fromRoute.name' },
          toRoute: { id: '$toRoute._id', name: '$toRoute.name' },
          openingBalance: 1,
          costFromRoute: 1,
          feeCODToRoute: 1,
          costToRoute: 1,
          feeCODFromRoute: 1,
          accountPayable: 1,
          receivable: 1,
          homeDeliveryFromRoute: 1,
          homeDeliveryToRoute: 1,
          surchargeToRoute: 1,
          surchargeFromRoute: 1,
          totalDebt: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      } as PipelineStage);

      // Add sort stage
      pipeline.push({
        $sort: sort,
      } as PipelineStage);

      const result = (await Debt.aggregate(pipeline).exec()) as IDebtRow[];

      // Get debt report total from DebtReportService
      // Debt reports already contain daily totals, so we just need to sum them up
      const total: IDebtTotal = await this.debtReportService.getDebtReportTotal(
        toRouteId,
        start,
        endOfDay
      );

      return {
        data: result,
        total,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list debt failed');
    }
  }

  async getDebtById(debtId: string, userId: string): Promise<IDebtRow | null> {
    try {
      const toRouteId = await this.userService.getUserSelectedRouteId(userId);

      // Validate ObjectId format
      if (!Types.ObjectId.isValid(debtId)) {
        throw new Error('Invalid debt ID format');
      }

      const pipeline: PipelineStage[] = [
        {
          $match: {
            _id: new Types.ObjectId(debtId),
            toRoute: toRouteId,
          },
        },
        // Join fromRoute
        {
          $lookup: {
            from: 'routes',
            localField: 'fromRoute',
            foreignField: '_id',
            as: 'fromRoute',
          },
        },
        { $unwind: { path: '$fromRoute', preserveNullAndEmptyArrays: true } },
        // Join toRoute
        {
          $lookup: {
            from: 'routes',
            localField: 'toRoute',
            foreignField: '_id',
            as: 'toRoute',
          },
        },
        { $unwind: { path: '$toRoute', preserveNullAndEmptyArrays: true } },
        // Project return fields
        {
          $project: {
            id: '$_id',
            fromRoute: { id: '$fromRoute._id', name: '$fromRoute.name' },
            toRoute: { id: '$toRoute._id', name: '$toRoute.name' },
            openingBalance: 1,
            costFromRoute: 1,
            feeCODToRoute: 1,
            costToRoute: 1,
            feeCODFromRoute: 1,
            accountPayable: 1,
            receivable: 1,
            homeDeliveryFromRoute: 1,
            homeDeliveryToRoute: 1,
            surchargeToRoute: 1,
            surchargeFromRoute: 1,
            totalDebt: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        } as PipelineStage,
      ];

      const result = (await Debt.aggregate(pipeline).exec()) as IDebtRow[];

      if (result.length === 0) {
        return null;
      }

      return result[0];
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get debt by id failed');
    }
  }
}
