import { Debt } from '@/models/debt.model';
import { Delivery, IDelivery } from '@/models/delivery.model';
import { IMoneyDelivery, MoneyDelivery } from '@/models/money-delivery.model';
import { IRoute, Route } from '@/models/route.model';
import { IDebtRow } from '@/types/debt.type';
import mongoose from 'mongoose';

export class CronjobService {
  async cronjobCalculateDebt(): Promise<void> {
    // Set yesterday's date range (from start of day to end of day)
    // Calculate yesterday: current date minus 1 day
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startDate = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      0,
      0,
      0,
      0
    );

    const endDate = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      23,
      59,
      59,
      999
    );

    // Check if debt table has data for yesterday
    const count = await Debt.countDocuments({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    if (count === 0) {
      await this.cronjobFirstCalculateDebt(startDate, endDate);
    } else {
      await this.cronjobCalculateDebtEveryDay(startDate, endDate);
    }
  }

  async cronjobFirstCalculateDebt(startDate: Date, endDate: Date): Promise<void> {
    const listInsertDebt: IDebtRow[] = [];
    //get list route
    const listFromRoute: IRoute[] = await Route.find({}).lean();

    //example first element: sa dec
    for (const route of listFromRoute) {
      // other route: can tho, tphcm
      const arrayRoute: Record<string, IDebtRow> = {};

      // handle array route with toRoute as key
      const handleArrayRoute = (key: string, toRoute: any) => {
        if (!arrayRoute[key]) {
          arrayRoute[key] = {
            id: new mongoose.Types.ObjectId(),
            fromRoute: route._id as unknown as any,
            toRoute: toRoute as unknown as any,
            openingBalance: 0,
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
            dateDebt: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
          };
        }
        return arrayRoute[key];
      };

      // get list toRoute except route
      const listToRoute: IRoute[] = await Route.find({
        _id: { $ne: route._id },
      }).lean();

      for (const toRoute of listToRoute) {
        handleArrayRoute(toRoute._id.toString(), toRoute._id);
      }

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
        const toRoute: string = delivery.toRoute.toString();

        // object from route with information about debt
        const elementArrayRoute = handleArrayRoute(toRoute, toRoute);
        const itemCost = delivery.itemCost ?? 0;

        const costDeliveryFromRoute = delivery.cost ? delivery.cost + itemCost : 0;
        const homeDeliveryCostFromRoute = delivery.homeDeliveryCost ?? 0;
        const collectForCustomerCostFromRoute = delivery.collectForCustomerCost ?? 0;

        // handle feeCODFromRoute (no cuoc di)
        if (delivery.paymentType === 'debt') {
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

      // handle listDeliveriesToRoute
      for (const delivery of listDeliveriesToRoute) {
        const fromRoute: string = delivery.fromRoute.toString();

        const elementArrayRoute = handleArrayRoute(fromRoute, fromRoute);
        const itemCost = delivery.itemCost ?? 0;

        const costDelivery = delivery.cost ? delivery.cost + itemCost : 0;
        const homeDeliveryCost = delivery.homeDeliveryCost ?? 0;
        const collectForCustomerCostToRoute = delivery.collectForCustomerCost ?? 0;

        // handle feeCODToRoute (no cuoc ve)
        if (delivery.paymentType === 'debt') {
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
        const toRoute: string = moneyDelivery.toRoute.toString();

        const elementArrayRoute = handleArrayRoute(toRoute, toRoute);

        const moneyDeliveryCostFromRoute = moneyDelivery.sendMoneyAmount ?? 0;

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
        const fromRoute: string = moneyDelivery.fromRoute.toString();
        const elementArrayRoute = handleArrayRoute(fromRoute, fromRoute);

        const moneyDeliveryCostToRoute = moneyDelivery.sendMoneyAmount ?? 0;

        // handle field costToRoute (tien cuoc ve)
        elementArrayRoute.costToRoute += moneyDeliveryCostToRoute ?? 0;
      }

      listInsertDebt.push(...(Object.values(arrayRoute).filter(Boolean) as IDebtRow[]));
    }

    const ops: mongoose.AnyBulkWriteOperation<IDebtRow>[] = [];
    // insert to debt collection
    for (const item of listInsertDebt) {
      // check fromRoute and toRoute are not the same
      if (item.fromRoute.toString() !== item.toRoute.toString()) {
        // calculate totalDebt
        item.totalDebt =
          item.costFromRoute +
          item.feeCODToRoute +
          item.homeDeliveryFromRoute -
          (item.costToRoute + item.feeCODFromRoute + item.homeDeliveryToRoute);

        ops.push({ insertOne: { document: item } });

        // Logic for today debt
        const today = new Date();
        const todayDebt: IDebtRow = {
          id: new mongoose.Types.ObjectId(),
          fromRoute: item.fromRoute as unknown as any,
          toRoute: item.toRoute as unknown as any,
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
          dateDebt: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          openingBalance: 0,
        };

        if (item.totalDebt === 0) {
          todayDebt.openingBalance = 0;
        } else {
          todayDebt.openingBalance = item.totalDebt;
        }

        if (todayDebt.openingBalance > 0) {
          todayDebt.accountPayable = todayDebt.openingBalance;
        } else if (todayDebt.openingBalance < 0) {
          todayDebt.receivable = todayDebt.openingBalance;
        }

        todayDebt.totalDebt =
          todayDebt.costFromRoute +
          todayDebt.feeCODToRoute +
          todayDebt.homeDeliveryFromRoute -
          (todayDebt.costToRoute + todayDebt.feeCODFromRoute + todayDebt.homeDeliveryToRoute);

        ops.push({ insertOne: { document: todayDebt } });
      }
    }

    const session = await mongoose.startSession();
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

  async cronjobCalculateDebtEveryDay(startDate: Date, endDate: Date): Promise<void> {
    const today = new Date();
    const yesterdayDateOnly = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );

    const listDebt = await Debt.find({
      dateDebt: yesterdayDateOnly,
    });

    const ops: mongoose.AnyBulkWriteOperation<IDebtRow>[] = [];

    for (const debt of listDebt) {
      const fromRoute = debt.fromRoute;
      const toRoute = debt.toRoute;

      // reset fields
      debt.costFromRoute = 0;
      debt.feeCODToRoute = 0;
      debt.costToRoute = 0;
      debt.feeCODFromRoute = 0;
      debt.homeDeliveryFromRoute = 0;
      debt.homeDeliveryToRoute = 0;
      debt.surchargeToRoute = 0;
      debt.surchargeFromRoute = 0;

      // 1. Get deliveries (From -> To)
      const listDeliveryFromRoute: IDelivery[] = await Delivery.find({
        fromRoute: fromRoute,
        toRoute: toRoute,
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        },
      }).lean();

      for (const delivery of listDeliveryFromRoute) {
        const itemCost = delivery.itemCost ?? 0;
        const costDeliveryFromRoute = delivery.cost ? delivery.cost + itemCost : 0;
        const homeDeliveryCostFromRoute = delivery.homeDeliveryCost ?? 0;
        const collectForCustomerCostFromRoute = delivery.collectForCustomerCost ?? 0;

        if (delivery.paymentType === 'debt') {
          debt.feeCODFromRoute += costDeliveryFromRoute ?? 0;
        }
        debt.homeDeliveryFromRoute += homeDeliveryCostFromRoute ?? 0;
        debt.surchargeToRoute += collectForCustomerCostFromRoute ?? 0;
      }

      // 2. Get deliveries (To -> From)
      const listDeliveriesToRoute: IDelivery[] = await Delivery.find({
        fromRoute: toRoute,
        toRoute: fromRoute,
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        },
      }).lean();

      for (const delivery of listDeliveriesToRoute) {
        const itemCost = delivery.itemCost ?? 0;
        const costDelivery = delivery.cost ? delivery.cost + itemCost : 0;
        const homeDeliveryCost = delivery.homeDeliveryCost ?? 0;
        const collectForCustomerCostToRoute = delivery.collectForCustomerCost ?? 0;

        if (delivery.paymentType === 'debt') {
          debt.feeCODToRoute += costDelivery ?? 0;
        }
        debt.homeDeliveryToRoute += homeDeliveryCost ?? 0;
        debt.surchargeFromRoute += collectForCustomerCostToRoute ?? 0;
      }

      // 3. Money Deliveries (From -> To)
      const listMoneyDeliveriesFromRoute: IMoneyDelivery[] = await MoneyDelivery.find({
        fromRoute: fromRoute,
        toRoute: toRoute,
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        },
      }).lean();

      for (const moneyDelivery of listMoneyDeliveriesFromRoute) {
        const moneyDeliveryCostFromRoute = moneyDelivery.sendMoneyAmount ?? 0;
        debt.costFromRoute += moneyDeliveryCostFromRoute ?? 0;
      }

      // 4. Money Deliveries (To -> From)
      const listMoneyDeliveriesToRoute: IMoneyDelivery[] = await MoneyDelivery.find({
        fromRoute: toRoute,
        toRoute: fromRoute,
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        },
      }).lean();

      for (const moneyDelivery of listMoneyDeliveriesToRoute) {
        const moneyDeliveryCostToRoute = moneyDelivery.sendMoneyAmount ?? 0;
        debt.costToRoute += moneyDeliveryCostToRoute ?? 0;
      }

      // Recalculate totalDebt
      debt.totalDebt =
        debt.costFromRoute +
        debt.feeCODToRoute +
        debt.homeDeliveryFromRoute -
        (debt.costToRoute + debt.feeCODFromRoute + debt.homeDeliveryToRoute);

      // Add update operation
      ops.push({
        updateOne: {
          filter: { _id: debt._id },
          update: {
            $set: {
              costFromRoute: debt.costFromRoute,
              feeCODToRoute: debt.feeCODToRoute,
              costToRoute: debt.costToRoute,
              feeCODFromRoute: debt.feeCODFromRoute,
              homeDeliveryFromRoute: debt.homeDeliveryFromRoute,
              homeDeliveryToRoute: debt.homeDeliveryToRoute,
              surchargeToRoute: debt.surchargeToRoute,
              surchargeFromRoute: debt.surchargeFromRoute,
              totalDebt: debt.totalDebt,
            },
          },
        },
      });

      // Logic for today debt
      const todayDebt: IDebtRow = {
        id: new mongoose.Types.ObjectId(),
        fromRoute: fromRoute as unknown as any,
        toRoute: toRoute as unknown as any,
        openingBalance: 0,
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
        dateDebt: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      };

      if (debt.totalDebt === 0) {
        todayDebt.openingBalance = 0;
      } else {
        todayDebt.openingBalance = debt.totalDebt;
      }

      if (todayDebt.openingBalance > 0) {
        todayDebt.accountPayable = todayDebt.openingBalance;
      } else if (todayDebt.openingBalance < 0) {
        todayDebt.receivable = todayDebt.openingBalance;
      }

      todayDebt.totalDebt =
        todayDebt.costFromRoute +
        todayDebt.feeCODToRoute +
        todayDebt.homeDeliveryFromRoute -
        (todayDebt.costToRoute + todayDebt.feeCODFromRoute + todayDebt.homeDeliveryToRoute);

      ops.push({ insertOne: { document: todayDebt } });
    }

    const session = await mongoose.startSession();
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
