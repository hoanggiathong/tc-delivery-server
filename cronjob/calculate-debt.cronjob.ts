import moduleAlias from 'module-alias';
import path from 'path';
moduleAlias.addAlias('@', path.resolve(__dirname, '../src'));

import { config } from 'dotenv';

// Load env file based on NODE_ENV
const envFile =
  process.env.NODE_ENV === 'uat'
    ? '.env.uat'
    : process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env';
config({ path: path.resolve(process.cwd(), envFile) });

import mongoose from 'mongoose';
import { CronjobService } from '../src/services/cron-job.service';
import { CronLogService } from '../src/services/cron-log.service';
import { DebtReportService } from '../src/services/debt-report.service';
import { APP_VERSION, BUILD_TIME } from '../src/version';

async function main() {
  console.log(`[Debt Cronjob] Version: ${APP_VERSION} | Build: ${BUILD_TIME}`);

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('Missing MONGODB_URI');
    process.exit(2);
  }
  const cronjobService = new CronjobService();
  const debtReportService = new DebtReportService();
  await mongoose.connect(uri, {
    dbName: process.env.MONGO_DB || undefined,
    readPreference: 'primary',
  });

  /** Key theo ngày VN (tránh lệch dateDebt do dùng UTC). */
  function getTodayKeyVn(): string {
    const VN_UTC_OFFSET_HOURS = 7;
    const now = new Date();
    const vnMs = now.getTime() + VN_UTC_OFFSET_HOURS * 60 * 60 * 1000;
    const vnDate = new Date(vnMs);
    const y = vnDate.getUTCFullYear();
    const m = vnDate.getUTCMonth();
    const d = vnDate.getUTCDate();
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  /**
   * RUN_DATE=YYYY-MM-DD (env): chạy cho đúng ngày VN đó. Tháng trong env là 1-12 (tháng 12 = 12).
   * runAsOfVnDate dùng chuẩn JS (month 0-11) để truyền vào service giống getTodayVn/Date.UTC.
   * Ví dụ: RUN_DATE=2026-12-01 → runAsOfVnDate = { year: 2026, month: 11, date: 1 } = 01/12/2026 VN.
   */
  const runDateEnv = process.env.RUN_DATE;
  let runAsOfVnDate: { year: number; month: number; date: number } | undefined;
  if (runDateEnv && /^\d{4}-\d{2}-\d{2}$/.test(runDateEnv)) {
    const [y, m, d] = runDateEnv.split('-').map(Number);
    runAsOfVnDate = { year: y, month: m - 1, date: d };
    console.log('[Debt Cronjob] RUN_DATE=', runDateEnv, '→ run for VN date', runAsOfVnDate);
  }

  /** Key dùng đúng ngày: format lại month 0-11 → 1-12 cho hiển thị YYYY-MM-DD. */
  const key = runAsOfVnDate
    ? `Calculate-debt-${runAsOfVnDate.year}-${String(runAsOfVnDate.month + 1).padStart(2, '0')}-${String(runAsOfVnDate.date).padStart(2, '0')}`
    : `Calculate-debt-${getTodayKeyVn()}`;

  try {
    const isRun = await CronLogService.isSuccess(key);
    if (isRun) {
      console.log(`Cronjob calculate debt already run success for this date: ${key}`);
      await mongoose.disconnect();
      return;
    }
    await CronLogService.start(key, 'Calculate debt cronjob');
    // await cronjobService.cronjobCalculateDebt(true);
    // await debtReportService.generateDebtReport(true);
    await cronjobService.cronjobCalculateDebt(true, runAsOfVnDate);
    await debtReportService.generateDebtReport(true, runAsOfVnDate);
    await CronLogService.success(key);
    await mongoose.disconnect();
  } catch (error) {
    console.log(`Error calculate debt cron-job [${key}]:`, error);
    const errorMessage = error instanceof Error ? error.message : error;
    await CronLogService.fail(key, String(errorMessage));
    await mongoose.disconnect();
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch(async e => {
    console.error(e);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  });
