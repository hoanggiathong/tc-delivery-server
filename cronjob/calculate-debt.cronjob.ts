import { config } from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { CronjobService } from '../src/services/cron-job.service';
import { CronLogService } from './../src/services/cron-log.service';
config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const uri = process.env.MONGODB_URI;

  const cronjobService = new CronjobService();

  if (!uri) {
    console.error('Missing MONGODB_URI');
    process.exit(2);
  }
  await mongoose.connect(uri, { dbName: process.env.MONGO_DB || undefined });

  const key = `Calculate-debt-${new Date().toISOString().slice(0, 10)}`;

  try {
    await CronLogService.start(key, 'Caluculate debt cronjob');
    await cronjobService.cronjobCalculateDebt();
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
