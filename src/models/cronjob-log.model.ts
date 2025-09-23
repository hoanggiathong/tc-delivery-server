import { CRON_LOG_STATUS } from '@/const/cron-log.const';
import { ICronLog } from '@/types/cron-log.type';
import mongoose, { Schema } from 'mongoose';

const CronLogSchema = new Schema<ICronLog>(
  {
    value: { type: String, required: true, index: true, unique: true },
    name: { type: String, required: false },
    status: {
      type: String,
      enum: Object.values(CRON_LOG_STATUS),
      default: CRON_LOG_STATUS.PROCESSING,
    },
    errorMsg: { type: String, required: false },
  },
  {
    timestamps: true,
    collection: 'cronlogs',
    toJSON: {
      transform: (_doc, ret) => {
        const { _id, __v, ...rest } = ret;
        return { id: _id, ...rest };
      },
    },
  }
);

CronLogSchema.index({ status: 1, createdAt: -1 });

export const CronLogModel = mongoose.model<ICronLog>('CronLog', CronLogSchema);
