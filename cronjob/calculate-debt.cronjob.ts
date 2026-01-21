import moduleAlias from 'module-alias';
import path from 'path';
moduleAlias.addAlias('@', path.resolve(__dirname, '../src'));

import { config } from 'dotenv';
if (process.env.NODE_ENV === 'development') {
  config({ path: path.resolve(__dirname, '../.env') });
}

import mongoose from 'mongoose';
import { CronjobService } from '../src/services/cron-job.service';
import { CronLogService } from '../src/services/cron-log.service';
import { DebtReportService } from '../src/services/debt-report.service';

async function main() {
  const uri = process.env.MONGODB_URI;

  const cronjobService = new CronjobService();
  const debtReportService = new DebtReportService();

  if (!uri) {
    console.error('Missing MONGODB_URI');
    process.exit(2);
  }
  await mongoose.connect(uri, { dbName: process.env.MONGO_DB || undefined });

  const key = `Calculate-debt-${new Date().toISOString().slice(0, 10)}`;

  try {
    await CronLogService.start(key, 'Caluculate debt cronjob');
    // Step 1: Calculate and create debt records
    await cronjobService.cronjobCalculateDebt();
    // Step 2: Generate debt report from the created debt records
    await debtReportService.generateDebtReport();
    await CronLogService.success(key);
    await mongoose.disconnect();
  } catch (error) {
    console.log('Error calculate debt cron-job', error);
    const errorMessage = error instanceof Error ? error.message : error;
    await CronLogService.fail(key, String(errorMessage));
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
