import { DEBT_MANAGEMENT_TYPE, SORT_BY } from '@/const/debt-management.const';
import { DebtManagement } from '@/models/debt-management.model';
import { Debt } from '@/models/debt.model';
import { Delivery, IDelivery } from '@/models/delivery.model';
import { IMoneyDelivery, MoneyDelivery } from '@/models/money-delivery.model';
import { IRoute, Route } from '@/models/route.model';
import { IDebtRow } from '@/types/debt.type';
import mongoose, { Types } from 'mongoose';

export class TestService {
  async cronjobCalculateDebt(): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const listInsertDebt: IDebtRow[] = [];

      // Set today's date range (from start of day to end of day)
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        0,
        0,
        0,
        0
      );
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999
      );

      //get list route
      const listFromRoute: IRoute[] = await Route.find({}).lean();

      //example first element: sa dec
      for (const route of listFromRoute) {
        console.log('route main checking:>> ', route);

        // other route: can tho, tphcm
        const arrayRoute: any = {};

        // handle array route with toRoute as key
        const handleArrayRoute = (key: string, toRoute: any) => {
          if (!arrayRoute[key]) {
            arrayRoute[key] = {
              fromRoute: route._id,
              toRoute: toRoute,
              costFromRoute: 0,
              feeCODToRoute: 0,
              costToRoute: 0,
              feeCODFromRoute: 0,
              accountPayable: 0,
              receivable: 0,
              homeDeliveryFromRoute: 0,
              homeDeliveryToRoute: 0,
              surchargeToRoute: 0,
              surchargeFromRoute: 0,
              totalDebt: 0,
            };
          }
          return arrayRoute[key];
        };

        // get list toRoute except route
        const listToRoute: IRoute[] = await Route.find({
          _id: { $ne: route._id },
        }).lean();

        console.log('listToRoute :>> ', listToRoute);

        listToRoute.map(async toRoute => {
          await handleArrayRoute(toRoute._id.toString(), toRoute._id);
        });

        console.log('arrayRoute :>> ', arrayRoute);

        // get list delivery with route is fromRoute in one day
        const listDeliveryFromRoute: IDelivery[] = await Delivery.find({
          fromRoute: route._id,
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        }).lean();

        console.log('listDeliveryFromRoute :>> ', listDeliveryFromRoute);

        // handle listDeliveryFromRoute
        for (const delivery of listDeliveryFromRoute) {
          const toRoute: any = delivery.toRoute.toString();

          // object from route with information about debt
          const elementArrayRoute = handleArrayRoute(toRoute, toRoute);

          console.log('listDeliveryFromRoute - delivery :>> ', delivery);
          console.log('arrayRoute[toRoute] - 1 :>> ', elementArrayRoute);

          const costDeliveryFromRoute = delivery.cost ?? 0;
          const homeDeliveryCostFromRoute = delivery.homeDeliveryCost ?? 0;
          const collectForCustomerCostFromRoute = delivery.collectForCustomerCost ?? 0;

          // handle feeCODFromRoute (no cuoc di)
          if (delivery.paymentType == 'debt') {
            elementArrayRoute.feeCODFromRoute += costDeliveryFromRoute ?? 0;
          }

          // handle homeDeliveryFromRoute(GTN di)
          elementArrayRoute.homeDeliveryFromRoute += homeDeliveryCostFromRoute ?? 0;

          // handle surchargeToRoute(phu phi di)
          elementArrayRoute.surchargeToRoute += collectForCustomerCostFromRoute ?? 0;
        }

        // get list delivery with route is toRoute in one day
        const listDeliveriesToRoute: IDelivery[] = await Delivery.find({
          toRoute: route._id,
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        }).lean();

        console.log('listDeliveriesToRoute :>> ', listDeliveriesToRoute);

        // handle listDeliveriesToRoute
        for (const delivery of listDeliveriesToRoute) {
          const fromRoute: any = delivery.fromRoute.toString();

          const elementArrayRoute = handleArrayRoute(fromRoute, fromRoute);

          const costDelivery = delivery.cost ?? 0;
          const homeDeliveryCost = delivery.homeDeliveryCost ?? 0;
          const collectForCustomerCostToRoute = delivery.collectForCustomerCost ?? 0;

          console.log('listDeliveriesToRoute - delivery :>> ', delivery);
          console.log('arrayRoute[fromRoute] - 2 :>> ', elementArrayRoute);

          // handle feeCODToRoute (no cuoc ve)
          if (delivery.paymentType == 'debt') {
            elementArrayRoute.feeCODToRoute += costDelivery ?? 0;
          }

          // handle homeDeliveryToRoute (GTN ve)
          elementArrayRoute.homeDeliveryToRoute += homeDeliveryCost ?? 0;

          // handle surchargeFromRoute(phu phi ve)
          elementArrayRoute.surchargeFromRoute += collectForCustomerCostToRoute ?? 0;
        }

        // get list money delivery with route is fromRoute in one day
        const listMoneyDeliveriesFromRoute: IMoneyDelivery[] = await MoneyDelivery.find({
          fromRoute: route._id,
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        }).lean();

        // handle listMoneyDeliveriesFromRoute
        for (const moneyDelivery of listMoneyDeliveriesFromRoute) {
          const toRoute: any = moneyDelivery.toRoute.toString();

          const elementArrayRoute = handleArrayRoute(toRoute, toRoute);

          const moneyDeliveryCostFromRoute = moneyDelivery.sendMoneyAmount ?? 0;

          console.log('listMoneyDeliveriesFromRoute - delivery :>> ', moneyDelivery);
          console.log('arrayRoute[toRoute] - 3 :>> ', elementArrayRoute);

          // handle field costFromRoute (tien cuoc di)
          elementArrayRoute.costFromRoute += moneyDeliveryCostFromRoute ?? 0;
        }

        // get list money delivery with route is toRoute in one day
        const listMoneyDeliveriesToRoute: IMoneyDelivery[] = await MoneyDelivery.find({
          toRoute: route._id,
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        }).lean();

        // handle listMoneyDeliveriesToRoute
        for (const moneyDelivery of listMoneyDeliveriesToRoute) {
          const fromRoute: any = moneyDelivery.fromRoute.toString();
          const elementArrayRoute = handleArrayRoute(fromRoute, fromRoute);

          const moneyDeliveryCostToRoute = moneyDelivery.sendMoneyAmount ?? 0;

          console.log('listMoneyDeliveriesToRoute - delivery :>> ', moneyDelivery);
          console.log('arrayRoute[fromRoute] - 4 :>> ', elementArrayRoute);

          // handle field costToRoute (tien cuoc ve)
          elementArrayRoute.costToRoute += moneyDeliveryCostToRoute ?? 0;
        }

        listInsertDebt.push(...(Object.values(arrayRoute).filter(Boolean) as IDebtRow[]));
      }

      console.log('listInsertDebt:>> ', listInsertDebt);

      // insert to debt collection
      await Promise.all(
        listInsertDebt.map(async itemDebt => {
          const debtData = new Debt(itemDebt);
          return await debtData.save({ session: session });
        })
      );

      //close transaction
      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Calculate debt failed');
    }
  }

  async getListPaymentDebtMangement(req: any): Promise<any> {
    const { startDate, endDate, fromRouteId, keySort, typeSort, key } = req.query;

    const start = new Date(String(startDate));
    const end = new Date(String(endDate));
    const endExclusive = new Date(end.getTime() + 1);

    const fromId = new Types.ObjectId(String(fromRouteId));

    const query = {
      fromRoute: fromId,
      type: DEBT_MANAGEMENT_TYPE.PAYMENT,
      cashDate: {
        $gte: start,
        $lte: endExclusive,
      },
    };

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
          sort = { toRoute: typeSort };
          break;
        default:
          sort = { toRoute: 1, createdAt: 1 };
          break;
      }
    } else {
      sort = { toRoute: 1, createdAt: 1 };
    }

    try {
      if (key) {
        Object.assign(query, {
          $or: [
            {
              content: { $regex: `${key}`, $options: 'i' },
            },
          ],
        });
      }

      const result = await DebtManagement.find(query)
        .select({
          _id: 1,
          fromRoute: 1,
          toRoute: 1,
          content: 1,
          type: 1,
          cash: 1,
          cashDate: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort(sort)
        .populate([
          {
            path: 'fromRoute',
            select: {
              _id: 1,
              name: 1,
            },
          },
          {
            path: 'toRoute',
            select: {
              _id: 1,
              name: 1,
            },
          },
        ])
        .lean();

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list debt management failed');
    }
  }
}
