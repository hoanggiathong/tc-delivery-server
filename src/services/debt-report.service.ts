import { DebtReport, IDebtReport } from '@/models/debt-report.model';
import { Debt } from '@/models/debt.model';
import { IDebtTotal } from '@/types/debt.type';
import mongoose from 'mongoose';

/** Vietnam timezone: UTC+7. Same convention as cron-job (00:00 VN = 17:00 UTC previous day). */
const VN_UTC_OFFSET_HOURS = 7;

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

function vnDateToDebtDateUtc(year: number, month: number, date: number): Date {
  return new Date(Date.UTC(year, month, date - 1, 17, 0, 0, 0));
}

/** Khoảng cả ngày UTC (đầu ngày – cuối ngày) để query dateDebt/dateDebtReport, tránh lệch. */
function dateDebtQueryRange(dateDebt: Date): { $gte: Date; $lte: Date } {
  const startMs = dateDebt.getTime();
  const endMs = startMs + 24 * 60 * 60 * 1000 - 1;
  return { $gte: new Date(startMs), $lte: new Date(endMs) };
}

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

type GroupedDebtReport = {
  toRoute: mongoose.Types.ObjectId;
  openingBalance: number;
  costFromRoute: number;
  feeCODToRoute: number;
  costToRoute: number;
  feeCODFromRoute: number;
  accountPayable: number;
  receivable: number;
  homeDeliveryFromRoute: number;
  homeDeliveryToRoute: number;
  surchargeToRoute: number;
  surchargeFromRoute: number;
  revenueHomeDelivery: number;
  revenueSurcharge: number;
  revenueTotal: number;
  totalDebt: number;
  dateDebtReport?: Date;
};

export class DebtReportService {
  /**
   * Generate debt report for "old day" and "new day" in VN timezone (same logic as debt cronjob).
   * - If DebtReport has no data for old day (first run): create report for old day, create report for new day.
   * - If DebtReport has data for old day (daily run): update report for old day, create report for new day.
   * When run at 00:00 VN (17:00 UTC previous day): old day = yesterday VN, new day = today VN.
   * @param runAsOfVnDate - Optional. Run as if "today VN" is this date. Convention: year, month 0-based (0=Jan, 11=Dec), date 1-31. Same as getTodayVn().
   * @param useTransaction - Optional. Default true. Set false for tests (standalone MongoDB).
   */
  async generateDebtReport(
    useTransaction: boolean = true,
    runAsOfVnDate?: { year: number; month: number; date: number }
  ): Promise<void> {
    const newDayVn = runAsOfVnDate ?? getTodayVn();
    const oldDayVn = vnDatePrev(newDayVn.year, newDayVn.month, newDayVn.date);

    const oldDayDebtDate = vnDateToDebtDateUtc(oldDayVn.year, oldDayVn.month, oldDayVn.date);

    const count = await DebtReport.countDocuments({
      dateDebtReport: dateDebtQueryRange(oldDayDebtDate),
    })
      .read('primary')
      .setOptions({ readConcern: { level: 'majority' } });

    if (count === 0) {
      await this.processDebtReportForVnDay(oldDayVn, useTransaction);
      await this.processDebtReportForVnDay(newDayVn, useTransaction);
    } else {
      await this.updateDebtReportForVnDay(oldDayVn, useTransaction);
      await this.processDebtReportForVnDay(newDayVn, useTransaction);
    }
  }

  /**
   * Process debt report for one VN calendar day. Queries Debt by dateDebt (17:00 UTC previous day).
   * @param useTransaction - Default true. Set false for tests (standalone MongoDB).
   */
  private async processDebtReportForVnDay(
    vnDay: { year: number; month: number; date: number },
    useTransaction: boolean = true
  ): Promise<void> {
    const dateDebtExact = vnDateToDebtDateUtc(vnDay.year, vnDay.month, vnDay.date);

    const doWork = async (session?: mongoose.ClientSession) => {
      const debtQuery = Debt.find({ dateDebt: dateDebtQueryRange(dateDebtExact) })
        .read('primary')
        .setOptions({ readConcern: { level: 'majority' } });
      const debts = await (session ? debtQuery.session(session).lean() : debtQuery.lean());

      const groupedDebts = new Map<string, GroupedDebtReport>();

      for (const debt of debts) {
        const toRouteObjId =
          debt.toRoute instanceof mongoose.Types.ObjectId
            ? debt.toRoute
            : new mongoose.Types.ObjectId(String(debt.toRoute));
        const toRouteId = toRouteObjId.toString();

        if (!groupedDebts.has(toRouteId)) {
          groupedDebts.set(toRouteId, {
            toRoute: toRouteObjId,
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
            dateDebtReport: new Date(dateDebtExact.getTime()),
          });
        }

        const grouped = groupedDebts.get(toRouteId);
        if (!grouped) {
          continue;
        }

        grouped.openingBalance += debt.openingBalance ?? 0;
        grouped.costFromRoute += debt.costFromRoute ?? 0;
        grouped.feeCODToRoute += debt.feeCODToRoute ?? 0;
        grouped.costToRoute += debt.costToRoute ?? 0;
        grouped.feeCODFromRoute += debt.feeCODFromRoute ?? 0;
        grouped.accountPayable += debt.accountPayable ?? 0;
        grouped.receivable += debt.receivable ?? 0;
        grouped.homeDeliveryFromRoute += debt.homeDeliveryFromRoute ?? 0;
        grouped.homeDeliveryToRoute += debt.homeDeliveryToRoute ?? 0;
        grouped.surchargeToRoute += debt.surchargeToRoute ?? 0;
        grouped.surchargeFromRoute += debt.surchargeFromRoute ?? 0;
        grouped.revenueHomeDelivery += debt.revenueHomeDelivery ?? 0;
        grouped.revenueSurcharge += debt.revenueSurcharge ?? 0;
        grouped.revenueTotal += debt.revenueTotal ?? 0;
        grouped.totalDebt += debt.totalDebt ?? 0;
      }

      const debtReports = Array.from(groupedDebts.values()).map(grouped => ({
        ...grouped,
        createdAt: dateDebtExact,
        updatedAt: dateDebtExact,
        dateDebtReport: new Date(dateDebtExact.getTime()),
      }));

      const deleteQuery = DebtReport.deleteMany({
        dateDebtReport: dateDebtQueryRange(dateDebtExact),
      });
      await (session ? deleteQuery.session(session) : deleteQuery);

      if (debtReports.length > 0) {
        await DebtReport.insertMany(debtReports, session ? { session } : {});
      }
    };

    if (useTransaction) {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        await doWork(session);
        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Generate debt report failed');
      } finally {
        await session.endSession();
      }
    } else {
      await doWork();
    }
  }

  /**
   * Update existing debt report for one VN day: re-aggregate from Debt and update in place.
   * Does NOT update field dateDebtReport (preserves existing value).
   * @param useTransaction - Default true. Set false for tests (standalone MongoDB).
   */
  private async updateDebtReportForVnDay(
    vnDay: { year: number; month: number; date: number },
    useTransaction: boolean = true
  ): Promise<void> {
    const dateDebtExact = vnDateToDebtDateUtc(vnDay.year, vnDay.month, vnDay.date);

    const doWork = async (session?: mongoose.ClientSession) => {
      const debtQuery = Debt.find({
        dateDebt: dateDebtQueryRange(dateDebtExact),
      })
        .read('primary')
        .setOptions({ readConcern: { level: 'majority' } });
      const debts = await (session ? debtQuery.session(session).lean() : debtQuery.lean());

      const groupedDebts = new Map<string, GroupedDebtReport>();

      for (const debt of debts) {
        const toRouteObjId =
          debt.toRoute instanceof mongoose.Types.ObjectId
            ? debt.toRoute
            : new mongoose.Types.ObjectId(String(debt.toRoute));
        const toRouteId = toRouteObjId.toString();

        if (!groupedDebts.has(toRouteId)) {
          groupedDebts.set(toRouteId, {
            toRoute: toRouteObjId,
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
          });
        }

        const grouped = groupedDebts.get(toRouteId);
        if (!grouped) {
          continue;
        }

        grouped.openingBalance += debt.openingBalance ?? 0;
        grouped.costFromRoute += debt.costFromRoute ?? 0;
        grouped.feeCODToRoute += debt.feeCODToRoute ?? 0;
        grouped.costToRoute += debt.costToRoute ?? 0;
        grouped.feeCODFromRoute += debt.feeCODFromRoute ?? 0;
        grouped.accountPayable += debt.accountPayable ?? 0;
        grouped.receivable += debt.receivable ?? 0;
        grouped.homeDeliveryFromRoute += debt.homeDeliveryFromRoute ?? 0;
        grouped.homeDeliveryToRoute += debt.homeDeliveryToRoute ?? 0;
        grouped.surchargeToRoute += debt.surchargeToRoute ?? 0;
        grouped.surchargeFromRoute += debt.surchargeFromRoute ?? 0;
        grouped.revenueHomeDelivery += debt.revenueHomeDelivery ?? 0;
        grouped.revenueSurcharge += debt.revenueSurcharge ?? 0;
        grouped.revenueTotal += debt.revenueTotal ?? 0;
        grouped.totalDebt += debt.totalDebt ?? 0;
      }

      const now = new Date();
      const reportFilter = dateDebtQueryRange(dateDebtExact);

      // update những report đã có hoặc tạo mới nếu thiếu
      for (const grouped of groupedDebts.values()) {
        const updateOp = DebtReport.updateOne(
          {
            toRoute: grouped.toRoute,
            dateDebtReport: reportFilter,
          },
          {
            $set: {
              openingBalance: grouped.openingBalance,
              costFromRoute: grouped.costFromRoute,
              feeCODToRoute: grouped.feeCODToRoute,
              costToRoute: grouped.costToRoute,
              feeCODFromRoute: grouped.feeCODFromRoute,
              accountPayable: grouped.accountPayable,
              receivable: grouped.receivable,
              homeDeliveryFromRoute: grouped.homeDeliveryFromRoute,
              homeDeliveryToRoute: grouped.homeDeliveryToRoute,
              surchargeToRoute: grouped.surchargeToRoute,
              surchargeFromRoute: grouped.surchargeFromRoute,
              revenueHomeDelivery: grouped.revenueHomeDelivery,
              revenueSurcharge: grouped.revenueSurcharge,
              revenueTotal: grouped.revenueTotal,
              totalDebt: grouped.totalDebt,
              updatedAt: now,
            },
            $setOnInsert: {
              toRoute: grouped.toRoute,
              dateDebtReport: new Date(dateDebtExact.getTime()),
              createdAt: now,
            },
          },
          { upsert: true }
        );
        await (session ? updateOp.session(session) : updateOp);
      }
    };

    if (useTransaction) {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        await doWork(session);
        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Update debt report for VN day failed');
      } finally {
        await session.endSession();
      }
    } else {
      await doWork();
    }
  }

  /**
   * Update debt report by toRoute and date range
   * @param toRoute - ObjectId or string of the toRoute
   * @param dateDebtReport - dateDebtReport at date
   * @param cash - Cash amount
   * @param session - Session
   * @param updateAccountPayable - Update account payable
   * @param updateReceivable - Update receivable
   * @returns Updated debt report
   */
  async updateDebtReport(
    toRoute: mongoose.Types.ObjectId | string,
    dateDebtReport: Date,
    cash: number,
    session?: mongoose.ClientSession,
    updateAccountPayable?: boolean,
    updateReceivable?: boolean
  ): Promise<IDebtReport | null> {
    try {
      const toRouteObjId =
        toRoute instanceof mongoose.Types.ObjectId
          ? toRoute
          : new mongoose.Types.ObjectId(String(toRoute));

      const startOfDay = new Date(
        dateDebtReport.getFullYear(),
        dateDebtReport.getMonth(),
        dateDebtReport.getDate(),
        0,
        0,
        0,
        0
      );
      const endOfDay = new Date(
        dateDebtReport.getFullYear(),
        dateDebtReport.getMonth(),
        dateDebtReport.getDate(),
        23,
        59,
        59,
        999
      );

      const debtReport = await DebtReport.findOne({
        toRoute: toRouteObjId,
        dateDebtReport: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      })
        .session(session || null)
        .lean();

      if (!debtReport) {
        return null;
      }

      const newAccountPayable = updateAccountPayable
        ? (debtReport.accountPayable ?? 0) + cash
        : (debtReport.accountPayable ?? 0);
      const newReceivable = updateReceivable
        ? (debtReport.receivable ?? 0) + cash
        : (debtReport.receivable ?? 0);

      // totalDebt của report phải cộng thêm revenueTotal
      const A =
        (debtReport.costFromRoute ?? 0) +
        (debtReport.feeCODToRoute ?? 0) +
        (debtReport.homeDeliveryFromRoute ?? 0) +
        (debtReport.surchargeFromRoute ?? 0) +
        newReceivable;

      const B =
        (debtReport.costToRoute ?? 0) +
        (debtReport.feeCODFromRoute ?? 0) +
        (debtReport.homeDeliveryToRoute ?? 0) +
        (debtReport.surchargeToRoute ?? 0) +
        newAccountPayable;

      const newTotalDebt =
        A - B + (debtReport.openingBalance ?? 0) + (debtReport.revenueTotal ?? 0);

      const updateQuery: mongoose.UpdateQuery<IDebtReport> = {
        $set: {
          updatedAt: new Date(),
          accountPayable: newAccountPayable,
          receivable: newReceivable,
          totalDebt: newTotalDebt,
        },
      };

      const options: mongoose.QueryOptions = {
        new: true,
        runValidators: true,
      };

      if (session) {
        options.session = session;
      }

      const updatedDebtReport = await DebtReport.findOneAndUpdate(
        {
          toRoute: toRouteObjId,
          dateDebtReport: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        },
        updateQuery,
        options
      ).exec();

      return updatedDebtReport;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Update debt report failed');
    }
  }

  /**
   * Get debt reports by toRoute and date range, then calculate total
   * @param toRouteId - ObjectId or string of the toRoute
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Total of all debt report fields
   */
  async getDebtReportTotal(
    toRouteId: mongoose.Types.ObjectId | string,
    startDate: Date,
    endDate: Date
  ): Promise<IDebtTotal> {
    try {
      const toRouteObjId =
        toRouteId instanceof mongoose.Types.ObjectId
          ? toRouteId
          : new mongoose.Types.ObjectId(String(toRouteId));

      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);

      const where = {
        toRoute: toRouteObjId,
        dateDebtReport: { $gte: start, $lte: endOfDay },
      };

      const debtReports = await DebtReport.find(where).lean();

      const total: {
        openingBalance: number;
        costFromRoute: number;
        feeCODToRoute: number;
        costToRoute: number;
        feeCODFromRoute: number;
        accountPayable: number;
        receivable: number;
        homeDeliveryFromRoute: number;
        homeDeliveryToRoute: number;
        surchargeToRoute: number;
        surchargeFromRoute: number;
        revenueHomeDelivery: number;
        revenueSurcharge: number;
        revenueTotal: number;
        totalDebt: number;
      } = {
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
      };

      for (const debtReport of debtReports) {
        total.openingBalance += debtReport.openingBalance ?? 0;
        total.costFromRoute += debtReport.costFromRoute ?? 0;
        total.feeCODToRoute += debtReport.feeCODToRoute ?? 0;
        total.costToRoute += debtReport.costToRoute ?? 0;
        total.feeCODFromRoute += debtReport.feeCODFromRoute ?? 0;
        total.accountPayable += debtReport.accountPayable ?? 0;
        total.receivable += debtReport.receivable ?? 0;
        total.homeDeliveryFromRoute += debtReport.homeDeliveryFromRoute ?? 0;
        total.homeDeliveryToRoute += debtReport.homeDeliveryToRoute ?? 0;
        total.surchargeToRoute += debtReport.surchargeToRoute ?? 0;
        total.surchargeFromRoute += debtReport.surchargeFromRoute ?? 0;
        total.revenueHomeDelivery += debtReport.revenueHomeDelivery ?? 0;
        total.revenueSurcharge += debtReport.revenueSurcharge ?? 0;
        total.revenueTotal += debtReport.revenueTotal ?? 0;
        total.totalDebt += debtReport.totalDebt ?? 0;
      }

      return total as IDebtTotal;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Get debt report total failed');
    }
  }
}
