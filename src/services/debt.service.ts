import { SORT_BY_DEBT } from '@/const/debt.const';
import { DEBT_MANAGEMENT_TYPE } from '@/const/debt-management.const';
import { Debt } from '@/models/debt.model';
import { DebtManagement } from '@/models/debt-management.model';
import { Delivery } from '@/models/delivery.model';
import { MoneyDelivery, MoneyDeliveryType } from '@/models/money-delivery.model';
import {
  IDebtDetailExpense,
  IDebtDetailItem,
  IDebtDetailWithListValues,
  IDebtReportDetailWithListValues,
  IDebtRow,
  IDebtTotal,
  IExportTotalDebtResponse,
  IGetListDebtResponse,
} from '@/types/debt.type';
import { Request } from 'express';
import { PipelineStage, Types } from 'mongoose';
import { DebtReportService } from './debt-report.service';
import { UserService } from './user.service';
import { Route } from '@/models/route.model';
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

  private async getRootRouteId(routeId: string): Promise<string> {
    let current = await Route.findById(routeId).lean();

    if (!current) {
      throw new Error('Route not found');
    }

    while (current.parentRouteId) {
      const parent = await Route.findById(current.parentRouteId).lean();
      if (!parent) {
        break;
      }
      current = parent;
    }

    return String(current._id);
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

    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);
    const toRouteId = await this.getRootRouteId(selectedRouteId);
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
          revenueHomeDelivery: 1, // DT GTN NỘP (+)
          revenueSurcharge: 1, // DT PHỤ PHÍ NỘP (+)
          revenueTotal: 1, // DOANH THU
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
      const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);
      const toRouteId = await this.getRootRouteId(selectedRouteId);

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
      const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);
      const toRouteId = await this.getRootRouteId(selectedRouteId);

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

      // Step 2 & 3: Calculate date range from debt dateDebt
      // dateDebt = 17:00 UTC (D-1) for VN day D (same convention as cronjob)
      // Query range: [dateDebt, dateDebt + 24h - 1ms] = VN midnight to VN 23:59:59.999
      const dateDebt = new Date(debt.dateDebt || debt.createdAt || new Date());
      const startDate = new Date(dateDebt.getTime());
      const endDate = new Date(dateDebt.getTime() + 24 * 60 * 60 * 1000 - 1);

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
            .select('fullCode cost itemCost homeDeliveryCost collectForCustomerCost paymentType')
            .lean(),
          MoneyDelivery.find({
            fromRoute: fromRouteId,
            toRoute: toRouteIdFromDebt,
            type: MoneyDeliveryType.NORMAL,
            createdAt: { $gte: startDate, $lte: endDate },
          })
            .select('fullCode sendMoneyAmount')
            .lean(),
          DebtManagement.find({
            fromRoute: fromRouteId,
            toRoute: toRouteIdFromDebt,
            type: DEBT_MANAGEMENT_TYPE.RECEIPT,
            createdAt: { $gte: startDate, $lte: endDate },
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
            .select('fullCode cost itemCost homeDeliveryCost collectForCustomerCost paymentType')
            .lean(),
          MoneyDelivery.find({
            fromRoute: toRouteIdFromDebt,
            toRoute: fromRouteId,
            type: MoneyDeliveryType.NORMAL,
            createdAt: { $gte: startDate, $lte: endDate },
          })
            .select('fullCode sendMoneyAmount')
            .lean(),
          DebtManagement.find({
            fromRoute: toRouteIdFromDebt,
            toRoute: fromRouteId,
            type: DEBT_MANAGEMENT_TYPE.PAYMENT,
            createdAt: { $gte: startDate, $lte: endDate },
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
        const itemCost = delivery.itemCost ?? 0;
        const costDelivery = delivery.cost ? delivery.cost + itemCost : 0;
        const homeDeliveryCost = delivery.homeDeliveryCost ?? 0;
        const collectForCustomerCost = delivery.collectForCustomerCost ?? 0;

        // feeCODToRoute (NỢ CƯỚC VỀ) - chỉ khi nợ cước
        if (delivery.paymentType === 'debt' && costDelivery > 0) {
          feeCODToRouteList.push({
            code: delivery.fullCode,
            money: costDelivery,
          });
        }

        // homeDeliveryToRoute (GIAO TẬN NƠI VỀ) - chỉ khi đã thu cước (paid)
        if (delivery.paymentType === 'paid' && homeDeliveryCost > 0) {
          homeDeliveryToRouteList.push({
            code: delivery.fullCode,
            money: homeDeliveryCost,
          });
        }

        // surchargeToRoute (PHỤ PHÍ VỀ) - chỉ khi đã thu cước (paid)
        if (delivery.paymentType === 'paid' && collectForCustomerCost > 0) {
          surchargeToRouteList.push({
            code: delivery.fullCode,
            money: collectForCustomerCost,
          });
        }
      }

      // Process money deliveries forward (chiều thuận = chiều về: fromRoute -> toRoute)
      for (const moneyDelivery of moneyDeliveriesForward) {
        // costToRoute (TIỀN VỀ)
        if (moneyDelivery.sendMoneyAmount && moneyDelivery.sendMoneyAmount > 0) {
          costToRouteList.push({
            code: moneyDelivery.fullCode,
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
        const itemCost = delivery.itemCost ?? 0;
        const costDelivery = delivery.cost ? delivery.cost + itemCost : 0;
        const homeDeliveryCost = delivery.homeDeliveryCost ?? 0;
        const collectForCustomerCost = delivery.collectForCustomerCost ?? 0;

        // feeCODFromRoute (NỢ CƯỚC ĐI) - chỉ khi nợ cước
        if (delivery.paymentType === 'debt' && costDelivery > 0) {
          feeCODFromRouteList.push({
            code: delivery.fullCode,
            money: costDelivery,
          });
        }

        // homeDeliveryFromRoute (GIAO TẬN NƠI ĐI) - chỉ khi đã thu cước (paid)
        if (delivery.paymentType === 'paid' && homeDeliveryCost > 0) {
          homeDeliveryFromRouteList.push({
            code: delivery.fullCode,
            money: homeDeliveryCost,
          });
        }

        // surchargeFromRoute (PHỤ PHÍ ĐI) - chỉ khi đã thu cước (paid)
        if (delivery.paymentType === 'paid' && collectForCustomerCost > 0) {
          surchargeFromRouteList.push({
            code: delivery.fullCode,
            money: collectForCustomerCost,
          });
        }
      }

      // Process money deliveries reverse (chiều ngược = chiều đi: toRoute -> fromRoute)
      for (const moneyDelivery of moneyDeliveriesReverse) {
        // costFromRoute (TIỀN ĐI)
        if (moneyDelivery.sendMoneyAmount && moneyDelivery.sendMoneyAmount > 0) {
          costFromRouteList.push({
            code: moneyDelivery.fullCode,
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

  async exportReportTotalDebt(req: Request, userId: string): Promise<IExportTotalDebtResponse> {
    const { startDate, endDate, fromRouteId } = req.query;

    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);
    const toRouteId = await this.getRootRouteId(selectedRouteId);
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
        // Group by fromRoute and sum all fields
        {
          $group: {
            _id: '$fromRoute._id',
            fromRouteName: { $first: '$fromRoute.name' },
            openingBalance: { $sum: '$openingBalance' },
            costFromRoute: { $sum: '$costFromRoute' },
            feeCODToRoute: { $sum: '$feeCODToRoute' },
            costToRoute: { $sum: '$costToRoute' },
            feeCODFromRoute: { $sum: '$feeCODFromRoute' },
            accountPayable: { $sum: '$accountPayable' },
            receivable: { $sum: '$receivable' },
            homeDeliveryFromRoute: { $sum: '$homeDeliveryFromRoute' },
            homeDeliveryToRoute: { $sum: '$homeDeliveryToRoute' },
            surchargeToRoute: { $sum: '$surchargeToRoute' },
            surchargeFromRoute: { $sum: '$surchargeFromRoute' },
            totalDebt: { $sum: '$totalDebt' },
          },
        },
        // Project to match IExportTotalDebtRow interface
        {
          $project: {
            _id: 0,
            fromRoute: {
              id: '$_id',
              name: '$fromRouteName',
            },
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
          },
        },
        // Sort by fromRoute name
        {
          $sort: { 'fromRoute.name': 1 },
        },
      ];

      const data = await Debt.aggregate(pipeline).exec();

      // Get debt report total from DebtReportService (same VN date range)
      const total: IDebtTotal = await this.debtReportService.getDebtReportTotal(
        toRouteId,
        startExact,
        endExact
      );

      return {
        data,
        total,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('export total debt failed');
    }
  }
}
