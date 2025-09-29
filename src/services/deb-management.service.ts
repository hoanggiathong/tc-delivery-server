import { DEBT_MANAGEMENT_TYPE, SORT_BY } from '@/const/debt-management.const';
import { DebtManagement } from '@/models/debt-management.model';
import { Debt } from '@/models/debt.model';
import { Route } from '@/models/route.model';
import { ICreateDebtManagementRequest } from '@/types/debt-management.type';
import mongoose, { Types } from 'mongoose';

export class DebtManagementService {
  async getListPaymentDebtMangement(req: any): Promise<any[]> {
    const { startDate, endDate, toRouteId, keySort } = req.query;

    let { typeSort } = req.query;

    const start = new Date(String(startDate));

    // Set end date to end of day
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const toId = new Types.ObjectId(String(toRouteId));
    let sort = {};

    console.log('typeSort :>> ', typeSort);
    //handle sort
    if (keySort) {
      if (!typeSort) {
        typeSort = 1;
      }

      switch (keySort) {
        case SORT_BY.CASH_DATE:
          sort = { cashDate: typeSort };
          break;
        case SORT_BY.CASH:
          sort = { cash: typeSort };
          break;
        case SORT_BY.TO_ROUTE:
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

      const pipeline = [
        {
          $match: {
            toRoute: toId,
            type: DEBT_MANAGEMENT_TYPE.RECEIPT,
            cashDate: { $gte: start, $lte: endOfDay },
            deleted: false,
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
        // project các field cần trả
        {
          $project: {
            _id: 1,
            fromRoute: { _id: '$fromRoute._id', name: '$fromRoute.name' },
            toRoute: { _id: '$toRoute._id', name: '$toRoute.name' },
            content: 1,
            type: 1,
            cash: 1,
            cashDate: 1,
            deleted: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
        { $sort: sort },
      ];
      const result = await DebtManagement.aggregate(pipeline).exec();
      console.log('result :>> ', result);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list payment debt management failed');
    }
  }

  async getListReceiptDebtMangement(req: any): Promise<any[]> {
    const { startDate, endDate, fromRouteId, keySort, typeSort } = req.query;

    const start = new Date(String(startDate));
    // Set end date to end of day
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const fromId = new Types.ObjectId(String(fromRouteId));
    let sort = {};

    //handle sort
    if (keySort) {
      switch (keySort) {
        case SORT_BY.CASH_DATE:
          sort = { cashDate: typeSort };
          break;
        case SORT_BY.CASH:
          sort = { cash: typeSort };
          break;
        case SORT_BY.TO_ROUTE:
          sort = { 'toRoute.name': typeSort };
          break;
        default:
          sort = { 'toRoute.name': 1, createdAt: 1 };
          break;
      }
    } else {
      sort = { 'toRoute.name': 1, createdAt: 1 };
    }

    console.log('sort :>> ', sort);
    try {
      const pipeline = [
        {
          $match: {
            fromRoute: fromId,
            type: DEBT_MANAGEMENT_TYPE.RECEIPT,
            cashDate: { $gte: start, $lte: endOfDay },
            deleted: false,
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
        {
          $project: {
            _id: 1,
            fromRoute: { _id: '$fromRoute._id', name: '$fromRoute.name' },
            toRoute: { _id: '$toRoute._id', name: '$toRoute.name' },
            content: 1,
            type: 1,
            cash: 1,
            cashDate: 1,
            deleted: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
        { $sort: sort },
      ];

      const result = await DebtManagement.aggregate(pipeline).exec();

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list receipt debt management failed');
    }
  }

  async createDebtManagement(data: ICreateDebtManagementRequest): Promise<any> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate fromRoute and toRoute exist
      const [fromRoute, toRoute] = await Promise.all([
        Route.findById(data.fromRoute),
        Route.findById(data.toRoute),
      ]);

      if (!fromRoute) {
        throw new Error('User selected route not found');
      }
      if (!toRoute) {
        throw new Error('To route not found');
      }

      const dataDebtManagement = new DebtManagement(data);
      const result = await dataDebtManagement.save({ session: session });

      const paymentDebt = -data.cash;
      const receiptDebt = data.cash;

      await Promise.all([
        // logic handle debt table
        // fromRoute o trong bang debt-management tuc la tram nay dang no tram toRoute
        // suy ra cash se la so duong
        // nghia la tram toRoute o bang debt-mangement se la fromRoute o bang debts
        await Debt.findOneAndUpdate(
          {
            fromRoute: data.fromRoute,
            toRoute: data.toRoute,
          },
          {
            paymentDebt: paymentDebt,
          },
          {
            session: session,
            new: true,
            upsert: true,
            runValidators: true,
            sort: {
              createdAt: -1,
            },
          }
        ),
        await Debt.findOneAndUpdate(
          {
            fromRoute: data.toRoute,
            toRoute: data.fromRoute,
          },
          {
            paymentDebt: receiptDebt,
          },
          {
            session: session,
            new: true,
            upsert: true,
            runValidators: true,
            sort: {
              createdAt: -1,
            },
          }
        ),
      ]);

      await session.commitTransaction();
      session.endSession();

      return result;
    } catch (error) {
      await session.commitTransaction();
      session.endSession();

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list receipt debt management failed');
    }
  }

  /**
   * Delete debt management by ID
   */
  async deleteDebtManagement(id: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const debtManagement = await DebtManagement.findById(id);

      if (!debtManagement) {
        throw new Error('Debt Management not found');
      }

      await Promise.all([
        await DebtManagement.updateOne(
          {
            _id: id,
          },
          {
            deleted: true,
            deletedAt: new Date(),
          },
          {
            session: session,
          }
        ),

        await Debt.updateOne(
          {
            fromRoute: debtManagement.toRoute,
            toRoute: debtManagement.fromRoute,
          },
          {
            paymentDebt: 0,
          },
          {
            session: session,
            sort: {
              createdAt: -1,
            },
          }
        ),

        await Debt.updateOne(
          {
            fromRoute: debtManagement.fromRoute,
            toRoute: debtManagement.toRoute,
          },
          {
            paymentDebt: 0,
          },
          {
            session: session,
            sort: {
              createdAt: -1,
            },
          }
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
