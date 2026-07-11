import { z } from 'zod';
import { DATE_YYYY_MM_DD_PATTERN, VALIDATION_MESSAGES } from '@/utils/validation-patterns';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const VIETNAM_TIMEZONE_OFFSET_IN_MS = 7 * 60 * 60 * 1000;
const MAX_DATE_RANGE_DAYS = 30;

interface IDateParts {
  year: number;
  month: number;
  day: number;
}

const parseDateParts = (value: string): IDateParts | null => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
  };
};

const addDays = (dateParts: IDateParts, days: number): IDateParts => {
  const date = new Date(
    Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day) + days * DAY_IN_MS
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

const formatDateParts = (dateParts: IDateParts): string =>
  `${dateParts.year}-${String(dateParts.month).padStart(2, '0')}-${String(dateParts.day).padStart(
    2,
    '0'
  )}`;

const getTodayInVietnam = (): IDateParts => {
  const vietnamNow = new Date(Date.now() + VIETNAM_TIMEZONE_OFFSET_IN_MS);

  return {
    year: vietnamNow.getUTCFullYear(),
    month: vietnamNow.getUTCMonth() + 1,
    day: vietnamNow.getUTCDate(),
  };
};

const getVietnamStartOfDayUTC = (dateParts: IDateParts): Date =>
  new Date(
    Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day) - VIETNAM_TIMEZONE_OFFSET_IN_MS
  );

const getVietnamEndOfDayUTC = (dateParts: IDateParts): Date => {
  const nextDay = addDays(dateParts, 1);

  return new Date(getVietnamStartOfDayUTC(nextDay).getTime() - 1);
};

const getCalendarDayNumber = (dateParts: IDateParts): number =>
  Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day) / DAY_IN_MS;

const editHistoryDateSchema = z
  .string()
  .regex(DATE_YYYY_MM_DD_PATTERN, VALIDATION_MESSAGES.DATE_YYYY_MM_DD);

const editHistoryDateRangeQuerySchema = z
  .object({
    startDate: editHistoryDateSchema.optional(),
    endDate: editHistoryDateSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const hasStartDate = Boolean(data.startDate);
    const hasEndDate = Boolean(data.endDate);

    if (hasStartDate !== hasEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start date and end date must be provided together',
        path: hasStartDate ? ['endDate'] : ['startDate'],
      });
      return;
    }

    if (!data.startDate || !data.endDate) {
      return;
    }

    const startDateParts = parseDateParts(data.startDate);
    const endDateParts = parseDateParts(data.endDate);

    if (!startDateParts) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start date is not a valid calendar date',
        path: ['startDate'],
      });
    }

    if (!endDateParts) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date is not a valid calendar date',
        path: ['endDate'],
      });
    }

    if (!startDateParts || !endDateParts) {
      return;
    }

    const startDayNumber = getCalendarDayNumber(startDateParts);
    const endDayNumber = getCalendarDayNumber(endDateParts);

    if (startDayNumber > endDayNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start date must be before or equal to end date',
        path: ['startDate'],
      });
      return;
    }

    const totalDays = endDayNumber - startDayNumber + 1;

    if (totalDays > MAX_DATE_RANGE_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`,
        path: ['endDate'],
      });
    }
  })
  .transform(data => {
    const defaultEndDateParts = getTodayInVietnam();
    const defaultStartDateParts = addDays(defaultEndDateParts, -(MAX_DATE_RANGE_DAYS - 1));

    const startDateParts = data.startDate
      ? (parseDateParts(data.startDate) ?? defaultStartDateParts)
      : defaultStartDateParts;

    const endDateParts = data.endDate
      ? (parseDateParts(data.endDate) ?? defaultEndDateParts)
      : defaultEndDateParts;

    return {
      startDate: getVietnamStartOfDayUTC(startDateParts),
      endDate: getVietnamEndOfDayUTC(endDateParts),
      startDateText: formatDateParts(startDateParts),
      endDateText: formatDateParts(endDateParts),
    };
  });

export const editHistoryDateRangeSchema = z.object({
  query: editHistoryDateRangeQuerySchema,
});

export type EditHistoryDateRangeQuery = z.infer<typeof editHistoryDateRangeSchema>['query'];
