import { Debt } from '@/models/debt.model';
import { Delivery, IDelivery } from '@/models/delivery.model';
import { IMoneyDelivery, MoneyDelivery, MoneyDeliveryType } from '@/models/money-delivery.model';
import { IRoute, Route } from '@/models/route.model';
import { IDebtRow } from '@/types/debt.type';
import mongoose from 'mongoose';

/** Vietnam timezone: UTC+7. Cron runs at 00:00 VN = 17:00 UTC previous day. */
const VN_UTC_OFFSET_HOURS = 7;

/** Get current calendar date (year, month, date) in Vietnam timezone. */
function getTodayVn(): { year: number; month: number; date: number } {
  const now = new Date();
  const vnMs = now.getTime() + VN_UTC_OFFSET_HOURS * 60 * 60 * 1000;
  const vnDate = new Date(vnMs);
  return {
    year: vnDate.getUTCFullYear(),
    month: vnDate.getUTCMonth(),
    date: vnDate.getUTCDate(),
  };
}

/**
 * For a VN calendar day (year, month, date), return the UTC dateDebt value.
 * Data for VN day D has dateDebt = 17:00:00 UTC on the previous UTC day (start of D in VN = 00:00 VN = 17:00 UTC D-1).
 */
function vnDateToDebtDateUtc(year: number, month: number, date: number): Date {
  return new Date(Date.UTC(year, month, date - 1, 17, 0, 0, 0));
}

/**
 * Khoảng cả ngày UTC cho dateDebt: từ 17:00 (D-1) đến 16:59:59.999 D UTC.
 * Tránh lệch so khớp do timezone/millisecond; query theo đầu ngày – cuối ngày.
 */
function dateDebtQueryRange(dateDebt: Date): { $gte: Date; $lte: Date } {
  const startMs = dateDebt.getTime();
  const endMs = startMs + 24 * 60 * 60 * 1000 - 1;
  return {
    $gte: new Date(startMs),
    $lte: new Date(endMs),
  };
}

/**
 * For a VN calendar day, return UTC range [start, end] for querying deliveries (createdAt).
 * VN day D: from 00:00 D VN to 23:59:59.999 D VN = 17:00 (D-1) UTC to 16:59:59.999 D UTC.
 */
function vnDateToUtcRange(year: number, month: number, date: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month, date - 1, 17, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, date, 16, 59, 59, 999));
  return { start, end };
}

/** Subtract one calendar day in VN (year, month, date). */
function vnDatePrev(
  year: number,
  month: number,
  date: number
): { year: number; month: number; date: number } {
  const d = new Date(Date.UTC(year, month, date));
  d.setUTCDate(d.getUTCDate() - 1);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    date: d.getUTCDate(),
  };
}

export class CronjobService {
  /**
   * Cron runs at 00:00 VN (e.g. 00:00 02-Feb-2026 VN = 17:00 01-Feb-2026 UTC).
   * - New day = current VN date (02-Feb VN), old day = previous VN date (01-Feb VN).
   * - If no debt for old day: first run → create old day + new day.
   * - If debt exists for old day: daily run → update old day + create new day.
   * @param runAsOfVnDate - Optional. Run as if "today VN" is this date. Convention: year, month 0-based (0=Jan, 11=Dec), date 1-31. Same as getTodayVn().
   */
  async cronjobCalculateDebt(
    useTransaction: boolean = true,
    runAsOfVnDate?: { year: number; month: number; date: number }
  ): Promise<void> {
    const newDayVn = runAsOfVnDate ?? getTodayVn();
    const oldDayVn = vnDatePrev(newDayVn.year, newDayVn.month, newDayVn.date);

    const oldDayDebtDate = vnDateToDebtDateUtc(oldDayVn.year, oldDayVn.month, oldDayVn.date);
    const newDayDebtDate = vnDateToDebtDateUtc(newDayVn.year, newDayVn.month, newDayVn.date);

    console.log('oldDayDebtDate', oldDayDebtDate);
    console.log('newDayDebtDate', newDayDebtDate);
    console.log('oldDayVn', oldDayVn);
    console.log('newDayVn', newDayVn);

    const dateDebtFilter = dateDebtQueryRange(oldDayDebtDate);
    const count = await Debt.countDocuments({
      dateDebt: dateDebtFilter,
    });

    if (count === 0) {
      await this.cronjobFirstCalculateDebt(
        oldDayVn,
        newDayVn,
        oldDayDebtDate,
        newDayDebtDate,
        useTransaction
      );
    } else {
      await this.cronjobCalculateDebtEveryDay(
        oldDayVn,
        newDayVn,
        oldDayDebtDate,
        newDayDebtDate,
        useTransaction
      );
    }
  }

  /**
   * First run: no debt for old day. Step 1: create debt for old day (VN). Step 2: create debt for new day (VN) with openingBalance from old day.
   * oldDayDebtDate/newDayDebtDate are pre-computed in cronjobCalculateDebt (no date - 1 again here).
   * @param useTransaction - Default true. Set false for tests (standalone MongoDB).
   */
  async cronjobFirstCalculateDebt(
    oldDayVn: { year: number; month: number; date: number },
    newDayVn: { year: number; month: number; date: number },
    oldDayDebtDate: Date,
    newDayDebtDate: Date,
    useTransaction: boolean = true
  ): Promise<void> {
    console.log('cronjobFirstCalculateDebt');
    const oldRange = vnDateToUtcRange(oldDayVn.year, oldDayVn.month, oldDayVn.date);

    console.log('oldRange', oldRange);

    const listFromRoute: IRoute[] = await Route.find({}).lean();

    /** Map key: "fromRouteId_toRouteId" -> debt row (fromRoute -> toRoute). Used so "deliveries TO route" add to row (sender -> route), not (route -> sender). */
    const debtByPair: Record<string, IDebtRow> = {};

    const getOrCreateRow = (
      fromRouteId: mongoose.Types.ObjectId,
      toRouteId: mongoose.Types.ObjectId
    ): IDebtRow => {
      const key = `${fromRouteId.toString()}_${toRouteId.toString()}`;
      if (!debtByPair[key]) {
        debtByPair[key] = {
          id: new mongoose.Types.ObjectId(),
          fromRoute: fromRouteId as unknown as any,
          toRoute: toRouteId as unknown as any,
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
          dateDebt: new Date(oldDayDebtDate.getTime()),
        };
      }
      return debtByPair[key];
    };

    // Pre-create all (from, to) pairs so every row exists for aggregation
    for (const fromRoute of listFromRoute) {
      for (const toRoute of listFromRoute) {
        const fromId = new mongoose.Types.ObjectId(String(fromRoute._id));
        const toId = new mongoose.Types.ObjectId(String(toRoute._id));
        if (fromId.toString() !== toId.toString()) {
          getOrCreateRow(fromId, toId);
        }
      }
    }

    for (const route of listFromRoute) {
      const routeId = new mongoose.Types.ObjectId(String(route._id));

      // Deliveries FROM route -> add to row (route -> delivery.toRoute)
      const listDeliveryFromRoute: IDelivery[] = await Delivery.find({
        fromRoute: route._id,
        createdAt: { $gte: oldRange.start, $lte: oldRange.end },
      }).lean();

      for (const delivery of listDeliveryFromRoute) {
        const toRouteId =
          delivery.toRoute instanceof mongoose.Types.ObjectId
            ? delivery.toRoute
            : new mongoose.Types.ObjectId(String(delivery.toRoute));
        const row = getOrCreateRow(routeId, toRouteId);
        const itemCost = delivery.itemCost ?? 0;
        const costDelivery = delivery.cost ? delivery.cost + itemCost : 0;
        const homeDeliveryCost = delivery.homeDeliveryCost ?? 0;
        const collectForCustomerCost = delivery.collectForCustomerCost ?? 0;

        if (delivery.paymentType === 'debt') {
          row.feeCODToRoute += costDelivery ?? 0;
        }
        if (delivery.paymentType === 'paid') {
          row.homeDeliveryToRoute += homeDeliveryCost ?? 0;
          row.surchargeToRoute += collectForCustomerCost ?? 0;
        }
      }

      // Deliveries TO route -> add feeCODToRoute to ROW NGƯỢC (route -> fromRoute) để 1 trạm chỉ có feeCODToRoute, trạm kia chỉ có feeCODFromRoute
      const listDeliveriesToRoute: IDelivery[] = await Delivery.find({
        toRoute: route._id,
        createdAt: { $gte: oldRange.start, $lte: oldRange.end },
      }).lean();

      for (const delivery of listDeliveriesToRoute) {
        const fromRouteId =
          delivery.fromRoute instanceof mongoose.Types.ObjectId
            ? delivery.fromRoute
            : new mongoose.Types.ObjectId(String(delivery.fromRoute));
        const row = getOrCreateRow(routeId, fromRouteId);
        const itemCost = delivery.itemCost ?? 0;
        const costDelivery = delivery.cost ? delivery.cost + itemCost : 0;
        const homeDeliveryCost = delivery.homeDeliveryCost ?? 0;
        const collectForCustomerCost = delivery.collectForCustomerCost ?? 0;

        if (delivery.paymentType === 'debt') {
          row.feeCODFromRoute += costDelivery ?? 0;
        }
        if (delivery.paymentType === 'paid') {
          row.homeDeliveryFromRoute += homeDeliveryCost ?? 0;
          row.surchargeFromRoute += collectForCustomerCost ?? 0;
        }
      }

      // Money FROM route -> add to row (route -> moneyDelivery.toRoute)
      const listMoneyDeliveriesFromRoute: IMoneyDelivery[] = await MoneyDelivery.find({
        fromRoute: route._id,
        createdAt: { $gte: oldRange.start, $lte: oldRange.end },
      }).lean();

      for (const moneyDelivery of listMoneyDeliveriesFromRoute) {
        const toRouteId =
          moneyDelivery.toRoute instanceof mongoose.Types.ObjectId
            ? moneyDelivery.toRoute
            : new mongoose.Types.ObjectId(String(moneyDelivery.toRoute));
        const row = getOrCreateRow(routeId, toRouteId);
        if (moneyDelivery.type === MoneyDeliveryType.NORMAL) {
          row.costToRoute += moneyDelivery.sendMoneyAmount ?? 0;
        }
      }

      // Money TO route -> add costToRoute to ROW NGƯỢC (route -> fromRoute)
      const listMoneyDeliveriesToRoute: IMoneyDelivery[] = await MoneyDelivery.find({
        toRoute: route._id,
        createdAt: { $gte: oldRange.start, $lte: oldRange.end },
      }).lean();

      for (const moneyDelivery of listMoneyDeliveriesToRoute) {
        const fromRouteId =
          moneyDelivery.fromRoute instanceof mongoose.Types.ObjectId
            ? moneyDelivery.fromRoute
            : new mongoose.Types.ObjectId(String(moneyDelivery.fromRoute));
        const row = getOrCreateRow(routeId, fromRouteId);
        row.costFromRoute += moneyDelivery.sendMoneyAmount ?? 0;
      }
    }

    const listInsertDebt = Object.values(debtByPair);

    const ops: mongoose.AnyBulkWriteOperation<IDebtRow>[] = [];

    for (const item of listInsertDebt) {
      if (item.fromRoute.toString() !== item.toRoute.toString()) {
        item.totalDebt =
          item.costFromRoute +
          item.feeCODToRoute +
          item.homeDeliveryFromRoute +
          item.surchargeFromRoute +
          item.receivable -
          (item.costToRoute +
            item.feeCODFromRoute +
            item.homeDeliveryToRoute +
            item.surchargeToRoute +
            item.accountPayable);

        ops.push({ insertOne: { document: item } });

        const newDayDebt: IDebtRow = {
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
          dateDebt: new Date(newDayDebtDate.getTime()),
          openingBalance: 0,
        };

        newDayDebt.openingBalance = item.totalDebt === 0 ? 0 : item.totalDebt;

        const newReceivable =
          item.costFromRoute +
          item.feeCODToRoute +
          item.homeDeliveryFromRoute +
          item.surchargeFromRoute +
          item.receivable;
        const newAccountPayable =
          item.costToRoute +
          item.feeCODFromRoute +
          item.homeDeliveryToRoute +
          item.surchargeToRoute +
          item.accountPayable;

        newDayDebt.accountPayable = Math.abs(newAccountPayable);
        newDayDebt.receivable = Math.abs(newReceivable);

        if (newDayDebt.openingBalance > 0) {
          newDayDebt.accountPayable = newAccountPayable + newDayDebt.openingBalance;
        } else if (newDayDebt.openingBalance < 0) {
          newDayDebt.receivable = newReceivable + Math.abs(newDayDebt.openingBalance);
        }

        newDayDebt.totalDebt =
          newDayDebt.receivable -
          newDayDebt.accountPayable +
          (newDayDebt.openingBalance ?? 0) +
          (item.openingBalance ?? 0);

        ops.push({ insertOne: { document: newDayDebt } });
      }
    }

    if (useTransaction) {
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
    } else {
      if (ops.length) {
        await Debt.bulkWrite(ops, { ordered: false });
      }
    }
  }

  /**
   * Daily run: debt for old day exists. Step 1: update debt for old day (VN). Step 2: create debt for new day (VN) with openingBalance from old day.
   * oldDayDebtDate/newDayDebtDate are pre-computed in cronjobCalculateDebt (no date - 1 again here).
   * @param useTransaction - Default true. Set false for tests (standalone MongoDB).
   */
  async cronjobCalculateDebtEveryDay(
    oldDayVn: { year: number; month: number; date: number },
    newDayVn: { year: number; month: number; date: number },
    oldDayDebtDate: Date,
    newDayDebtDate: Date,
    useTransaction: boolean = true
  ): Promise<void> {
    console.log('cronjobCalculateDebtEveryDay');
    const oldRange = vnDateToUtcRange(oldDayVn.year, oldDayVn.month, oldDayVn.date);

    console.log('oldRange', oldRange);

    const listDebt = await Debt.find({
      dateDebt: dateDebtQueryRange(oldDayDebtDate),
    });

    const ops: mongoose.AnyBulkWriteOperation<IDebtRow>[] = [];

    for (const debt of listDebt) {
      const fromRoute = debt.fromRoute;
      const toRoute = debt.toRoute;

      debt.costFromRoute = 0;
      debt.feeCODToRoute = 0;
      debt.costToRoute = 0;
      debt.feeCODFromRoute = 0;
      debt.homeDeliveryFromRoute = 0;
      debt.homeDeliveryToRoute = 0;
      debt.surchargeToRoute = 0;
      debt.surchargeFromRoute = 0;

      // Phía "đi": deliveries (fromRoute -> toRoute) -> feeCODFromRoute, homeDeliveryFromRoute, surchargeFromRoute
      const listDeliveryFromRoute: IDelivery[] = await Delivery.find({
        fromRoute,
        toRoute,
        createdAt: { $gte: oldRange.start, $lte: oldRange.end },
      }).lean();

      for (const delivery of listDeliveryFromRoute) {
        const itemCost = delivery.itemCost ?? 0;
        const costDelivery = delivery.cost ? delivery.cost + itemCost : 0;
        const homeDeliveryCost = delivery.homeDeliveryCost ?? 0;
        const collectForCustomerCost = delivery.collectForCustomerCost ?? 0;

        if (delivery.paymentType === 'debt') {
          debt.feeCODToRoute += costDelivery ?? 0;
        }
        if (delivery.paymentType === 'paid') {
          debt.homeDeliveryToRoute += homeDeliveryCost ?? 0;
          debt.surchargeToRoute += collectForCustomerCost ?? 0;
        }
      }

      // Phía "về": chỉ row (toRoute -> fromRoute) mới nhận feeCODToRoute; cùng 1 đơn thì 1 trạm feeCODFromRoute, trạm kia feeCODToRoute (dùng thứ tự ObjectId để mỗi cặp chỉ 1 row nhận feeCODToRoute)
      const isReceiverRow = fromRoute.toString() > toRoute.toString();
      if (isReceiverRow) {
        const listDeliveriesToRoute: IDelivery[] = await Delivery.find({
          fromRoute: toRoute,
          toRoute: fromRoute,
          createdAt: { $gte: oldRange.start, $lte: oldRange.end },
        }).lean();

        for (const delivery of listDeliveriesToRoute) {
          const itemCost = delivery.itemCost ?? 0;
          const costDelivery = delivery.cost ? delivery.cost + itemCost : 0;
          const homeDeliveryCost = delivery.homeDeliveryCost ?? 0;
          const collectForCustomerCost = delivery.collectForCustomerCost ?? 0;

          if (delivery.paymentType === 'debt') {
            debt.feeCODFromRoute += costDelivery ?? 0;
          }

          //đã thu cước thì mới tính GTN vs phụ phí
          if (delivery.paymentType === 'paid') {
            debt.homeDeliveryFromRoute += homeDeliveryCost ?? 0;
            debt.surchargeFromRoute += collectForCustomerCost ?? 0;
          }
        }

        const listMoneyDeliveriesToRoute: IMoneyDelivery[] = await MoneyDelivery.find({
          fromRoute: toRoute,
          toRoute: fromRoute,
          createdAt: { $gte: oldRange.start, $lte: oldRange.end },
        }).lean();

        for (const moneyDelivery of listMoneyDeliveriesToRoute) {
          debt.costFromRoute += moneyDelivery.sendMoneyAmount ?? 0;
        }
      }

      // Money costFromRoute: chỉ từ (fromRoute -> toRoute)
      const listMoneyDeliveriesFromRoute: IMoneyDelivery[] = await MoneyDelivery.find({
        fromRoute,
        toRoute,
        createdAt: { $gte: oldRange.start, $lte: oldRange.end },
      }).lean();

      for (const moneyDelivery of listMoneyDeliveriesFromRoute) {
        if (moneyDelivery.type === MoneyDeliveryType.NORMAL) {
          debt.costToRoute += moneyDelivery.sendMoneyAmount ?? 0;
        }
      }

      debt.totalDebt =
        debt.costFromRoute +
        debt.feeCODToRoute +
        debt.homeDeliveryFromRoute +
        debt.surchargeFromRoute +
        debt.receivable -
        (debt.costToRoute +
          debt.feeCODFromRoute +
          debt.homeDeliveryToRoute +
          debt.surchargeToRoute +
          debt.accountPayable) +
        (debt.openingBalance ?? 0);

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

      const openingBalance = debt.totalDebt ?? 0;
      const newReceivable =
        debt.receivable +
        debt.costFromRoute +
        debt.feeCODToRoute +
        debt.homeDeliveryFromRoute +
        debt.surchargeFromRoute;
      const newAccountPayable =
        debt.accountPayable +
        debt.costToRoute +
        debt.feeCODFromRoute +
        debt.homeDeliveryToRoute +
        debt.surchargeToRoute;

      let accountPayable = Math.abs(newAccountPayable);
      let receivable = Math.abs(newReceivable);

      if (openingBalance > 0) {
        accountPayable = newAccountPayable + openingBalance;
      } else if (openingBalance < 0) {
        receivable = newReceivable + Math.abs(openingBalance);
      }

      const totalDebt =
        receivable - accountPayable + (openingBalance ?? 0) + (debt.openingBalance ?? 0);

      const newDayDebt: IDebtRow = {
        id: new mongoose.Types.ObjectId(),
        fromRoute: fromRoute as unknown as any,
        toRoute: toRoute as unknown as any,
        openingBalance,
        costFromRoute: 0,
        feeCODToRoute: 0,
        costToRoute: 0,
        feeCODFromRoute: 0,
        accountPayable,
        receivable,
        homeDeliveryFromRoute: 0,
        homeDeliveryToRoute: 0,
        surchargeToRoute: 0,
        surchargeFromRoute: 0,
        totalDebt,
        dateDebt: new Date(newDayDebtDate.getTime()),
      };

      ops.push({ insertOne: { document: newDayDebt } });
    }

    if (useTransaction) {
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
    } else {
      if (ops.length) {
        await Debt.bulkWrite(ops, { ordered: false });
      }
    }
  }
}
