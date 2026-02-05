import { SORT_BY_DEBT } from '@/const/debt.const';
import { DEBT_MANAGEMENT_TYPE } from '@/const/debt-management.const';
import { Debt } from '@/models/debt.model';
import { DebtManagement } from '@/models/debt-management.model';
import { Delivery } from '@/models/delivery.model';
import { MoneyDelivery } from '@/models/money-delivery.model';
import {
  IDebtDetailExpense,
  IDebtDetailItem,
  IDebtDetailWithListValues,
  IDebtReportDetailWithListValues,
  IDebtRow,
  IDebtTotal,
  IGetListDebtResponse,
} from '@/types/debt.type';
import { Request } from 'express';
import { PipelineStage, Types } from 'mongoose';
import { DebtReportService } from './debt-report.service';
import { UserService } from './user.service';

/**
 * For a VN calendar day (year, month, date), return the UTC dateDebt value.
 * Same convention as cron-job: debt for VN day D has dateDebt = 17:00 UTC on previous UTC day.
 */
function vnDateToDebtDateUtc(year: number, month: number, date: number): Date {
  return new Date(Date.UTC(year, month, date - 1, 17, 0, 0, 0));
}

export class DebtService {
  private userService: UserService;
  private debtReportService: DebtReportService;
  constructor() {
    this.userService = new UserService();
    this.debtReportService = new DebtReportService();
  }

  async getListDebt(req: Request, userId: string): Promise<IGetListDebtResponse> {
    const { startDate, endDate, keySort, key, fromRouteId } = req.query;

    let typeSort: 1 | -1 | undefined = undefined;
    if (req.query.typeSort) {
      const typeSortValue = Number(req.query.typeSort);
      if (typeSortValue === 1 || typeSortValue === -1) {
        typeSort = typeSortValue;
      }
    }

    const toRouteId = await this.userService.getUserSelectedRouteId(userId);
    const startOfDate = new Date(String(startDate));
    const endOfDate = new Date(String(endDate));

    // Interpret startDate/endDate as VN calendar days; query dateDebt (17:00 UTC previous day)
    const startExact = vnDateToDebtDateUtc(
      startOfDate.getUTCFullYear(),
      startOfDate.getUTCMonth(),
      startOfDate.getUTCDate()
    );
    const endExact = vnDateToDebtDateUtc(
      endOfDate.getUTCFullYear(),
      endOfDate.getUTCMonth(),
      endOfDate.getUTCDate()
    );

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
          sort = { 'toRoute.name': 1, dateDebt: 1 };
          break;
      }
    } else {
      sort = { 'toRoute.name': 1, dateDebt: 1 };
    }

    try {
      const toRouteIdObj = new Types.ObjectId(toRouteId);
      const matchStage: Record<string, unknown> = {
        toRoute: toRouteIdObj,
        dateDebt: { $gte: startExact, $lte: endExact },
      };

      if (fromRouteId) {
        if (!Types.ObjectId.isValid(String(fromRouteId))) {
          throw new Error('Invalid fromRouteId format');
        }
        matchStage.fromRoute = new Types.ObjectId(String(fromRouteId));
      }

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
          dateDebt: 1,
        },
      } as PipelineStage);

      // Add sort stage
      pipeline.push({
        $sort: sort,
      } as PipelineStage);

      const result = (await Debt.aggregate(pipeline).exec()) as IDebtRow[];

      // Get debt report total from DebtReportService (same VN date range)
      const total: IDebtTotal = await this.debtReportService.getDebtReportTotal(
        toRouteId,
        startExact,
        endExact
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

      const toRouteIdObj = new Types.ObjectId(toRouteId);

      const pipeline: PipelineStage[] = [
        {
          $match: {
            _id: new Types.ObjectId(debtId),
            toRoute: toRouteIdObj,
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
            dateDebt: 1,
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

  async getDebtDetailWithListValues(
    debtId: string,
    userId: string
  ): Promise<IDebtReportDetailWithListValues | null> {
    try {
      const toRouteId = await this.userService.getUserSelectedRouteId(userId);

      // Validate ObjectId format
      if (!Types.ObjectId.isValid(debtId)) {
        throw new Error('Invalid debt ID format');
      }

      const toRouteIdObj = new Types.ObjectId(toRouteId);

      // Step 1: Find debt data
      const pipeline: PipelineStage[] = [
        {
          $match: {
            _id: new Types.ObjectId(debtId),
            toRoute: toRouteIdObj,
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
            dateDebt: 1,
          },
        } as PipelineStage,
      ];

      const debtResult = (await Debt.aggregate(pipeline).exec()) as IDebtRow[];

      if (debtResult.length === 0) {
        return null;
      }

      const debt = debtResult[0];

      // Step 2 & 3: Calculate date range from debt createdAt
      const debtDate = new Date(debt.createdAt || new Date());
      const startDate = new Date(
        debtDate.getFullYear(),
        debtDate.getMonth(),
        debtDate.getDate(),
        0,
        0,
        0,
        0
      );
      const endDate = new Date(
        debtDate.getFullYear(),
        debtDate.getMonth(),
        debtDate.getDate(),
        23,
        59,
        59,
        999
      );

      const fromRouteId = new Types.ObjectId(String(debt.fromRoute.id));
      const toRouteIdFromDebt = new Types.ObjectId(String(debt.toRoute.id));

      // Step 2: Get deliveries and money deliveries (chiều thuận = chiều về: fromRoute -> toRoute)
      const [deliveriesForward, moneyDeliveriesForward, debtManagementsForward] = await Promise.all(
        [
          Delivery.find({
            fromRoute: fromRouteId,
            toRoute: toRouteIdFromDebt,
            createdAt: { $gte: startDate, $lte: endDate },
          })
            .select('code cost homeDeliveryCost collectForCustomerCost paymentType')
            .lean(),
          MoneyDelivery.find({
            fromRoute: fromRouteId,
            toRoute: toRouteIdFromDebt,
            createdAt: { $gte: startDate, $lte: endDate },
          })
            .select('code sendMoneyAmount')
            .lean(),
          DebtManagement.find({
            fromRoute: fromRouteId,
            toRoute: toRouteIdFromDebt,
            type: DEBT_MANAGEMENT_TYPE.RECEIPT,
            cashDate: { $gte: startDate, $lte: endDate },
            deleted: false,
          })
            .select('content cash')
            .lean(),
        ]
      );

      // Step 3: Get deliveries and money deliveries (chiều ngược = chiều đi: toRoute -> fromRoute)
      const [deliveriesReverse, moneyDeliveriesReverse, debtManagementsReverse] = await Promise.all(
        [
          Delivery.find({
            fromRoute: toRouteIdFromDebt,
            toRoute: fromRouteId,
            createdAt: { $gte: startDate, $lte: endDate },
          })
            .select('code cost homeDeliveryCost collectForCustomerCost paymentType')
            .lean(),
          MoneyDelivery.find({
            fromRoute: toRouteIdFromDebt,
            toRoute: fromRouteId,
            createdAt: { $gte: startDate, $lte: endDate },
          })
            .select('code sendMoneyAmount')
            .lean(),
          DebtManagement.find({
            fromRoute: toRouteIdFromDebt,
            toRoute: fromRouteId,
            type: DEBT_MANAGEMENT_TYPE.PAYMENT,
            cashDate: { $gte: startDate, $lte: endDate },
            deleted: false,
          })
            .select('content cash')
            .lean(),
        ]
      );

      // Step 4 & 5: Create arrays and populate them
      const feeCODFromRouteList: IDebtDetailItem[] = [];
      const homeDeliveryFromRouteList: IDebtDetailItem[] = [];
      const surchargeToRouteList: IDebtDetailItem[] = [];
      const costFromRouteList: IDebtDetailItem[] = [];
      const paymentManagementList: IDebtDetailExpense[] = [];

      const feeCODToRouteList: IDebtDetailItem[] = [];
      const homeDeliveryToRouteList: IDebtDetailItem[] = [];
      const surchargeFromRouteList: IDebtDetailItem[] = [];
      const costToRouteList: IDebtDetailItem[] = [];
      const receivableManagementList: IDebtDetailExpense[] = [];

      // Process deliveries forward (chiều thuận = chiều về: fromRoute -> toRoute)
      for (const delivery of deliveriesForward) {
        // feeCODToRoute (NỢ CƯỚC VỀ)
        if (delivery.paymentType === 'debt' && delivery.cost) {
          feeCODToRouteList.push({
            code: delivery.code,
            money: delivery.cost,
          });
        }

        // homeDeliveryToRoute (GIAO TẬN NƠI VỀ)
        if (delivery.homeDeliveryCost && delivery.homeDeliveryCost > 0) {
          homeDeliveryToRouteList.push({
            code: delivery.code,
            money: delivery.homeDeliveryCost,
          });
        }

        // surchargeFromRoute (PHỤ PHÍ VỀ)
        if (delivery.collectForCustomerCost && delivery.collectForCustomerCost > 0) {
          surchargeToRouteList.push({
            code: delivery.code,
            money: delivery.collectForCustomerCost,
          });
        }
      }

      // Process money deliveries forward (chiều thuận = chiều về: fromRoute -> toRoute)
      for (const moneyDelivery of moneyDeliveriesForward) {
        // costToRoute (TIỀN VỀ)
        if (moneyDelivery.sendMoneyAmount && moneyDelivery.sendMoneyAmount > 0) {
          costToRouteList.push({
            code: moneyDelivery.code,
            money: moneyDelivery.sendMoneyAmount,
          });
        }
      }

      // Process debt managements forward (RECEIPT - TIỀN VỀ)
      for (const debtManagement of debtManagementsForward) {
        if (debtManagement.cash && debtManagement.cash > 0) {
          receivableManagementList.push({
            content: debtManagement.content || '',
            money: debtManagement.cash,
          });
        }
      }

      // Process deliveries reverse (chiều ngược = chiều đi: toRoute -> fromRoute)
      for (const delivery of deliveriesReverse) {
        // feeCODFromRoute (NỢ CƯỚC ĐI)
        if (delivery.paymentType === 'debt' && delivery.cost) {
          feeCODFromRouteList.push({
            code: delivery.code,
            money: delivery.cost,
          });
        }

        // homeDeliveryFromRoute (GIAO TẬN NƠI ĐI)
        if (delivery.homeDeliveryCost && delivery.homeDeliveryCost > 0) {
          homeDeliveryFromRouteList.push({
            code: delivery.code,
            money: delivery.homeDeliveryCost,
          });
        }

        // surchargeToRoute (PHỤ PHÍ ĐI)
        if (delivery.collectForCustomerCost && delivery.collectForCustomerCost > 0) {
          surchargeFromRouteList.push({
            code: delivery.code,
            money: delivery.collectForCustomerCost,
          });
        }
      }

      // Process money deliveries reverse (chiều ngược = chiều đi: toRoute -> fromRoute)
      for (const moneyDelivery of moneyDeliveriesReverse) {
        // costFromRoute (TIỀN ĐI)
        if (moneyDelivery.sendMoneyAmount && moneyDelivery.sendMoneyAmount > 0) {
          costFromRouteList.push({
            code: moneyDelivery.code,
            money: moneyDelivery.sendMoneyAmount,
          });
        }
      }

      // Process debt managements reverse (PAYMENT - TIỀN ĐI)
      for (const debtManagement of debtManagementsReverse) {
        if (debtManagement.cash && debtManagement.cash > 0) {
          paymentManagementList.push({
            content: debtManagement.content || '',
            money: debtManagement.cash,
          });
        }
      }

      // Combine debt data with detail lists
      const debtDetailWithListValues: IDebtDetailWithListValues = {
        ...debt,
        feeCODFromRouteList,
        homeDeliveryFromRouteList,
        surchargeToRouteList,
        costFromRouteList,
        paymentManagementList,
        feeCODToRouteList,
        homeDeliveryToRouteList,
        surchargeFromRouteList,
        costToRouteList,
        receivableManagementList,
      };

      const result: IDebtReportDetailWithListValues = {
        data: debt,
        debtDetailWithListValues,
      };

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get debt detail with list values failed');
    }
  }
}
