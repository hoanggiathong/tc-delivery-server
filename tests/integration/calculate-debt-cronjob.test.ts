/**
 * Integration test: chạy cronjob calculate-debt cho 4 ngày liên tiếp (ngày 2–5 VN)
 * theo đúng flow: Debt và DebtReport KHÔNG có data ban đầu, chỉ có Route.
 *
 * Kỳ vọng sau 4 lần chạy (new day = 02-Feb, 03-Feb, 04-Feb, 05-Feb VN):
 * - Debt: 20800 bản ghi (5 ngày × 4160/ngày).
 *   dateDebt: 2026-01-31T17:00:00.000Z, 2026-02-01T17:00:00.000Z, 2026-02-02T17:00:00.000Z,
 *   2026-02-03T17:00:00.000Z, 2026-02-04T17:00:00.000Z
 * - DebtReport: 325 bản ghi (5 ngày × 65/ngày). dateDebtReport giống dateDebt.
 */

import { DebtReport } from '../../src/models/debt-report.model';
import { Debt } from '../../src/models/debt.model';
import { Route } from '../../src/models/route.model';
import { CronjobService } from '../../src/services/cron-job.service';
import { DebtReportService } from '../../src/services/debt-report.service';

const DEBT_PER_DAY = 4160;
const DEBT_REPORT_PER_DAY = 65;
const EXPECTED_DEBT_DATES = [
  new Date('2026-01-31T17:00:00.000Z'),
  new Date('2026-02-01T17:00:00.000Z'),
  new Date('2026-02-02T17:00:00.000Z'),
  new Date('2026-02-03T17:00:00.000Z'),
  new Date('2026-02-04T17:00:00.000Z'),
];

/** 65 routes → 65×64 = 4160 debt rows per day, 65 debt-report rows per day. */
const ROUTE_COUNT = 65;

function normalizeDate(d: Date): string {
  return d.toISOString().slice(0, 19) + 'Z';
}

describe('Calculate Debt Cronjob (4 days run)', () => {
  let cronjobService: CronjobService;
  let debtReportService: DebtReportService;

  beforeAll(() => {
    cronjobService = new CronjobService();
    debtReportService = new DebtReportService();
  });

  beforeEach(async () => {
    await Debt.deleteMany({});
    await DebtReport.deleteMany({});
    await Route.deleteMany({});

    const routes = Array.from({ length: ROUTE_COUNT }, (_, i) => ({
      code: `R${String(i + 1).padStart(2, '0')}`,
      name: `Route ${i + 1}`,
    }));
    await Route.insertMany(routes);
  });

  it('ban đầu Debt và DebtReport không có data, chỉ có Route', async () => {
    const debtCount = await Debt.countDocuments();
    const debtReportCount = await DebtReport.countDocuments();
    const routeCount = await Route.countDocuments();
    expect(debtCount).toBe(0);
    expect(debtReportCount).toBe(0);
    expect(routeCount).toBe(ROUTE_COUNT);
  });

  it('sau 4 lần chạy cron (ngày 2, 3, 4, 5 VN) từ trạng thái không có Debt/DebtReport → 20800 Debt, 325 DebtReport', async () => {
    expect(await Debt.countDocuments()).toBe(0);
    expect(await DebtReport.countDocuments()).toBe(0);

    const runDays: Array<{ year: number; month: number; date: number }> = [
      { year: 2026, month: 1, date: 2 }, // 02-Feb VN
      { year: 2026, month: 1, date: 3 }, // 03-Feb VN
      { year: 2026, month: 1, date: 4 }, // 04-Feb VN
      { year: 2026, month: 1, date: 5 }, // 05-Feb VN
    ];

    for (const runAsOfVnDate of runDays) {
      await cronjobService.cronjobCalculateDebt(runAsOfVnDate, true);
      await debtReportService.generateDebtReport(true, runAsOfVnDate);
    }

    const totalDebt = await Debt.countDocuments();
    expect(totalDebt).toBe(DEBT_PER_DAY * EXPECTED_DEBT_DATES.length);

    for (const dateDebt of EXPECTED_DEBT_DATES) {
      const count = await Debt.countDocuments({ dateDebt });
      expect(count).toBe(DEBT_PER_DAY);
    }

    const totalDebtReport = await DebtReport.countDocuments();
    expect(totalDebtReport).toBe(DEBT_REPORT_PER_DAY * EXPECTED_DEBT_DATES.length);

    for (const dateDebtReport of EXPECTED_DEBT_DATES) {
      const count = await DebtReport.countDocuments({ dateDebtReport });
      expect(count).toBe(DEBT_REPORT_PER_DAY);
    }
  });

  it('mỗi dateDebt và dateDebtReport phải đúng giá trị UTC (17:00:00.000Z)', async () => {
    expect(await Debt.countDocuments()).toBe(0);
    expect(await DebtReport.countDocuments()).toBe(0);

    const runDays: Array<{ year: number; month: number; date: number }> = [
      { year: 2026, month: 1, date: 2 },
      { year: 2026, month: 1, date: 3 },
      { year: 2026, month: 1, date: 4 },
      { year: 2026, month: 1, date: 5 },
    ];

    for (const runAsOfVnDate of runDays) {
      await cronjobService.cronjobCalculateDebt(runAsOfVnDate, false);
      await debtReportService.generateDebtReport(false, runAsOfVnDate);
    }

    const distinctDebtDates = await Debt.distinct('dateDebt');
    expect(distinctDebtDates.length).toBe(5);

    const normalizedExpected = EXPECTED_DEBT_DATES.map(normalizeDate).sort();
    const normalizedActual = distinctDebtDates.map((d: Date) => normalizeDate(new Date(d))).sort();
    expect(normalizedActual).toEqual(normalizedExpected);

    const distinctReportDates = await DebtReport.distinct('dateDebtReport');
    expect(distinctReportDates.length).toBe(5);
    const normalizedReportActual = distinctReportDates
      .map((d: Date) => normalizeDate(new Date(d)))
      .sort();
    expect(normalizedReportActual).toEqual(normalizedExpected);
  });
});
