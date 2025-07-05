import { Delivery } from '@/models/delivery.model';
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
   * Generate next code for preview (doesn't reserve the code)
   * @param date - Date for the delivery (default: today)
   * @returns Promise<string> - Next available code for preview
   */
  static async getNextCodePreview(date: Date = new Date()): Promise<string> {
    return this.generateNextCode(date);
  }

    /**
   * Find the last code for a specific date prefix
   * @param datePrefix - Date prefix in DDMMYY format
   * @returns Promise<string | null> - Last code or null if none found
   */
  private static async findLastCodeForDate(datePrefix: string): Promise<string | null> {
    try {
      const regex = new RegExp(`^${datePrefix}\\d{4}$`);

      const deliveries = await Delivery.find(
        { code: { $regex: regex } },
        { code: 1 }
      )
      .sort({ code: -1 })
      .limit(1)
      .lean();

      return deliveries.length > 0 ? deliveries[0].code : null;

    } catch (error) {
      logger.error('Error finding last code for date:', error);
      throw error;
    }
  }

  /**
   * Generate code with specific sequence number
   * @param datePrefix - Date prefix in DDMMYY format
   * @param sequence - Sequence number
   * @returns Promise<string> - Generated code
   */
  private static async generateNextCodeWithSequence(datePrefix: string, sequence: number): Promise<string> {
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
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    if (sequence < 1 || sequence > 9999) return false;

    // Additional date validation (assume 00-99 all means 20xx for delivery codes)
    const fullYear = 2000 + year;
    const date = new Date(fullYear, month - 1, day);

    return date.getDate() === day &&
           date.getMonth() === month - 1 &&
           date.getFullYear() === fullYear;
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
   * @param date - Date to check
   * @returns Promise<number> - Number of deliveries for the date
   */
  static async getDeliveryCountForDate(date: Date): Promise<number> {
    try {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      const datePrefix = `${day}${month}${year}`;

      const regex = new RegExp(`^${datePrefix}\\d{4}$`);

      return await Delivery.countDocuments({ code: { $regex: regex } });

    } catch (error) {
      logger.error('Error getting delivery count for date:', error);
      throw error;
    }
  }

  /**
   * Check if maximum deliveries reached for a date
   * @param date - Date to check
   * @returns Promise<boolean> - True if maximum reached
   */
  static async isMaxDeliveriesReached(date: Date): Promise<boolean> {
    const count = await this.getDeliveryCountForDate(date);
    return count >= 9999;
  }
}