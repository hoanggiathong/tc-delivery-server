import { CRON_LOG_STATUS, CronLogModel } from '@/models/cronjob-log.model';
import { ICronLog } from '@/types/cron-log.type';

export class CronLogService {
  static async start(value: string, name?: string): Promise<ICronLog> {
    return CronLogModel.findOneAndUpdate(
      { value },
      {
        value,
        name,
        status: CRON_LOG_STATUS.PROCESSING,
        errorMsg: null,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    ).exec();
  }

  static async success(value: string): Promise<ICronLog | null> {
    return CronLogModel.findOneAndUpdate(
      { value },
      {
        status: CRON_LOG_STATUS.SUCCESS,
        errorMsg: null,
      },
      {
        new: true,
        runValidators: true,
      }
    ).exec();
  }

  static async fail(value: string, errorMsg?: string): Promise<ICronLog | null> {
    return CronLogModel.findOneAndUpdate(
      { value },
      {
        status: CRON_LOG_STATUS.FAILED,
        errorMsg: errorMsg || null,
      },
      {
        new: true,
        runValidators: true,
      }
    ).exec();
  }
}
