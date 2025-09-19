import { CRON_LOG_STATUS } from '@/models/cronjob-log.model';
import { Document } from 'mongoose';

export interface ICronLog extends Document {
  value: string; // unique
  name?: string;
  status: CRON_LOG_STATUS; // enum
  errorMsg?: string;
  createdAt: Date;
  updatedAt: Date;
}
