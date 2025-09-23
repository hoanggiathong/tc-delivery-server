import { Debt } from '@/models/debt.model';
import { Delivery, IDelivery } from '@/models/delivery.model';
import { IMoneyDelivery, MoneyDelivery } from '@/models/money-delivery.model';
import { IRoute, Route } from '@/models/route.model';
import { IDebtRow } from '@/types/debt.type';
import mongoose from 'mongoose';

export class CronjobService {
  async cronjobCalculateDebt(): Promise<void> {
    let listInsertDebt: IDebtRow[] = [];

    // Set today's date range (from start of day to end of day)
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
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
      let arrayRoute: any = {};

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

      for (const toRoute of listToRoute) {
        handleArrayRoute(toRoute._id.toString(), toRoute._id);
      }
      // listToRoute.map(async toRoute => {
      //   await handleArrayRoute(toRoute._id.toString(), toRoute._id);
      // });

      console.log('arrayRoute :>> ', arrayRoute);

      // get list delivery with route is fromRoute in one day
      const listDeliveryFromRoute: IDelivery[] = await Delivery.find({
        fromRoute: route._id,
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        },
      }).lean();

      // handle listDeliveryFromRoute
      for (const delivery of listDeliveryFromRoute) {
        const toRoute: any = delivery.toRoute.toString();

        // object from route with information about debt
        const elementArrayRoute = handleArrayRoute(toRoute, toRoute);

        let costDeliveryFromRoute = delivery.cost ?? 0;
        let homeDeliveryCostFromRoute = delivery.homeDeliveryCost ?? 0;
        let collectForCustomerCostFromRoute = delivery.collectForCustomerCost ?? 0;

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

        let costDelivery = delivery.cost ?? 0;
        let homeDeliveryCost = delivery.homeDeliveryCost ?? 0;
        let collectForCustomerCostToRoute = delivery.collectForCustomerCost ?? 0;

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

        let moneyDeliveryCostFromRoute = moneyDelivery.sendMoneyAmount ?? 0;

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

        let moneyDeliveryCostToRoute = moneyDelivery.sendMoneyAmount ?? 0;

        // handle field costToRoute (tien cuoc ve)
        elementArrayRoute.costToRoute += moneyDeliveryCostToRoute ?? 0;
      }

      listInsertDebt.push(...(Object.values(arrayRoute).filter(Boolean) as IDebtRow[]));
    }

    console.log('listInsertDebt:>> ', listInsertDebt);

    const ops: any[] = [];
    // insert to debt collection
    for (const item of listInsertDebt) {
      // check fromRoute and toRoute are not the same
      if (item.fromRoute.toString() !== item.toRoute.toString()) {
        const lastDebt = await Debt.findOne({
          fromRoute: item.fromRoute,
          toRoute: item.toRoute,
        })
          .sort({ createdAt: -1, _id: -1 })
          .lean();

        if (lastDebt) {
          if (lastDebt.totalDebt === 0) {
            item.openingBalance = 0;
          } else {
            item.openingBalance = lastDebt.totalDebt;
          }
        } else {
          item.openingBalance = 0;
        }

        // handle two field: accountPayable and receivable
        if (item.openingBalance == 0) {
          item.accountPayable = 0;
          item.receivable = 0;
        } else if (item.openingBalance > 0) {
          item.accountPayable = +item.openingBalance;
        } else if (item.openingBalance < 0) {
          item.receivable = +item.openingBalance;
        }

        // calculate totalDebt
        if (lastDebt) {
          item.totalDebt =
            item.costFromRoute +
            item.feeCODToRoute +
            item.homeDeliveryFromRoute -
            (item.costToRoute + item.feeCODFromRoute + item.homeDeliveryToRoute) +
            lastDebt.paymentDebt;
        } else {
          item.totalDebt =
            item.costFromRoute +
            item.feeCODToRoute +
            item.homeDeliveryFromRoute -
            (item.costToRoute + item.feeCODFromRoute + item.homeDeliveryToRoute);
        }

        ops.push({ insertOne: { document: item } });
      }
    }

    let session = await mongoose.startSession();
    try {
      await session.withTransaction(
        async () => {
          if (ops.length) {
            await Debt.bulkWrite(ops, { session, ordered: false });
          }
        },
        {
          readPreference: 'primary',
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
        }
      );
    } finally {
      await session.endSession();
    }
  }
}
