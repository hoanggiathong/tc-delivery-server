/**
 * Date utility functions for handling Vietnam timezone (UTC+7)
 * MongoDB stores dates in UTC, so we need to convert Vietnam time to UTC for queries
 */

const VIETNAM_TIMEZONE_OFFSET = 7 * 60; // UTC+7 in minutes

/**
 * Parse a date string in YYYY-MM-DD format to a Date object in Vietnam timezone
 * @param dateString - Date string in YYYY-MM-DD format (e.g., "2024-01-15")
 * @returns Date object representing the date in Vietnam timezone
 */
export function parseVietnameseDate(dateString: string): Date {
  // Parse as YYYY-MM-DD and create date in local context
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get the start of day (00:00:00.000) for a given date in Vietnam timezone
 * @param date - Input date
 * @returns Date object set to 00:00:00.000 in Vietnam timezone
 */
export function getStartOfDayVietnam(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * Get the end of day (23:59:59.999) for a given date in Vietnam timezone
 * @param date - Input date
 * @returns Date object set to 23:59:59.999 in Vietnam timezone
 */
export function getEndOfDayVietnam(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/**
 * Convert a Vietnam time Date object to UTC by subtracting 7 hours
 * This is used to convert user input (Vietnam time) to UTC for MongoDB queries
 * @param vietnamDate - Date object in Vietnam timezone
 * @returns Date object converted to UTC
 */
export function convertVietnamToUTC(vietnamDate: Date): Date {
  const utcDate = new Date(vietnamDate);
  utcDate.setMinutes(utcDate.getMinutes() - VIETNAM_TIMEZONE_OFFSET);
  return utcDate;
}

/**
 * Parse a YYYY-MM-DD date string and return start of day in UTC
 * This combines parseVietnameseDate, getStartOfDayVietnam, and convertVietnamToUTC
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object representing start of day (00:00:00.000) in UTC
 */
export function getStartOfDayUTC(dateString: string): Date {
  const vietnamDate = parseVietnameseDate(dateString);
  const startOfDay = getStartOfDayVietnam(vietnamDate);
  return convertVietnamToUTC(startOfDay);
}

/**
 * Parse a YYYY-MM-DD date string and return end of day in UTC
 * This combines parseVietnameseDate, getEndOfDayVietnam, and convertVietnamToUTC
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object representing end of day (23:59:59.999) in UTC
 */
export function getEndOfDayUTC(dateString: string): Date {
  const vietnamDate = parseVietnameseDate(dateString);
  const endOfDay = getEndOfDayVietnam(vietnamDate);
  return convertVietnamToUTC(endOfDay);
}
