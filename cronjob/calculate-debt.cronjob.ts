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
  await mongoose.connect(uri, { dbName: process.env.MONGO_DB || undefined });

  // ========== CHỌN MỘT TRONG HAI CASE: BỎ COMMENT BLOCK CẦN CHẠY ==========

  // ---------- CASE 1: Run ngày hiện tại (production / test run thật) ----------
  const key = `Calculate-debt-${new Date().toISOString().slice(0, 10)}`;
  const isRun = await CronLogService.isSuccess(key);
  if (isRun) {
    console.log('Cronjob calculate debt already run success for today');
    await mongoose.disconnect();
    return;
  }
  const useNextDay = false; // ngày hiện tại

  // ---------- CASE 2: Run testing tăng 1 ngày (simulate ngày mai VN) ----------
  // let key = `Calculate-debt-${new Date().toISOString().slice(0, 10)}`;
  // const isRun = await CronLogService.isSuccess(key);
  // if (isRun) {
  //   const date = new Date();
  //   date.setDate(date.getDate() + 1);
  //   key = `Calculate-debt-${date.toISOString().slice(0, 10)}`;
  // }
  // const useNextDay = true; // simulate ngày mai VN

  try {
    await CronLogService.start(key, 'Calculate debt cronjob');
    await cronjobService.cronjobCalculateDebt(useNextDay);
    await debtReportService.generateDebtReport(useNextDay);
    await CronLogService.success(key);
    await mongoose.disconnect();
  } catch (error) {
    console.log('Error calculate debt cron-job', error);
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
