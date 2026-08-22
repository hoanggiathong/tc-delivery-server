import { MobileNewsPublicationService } from '@/modules/mobile-customer/mobile-news-publication.service';
import Logger from '@/utils/logger';

const INTERVAL_MS = 60 * 1000;

const START_DELAY_MS = 20 * 1000;

let interval: NodeJS.Timeout | null = null;

let startTimer: NodeJS.Timeout | null = null;

let running = false;

const service = new MobileNewsPublicationService();

export const runMobileNewsPublicationJob = async (): Promise<void> => {
  if (running) {
    return;
  }

  running = true;

  try {
    const result = await service.processDue(20);

    if (result.processed > 0 || result.duplicate > 0 || result.failed > 0) {
      Logger.info('Mobile news publication job completed', result);
    }
  } catch (error) {
    Logger.error('Mobile news publication job failed', {
      error: error instanceof Error ? error.message : error,
    });
  } finally {
    running = false;
  }
};

export const startMobileNewsPublicationCron = (): void => {
  if (interval || startTimer) {
    return;
  }

  startTimer = setTimeout(() => {
    startTimer = null;

    void runMobileNewsPublicationJob();

    interval = setInterval(() => {
      void runMobileNewsPublicationJob();
    }, INTERVAL_MS);

    interval.unref();
  }, START_DELAY_MS);

  startTimer.unref();
};

export const stopMobileNewsPublicationCron = (): void => {
  if (startTimer) {
    clearTimeout(startTimer);
    startTimer = null;
  }

  if (interval) {
    clearInterval(interval);
    interval = null;
  }
};
