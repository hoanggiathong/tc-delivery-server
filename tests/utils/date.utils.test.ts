import {
  parseVietnameseDate,
  getStartOfDayVietnam,
  getEndOfDayVietnam,
  convertVietnamToUTC,
  getStartOfDayUTC,
  getEndOfDayUTC,
} from '@/utils/date.utils';

describe('Date Utils', () => {
  describe('parseVietnameseDate', () => {
    it('should parse YYYY-MM-DD format correctly', () => {
      const result = parseVietnameseDate('2024-01-15');
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it('should handle different months', () => {
      const result = parseVietnameseDate('2024-12-31');
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(31);
    });
  });

  describe('getStartOfDayVietnam', () => {
    it('should return 00:00:00.000', () => {
      const date = new Date(2024, 0, 15, 14, 30, 45, 500);
      const result = getStartOfDayVietnam(date);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
      expect(result.getDate()).toBe(15);
    });
  });

  describe('getEndOfDayVietnam', () => {
    it('should return 23:59:59.999', () => {
      const date = new Date(2024, 0, 15, 10, 20, 30, 400);
      const result = getEndOfDayVietnam(date);

      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
      expect(result.getDate()).toBe(15);
    });
  });

  describe('convertVietnamToUTC', () => {
    it('should subtract 7 hours from Vietnam time', () => {
      const vietnamDate = new Date(2024, 0, 15, 10, 0, 0, 0);
      const result = convertVietnamToUTC(vietnamDate);

      expect(result.getHours()).toBe(3);
    });

    it('should handle date boundary crossing when converting', () => {
      const vietnamDate = new Date(2024, 0, 15, 3, 0, 0, 0);
      const result = convertVietnamToUTC(vietnamDate);

      expect(result.getDate()).toBe(14);
      expect(result.getHours()).toBe(20);
    });
  });

  describe('getStartOfDayUTC', () => {
    it('should return start of day in UTC (00:00 VN = 17:00 previous day UTC)', () => {
      const result = getStartOfDayUTC('2024-01-15');

      expect(result.getDate()).toBe(14);
      expect(result.getHours()).toBe(17);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe('getEndOfDayUTC', () => {
    it('should return end of day in UTC (23:59:59.999 VN = 16:59:59.999 same day UTC)', () => {
      const result = getEndOfDayUTC('2024-01-15');

      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(16);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });
  });

  describe('Integration tests', () => {
    it('should handle date range query correctly', () => {
      const startUTC = getStartOfDayUTC('2024-01-15');
      const endUTC = getEndOfDayUTC('2024-01-15');

      expect(startUTC.getTime()).toBeLessThan(endUTC.getTime());
      const diffHours = (endUTC.getTime() - startUTC.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeCloseTo(24, 0);
    });

    it('should handle multi-day range', () => {
      const startUTC = getStartOfDayUTC('2024-01-01');
      const endUTC = getEndOfDayUTC('2024-01-31');

      expect(startUTC.getTime()).toBeLessThan(endUTC.getTime());
      const diffDays = Math.ceil((endUTC.getTime() - startUTC.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(31);
    });
  });
});
