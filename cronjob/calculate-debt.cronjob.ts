import moduleAlias from 'module-alias';
import path from 'path';
moduleAlias.addAlias('@', path.resolve(__dirname, '../src'));

import { config } from 'dotenv';

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

  const key = `Calculate-debt-${getTodayKeyVn()}`;

  await mongoose.connect(uri, {
    dbName: process.env.MONGO_DB || undefined,
    readPreference: 'primary',
  });

  const cronjobService = new CronjobService();
  const debtReportService = new DebtReportService();

  try {
    const isRun = await CronLogService.isSuccess(key);
    if (isRun) {
      console.log(`Cronjob calculate debt already run success for this date: ${key}`);
      await mongoose.disconnect();
      return;
    }

    await CronLogService.start(key, 'Calculate debt cronjob');
    await cronjobService.cronjobCalculateDebt();
    await debtReportService.generateDebtReport();
    await CronLogService.success(key);
    await mongoose.disconnect();
  } catch (error) {
    console.log(`Error calculate debt cron-job [${key}]:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
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
