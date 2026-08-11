import { MobileCustomerAccountDeletionService } from '@/modules/mobile-customer/mobile-customer-account-deletion.service';
import Logger from '@/utils/logger';

const INTERVAL_MS = 60 * 60 * 1000;
const START_DELAY_MS = 30 * 1000;

let interval: NodeJS.Timeout | null = null;
let startTimer: NodeJS.Timeout | null = null;
let running = false;

const service = new MobileCustomerAccountDeletionService();

export const runMobileCustomerAccountDeletionJob = async (): Promise<void> => {
  if (running) {
    return;
  }
  running = true;

  try {
    const result = await service.processDueDeletions(50);
    if (result.scanned > 0 || result.failed > 0) {
      Logger.info('Mobile customer account deletion job completed', result);
    }
  } catch (error) {
    Logger.error('Mobile customer account deletion job failed', {
      error: error instanceof Error ? error.message : error,
    });
  } finally {
    running = false;
  }
};

export const startMobileCustomerAccountDeletionCron = (): void => {
  if (interval || startTimer) {
    return;
  }

  startTimer = setTimeout(() => {
    startTimer = null;
    void runMobileCustomerAccountDeletionJob();

    interval = setInterval(() => {
      void runMobileCustomerAccountDeletionJob();
    }, INTERVAL_MS);
    interval.unref();
  }, START_DELAY_MS);
  startTimer.unref();
};

export const stopMobileCustomerAccountDeletionCron = (): void => {
  if (startTimer) {
    clearTimeout(startTimer);
    startTimer = null;
  }
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
};
