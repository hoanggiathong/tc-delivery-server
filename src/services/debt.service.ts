import { SORT_BY_DEBT } from '@/const/debt.const';
import { DEBT_MANAGEMENT_TYPE } from '@/const/debt-management.const';
import { Debt } from '@/models/debt.model';
import { DebtManagement } from '@/models/debt-management.model';
import { Delivery } from '@/models/delivery.model';
import { MoneyDelivery, MoneyDeliveryType } from '@/models/money-delivery.model';
import { Route } from '@/models/route.model';
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

type RouteLean = {
  _id: Types.ObjectId;
  parentRouteId?: Types.ObjectId | null;
};

type MoneyDeliveryLean = {
  fullCode?: string;
  sendMoneyAmount?: number;
};

type DeliveryLean = {
  fullCode?: string;
  cost?: number;
  itemCost?: number;
  homeDeliveryCost?: number;
  collectForCustomerCost?: number;
  paymentType?: string;
};

type DebtManagementLean = {
  content?: string;
  cash?: number;
};

function vnDateToDebtDateUtc(year: number, month: number, date: number): Date {
  return new Date(Date.UTC(year, month, date - 1, 17, 0, 0, 0));
}

function buildDebtProjection(): PipelineStage.Project['$project'] {
  return {
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
    revenueHomeDelivery: 1,
    revenueSurcharge: 1,
    revenueTotal: 1,
    totalDebt: 1,
    netDebt: 1,
    cashCollectedToday: 1,
    newDebtFreightToday: 1,
    paidOldDebtToday: 1,
    minimumTransferToCompany: 1,
    createdAt: 1,
    updatedAt: 1,
    dateDebt: 1,
  };
}

function buildMoneyDeliveryTypeFilter() {
  return {
    $in: [MoneyDeliveryType.NORMAL, MoneyDeliveryType.COLLECT_FOR_CUSTOMER],
  };
}

export class DebtService {
  private userService: UserService;
  private debtReportService: DebtReportService;

  constructor() {
    this.userService = new UserService();
    this.debtReportService = new DebtReportService();
  }

  private async getRootRouteId(routeId: string): Promise<string> {
    let current: RouteLean | null = await Route.findById(routeId)
      .select('_id parentRouteId')
      .lean<RouteLean | null>();

    if (!current) {
      throw new Error(`Route not found: ${routeId}`);
    }

    while (current.parentRouteId) {
      const parent: RouteLean | null = await Route.findById(current.parentRouteId)
        .select('_id parentRouteId')
        .lean<RouteLean | null>();

      if (!parent) {
        break;
      }

      current = parent;
    }

    return current._id.toString();
  }

  private parseDebtDateRange(startDate: unknown, endDate: unknown) {
    const startOfDate = new Date(String(startDate));
    const endOfDate = new Date(String(endDate));

    return {
      startExact: vnDateToDebtDateUtc(
        startOfDate.getUTCFullYear(),
        startOfDate.getUTCMonth(),
        startOfDate.getUTCDate()
      ),
      endExact: vnDateToDebtDateUtc(
        endOfDate.getUTCFullYear(),
        endOfDate.getUTCMonth(),
        endOfDate.getUTCDate()
      ),
    };
  }

  private async buildDebtMatchStage(params: {
    toRouteId: string;
    startExact: Date;
    endExact: Date;
    fromRouteId?: unknown;
  }): Promise<Record<string, unknown>> {
    const matchStage: Record<string, unknown> = {
      toRoute: new Types.ObjectId(params.toRouteId),
      dateDebt: { $gte: params.startExact, $lte: params.endExact },
    };

    if (params.fromRouteId) {
      if (!Types.ObjectId.isValid(String(params.fromRouteId))) {
        throw new Error('Invalid fromRouteId format');
      }

      const fromRouteRootId = await this.getRootRouteId(String(params.fromRouteId));
      matchStage.fromRoute = new Types.ObjectId(fromRouteRootId);
    }

    return matchStage;
  }

  private buildDebtLookupPipeline(matchStage: Record<string, unknown>): PipelineStage[] {
    return [
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
    ];
  }

  async getListDebt(req: Request, userId: string): Promise<IGetListDebtResponse> {
    const { startDate, endDate, keySort, key, fromRouteId } = req.query;

    let typeSort: 1 | -1 | undefined;
    if (req.query.typeSort) {
      const typeSortValue = Number(req.query.typeSort);
      if (typeSortValue === 1 || typeSortValue === -1) {
        typeSort = typeSortValue;
      }
    }

    const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);
    const toRouteId = await this.getRootRouteId(selectedRouteId);
    const { startExact, endExact } = this.parseDebtDateRange(startDate, endDate);

    let sort: Record<string, 1 | -1>;
    if (keySort) {
      if (!typeSort) {
        typeSort = 1;
      }

      switch (keySort) {
        case SORT_BY_DEBT.TOTAL_COST:
          sort = { netDebt: typeSort };
          break;
        case SORT_BY_DEBT.TO_ROUTE:
          sort = { 'toRoute.name': typeSort };
          break;
        default:
          sort = { 'fromRoute.name': 1, dateDebt: 1 };
          break;
      }
    } else {
      sort = { 'fromRoute.name': 1, dateDebt: 1 };
    }

    try {
      const matchStage = await this.buildDebtMatchStage({
        toRouteId,
        startExact,
        endExact,
        fromRouteId,
      });

      const pipeline = this.buildDebtLookupPipeline(matchStage);

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

      pipeline.push({
        $project: buildDebtProjection(),
      } as PipelineStage);

      pipeline.push({
        $sort: sort,
      } as PipelineStage);

      const result = (await Debt.aggregate(pipeline).exec()) as IDebtRow[];

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

      if (!Types.ObjectId.isValid(debtId)) {
        throw new Error('Invalid debt ID format');
      }

      const pipeline: PipelineStage[] = [
        ...this.buildDebtLookupPipeline({
          _id: new Types.ObjectId(debtId),
          toRoute: new Types.ObjectId(toRouteId),
        }),
        {
          $project: buildDebtProjection(),
        } as PipelineStage,
      ];

      const result = (await Debt.aggregate(pipeline).exec()) as IDebtRow[];
      return result[0] ?? null;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get debt by id failed');
    }
  }

  private async resolveRouteIdsByHierarchy(routeId: string): Promise<Types.ObjectId[]> {
    const route = await Route.findById(routeId)
      .select('_id')
      .lean<{ _id: Types.ObjectId } | null>();

    if (!route) {
      throw new Error(`Route not found: ${routeId}`);
    }

    const hasChildren = await Route.exists({
      parentRouteId: route._id,
    });

    if (!hasChildren) {
      return [route._id];
    }

    return this.getRouteTreeIds(routeId);
  }

  private async getRouteTreeIds(rootRouteId: string): Promise<Types.ObjectId[]> {
    const rootId = new Types.ObjectId(rootRouteId);
    const result: Types.ObjectId[] = [rootId];
    const queue: Types.ObjectId[] = [rootId];

    while (queue.length > 0) {
      const parentIds = queue.splice(0, queue.length);

      const children = await Route.find({
        parentRouteId: { $in: parentIds },
      })
        .select('_id')
        .lean<{ _id: Types.ObjectId }[]>();

      for (const child of children) {
        result.push(child._id);
        queue.push(child._id);
      }
    }

    return result;
  }

  async getDebtDetailWithListValues(
    debtId: string,
    userId: string
  ): Promise<IDebtReportDetailWithListValues | null> {
    try {
      const selectedRouteId = await this.userService.getUserSelectedRouteId(userId);
      const toRouteId = await this.getRootRouteId(selectedRouteId);

      if (!Types.ObjectId.isValid(debtId)) {
        throw new Error('Invalid debt ID format');
      }

      const debtPipeline: PipelineStage[] = [
        ...this.buildDebtLookupPipeline({
          _id: new Types.ObjectId(debtId),
          toRoute: new Types.ObjectId(toRouteId),
        }),
        {
          $project: buildDebtProjection(),
        } as PipelineStage,
      ];

      const debtResult = (await Debt.aggregate(debtPipeline).exec()) as IDebtRow[];
      if (debtResult.length === 0) {
        return null;
      }

      const debt = debtResult[0];
      const dateDebt = new Date(debt.dateDebt || debt.createdAt || new Date());
      const startDate = new Date(dateDebt.getTime());
      const endDate = new Date(dateDebt.getTime() + 24 * 60 * 60 * 1000 - 1);

      const [fromRouteIds, toRouteIds] = await Promise.all([
        this.resolveRouteIdsByHierarchy(String(debt.fromRoute.id)),
        this.resolveRouteIdsByHierarchy(String(debt.toRoute.id)),
      ]);

      const [deliveriesForward, moneyDeliveriesForward, debtManagementsForward] = await Promise.all(
        [
          Delivery.find({
            fromRoute: { $in: fromRouteIds },
            toRoute: { $in: toRouteIds },
            createdAt: { $gte: startDate, $lte: endDate },
          })
            .select('fullCode cost itemCost homeDeliveryCost collectForCustomerCost paymentType')
            .lean<DeliveryLean[]>(),
          MoneyDelivery.find({
            fromRoute: { $in: fromRouteIds },
            toRoute: { $in: toRouteIds },
            type: buildMoneyDeliveryTypeFilter(),
            createdAt: { $gte: startDate, $lte: endDate },
          })
            .select('fullCode sendMoneyAmount')
            .lean<MoneyDeliveryLean[]>(),
          DebtManagement.find({
            fromRoute: { $in: fromRouteIds },
            toRoute: { $in: toRouteIds },
            type: DEBT_MANAGEMENT_TYPE.RECEIPT,
            createdAt: { $gte: startDate, $lte: endDate },
            deleted: false,
          })
            .select('content cash')
            .lean<DebtManagementLean[]>(),
        ]
      );

      const [deliveriesReverse, moneyDeliveriesReverse, debtManagementsReverse] = await Promise.all(
        [
          Delivery.find({
            fromRoute: { $in: toRouteIds },
            toRoute: { $in: fromRouteIds },
            createdAt: { $gte: startDate, $lte: endDate },
          })
            .select('fullCode cost itemCost homeDeliveryCost collectForCustomerCost paymentType')
            .lean<DeliveryLean[]>(),
          MoneyDelivery.find({
            fromRoute: { $in: toRouteIds },
            toRoute: { $in: fromRouteIds },
            type: buildMoneyDeliveryTypeFilter(),
            createdAt: { $gte: startDate, $lte: endDate },
          })
            .select('fullCode sendMoneyAmount')
            .lean<MoneyDeliveryLean[]>(),
          DebtManagement.find({
            fromRoute: { $in: toRouteIds },
            toRoute: { $in: fromRouteIds },
            type: DEBT_MANAGEMENT_TYPE.PAYMENT,
            createdAt: { $gte: startDate, $lte: endDate },
            deleted: false,
          })
            .select('content cash')
            .lean<DebtManagementLean[]>(),
        ]
      );

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

      for (const delivery of deliveriesForward) {
        const itemCost = delivery.itemCost ?? 0;
        const costDelivery = delivery.cost ? delivery.cost + itemCost : 0;
        const homeDeliveryCost = delivery.homeDeliveryCost ?? 0;
        const collectForCustomerCost = delivery.collectForCustomerCost ?? 0;

        if (delivery.paymentType === 'debt' && costDelivery > 0) {
          feeCODToRouteList.push({
            code: delivery.fullCode || '',
            money: costDelivery,
          });
        }

        if (delivery.paymentType === 'paid' && homeDeliveryCost > 0) {
          homeDeliveryToRouteList.push({
            code: delivery.fullCode || '',
            money: homeDeliveryCost,
          });
        }

        if (delivery.paymentType === 'paid' && collectForCustomerCost > 0) {
          surchargeToRouteList.push({
            code: delivery.fullCode || '',
            money: collectForCustomerCost,
          });
        }
      }

      for (const moneyDelivery of moneyDeliveriesForward) {
        if ((moneyDelivery.sendMoneyAmount ?? 0) > 0) {
          costToRouteList.push({
            code: moneyDelivery.fullCode || '',
            money: moneyDelivery.sendMoneyAmount ?? 0,
          });
        }
      }

      for (const debtManagement of debtManagementsForward) {
        if ((debtManagement.cash ?? 0) > 0) {
          receivableManagementList.push({
            content: debtManagement.content || '',
            money: debtManagement.cash ?? 0,
          });
        }
      }

      for (const delivery of deliveriesReverse) {
        const itemCost = delivery.itemCost ?? 0;
        const costDelivery = delivery.cost ? delivery.cost + itemCost : 0;
        const homeDeliveryCost = delivery.homeDeliveryCost ?? 0;
        const collectForCustomerCost = delivery.collectForCustomerCost ?? 0;

        if (delivery.paymentType === 'debt' && costDelivery > 0) {
          feeCODFromRouteList.push({
            code: delivery.fullCode || '',
            money: costDelivery,
          });
        }

        if (delivery.paymentType === 'paid' && homeDeliveryCost > 0) {
          homeDeliveryFromRouteList.push({
            code: delivery.fullCode || '',
            money: homeDeliveryCost,
          });
        }

        if (delivery.paymentType === 'paid' && collectForCustomerCost > 0) {
          surchargeFromRouteList.push({
            code: delivery.fullCode || '',
            money: collectForCustomerCost,
          });
        }
      }

      for (const moneyDelivery of moneyDeliveriesReverse) {
        if ((moneyDelivery.sendMoneyAmount ?? 0) > 0) {
          costFromRouteList.push({
            code: moneyDelivery.fullCode || '',
            money: moneyDelivery.sendMoneyAmount ?? 0,
          });
        }
      }

      for (const debtManagement of debtManagementsReverse) {
        if ((debtManagement.cash ?? 0) > 0) {
          paymentManagementList.push({
            content: debtManagement.content || '',
            money: debtManagement.cash ?? 0,
          });
        }
      }

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

      return {
        data: debt,
        debtDetailWithListValues,
      };
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
    const { startExact, endExact } = this.parseDebtDateRange(startDate, endDate);

    try {
      const matchStage = await this.buildDebtMatchStage({
        toRouteId,
        startExact,
        endExact,
        fromRouteId,
      });

      const pipeline: PipelineStage[] = [
        ...this.buildDebtLookupPipeline(matchStage),
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
            netDebt: { $sum: { $ifNull: ['$netDebt', 0] } },
          },
        },
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
            netDebt: 1,
          },
        },
        {
          $sort: { 'fromRoute.name': 1 },
        },
      ];

      const data = await Debt.aggregate(pipeline).exec();

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

export default DebtService;
