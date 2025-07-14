import { Delivery } from '@/models/delivery.model';
import { MoneyDelivery } from '@/models/money-delivery.model';
import logger from '@/utils/logger';

export class CodeGeneratorService {
  /**
   * Generate next delivery code with format DDMMYY + sequence number (0001-9999)
   * @param date - Date for the delivery (default: today)
   * @returns Promise<string> - Next available code
   */
  static async generateNextCode(date: Date = new Date()): Promise<string> {
    try {
      // Format date as DDMMYY
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      const datePrefix = `${day}${month}${year}`;

      // Find the highest sequence number for today
      const lastCode = await this.findLastCodeForDate(datePrefix);

      let nextSequence = 1;
      if (lastCode) {
        const lastSequence = parseInt(lastCode.slice(-4)); // Get last 4 digits
        nextSequence = lastSequence + 1;
      }

      // Check if we've reached the maximum sequence number for the day
      if (nextSequence > 9999) {
        throw new Error(`Maximum number of deliveries (9999) reached for date ${datePrefix}`);
      }

      // Format sequence number as 4-digit string with leading zeros
      const sequenceStr = String(nextSequence).padStart(4, '0');
      const newCode = `${datePrefix}${sequenceStr}`;

      // Verify the code doesn't already exist (extra safety check)
      const existingDelivery = await Delivery.findOne({ code: newCode }).lean();
      if (existingDelivery) {
        logger.warn(`Code ${newCode} already exists, trying next sequence`);
        // Recursively try next code (this should be rare)
        return this.generateNextCodeWithSequence(datePrefix, nextSequence + 1);
      }

      return newCode;
    } catch (error) {
      logger.error('Error generating delivery code:', error);
      throw error;
    }
  }

  /**
   * Generate next money delivery code with format DDMMYY + sequence number (0001-9999)
   * @param date - Date for the money delivery (default: today)
   * @returns Promise<string> - Next available code
   */
  static async generateNextMoneyDeliveryCode(date: Date = new Date()): Promise<string> {
    try {
      // Format date as DDMMYY
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      const datePrefix = `${day}${month}${year}`;

      // Find the highest sequence number for today
      const lastCode = await this.findLastMoneyDeliveryCodeForDate(datePrefix);

      let nextSequence = 1;
      if (lastCode) {
        const lastSequence = parseInt(lastCode.slice(-4)); // Get last 4 digits
        nextSequence = lastSequence + 1;
      }

      // Check if we've reached the maximum sequence number for the day
      if (nextSequence > 9999) {
        throw new Error(`Maximum number of money deliveries (9999) reached for date ${datePrefix}`);
      }

      // Format sequence number as 4-digit string with leading zeros
      const sequenceStr = String(nextSequence).padStart(4, '0');
      const newCode = `${datePrefix}${sequenceStr}`;

      // Verify the code doesn't already exist (extra safety check)
      const existingMoneyDelivery = await MoneyDelivery.findOne({ code: newCode }).lean();
      if (existingMoneyDelivery) {
        logger.warn(`Money delivery code ${newCode} already exists, trying next sequence`);
        // Recursively try next code (this should be rare)
        return this.generateNextMoneyDeliveryCodeWithSequence(datePrefix, nextSequence + 1);
      }

      return newCode;
    } catch (error) {
      logger.error('Error generating money delivery code:', error);
      throw error;
    }
  }

  /**
   * Find the last delivery code for a specific date
   */
  private static async findLastCodeForDate(datePrefix: string): Promise<string | null> {
    try {
      const regex = new RegExp(`^${datePrefix}\\d{4}$`);
      const lastCode = await Delivery.findOne({ code: regex })
        .sort({ code: -1 })
        .select('code')
        .lean();

      return lastCode ? lastCode.code : null;
    } catch (error) {
      logger.error('Error finding last code for date:', error);
      return null;
    }
  }

  /**
   * Find the last money delivery code for a specific date
   */
  private static async findLastMoneyDeliveryCodeForDate(
    datePrefix: string
  ): Promise<string | null> {
    try {
      const regex = new RegExp(`^${datePrefix}\\d{4}$`);
      const lastCode = await MoneyDelivery.findOne({ code: regex })
        .sort({ code: -1 })
        .select('code')
        .lean();

      return lastCode ? lastCode.code : null;
    } catch (error) {
      logger.error('Error finding last money delivery code for date:', error);
      return null;
    }
  }

  /**
   * Generate code with specific sequence number
   */
  private static async generateNextCodeWithSequence(
    datePrefix: string,
    sequence: number
  ): Promise<string> {
    if (sequence > 9999) {
      throw new Error(`Maximum number of deliveries (9999) reached for date ${datePrefix}`);
    }

    const sequenceStr = String(sequence).padStart(4, '0');
    const newCode = `${datePrefix}${sequenceStr}`;

    // Check if this code exists
    const existingDelivery = await Delivery.findOne({ code: newCode }).lean();
    if (existingDelivery) {
      // Try next sequence
      return this.generateNextCodeWithSequence(datePrefix, sequence + 1);
    }

    return newCode;
  }

  /**
   * Generate money delivery code with specific sequence number
   */
  private static async generateNextMoneyDeliveryCodeWithSequence(
    datePrefix: string,
    sequence: number
  ): Promise<string> {
    if (sequence > 9999) {
      throw new Error(`Maximum number of money deliveries (9999) reached for date ${datePrefix}`);
    }

    const sequenceStr = String(sequence).padStart(4, '0');
    const newCode = `${datePrefix}${sequenceStr}`;

    // Check if this code exists
    const existingMoneyDelivery = await MoneyDelivery.findOne({ code: newCode }).lean();
    if (existingMoneyDelivery) {
      // Try next sequence
      return this.generateNextMoneyDeliveryCodeWithSequence(datePrefix, sequence + 1);
    }

    return newCode;
  }

  /**
   * Validate delivery code format
   * @param code - Code to validate
   * @returns boolean - True if valid format
   */
  static validateCodeFormat(code: string): boolean {
    // Check if code is exactly 10 digits
    if (!/^\d{10}$/.test(code)) {
      return false;
    }

    // Extract date parts
    const day = parseInt(code.slice(0, 2));
    const month = parseInt(code.slice(2, 4));
    const year = parseInt(code.slice(4, 6));
    const sequence = parseInt(code.slice(6, 10));

    // Validate date parts
    if (day < 1 || day > 31) {
      return false;
    }
    if (month < 1 || month > 12) {
      return false;
    }
    if (sequence < 1 || sequence > 9999) {
      return false;
    }

    // Additional date validation (assume 00-99 all means 20xx for delivery codes)
    const fullYear = 2000 + year;
    const date = new Date(fullYear, month - 1, day);

    return (
      date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === fullYear
    );
  }

  /**
   * Parse delivery code to extract date and sequence
   * @param code - Delivery code
   * @returns object with date and sequence
   */
  static parseCode(code: string): { date: Date; sequence: number } | null {
    if (!this.validateCodeFormat(code)) {
      return null;
    }

    const day = parseInt(code.slice(0, 2));
    const month = parseInt(code.slice(2, 4));
    const year = parseInt(code.slice(4, 6));
    const sequence = parseInt(code.slice(6, 10));

    const fullYear = 2000 + year;
    const date = new Date(fullYear, month - 1, day);

    return { date, sequence };
  }

  /**
   * Get delivery count for a specific date
   */
  static async getDeliveryCountForDate(date: Date): Promise<number> {
    try {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      const datePrefix = `${day}${month}${year}`;

      const regex = new RegExp(`^${datePrefix}\\d{4}$`);
      const count = await Delivery.countDocuments({ code: regex });

      return count;
    } catch (error) {
      logger.error('Error getting delivery count for date:', error);
      throw error;
    }
  }

  /**
   * Get money delivery count for a specific date
   */
  static async getMoneyDeliveryCountForDate(date: Date): Promise<number> {
    try {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      const datePrefix = `${day}${month}${year}`;

      const regex = new RegExp(`^${datePrefix}\\d{4}$`);
      const count = await MoneyDelivery.countDocuments({ code: regex });

      return count;
    } catch (error) {
      logger.error('Error getting money delivery count for date:', error);
      throw error;
    }
  }

  /**
   * Check if maximum deliveries reached for a date
   */
  static async isMaxDeliveriesReached(date: Date): Promise<boolean> {
    try {
      const count = await this.getDeliveryCountForDate(date);
      return count >= 9999;
    } catch (error) {
      logger.error('Error checking max deliveries reached:', error);
      throw error;
    }
  }

  /**
   * Check if maximum money deliveries reached for a date
   */
  static async isMaxMoneyDeliveriesReached(date: Date): Promise<boolean> {
    try {
      const count = await this.getMoneyDeliveryCountForDate(date);
      return count >= 9999;
    } catch (error) {
      logger.error('Error checking max money deliveries reached:', error);
      throw error;
    }
  }

  /**
   * Get next code preview without actually generating it
   * @param date - Date for the delivery (default: today)
   * @returns Promise<string> - Next available code preview
   */
  static async getNextCodePreview(date: Date = new Date()): Promise<string> {
    try {
      // Format date as DDMMYY
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      const datePrefix = `${day}${month}${year}`;

      // Find the highest sequence number for today
      const lastCode = await this.findLastCodeForDate(datePrefix);

      let nextSequence = 1;
      if (lastCode) {
        const lastSequence = parseInt(lastCode.slice(-4)); // Get last 4 digits
        nextSequence = lastSequence + 1;
      }

      // Check if we've reached the maximum sequence number for the day
      if (nextSequence > 9999) {
        throw new Error(`Maximum number of deliveries (9999) reached for date ${datePrefix}`);
      }

      // Format sequence number as 4-digit string with leading zeros
      const sequenceStr = String(nextSequence).padStart(4, '0');
      const newCode = `${datePrefix}${sequenceStr}`;

      return newCode;
    } catch (error) {
      logger.error('Error getting next code preview:', error);
      throw error;
    }
  }
}
