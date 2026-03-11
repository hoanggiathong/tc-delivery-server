import mongoose, { Types } from 'mongoose';
import { Debt } from '@/models/debt.model';
import { Delivery } from '@/models/delivery.model';
import { MoneyDelivery, MoneyDeliveryType } from '@/models/money-delivery.model';
import { Route, IRoute } from '@/models/route.model';
import { IDebtRowDB } from '@/types/debt.type';
import { RouteType } from '@/types/route.type';

const VN_UTC_OFFSET_HOURS = 7;

type VnDate = { year: number; month: number; date: number };
type RouteRelation = 'OWNED_OWNED' | 'OWNED_PARTNER' | 'PARTNER_OWNED' | 'PARTNER_PARTNER';

function getTodayVn(): VnDate {
  const now = new Date();
  const vnMs = now.getTime() + VN_UTC_OFFSET_HOURS * 60 * 60 * 1000;
  const vnDate = new Date(vnMs);

  return {
    year: vnDate.getUTCFullYear(),
    month: vnDate.getUTCMonth(),
    date: vnDate.getUTCDate(),
  };
}

function parseVnDateISO(vnISO: string): VnDate {
  const [ys, ms, ds] = vnISO.split('-');
  const year = Number(ys);
  const month = Number(ms) - 1;
  const date = Number(ds);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(date)) {
    throw new Error(`Invalid VN date: ${vnISO}`);
  }

  return { year, month, date };
}

function vnDatePrev(year: number, month: number, date: number): VnDate {
  const d = new Date(Date.UTC(year, month, date));
  d.setUTCDate(d.getUTCDate() - 1);

  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    date: d.getUTCDate(),
  };
}

function vnDateToDebtDateUtc(year: number, month: number, date: number): Date {
  return new Date(Date.UTC(year, month, date - 1, 17, 0, 0, 0));
}

function vnDateToUtcRange(year: number, month: number, date: number) {
  const start = new Date(Date.UTC(year, month, date - 1, 17, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, date, 16, 59, 59, 999));
  return { start, end };
}

/*
function dateDebtQueryRange(dateDebt: Date) {
  const start = dateDebt.getTime();
  const end = start + 24 * 60 * 60 * 1000 - 1;

  return {
    $gte: new Date(start),
    $lte: new Date(end),
  };
}
*/

function buildRootRouteMap(routes: IRoute[]) {
  const routeMap = new Map<string, IRoute>();
  routes.forEach(r => routeMap.set(r._id.toString(), r));

  const rootMap = new Map<string, Types.ObjectId>();

  for (const r of routes) {
    let current: IRoute | undefined = r;

    while (current?.parentRouteId) {
      const parent = routeMap.get(current.parentRouteId.toString());
      if (!parent) {
        break;
      }
      current = parent;
    }

    rootMap.set(r._id.toString(), current?._id as Types.ObjectId);
  }

  return rootMap;
}

function getRootRoute(
  routeId: Types.ObjectId,
  rootRouteMap: Map<string, Types.ObjectId>
): Types.ObjectId {
  return rootRouteMap.get(routeId.toString()) ?? routeId;
}

function toObjectId(id: any): Types.ObjectId {
  if (id instanceof Types.ObjectId) {
    return id;
  }
  return new Types.ObjectId(id);
}

function getRouteRelation(from: IRoute, to: IRoute): RouteRelation {
  if (from.type === RouteType.OWNED && to.type === RouteType.OWNED) {
    return 'OWNED_OWNED';
  }
  if (from.type === RouteType.OWNED && to.type === RouteType.PARTNER) {
    return 'OWNED_PARTNER';
  }
  if (from.type === RouteType.PARTNER && to.type === RouteType.OWNED) {
    return 'PARTNER_OWNED';
  }
  return 'PARTNER_PARTNER';
}

/**
 * OWNED_OWNED:
 * - GTN/PP không khấu trừ nữa
 * - chỉ khấu trừ tiền đi/về, nợ cước đi/về, thu/chi
 *
 * Các relation còn lại:
 * - khấu trừ như partner
 */
function computeBaseTotalDebt(row: IDebtRowDB, relation: RouteRelation) {
  if (relation === 'OWNED_OWNED') {
    return (
      (row.costFromRoute ?? 0) +
      (row.feeCODToRoute ?? 0) +
      (row.receivable ?? 0) -
      ((row.costToRoute ?? 0) + (row.feeCODFromRoute ?? 0) + (row.accountPayable ?? 0)) +
      (row.openingBalance ?? 0)
    );
  }

  return (
    (row.costFromRoute ?? 0) +
    (row.feeCODToRoute ?? 0) +
    (row.homeDeliveryFromRoute ?? 0) +
    (row.surchargeFromRoute ?? 0) +
    (row.receivable ?? 0) -
    ((row.costToRoute ?? 0) +
      (row.feeCODFromRoute ?? 0) +
      (row.homeDeliveryToRoute ?? 0) +
      (row.surchargeToRoute ?? 0) +
      (row.accountPayable ?? 0)) +
    (row.openingBalance ?? 0)
  );
}

/**
 * revenueTotal =
 *   (cost + itemValue)(debt)
 * + (cost + itemValue)(paid)
 * + homeDeliveryCost(paid)
 * + collectForCustomerCost(paid)
 * + sendCost(normal)
 * + sendCost(collect)
 */
function finalizeRevenue(row: IDebtRowDB) {
  const revDebtAmount = (row as any).revDebtAmount ?? 0;
  const revPaidAmount = (row as any).revPaidAmount ?? 0;
  const revNormalSendCost = (row as any).revNormalSendCost ?? 0;
  const revCollectSendCost = (row as any).revCollectSendCost ?? 0;
  const revPaidHomeDelivery = (row as any).revPaidHomeDelivery ?? 0;
  const revPaidCollectForCustomer = (row as any).revPaidCollectForCustomer ?? 0;

  row.revenueHomeDelivery = revPaidHomeDelivery;
  row.revenueSurcharge = revPaidCollectForCustomer;

  row.revenueTotal =
    revDebtAmount +
    revPaidAmount +
    revNormalSendCost +
    revCollectSendCost +
    revPaidHomeDelivery +
    revPaidCollectForCustomer;

  delete (row as any).revDebtAmount;
  delete (row as any).revPaidAmount;
  delete (row as any).revNormalSendCost;
  delete (row as any).revCollectSendCost;
  delete (row as any).revPaidHomeDelivery;
  delete (row as any).revPaidCollectForCustomer;
}

function clearRevenue(row: IDebtRowDB) {
  row.revenueHomeDelivery = 0;
  row.revenueSurcharge = 0;
  row.revenueTotal = 0;

  delete (row as any).revDebtAmount;
  delete (row as any).revPaidAmount;
  delete (row as any).revNormalSendCost;
  delete (row as any).revCollectSendCost;
  delete (row as any).revPaidHomeDelivery;
  delete (row as any).revPaidCollectForCustomer;
}

export class CronjobService {
  async cronjobCalculateDebt(runAsOf?: VnDate | string, skipLock = false) {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const newDayVn =
          typeof runAsOf === 'string' ? parseVnDateISO(runAsOf) : (runAsOf ?? getTodayVn());

        const oldDayVn = vnDatePrev(newDayVn.year, newDayVn.month, newDayVn.date);

        const oldDayDebtDate = vnDateToDebtDateUtc(oldDayVn.year, oldDayVn.month, oldDayVn.date);
        const newDayDebtDate = vnDateToDebtDateUtc(newDayVn.year, newDayVn.month, newDayVn.date);

        if (isNaN(oldDayDebtDate.getTime()) || isNaN(newDayDebtDate.getTime())) {
          throw new Error(
            `Invalid debt dates. newDayVn=${JSON.stringify(newDayVn)} oldDayVn=${JSON.stringify(oldDayVn)}`
          );
        }

        //const dateKey = `${newDayVn.year}-${newDayVn.month + 1}-${newDayVn.date}`;
        const dateKey = `${newDayVn.year}-${String(newDayVn.month + 1).padStart(2, '0')}-${String(
          newDayVn.date
        ).padStart(2, '0')}`;

        if (!skipLock) {
          const lockRes = await mongoose.connection
            .collection('cronlocks')
            .findOneAndUpdate(
              { job: 'cron_debt', date: dateKey },
              { $setOnInsert: { job: 'cron_debt', date: dateKey } },
              { upsert: true, returnDocument: 'before', session }
            );

          if ((lockRes as any)?.value) {
            console.log('cron already executed');
            return;
          }
        }

        const count = await Debt.countDocuments({
          dateDebt: oldDayDebtDate,
        }).session(session);

        if (count === 0) {
          await this.firstRun(oldDayVn, oldDayDebtDate, session);
          await this.dailyRun(oldDayDebtDate, newDayDebtDate, session);
        } else {
          await this.recomputeOldDay(oldDayVn, oldDayDebtDate, session);
          await this.dailyRun(oldDayDebtDate, newDayDebtDate, session);
        }
      });
    } finally {
      await session.endSession();
    }
  }

  private createDebtRow(from: Types.ObjectId, to: Types.ObjectId, dateDebt: Date): IDebtRowDB {
    const row: IDebtRowDB = {
      id: new Types.ObjectId(),
      fromRoute: from,
      toRoute: to,

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

      revenueHomeDelivery: 0,
      revenueSurcharge: 0,
      revenueTotal: 0,

      totalDebt: 0,
      dateDebt,
    };

    (row as any).revDebtAmount = 0;
    (row as any).revPaidAmount = 0;
    (row as any).revNormalSendCost = 0;
    (row as any).revCollectSendCost = 0;
    (row as any).revPaidHomeDelivery = 0;
    (row as any).revPaidCollectForCustomer = 0;

    return row;
  }

  private async buildDebtMapForDate(
    oldDayVn: VnDate,
    oldDayDebtDate: Date,
    session: mongoose.ClientSession,
    seedExisting = false
  ) {
    const range = vnDateToUtcRange(oldDayVn.year, oldDayVn.month, oldDayVn.date);

    const routes = await Route.find().session(session).lean<IRoute[]>();
    const rootRouteMap = buildRootRouteMap(routes);

    const allRouteMap = new Map<string, IRoute>();
    routes.forEach(r => allRouteMap.set(r._id.toString(), r));

    const rootRouteInfoMap = new Map<string, IRoute>();
    for (const r of routes) {
      const rootId = getRootRoute(toObjectId(r._id), rootRouteMap);
      const rootRoute = allRouteMap.get(rootId.toString());
      if (rootRoute) {
        rootRouteInfoMap.set(rootId.toString(), rootRoute);
      }
    }

    const rootRouteIds = Array.from(rootRouteInfoMap.keys()).map(id => new Types.ObjectId(id));
    const debtMap: Record<string, IDebtRowDB> = {};

    const getRow = (from: Types.ObjectId, to: Types.ObjectId) => {
      const key = `${from}_${to}`;
      if (!debtMap[key]) {
        debtMap[key] = this.createDebtRow(from, to, oldDayDebtDate);
      }
      return debtMap[key];
    };

    for (const fromRoot of rootRouteIds) {
      for (const toRoot of rootRouteIds) {
        if (fromRoot.toString() === toRoot.toString()) {
          continue;
        }
        getRow(fromRoot, toRoot);
      }
    }

    if (seedExisting) {
      const existingDebts = await Debt.find({
        dateDebt: oldDayDebtDate,
      }).session(session);

      for (const d of existingDebts) {
        const fromRoot = getRootRoute(toObjectId(d.fromRoute), rootRouteMap);
        const toRoot = getRootRoute(toObjectId(d.toRoute), rootRouteMap);
        if (fromRoot.equals(toRoot)) {
          continue;
        }

        const row = getRow(fromRoot, toRoot);
        row.openingBalance = d.openingBalance ?? 0;
        row.accountPayable = d.accountPayable ?? 0;
        row.receivable = d.receivable ?? 0;
      }
    }

    const deliveryCursor = Delivery.find({
      createdAt: { $gte: range.start, $lte: range.end },
    })
      .session(session)
      .cursor();

    for await (const delivery of deliveryCursor) {
      if (!delivery.fromRoute || !delivery.toRoute) {
        continue;
      }

      const fromRoot = getRootRoute(new Types.ObjectId(delivery.fromRoute), rootRouteMap);
      const toRoot = getRootRoute(new Types.ObjectId(delivery.toRoute), rootRouteMap);
      if (fromRoot.equals(toRoot)) {
        continue;
      }

      const fromRoute = rootRouteInfoMap.get(fromRoot.toString());
      const toRoute = rootRouteInfoMap.get(toRoot.toString());
      if (!fromRoute || !toRoute) {
        continue;
      }

      const relation = getRouteRelation(fromRoute, toRoute);
      const shouldAddRevenue = relation === 'OWNED_OWNED' || fromRoute.type === RouteType.OWNED;

      const row = getRow(fromRoot, toRoot);
      const opp = getRow(toRoot, fromRoot);

      const itemValue = delivery.itemCost ?? 0;
      const cost = delivery.cost ?? 0;
      const costWithItem = cost + itemValue;

      if (delivery.paymentType === 'debt') {
        row.feeCODToRoute += costWithItem;
        opp.feeCODFromRoute += costWithItem;

        if (shouldAddRevenue) {
          (opp as any).revDebtAmount += costWithItem;
        }
      }

      if (delivery.paymentType === 'paid') {
        const gtn = delivery.homeDeliveryCost ?? 0;
        const surcharge = delivery.collectForCustomerCost ?? 0;

        row.homeDeliveryToRoute += gtn;
        row.surchargeToRoute += surcharge;

        opp.homeDeliveryFromRoute += gtn;
        opp.surchargeFromRoute += surcharge;

        if (shouldAddRevenue) {
          (opp as any).revPaidAmount += costWithItem;
          (opp as any).revPaidHomeDelivery += gtn;
          (opp as any).revPaidCollectForCustomer += surcharge;
        }
      }
    }

    const moneyCursor = MoneyDelivery.find({
      type: { $in: [MoneyDeliveryType.NORMAL, MoneyDeliveryType.COLLECT] },
      createdAt: { $gte: range.start, $lte: range.end },
    })
      .session(session)
      .cursor();

    for await (const money of moneyCursor) {
      if (!money.fromRoute || !money.toRoute) {
        continue;
      }

      const fromRoot = getRootRoute(new Types.ObjectId(money.fromRoute), rootRouteMap);
      const toRoot = getRootRoute(new Types.ObjectId(money.toRoute), rootRouteMap);
      if (fromRoot.equals(toRoot)) {
        continue;
      }

      const fromRoute = rootRouteInfoMap.get(fromRoot.toString());
      const toRoute = rootRouteInfoMap.get(toRoot.toString());
      if (!fromRoute || !toRoute) {
        continue;
      }

      const relation = getRouteRelation(fromRoute, toRoute);
      const shouldAddRevenue = relation === 'OWNED_OWNED' || fromRoute.type === RouteType.OWNED;

      const row = getRow(fromRoot, toRoot);
      const opp = getRow(toRoot, fromRoot);

      const sendMoneyAmount = money.sendMoneyAmount ?? 0;
      const sendCost = (money as any).sendCost ?? 0;

      // Tiền Về / Tiền Đi chỉ lấy NORMAL
      if (money.type === MoneyDeliveryType.NORMAL && sendMoneyAmount > 0) {
        row.costToRoute += sendMoneyAmount;
        opp.costFromRoute += sendMoneyAmount;
      }

      // Doanh thu cộng theo đúng chiều đang phát sinh
      if (shouldAddRevenue && sendCost > 0) {
        if (money.type === MoneyDeliveryType.NORMAL) {
          (row as any).revNormalSendCost += sendCost;
        }

        if (money.type === MoneyDeliveryType.COLLECT) {
          (row as any).revCollectSendCost += sendCost;
        }
      }
    }

    return { debtMap, routeMap: rootRouteInfoMap };
  }

  async firstRun(oldDayVn: VnDate, oldDayDebtDate: Date, session: mongoose.ClientSession) {
    const { debtMap, routeMap } = await this.buildDebtMapForDate(
      oldDayVn,
      oldDayDebtDate,
      session,
      false
    );

    const ops: mongoose.AnyBulkWriteOperation<IDebtRowDB>[] = [];

    for (const row of Object.values(debtMap)) {
      if (row.fromRoute.toString() === row.toRoute.toString()) {
        continue;
      }

      const fromRoute = routeMap.get(row.fromRoute.toString());
      const toRoute = routeMap.get(row.toRoute.toString());
      if (!fromRoute || !toRoute) {
        continue;
      }

      const relation = getRouteRelation(fromRoute, toRoute);
      const shouldAddRevenue = relation === 'OWNED_OWNED' || toRoute.type === RouteType.OWNED;

      row.totalDebt = computeBaseTotalDebt(row, relation);

      if (shouldAddRevenue) {
        finalizeRevenue(row);
        row.totalDebt += row.revenueTotal ?? 0;
      } else {
        clearRevenue(row);
      }

      ops.push({
        updateOne: {
          filter: {
            fromRoute: row.fromRoute,
            toRoute: row.toRoute,
            dateDebt: row.dateDebt,
          },
          update: { $setOnInsert: row },
          upsert: true,
        },
      });
    }

    if (ops.length) {
      await Debt.bulkWrite(ops, { ordered: false, session });
    }
  }

  private async recomputeOldDay(
    oldDayVn: VnDate,
    oldDayDebtDate: Date,
    session: mongoose.ClientSession
  ) {
    const { debtMap, routeMap } = await this.buildDebtMapForDate(
      oldDayVn,
      oldDayDebtDate,
      session,
      true
    );

    const ops: mongoose.AnyBulkWriteOperation<IDebtRowDB>[] = [];

    for (const row of Object.values(debtMap)) {
      if (row.fromRoute.toString() === row.toRoute.toString()) {
        continue;
      }

      const fromRoute = routeMap.get(row.fromRoute.toString());
      const toRoute = routeMap.get(row.toRoute.toString());
      if (!fromRoute || !toRoute) {
        continue;
      }

      const relation = getRouteRelation(fromRoute, toRoute);
      const shouldAddRevenue = relation === 'OWNED_OWNED' || toRoute.type === RouteType.OWNED;

      row.totalDebt = computeBaseTotalDebt(row, relation);

      if (shouldAddRevenue) {
        finalizeRevenue(row);
        row.totalDebt += row.revenueTotal ?? 0;
      } else {
        clearRevenue(row);
      }

      ops.push({
        updateOne: {
          filter: {
            fromRoute: row.fromRoute,
            toRoute: row.toRoute,
            dateDebt: row.dateDebt,
          },
          update: {
            $set: {
              costFromRoute: row.costFromRoute,
              feeCODToRoute: row.feeCODToRoute,
              costToRoute: row.costToRoute,
              feeCODFromRoute: row.feeCODFromRoute,
              homeDeliveryFromRoute: row.homeDeliveryFromRoute,
              homeDeliveryToRoute: row.homeDeliveryToRoute,
              surchargeFromRoute: row.surchargeFromRoute,
              surchargeToRoute: row.surchargeToRoute,
              revenueHomeDelivery: row.revenueHomeDelivery,
              revenueSurcharge: row.revenueSurcharge,
              revenueTotal: row.revenueTotal,
              totalDebt: row.totalDebt,
            },
          },
          upsert: false,
        },
      });
    }

    if (ops.length) {
      await Debt.bulkWrite(ops, { ordered: false, session });
    }
  }

  async dailyRun(oldDayDebtDate: Date, newDayDebtDate: Date, session: mongoose.ClientSession) {
    const debts = await Debt.find({
      dateDebt: oldDayDebtDate,
    }).session(session);

    const ops: mongoose.AnyBulkWriteOperation<IDebtRowDB>[] = [];

    for (const debt of debts) {
      const openingBalance = debt.totalDebt ?? 0;

      const newDayDebt: IDebtRowDB = {
        id: new Types.ObjectId(),
        fromRoute: debt.fromRoute as any,
        toRoute: debt.toRoute as any,

        openingBalance,

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

        revenueHomeDelivery: 0,
        revenueSurcharge: 0,
        revenueTotal: 0,

        totalDebt: openingBalance,
        dateDebt: newDayDebtDate,
      };

      ops.push({
        updateOne: {
          filter: {
            fromRoute: newDayDebt.fromRoute,
            toRoute: newDayDebt.toRoute,
            dateDebt: newDayDebt.dateDebt,
          },
          update: { $setOnInsert: newDayDebt },
          upsert: true,
        },
      });
    }

    if (ops.length) {
      await Debt.bulkWrite(ops, { ordered: false, session });
    }
  }
}
