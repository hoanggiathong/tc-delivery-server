import mongoose, { Types } from 'mongoose';
import { Debt } from '@/models/debt.model';
import { Delivery } from '@/models/delivery.model';
import { MoneyDelivery, MoneyDeliveryType } from '@/models/money-delivery.model';
import { Route, IRoute } from '@/models/route.model';
import { IDebtRowDB } from '@/types/debt.type';
import { RouteType } from '@/types/route.type';

const VN_UTC_OFFSET_HOURS = 7;
const COMPANY_ROUTE_CODE = 'SG';

type VnDate = { year: number; month: number; date: number };
type RouteRelation = 'OWNED_OWNED' | 'OWNED_PARTNER' | 'PARTNER_OWNED' | 'PARTNER_PARTNER';

type RevenueExtraFields = {
  revDebtAmount?: number;
  revPaidAmount?: number;
  revNormalSendCost?: number;
  revCollectSendCost?: number;
  revPaidHomeDelivery?: number;
  revPaidCollectForCustomer?: number;
  revDebtHomeDelivery?: number;
  revDebtCollectForCustomer?: number;

  netDebt?: number;
  cashCollectedToday?: number;
  newDebtFreightToday?: number;
  paidOldDebtToday?: number;
  minimumTransferToCompany?: number;
};

type DebtRowExt = IDebtRowDB & RevenueExtraFields;

type RootRevenueAccumulator = {
  revDebtAmount: number;
  revPaidAmount: number;
  revNormalSendCost: number;
  revCollectSendCost: number;
  revPaidHomeDelivery: number;
  revPaidCollectForCustomer: number;
  revDebtHomeDelivery: number;
  revDebtCollectForCustomer: number;
};

function createRootRevenueAccumulator(): RootRevenueAccumulator {
  return {
    revDebtAmount: 0,
    revPaidAmount: 0,
    revNormalSendCost: 0,
    revCollectSendCost: 0,
    revPaidHomeDelivery: 0,
    revPaidCollectForCustomer: 0,
    revDebtHomeDelivery: 0,
    revDebtCollectForCustomer: 0,
  };
}

function getOrCreateRootRevenueBucket(
  map: Map<string, RootRevenueAccumulator>,
  rootId: Types.ObjectId
): RootRevenueAccumulator {
  const key = rootId.toString();
  let bucket = map.get(key);
  if (!bucket) {
    bucket = createRootRevenueAccumulator();
    map.set(key, bucket);
  }
  return bucket;
}

function isOwnedRouteType(type?: string | null): boolean {
  return (
    String(type || '')
      .trim()
      .toLowerCase() === RouteType.OWNED
  );
}

function isTpRoute(route?: IRoute | null): boolean {
  return (route?.code ?? '') === COMPANY_ROUTE_CODE;
}

function canRunWithoutTransaction(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_NO_TRANSACTION_DEBUG === 'true';
}

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
  if (isOwnedRouteType(from.type) && isOwnedRouteType(to.type)) {
    return 'OWNED_OWNED';
  }
  if (isOwnedRouteType(from.type) && !isOwnedRouteType(to.type)) {
    return 'OWNED_PARTNER';
  }
  if (!isOwnedRouteType(from.type) && isOwnedRouteType(to.type)) {
    return 'PARTNER_OWNED';
  }
  return 'PARTNER_PARTNER';
}

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

function finalizeRevenue(row: DebtRowExt) {
  const revDebtAmount = row.revDebtAmount ?? 0;
  const revPaidAmount = row.revPaidAmount ?? 0;
  const revNormalSendCost = row.revNormalSendCost ?? 0;
  const revCollectSendCost = row.revCollectSendCost ?? 0;

  const revPaidHomeDelivery = row.revPaidHomeDelivery ?? 0;
  const revPaidCollectForCustomer = row.revPaidCollectForCustomer ?? 0;

  const revDebtHomeDelivery = row.revDebtHomeDelivery ?? 0;
  const revDebtCollectForCustomer = row.revDebtCollectForCustomer ?? 0;

  // DT GTN NỘP = GTN paid + GTN nợ cước về
  row.revenueHomeDelivery = revPaidHomeDelivery + revDebtHomeDelivery;

  // PP NỘP = Phụ phí paid + Phụ phí nợ cước về
  row.revenueSurcharge = revPaidCollectForCustomer + revDebtCollectForCustomer;

  row.revenueTotal = revDebtAmount + revPaidAmount + revNormalSendCost + revCollectSendCost;

  row.newDebtFreightToday = revDebtAmount;

  row.cashCollectedToday =
    revPaidAmount +
    revNormalSendCost +
    revCollectSendCost +
    revPaidHomeDelivery +
    revPaidCollectForCustomer;

  row.paidOldDebtToday = 0;
  row.minimumTransferToCompany = row.cashCollectedToday ?? 0;

  delete row.revDebtAmount;
  delete row.revPaidAmount;
  delete row.revNormalSendCost;
  delete row.revCollectSendCost;
  delete row.revPaidHomeDelivery;
  delete row.revPaidCollectForCustomer;
  delete row.revDebtHomeDelivery;
  delete row.revDebtCollectForCustomer;
}

function clearRevenue(row: DebtRowExt) {
  row.revenueHomeDelivery = 0;
  row.revenueSurcharge = 0;
  row.revenueTotal = 0;
  row.cashCollectedToday = 0;
  row.newDebtFreightToday = 0;
  row.paidOldDebtToday = 0;
  row.minimumTransferToCompany = 0;

  delete row.revDebtAmount;
  delete row.revPaidAmount;
  delete row.revNormalSendCost;
  delete row.revCollectSendCost;
  delete row.revPaidHomeDelivery;
  delete row.revPaidCollectForCustomer;
  delete row.revDebtHomeDelivery;
  delete row.revDebtCollectForCustomer;
}

export class CronjobService {
  private createDebtRow(from: Types.ObjectId, to: Types.ObjectId, dateDebt: Date): DebtRowExt {
    return {
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

      netDebt: 0,
      cashCollectedToday: 0,
      newDebtFreightToday: 0,
      paidOldDebtToday: 0,
      minimumTransferToCompany: 0,

      revDebtAmount: 0,
      revPaidAmount: 0,
      revNormalSendCost: 0,
      revCollectSendCost: 0,
      revPaidHomeDelivery: 0,
      revPaidCollectForCustomer: 0,
      revDebtHomeDelivery: 0,
      revDebtCollectForCustomer: 0,
    };
  }

  private addRevenueToBucket(
    bucket: RootRevenueAccumulator,
    patch: Partial<RootRevenueAccumulator>
  ) {
    bucket.revDebtAmount += patch.revDebtAmount ?? 0;
    bucket.revPaidAmount += patch.revPaidAmount ?? 0;
    bucket.revNormalSendCost += patch.revNormalSendCost ?? 0;
    bucket.revCollectSendCost += patch.revCollectSendCost ?? 0;
    bucket.revPaidHomeDelivery += patch.revPaidHomeDelivery ?? 0;
    bucket.revPaidCollectForCustomer += patch.revPaidCollectForCustomer ?? 0;
    bucket.revDebtHomeDelivery += patch.revDebtHomeDelivery ?? 0;
    bucket.revDebtCollectForCustomer += patch.revDebtCollectForCustomer ?? 0;
  }

  private getRowActivityScore(row: DebtRowExt): number {
    return (
      Math.abs(row.costFromRoute ?? 0) +
      Math.abs(row.feeCODToRoute ?? 0) +
      Math.abs(row.costToRoute ?? 0) +
      Math.abs(row.feeCODFromRoute ?? 0) +
      Math.abs(row.homeDeliveryFromRoute ?? 0) +
      Math.abs(row.homeDeliveryToRoute ?? 0) +
      Math.abs(row.surchargeFromRoute ?? 0) +
      Math.abs(row.surchargeToRoute ?? 0) +
      Math.abs(row.receivable ?? 0) +
      Math.abs(row.accountPayable ?? 0)
    );
  }

  private sortRowsDeterministically(
    rows: DebtRowExt[],
    rootRouteInfoMap: Map<string, IRoute>
  ): DebtRowExt[] {
    return [...rows].sort((a, b) => {
      const activityDiff = this.getRowActivityScore(b) - this.getRowActivityScore(a);
      if (activityDiff !== 0) {
        return activityDiff;
      }

      const aFrom = rootRouteInfoMap.get(a.fromRoute.toString());
      const bFrom = rootRouteInfoMap.get(b.fromRoute.toString());
      const aFromCode = aFrom?.code ?? '';
      const bFromCode = bFrom?.code ?? '';
      const fromCodeDiff = aFromCode.localeCompare(bFromCode, 'vi');
      if (fromCodeDiff !== 0) {
        return fromCodeDiff;
      }

      const aTo = rootRouteInfoMap.get(a.toRoute.toString());
      const bTo = rootRouteInfoMap.get(b.toRoute.toString());
      const aToCode = aTo?.code ?? '';
      const bToCode = bTo?.code ?? '';
      const toCodeDiff = aToCode.localeCompare(bToCode, 'vi');
      if (toCodeDiff !== 0) {
        return toCodeDiff;
      }

      return a.fromRoute.toString().localeCompare(b.fromRoute.toString(), 'vi');
    });
  }

  private pickRevenueTargetRow(
    debtMap: Record<string, DebtRowExt>,
    rootRouteInfoMap: Map<string, IRoute>,
    ownedRootId: Types.ObjectId
  ): DebtRowExt | null {
    const ownedRoot = rootRouteInfoMap.get(ownedRootId.toString());
    if (!ownedRoot) {
      return null;
    }

    if (!isTpRoute(ownedRoot)) {
      const rows = Object.values(debtMap).filter(
        row => row.toRoute.toString() === ownedRootId.toString()
      );

      if (!rows.length) {
        return null;
      }

      const preferredRows = rows.filter(row => {
        const fromRoute = rootRouteInfoMap.get(row.fromRoute.toString());
        return fromRoute?.code === COMPANY_ROUTE_CODE;
      });

      if (preferredRows.length) {
        return this.sortRowsDeterministically(preferredRows, rootRouteInfoMap)[0];
      }

      return this.sortRowsDeterministically(rows, rootRouteInfoMap)[0];
    }

    const inboundRowsToCompany = Object.values(debtMap).filter(
      row => row.toRoute.toString() === ownedRootId.toString()
    );

    if (!inboundRowsToCompany.length) {
      return null;
    }

    return this.sortRowsDeterministically(inboundRowsToCompany, rootRouteInfoMap)[0];
  }

  private applyRevenueBucketToExistingRow(row: DebtRowExt, bucket: RootRevenueAccumulator) {
    row.revDebtAmount = bucket.revDebtAmount;
    row.revPaidAmount = bucket.revPaidAmount;
    row.revNormalSendCost = bucket.revNormalSendCost;
    row.revCollectSendCost = bucket.revCollectSendCost;
    row.revPaidHomeDelivery = bucket.revPaidHomeDelivery;
    row.revPaidCollectForCustomer = bucket.revPaidCollectForCustomer;
    row.revDebtHomeDelivery = bucket.revDebtHomeDelivery;
    row.revDebtCollectForCustomer = bucket.revDebtCollectForCustomer;
  }

  private getFreightRevenueOwner(
    fromRootRoute: IRoute,
    _toRootRoute: IRoute
  ): Types.ObjectId | null {
    if (isOwnedRouteType(fromRootRoute.type)) {
      return toObjectId(fromRootRoute._id);
    }

    return null;
  }

  private getDestinationRevenueOwner(fromRootRoute: IRoute): Types.ObjectId | null {
    if (isOwnedRouteType(fromRootRoute.type)) {
      return toObjectId(fromRootRoute._id);
    }

    return null;
  }

  private getDebtReturnRevenueOwner(toRootRoute: IRoute): Types.ObjectId | null {
    // GTN về / PP về debt thuộc trạm nhận nếu trạm nhận là owned
    if (isOwnedRouteType(toRootRoute.type)) {
      return toObjectId(toRootRoute._id);
    }

    return null;
  }

  private getMoneyRevenueOwner(
    moneyType: MoneyDeliveryType,
    fromRootRoute: IRoute,
    toRootRoute: IRoute
  ): Types.ObjectId | null {
    if (moneyType === MoneyDeliveryType.NORMAL) {
      if (isOwnedRouteType(fromRootRoute.type)) {
        return toObjectId(fromRootRoute._id);
      }

      return null;
    }

    if (moneyType === MoneyDeliveryType.COLLECT) {
      if (isOwnedRouteType(toRootRoute.type)) {
        return toObjectId(toRootRoute._id);
      }

      return null;
    }

    return null;
  }

  private computeOwnedSubmissionAdjustments(
    debtMap: Record<string, DebtRowExt>,
    routeMap: Map<string, IRoute>,
    ownedRootId: Types.ObjectId
  ) {
    let partnerInboundGtn = 0;
    let partnerOutboundGtn = 0;
    let partnerInboundSurcharge = 0;
    let partnerOutboundSurcharge = 0;

    for (const row of Object.values(debtMap)) {
      if (row.toRoute.toString() !== ownedRootId.toString()) {
        continue;
      }

      const fromRoute = routeMap.get(row.fromRoute.toString());
      if (!fromRoute) {
        continue;
      }

      if (isOwnedRouteType(fromRoute.type)) {
        continue;
      }

      partnerInboundGtn += row.homeDeliveryToRoute ?? 0;
      partnerOutboundGtn += row.homeDeliveryFromRoute ?? 0;

      partnerInboundSurcharge += row.surchargeToRoute ?? 0;
      partnerOutboundSurcharge += row.surchargeFromRoute ?? 0;
    }

    return {
      gtnNetFromPartner: partnerInboundGtn - partnerOutboundGtn,
      surchargeNetFromPartner: partnerInboundSurcharge - partnerOutboundSurcharge,
    };
  }

  private applyOwnedSubmissionMetrics(
    debtMap: Record<string, DebtRowExt>,
    routeMap: Map<string, IRoute>
  ) {
    const ownedRoots = new Set<string>();

    for (const row of Object.values(debtMap)) {
      const toRoute = routeMap.get(row.toRoute.toString());
      if (toRoute && isOwnedRouteType(toRoute.type) && !isTpRoute(toRoute)) {
        ownedRoots.add(row.toRoute.toString());
      }
    }

    for (const ownedRootId of ownedRoots) {
      const targetRow = this.pickRevenueTargetRow(
        debtMap,
        routeMap,
        new Types.ObjectId(ownedRootId)
      );

      if (!targetRow) {
        continue;
      }

      const { gtnNetFromPartner, surchargeNetFromPartner } = this.computeOwnedSubmissionAdjustments(
        debtMap,
        routeMap,
        new Types.ObjectId(ownedRootId)
      );

      targetRow.revenueHomeDelivery = (targetRow.revenueHomeDelivery ?? 0) + gtnNetFromPartner;
      targetRow.revenueSurcharge = (targetRow.revenueSurcharge ?? 0) + surchargeNetFromPartner;
    }
  }

  private syncCompanyViewMetrics(
    debtMap: Record<string, DebtRowExt>,
    routeMap: Map<string, IRoute>
  ) {
    const processed = new Set<string>();

    for (const row of Object.values(debtMap)) {
      const fromId = row.fromRoute.toString();
      const toId = row.toRoute.toString();
      const pairKey = [fromId, toId].sort().join('__');

      if (processed.has(pairKey)) {
        continue;
      }
      processed.add(pairKey);

      const reverseKey = `${toId}_${fromId}`;
      const reverseRow = debtMap[reverseKey];
      if (!reverseRow) {
        continue;
      }

      const fromRoute = routeMap.get(fromId);
      const toRoute = routeMap.get(toId);
      const reverseFromRoute = routeMap.get(reverseRow.fromRoute.toString());
      const reverseToRoute = routeMap.get(reverseRow.toRoute.toString());

      if (!fromRoute || !toRoute || !reverseFromRoute || !reverseToRoute) {
        continue;
      }

      let ownedMetricsRow: DebtRowExt | null = null;
      let companyViewRow: DebtRowExt | null = null;

      if (isTpRoute(fromRoute) && isOwnedRouteType(toRoute.type)) {
        ownedMetricsRow = row;
        companyViewRow = reverseRow;
      } else if (isTpRoute(reverseFromRoute) && isOwnedRouteType(reverseToRoute.type)) {
        ownedMetricsRow = reverseRow;
        companyViewRow = row;
      }

      if (!ownedMetricsRow || !companyViewRow) {
        continue;
      }

      companyViewRow.revenueTotal = ownedMetricsRow.revenueTotal ?? 0;
      companyViewRow.revenueHomeDelivery = ownedMetricsRow.revenueHomeDelivery ?? 0;
      companyViewRow.revenueSurcharge = ownedMetricsRow.revenueSurcharge ?? 0;
      companyViewRow.cashCollectedToday = ownedMetricsRow.cashCollectedToday ?? 0;
      companyViewRow.newDebtFreightToday = ownedMetricsRow.newDebtFreightToday ?? 0;
      companyViewRow.paidOldDebtToday = ownedMetricsRow.paidOldDebtToday ?? 0;
      companyViewRow.minimumTransferToCompany = ownedMetricsRow.minimumTransferToCompany ?? 0;
    }
  }

  private normalizeCompanyPairTotals(
    debtMap: Record<string, DebtRowExt>,
    routeMap: Map<string, IRoute>
  ) {
    const processed = new Set<string>();

    for (const row of Object.values(debtMap)) {
      const fromId = row.fromRoute.toString();
      const toId = row.toRoute.toString();
      const pairKey = [fromId, toId].sort().join('__');

      if (processed.has(pairKey)) {
        continue;
      }
      processed.add(pairKey);

      const reverseKey = `${toId}_${fromId}`;
      const reverseRow = debtMap[reverseKey];
      if (!reverseRow) {
        continue;
      }

      const fromRoute = routeMap.get(fromId);
      const toRoute = routeMap.get(toId);
      const reverseFromRoute = routeMap.get(reverseRow.fromRoute.toString());
      const reverseToRoute = routeMap.get(reverseRow.toRoute.toString());

      if (!fromRoute || !toRoute || !reverseFromRoute || !reverseToRoute) {
        continue;
      }

      let ownedViewRow: DebtRowExt | null = null;
      let reverseViewRow: DebtRowExt | null = null;
      let ownedViewFromRoute: IRoute | null = null;
      let ownedViewToRoute: IRoute | null = null;

      if (isTpRoute(fromRoute) && isOwnedRouteType(toRoute.type)) {
        ownedViewRow = row;
        reverseViewRow = reverseRow;
        ownedViewFromRoute = fromRoute;
        ownedViewToRoute = toRoute;
      } else if (isTpRoute(reverseFromRoute) && isOwnedRouteType(reverseToRoute.type)) {
        ownedViewRow = reverseRow;
        reverseViewRow = row;
        ownedViewFromRoute = reverseFromRoute;
        ownedViewToRoute = reverseToRoute;
      }

      if (!ownedViewRow || !reverseViewRow || !ownedViewFromRoute || !ownedViewToRoute) {
        continue;
      }

      const relation = getRouteRelation(ownedViewFromRoute, ownedViewToRoute);
      const baseDebt = computeBaseTotalDebt(ownedViewRow, relation);
      const revenue = ownedViewRow.revenueTotal ?? 0;
      const revenueHomeDelivery = ownedViewRow.revenueHomeDelivery ?? 0;
      const revenueSurcharge = ownedViewRow.revenueSurcharge ?? 0;

      const finalDebt = baseDebt + revenue + revenueHomeDelivery + revenueSurcharge;

      ownedViewRow.totalDebt = finalDebt;
      ownedViewRow.netDebt = finalDebt;

      reverseViewRow.totalDebt = -finalDebt;
      reverseViewRow.netDebt = -finalDebt;
    }
  }

  private async runCronDebtCore(
    runAsOf?: VnDate | string,
    skipLock = false,
    session?: mongoose.ClientSession
  ) {
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

    const dateKey = `${newDayVn.year}-${String(newDayVn.month + 1).padStart(2, '0')}-${String(
      newDayVn.date
    ).padStart(2, '0')}`;

    if (!skipLock) {
      const cronlocks = mongoose.connection.collection('cronlocks');
      const lockRes = session
        ? await cronlocks.findOneAndUpdate(
            { job: 'cron_debt', date: dateKey },
            { $setOnInsert: { job: 'cron_debt', date: dateKey } },
            { upsert: true, returnDocument: 'before', session }
          )
        : await cronlocks.findOneAndUpdate(
            { job: 'cron_debt', date: dateKey },
            { $setOnInsert: { job: 'cron_debt', date: dateKey } },
            { upsert: true, returnDocument: 'before' }
          );

      if ((lockRes as any)?.value) {
        return;
      }
    }

    const countQuery = Debt.countDocuments({
      dateDebt: oldDayDebtDate,
    });

    const count = session ? await countQuery.session(session) : await countQuery;

    if (count === 0) {
      await this.firstRun(oldDayVn, oldDayDebtDate, session);
      await this.dailyRun(oldDayDebtDate, newDayDebtDate, session);
    } else {
      await this.recomputeOldDay(oldDayVn, oldDayDebtDate, session);
      await this.dailyRun(oldDayDebtDate, newDayDebtDate, session);
    }
  }

  async cronjobCalculateDebt(runAsOf?: VnDate | string, skipLock = false) {
    const session = await mongoose.startSession();

    try {
      let isReplicaSet = false;

      const db = mongoose.connection.db;
      if (db) {
        const hello = await db.admin().command({ hello: 1 });
        isReplicaSet = Boolean((hello as any)?.setName);
      }

      if (isReplicaSet) {
        await session.withTransaction(async () => {
          await this.runCronDebtCore(runAsOf, skipLock, session);
        });
        return;
      }

      if (!canRunWithoutTransaction()) {
        throw new Error(
          'MongoDB local is standalone. Set ALLOW_NO_TRANSACTION_DEBUG=true to run debug without transaction.'
        );
      }

      await this.runCronDebtCore(runAsOf, skipLock, undefined);
    } finally {
      await session.endSession();
    }
  }

  private async buildDebtMapForDate(
    oldDayVn: VnDate,
    oldDayDebtDate: Date,
    session?: mongoose.ClientSession,
    seedExisting = false
  ) {
    const range = vnDateToUtcRange(oldDayVn.year, oldDayVn.month, oldDayVn.date);

    const routeQuery = Route.find().lean<IRoute[]>();
    const routes = session ? await routeQuery.session(session) : await routeQuery;

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
    const debtMap: Record<string, DebtRowExt> = {};
    const rootRevenueMap = new Map<string, RootRevenueAccumulator>();

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
      const existingDebtQuery = Debt.find({
        dateDebt: oldDayDebtDate,
      });
      const existingDebts = session
        ? await existingDebtQuery.session(session)
        : await existingDebtQuery;

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

    const deliveryQuery = Delivery.find({
      createdAt: { $gte: range.start, $lte: range.end },
    });

    const deliveryCursor = session
      ? deliveryQuery.session(session).cursor()
      : deliveryQuery.cursor();

    for await (const delivery of deliveryCursor) {
      if (!delivery.fromRoute || !delivery.toRoute) {
        continue;
      }

      const fromRoot = getRootRoute(new Types.ObjectId(delivery.fromRoute), rootRouteMap);
      const toRoot = getRootRoute(new Types.ObjectId(delivery.toRoute), rootRouteMap);

      const fromRoute = rootRouteInfoMap.get(fromRoot.toString());
      const toRoute = rootRouteInfoMap.get(toRoot.toString());
      if (!fromRoute || !toRoute) {
        continue;
      }

      const itemValue = delivery.itemCost ?? 0;
      const cost = delivery.cost ?? 0;
      const costWithItem = cost + itemValue;
      const gtn = delivery.homeDeliveryCost ?? 0;
      const surcharge = delivery.collectForCustomerCost ?? 0;

      const freightOwner = this.getFreightRevenueOwner(fromRoute, toRoute);

      if (freightOwner) {
        const bucket = getOrCreateRootRevenueBucket(rootRevenueMap, freightOwner);

        if (delivery.paymentType === 'debt') {
          this.addRevenueToBucket(bucket, { revDebtAmount: costWithItem });
        }

        if (delivery.paymentType === 'paid') {
          this.addRevenueToBucket(bucket, { revPaidAmount: costWithItem });
        }
      }

      if (delivery.paymentType === 'paid') {
        const paidDestinationOwner = this.getDestinationRevenueOwner(fromRoute);
        if (paidDestinationOwner) {
          const bucket = getOrCreateRootRevenueBucket(rootRevenueMap, paidDestinationOwner);
          this.addRevenueToBucket(bucket, {
            revPaidHomeDelivery: gtn,
            revPaidCollectForCustomer: surcharge,
          });
        }
      }

      if (delivery.paymentType === 'debt') {
        const debtReturnOwner = this.getDebtReturnRevenueOwner(toRoute);
        if (debtReturnOwner) {
          const bucket = getOrCreateRootRevenueBucket(rootRevenueMap, debtReturnOwner);
          this.addRevenueToBucket(bucket, {
            revDebtHomeDelivery: gtn,
            revDebtCollectForCustomer: surcharge,
          });
        }
      }

      if (fromRoot.equals(toRoot)) {
        continue;
      }

      const row = getRow(fromRoot, toRoot);
      const opp = getRow(toRoot, fromRoot);

      if (delivery.paymentType === 'debt') {
        row.feeCODToRoute += costWithItem;
        opp.feeCODFromRoute += costWithItem;
      }

      if (delivery.paymentType === 'paid') {
        row.homeDeliveryToRoute += gtn;
        row.surchargeToRoute += surcharge;

        opp.homeDeliveryFromRoute += gtn;
        opp.surchargeFromRoute += surcharge;
      }
    }

    const moneyQuery = MoneyDelivery.find({
      type: {
        $in: [
          MoneyDeliveryType.NORMAL,
          MoneyDeliveryType.COLLECT,
          MoneyDeliveryType.COLLECT_FOR_CUSTOMER,
        ],
      },
      createdAt: { $gte: range.start, $lte: range.end },
    });

    const moneyCursor = session ? moneyQuery.session(session).cursor() : moneyQuery.cursor();

    for await (const money of moneyCursor) {
      if (!money.fromRoute || !money.toRoute) {
        continue;
      }

      const fromRoot = getRootRoute(new Types.ObjectId(money.fromRoute), rootRouteMap);
      const toRoot = getRootRoute(new Types.ObjectId(money.toRoute), rootRouteMap);

      const fromRoute = rootRouteInfoMap.get(fromRoot.toString());
      const toRoute = rootRouteInfoMap.get(toRoot.toString());
      if (!fromRoute || !toRoute) {
        continue;
      }

      const sendMoneyAmount = money.sendMoneyAmount ?? 0;
      const sendCost = (money as any).sendCost ?? 0;

      const moneyOwner = this.getMoneyRevenueOwner(money.type, fromRoute, toRoute);

      if (moneyOwner && sendCost > 0) {
        const bucket = getOrCreateRootRevenueBucket(rootRevenueMap, moneyOwner);

        if (money.type === MoneyDeliveryType.NORMAL) {
          this.addRevenueToBucket(bucket, { revNormalSendCost: sendCost });
        }

        if (money.type === MoneyDeliveryType.COLLECT) {
          this.addRevenueToBucket(bucket, { revCollectSendCost: sendCost });
        }
      }

      if (fromRoot.equals(toRoot)) {
        continue;
      }

      const row = getRow(fromRoot, toRoot);
      const opp = getRow(toRoot, fromRoot);

      const isNormalOrCollectForCustomer =
        money.type === MoneyDeliveryType.NORMAL ||
        money.type === MoneyDeliveryType.COLLECT_FOR_CUSTOMER;

      if (isNormalOrCollectForCustomer && sendMoneyAmount > 0) {
        row.costToRoute += sendMoneyAmount;
        opp.costFromRoute += sendMoneyAmount;
      }
    }

    for (const [rootId, bucket] of rootRevenueMap.entries()) {
      const rootRoute = rootRouteInfoMap.get(rootId);
      if (!rootRoute || !isOwnedRouteType(rootRoute.type)) {
        continue;
      }

      const targetRow = this.pickRevenueTargetRow(
        debtMap,
        rootRouteInfoMap,
        rootRoute._id as Types.ObjectId
      );

      if (!targetRow) {
        continue;
      }

      this.applyRevenueBucketToExistingRow(targetRow, bucket);
    }

    return { debtMap, routeMap: rootRouteInfoMap };
  }

  async firstRun(oldDayVn: VnDate, oldDayDebtDate: Date, session?: mongoose.ClientSession) {
    const { debtMap, routeMap } = await this.buildDebtMapForDate(
      oldDayVn,
      oldDayDebtDate,
      session,
      false
    );

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

      row.totalDebt = computeBaseTotalDebt(row, relation);
      row.netDebt = row.totalDebt;

      if (isOwnedRouteType(toRoute.type)) {
        finalizeRevenue(row);
      } else {
        clearRevenue(row);
      }
    }

    this.applyOwnedSubmissionMetrics(debtMap, routeMap);
    this.syncCompanyViewMetrics(debtMap, routeMap);
    this.normalizeCompanyPairTotals(debtMap, routeMap);

    const ops: mongoose.AnyBulkWriteOperation<IDebtRowDB>[] = [];

    for (const row of Object.values(debtMap)) {
      if (row.fromRoute.toString() === row.toRoute.toString()) {
        continue;
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
              openingBalance: row.openingBalance ?? 0,
              costFromRoute: row.costFromRoute,
              feeCODToRoute: row.feeCODToRoute,
              costToRoute: row.costToRoute,
              feeCODFromRoute: row.feeCODFromRoute,
              accountPayable: row.accountPayable ?? 0,
              receivable: row.receivable ?? 0,
              homeDeliveryFromRoute: row.homeDeliveryFromRoute,
              homeDeliveryToRoute: row.homeDeliveryToRoute,
              surchargeFromRoute: row.surchargeFromRoute,
              surchargeToRoute: row.surchargeToRoute,
              revenueHomeDelivery: row.revenueHomeDelivery,
              revenueSurcharge: row.revenueSurcharge,
              revenueTotal: row.revenueTotal,
              totalDebt: row.totalDebt,
              netDebt: row.netDebt ?? 0,
              cashCollectedToday: row.cashCollectedToday ?? 0,
              newDebtFreightToday: row.newDebtFreightToday ?? 0,
              paidOldDebtToday: row.paidOldDebtToday ?? 0,
              minimumTransferToCompany: row.minimumTransferToCompany ?? 0,
            },
            $setOnInsert: {
              id: row.id,
              fromRoute: row.fromRoute,
              toRoute: row.toRoute,
              dateDebt: row.dateDebt,
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length) {
      if (session) {
        await Debt.bulkWrite(ops, { ordered: false, session });
      } else {
        await Debt.bulkWrite(ops, { ordered: false });
      }
    }
  }

  private async recomputeOldDay(
    oldDayVn: VnDate,
    oldDayDebtDate: Date,
    session?: mongoose.ClientSession
  ) {
    const { debtMap, routeMap } = await this.buildDebtMapForDate(
      oldDayVn,
      oldDayDebtDate,
      session,
      true
    );

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

      row.totalDebt = computeBaseTotalDebt(row, relation);
      row.netDebt = row.totalDebt;

      if (isOwnedRouteType(toRoute.type)) {
        finalizeRevenue(row);
      } else {
        clearRevenue(row);
      }
    }

    this.applyOwnedSubmissionMetrics(debtMap, routeMap);
    this.syncCompanyViewMetrics(debtMap, routeMap);
    this.normalizeCompanyPairTotals(debtMap, routeMap);

    const ops: mongoose.AnyBulkWriteOperation<IDebtRowDB>[] = [];

    for (const row of Object.values(debtMap)) {
      if (row.fromRoute.toString() === row.toRoute.toString()) {
        continue;
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
              openingBalance: row.openingBalance ?? 0,
              costFromRoute: row.costFromRoute,
              feeCODToRoute: row.feeCODToRoute,
              costToRoute: row.costToRoute,
              feeCODFromRoute: row.feeCODFromRoute,
              accountPayable: row.accountPayable ?? 0,
              receivable: row.receivable ?? 0,
              homeDeliveryFromRoute: row.homeDeliveryFromRoute,
              homeDeliveryToRoute: row.homeDeliveryToRoute,
              surchargeFromRoute: row.surchargeFromRoute,
              surchargeToRoute: row.surchargeToRoute,
              revenueHomeDelivery: row.revenueHomeDelivery,
              revenueSurcharge: row.revenueSurcharge,
              revenueTotal: row.revenueTotal,
              totalDebt: row.totalDebt,
              netDebt: row.netDebt ?? 0,
              cashCollectedToday: row.cashCollectedToday ?? 0,
              newDebtFreightToday: row.newDebtFreightToday ?? 0,
              paidOldDebtToday: row.paidOldDebtToday ?? 0,
              minimumTransferToCompany: row.minimumTransferToCompany ?? 0,
            },
          },
          upsert: false,
        },
      });
    }

    if (ops.length) {
      if (session) {
        await Debt.bulkWrite(ops, { ordered: false, session });
      } else {
        await Debt.bulkWrite(ops, { ordered: false });
      }
    }
  }

  async dailyRun(oldDayDebtDate: Date, newDayDebtDate: Date, session?: mongoose.ClientSession) {
    const debtQuery = Debt.find({
      dateDebt: oldDayDebtDate,
    });

    const debts = session ? await debtQuery.session(session) : await debtQuery;

    const ops: mongoose.AnyBulkWriteOperation<IDebtRowDB>[] = [];

    for (const debt of debts) {
      const openingBalance = (debt as any).netDebt ?? debt.totalDebt ?? 0;

      const newDayDebt: DebtRowExt = {
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
        netDebt: openingBalance,

        cashCollectedToday: 0,
        newDebtFreightToday: 0,
        paidOldDebtToday: 0,
        minimumTransferToCompany: 0,

        dateDebt: newDayDebtDate,
      };

      ops.push({
        updateOne: {
          filter: {
            fromRoute: newDayDebt.fromRoute,
            toRoute: newDayDebt.toRoute,
            dateDebt: newDayDebt.dateDebt,
          },
          update: {
            $setOnInsert: {
              ...newDayDebt,
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length) {
      if (session) {
        await Debt.bulkWrite(ops, { ordered: false, session });
      } else {
        await Debt.bulkWrite(ops, { ordered: false });
      }
    }
  }
}

export class CronJobService extends CronjobService {}

export default CronjobService;
