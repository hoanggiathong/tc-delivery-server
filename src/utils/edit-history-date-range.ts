import type {
  IEditHistoryDateRangeQuery,
  IResolvedEditHistoryDateRange,
} from '@/types/edit-history.type';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 30;

interface IDateParts {
  year: number;
  month: number;
  day: number;
}

const pad2 = (value: number): string => String(value).padStart(2, '0');

const formatDateParts = (parts: IDateParts): string =>
  `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;

const parseDateParts = (value: string, fieldName: string): IDateParts => {
  const match = value.match(DATE_PATTERN);

  if (!match) {
    throw new Error(`Validation error: ${fieldName} must use YYYY-MM-DD format`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Validation error: ${fieldName} is not a valid calendar date`);
  }

  return { year, month, day };
};

const toCalendarOrdinal = (parts: IDateParts): number =>
  Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_MS;

const toVietnamStartOfDayUtc = (parts: IDateParts): Date =>
  new Date(Date.UTC(parts.year, parts.month - 1, parts.day) - VIETNAM_UTC_OFFSET_MS);

const addCalendarDays = (parts: IDateParts, amount: number): IDateParts => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day) + amount * DAY_MS);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

const getTodayInVietnam = (): IDateParts => {
  const shifted = new Date(Date.now() + VIETNAM_UTC_OFFSET_MS);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
};

export const resolveEditHistoryDateRange = (
  query: IEditHistoryDateRangeQuery
): IResolvedEditHistoryDateRange => {
  const hasStartDate = Boolean(query.startDate);
  const hasEndDate = Boolean(query.endDate);

  if (hasStartDate !== hasEndDate) {
    throw new Error('Validation error: startDate and endDate must be provided together');
  }

  const endParts = hasEndDate
    ? parseDateParts(String(query.endDate), 'endDate')
    : getTodayInVietnam();

  const startParts = hasStartDate
    ? parseDateParts(String(query.startDate), 'startDate')
    : addCalendarDays(endParts, -(MAX_RANGE_DAYS - 1));

  const startOrdinal = toCalendarOrdinal(startParts);
  const endOrdinal = toCalendarOrdinal(endParts);

  if (startOrdinal > endOrdinal) {
    throw new Error('Validation error: startDate cannot be after endDate');
  }

  const totalDays = endOrdinal - startOrdinal + 1;

  if (totalDays > MAX_RANGE_DAYS) {
    throw new Error(`Validation error: date range cannot exceed ${MAX_RANGE_DAYS} days`);
  }

  const endExclusiveParts = addCalendarDays(endParts, 1);

  return {
    startDate: toVietnamStartOfDayUtc(startParts),
    endDateExclusive: toVietnamStartOfDayUtc(endExclusiveParts),
    startDateText: formatDateParts(startParts),
    endDateText: formatDateParts(endParts),
    totalDays,
  };
};
