import { CRON_LOG_STATUS } from '@/const/cron-log.const';
import { Document } from 'mongoose';

export interface ICronLog extends Document {
  value: string; // unique
  name?: string;
  status: CRON_LOG_STATUS; // enum
  errorMsg?: string;
  createdAt: Date;
  updatedAt: Date;
}
