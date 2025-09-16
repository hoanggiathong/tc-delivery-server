import { Debt } from '@/models/debt.model';
import { Delivery, IDelivery } from '@/models/delivery.model';
import { IMoneyDelivery, MoneyDelivery } from '@/models/money-delivery.model';
import { IRoute, Route } from '@/models/route.model';
import { IDebtRow } from '@/types/debt.type';
import mongoose from 'mongoose';

export class TestService {
  async cronjobCalculateDebt(): Promise<void> {
    let session = await mongoose.startSession();
    session.startTransaction();

    try {
      let listInsertDebt: IDebtRow[] = [];

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
      const listRoute: IRoute[] = await Route.find({}).lean();

      //example first element: sa dec
      for (const route of listRoute) {
        // other route: can tho, tphcm
        let arrayRoute: any = {};

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
          arrayRoute[toRoute] = {
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

          let totalCost = delivery.totalCost ?? 0;

          // handle feeCODFromRoute
          if (delivery.paymentType == 'debt') {
            // field feeCODFromRoute
            let totalFeeCODFromRoute = arrayRoute[toRoute]?.totalCost + totalCost;

            arrayRoute[toRoute] = {
              feeCODFromRoute: totalFeeCODFromRoute,
            };
          } else {
            // handle field costFromRoute
            let totalCostFromRoute = arrayRoute[toRoute]?.totalCost + totalCost;

            arrayRoute[toRoute] = {
              costFromRoute: totalCostFromRoute,
            };
          }

          let totalHomeDeliveryFromRoute =
            arrayRoute[toRoute]?.homeDeliveryFromRoute + delivery.homeDeliveryCost;

          arrayRoute[toRoute] = {
            homeDeliveryFromRoute: totalHomeDeliveryFromRoute,
          };
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
          const fromRoute: any = delivery.fromRoute.toString();

          let totalCost = delivery.totalCost ?? 0;

          // handle feeCODToRoute
          if (delivery.paymentType == 'debt') {
            // field feeCODToRoute
            let totalFeeCODToRoute = arrayRoute[fromRoute]?.totalCost + totalCost;

            arrayRoute[fromRoute] = {
              feeCODToRoute: totalFeeCODToRoute,
            };
          } else {
            // handle field costToRoute
            let totalCostToRoute = arrayRoute[fromRoute]?.totalCost + totalCost;

            arrayRoute[fromRoute] = {
              costToRoute: totalCostToRoute,
            };
          }

          let totalHomeDeliveryToRoute =
            arrayRoute[fromRoute]?.homeDeliveryToRoute + delivery.homeDeliveryCost;

          arrayRoute[fromRoute] = {
            homeDeliveryToRoute: totalHomeDeliveryToRoute,
          };
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

          // handle field costFromRoute
          let totalCostFromRoute = arrayRoute[toRoute]?.totalCost + moneyDelivery.totalCost;

          arrayRoute[toRoute] = {
            costFromRoute: totalCostFromRoute,
          };
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

          // handle field costToRoute
          let totalCostToRoute = arrayRoute[fromRoute]?.totalCost + moneyDelivery.totalCost;

          arrayRoute[fromRoute] = {
            costToRoute: totalCostToRoute,
          };
        }

        listInsertDebt.push(...(Object.values(arrayRoute).filter(Boolean) as IDebtRow[]));
      }

      // insert to debt collection
      listInsertDebt.forEach(async itemDebt => {
        const debtData = new Debt(itemDebt);
        return await debtData.save({ session: session });
      });

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
}
