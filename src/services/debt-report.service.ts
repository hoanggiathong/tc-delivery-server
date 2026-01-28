import { DebtReport, IDebtReport } from '@/models/debt-report.model';
import { Debt } from '@/models/debt.model';
import { IDebtTotal } from '@/types/debt.type';
import mongoose from 'mongoose';

export class DebtReportService {
  async generateDebtReport(isNextDay: boolean = false): Promise<void> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // testing increase date
    if (isNextDay) {
      console.log('isNextDay generateDebtReport:>> ', isNextDay);
      today.setDate(today.getDate() + 1);
      yesterday.setDate(yesterday.getDate() + 1);
    }

    console.log('today:>> ', today);
    console.log('yesterday:>> ', yesterday);

    await this.processDebtReport(yesterday);
    await this.processDebtReport(today);
  }

  private async processDebtReport(date: Date): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59,
        999
      );

      const debts = await Debt.find({
        dateDebt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      })
        .session(session)
        .lean();

      if (debts.length === 0) {
        // If no debts, verify if we should delete existing reports?
        // For safety, I'll stick to the original behavior of returning early if no debts found.
        await session.commitTransaction();
        session.endSession();
        return;
      }

      const groupedDebts = new Map<
        string,
        {
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
          totalDebt: number;
          dateDebtReport: Date;
        }
      >();

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
            totalDebt: 0,
            dateDebtReport: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
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
        grouped.totalDebt += debt.totalDebt ?? 0;
      }

      // Convert map to array for bulk insert
      const debtReports = Array.from(groupedDebts.values()).map(grouped => ({
        ...grouped,
        createdAt: startOfDay,
        updatedAt: startOfDay,
        dateDebtReport: date,
      }));

      // Delete existing debt reports for the day (if any)
      await DebtReport.deleteMany({
        dateDebtReport: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      }).session(session);

      // Insert aggregated data into debt-report collection
      if (debtReports.length > 0) {
        await DebtReport.insertMany(debtReports, { session });
      }

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Generate debt report failed');
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
      // Convert toRoute to ObjectId if it's a string
      const toRouteObjId =
        toRoute instanceof mongoose.Types.ObjectId
          ? toRoute
          : new mongoose.Types.ObjectId(String(toRoute));

      // Calculate start and end of day for createdAt
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

      // Find the debt report first to calculate totalDebt correctly
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

      // Calculate new values
      const newAccountPayable = updateAccountPayable
        ? (debtReport.accountPayable ?? 0) + cash
        : (debtReport.accountPayable ?? 0);
      const newReceivable = updateReceivable
        ? (debtReport.receivable ?? 0) + cash
        : (debtReport.receivable ?? 0);

      // Calculate totalDebt using the correct formula:
      // totalDebt = (costFromRoute + feeCODToRoute + homeDeliveryFromRoute + surchargeFromRoute + receivable)
      //           - (costToRoute + feeCODFromRoute + homeDeliveryToRoute +  surchargeToRoute + accountPayable)
      //           + openingBalance
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
      const newTotalDebt = A - B + (debtReport.openingBalance ?? 0);

      const updateQuery: mongoose.UpdateQuery<IDebtReport> = {
        $set: {
          updatedAt: new Date(),
          accountPayable: newAccountPayable,
          receivable: newReceivable,
          totalDebt: newTotalDebt,
        },
      };

      // Find and update debt report
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
   * @param startDate - Start date (will be set to start of day)
   * @param endDate - End date (will be set to end of day)
   * @returns Total of all debt report fields
   */
  async getDebtReportTotal(
    toRouteId: mongoose.Types.ObjectId | string,
    startDate: Date,
    endDate: Date
  ): Promise<IDebtTotal> {
    try {
      // Convert toRouteId to ObjectId if it's a string
      const toRouteObjId =
        toRouteId instanceof mongoose.Types.ObjectId
          ? toRouteId
          : new mongoose.Types.ObjectId(String(toRouteId));

      // Set start date to start of day
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      // Set end date to end of day
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);

      const where = {
        toRoute: toRouteObjId,
        dateDebtReport: { $gte: start, $lte: endOfDay },
      };

      const debtReports = await DebtReport.find(where).lean();

      // Initialize total object
      const total = {
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
      };

      // Sum all fields from debt reports (each report is already a daily total)
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
        total.totalDebt += debtReport.totalDebt ?? 0;
      }

      return total;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Get debt report total failed');
    }
  }
}
