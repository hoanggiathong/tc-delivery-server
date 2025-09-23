import { SORT_BY_DEBT } from '@/const/debt.const';
import { Debt } from '@/models/debt.model';
import { Types } from 'mongoose';

export class DebtService {
  async getListDebt(req: any): Promise<any[]> {
    const { startDate, endDate, fromRouteId, keySort } = req.query;

    let { typeSort } = req.query;

    const start = new Date(String(startDate));
    // Set end date to end of day
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const fromId = new Types.ObjectId(String(fromRouteId));

    let sort = {};

    //handle sort
    if (keySort) {
      if (!typeSort) {
        typeSort = 1;
      }

      switch (keySort) {
        case SORT_BY_DEBT.TOTAL_COST:
          sort = { cash: typeSort };
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
      const pipeline = [
        {
          $match: {
            fromRoute: fromId,
            createdAt: { $gte: start, $lte: endOfDay },
          },
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
        // project return fields need to select
        {
          $project: {
            _id: 1,
            fromRoute: { _id: '$fromRoute._id', name: '$fromRoute.name' },
            toRoute: { _id: '$toRoute._id', name: '$toRoute.name' },
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
        },
        {
          $sort: sort,
        },
      ];

      const result = await Debt.aggregate(pipeline).exec();
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list debt failed');
    }
  }
}
