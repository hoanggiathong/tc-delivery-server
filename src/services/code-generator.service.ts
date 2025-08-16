import { Delivery } from '@/models/delivery.model';
import { MoneyDelivery } from '@/models/money-delivery.model';
import { DeliveryCounter } from '@/models/delivery-counter.model';
import { Types } from 'mongoose';
import logger from '@/utils/logger';

export class CodeGeneratorService {
  private static readonly MAX_RETRIES = 10;
  private static readonly MAX_SEQUENCE = 9999;

  /**
   * Generate next delivery code with atomic operations
   * @param toRouteId - Target route ID for sequence numbering (required)
   * @param date - Date for the delivery (default: today)
   * @returns Promise<string> - Next available code
   */
  static async generateNextCodeAtomic(toRouteId: string, date: Date = new Date()): Promise<string> {
    // Validate required toRouteId parameter
    if (!toRouteId) {
      throw new Error('toRouteId is required for code generation');
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(toRouteId)) {
      throw new Error('toRouteId must be a valid ObjectId');
    }

    try {
      const datePrefix = this.formatDatePrefix(date);

      // Use atomic findOneAndUpdate to get next sequence
      const counter = await DeliveryCounter.findOneAndUpdate(
        { datePrefix, toRoute: new Types.ObjectId(toRouteId) },
        { $inc: { deliverySequence: 1 } },
        { new: true, upsert: true }
      );

      if (counter.deliverySequence > this.MAX_SEQUENCE) {
        throw new Error(
          `Maximum number of deliveries (${this.MAX_SEQUENCE}) reached for date ${datePrefix}`
        );
      }

      const code = `${datePrefix}${String(counter.deliverySequence).padStart(4, '0')}`;

      // Validate code uniqueness as extra safety
      await this.validateCodeUniqueness(code, toRouteId, 'delivery');

      return code;
    } catch (error) {
      logger.error('Error generating delivery code atomically:', error);
      throw error;
    }
  }

  /**
   * Generate next money delivery code with atomic operations
   * @param toRouteId - Target route ID for sequence numbering (required)
   * @param date - Date for the money delivery (default: today)
   * @returns Promise<string> - Next available code
   */
  static async generateNextMoneyDeliveryCodeAtomic(
    toRouteId: string,
    date: Date = new Date()
  ): Promise<string> {
    // Validate required toRouteId parameter
    if (!toRouteId) {
      throw new Error('toRouteId is required for money delivery code generation');
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(toRouteId)) {
      throw new Error('toRouteId must be a valid ObjectId');
    }

    try {
      const datePrefix = this.formatDatePrefix(date);

      // Use atomic findOneAndUpdate to get next sequence
      const counter = await DeliveryCounter.findOneAndUpdate(
        { datePrefix, toRoute: new Types.ObjectId(toRouteId) },
        { $inc: { moneyDeliverySequence: 1 } },
        { new: true, upsert: true }
      );

      if (counter.moneyDeliverySequence > this.MAX_SEQUENCE) {
        throw new Error(
          `Maximum number of money deliveries (${this.MAX_SEQUENCE}) reached for date ${datePrefix}`
        );
      }

      const code = `${datePrefix}${String(counter.moneyDeliverySequence).padStart(4, '0')}`;

      // Validate code uniqueness as extra safety
      await this.validateCodeUniqueness(code, toRouteId, 'money-delivery');

      return code;
    } catch (error) {
      logger.error('Error generating money delivery code atomically:', error);
      throw error;
    }
  }

  /**
   * Format date as DDMMYY prefix
   */
  private static formatDatePrefix(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}${month}${year}`;
  }

  /**
   * Validate code uniqueness in the target collection
   */
  private static async validateCodeUniqueness(
    code: string,
    toRouteId: string,
    type: 'delivery' | 'money-delivery'
  ): Promise<void> {
    const query = { code, toRoute: new Types.ObjectId(toRouteId) };

    const exists =
      type === 'delivery' ? await Delivery.exists(query) : await MoneyDelivery.exists(query);

    if (exists) {
      throw new Error(`${type} code ${code} already exists for route ${toRouteId}`);
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate next delivery code with format DDMMYY + sequence number (0001-9999)
   * @param toRouteId - Target route ID for sequence numbering (required)
   * @param date - Date for the delivery (default: today)
   * @returns Promise<string> - Next available code
   */
  static async generateNextCode(toRouteId: string, date: Date = new Date()): Promise<string> {
    return this.generateNextCodeWithRetry(toRouteId, date);
  }

  /**
   * Generate next delivery code with retry mechanism
   */
  private static async generateNextCodeWithRetry(toRouteId: string, date: Date): Promise<string> {
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        // Try atomic generation first
        return await this.generateNextCodeAtomic(toRouteId, date);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // If it's a duplicate code error and we have retries left, try fallback
        if (errorMessage.includes('already exists') && attempt < this.MAX_RETRIES - 1) {
          logger.warn(
            `Code generation attempt ${attempt + 1} failed due to duplicate, retrying...`
          );
          // Try legacy method as fallback
          try {
            return await this.generateNextCodeLegacy(toRouteId, date);
          } catch (fallbackError) {
            // If fallback also fails, continue to next retry
            logger.warn(`Fallback method also failed on attempt ${attempt + 1}`);
            await this.sleep(Math.random() * 100); // Random delay before retry
            continue;
          }
        }

        // If it's not a duplicate error or we're out of retries, throw
        throw error;
      }
    }

    throw new Error(`Failed to generate unique delivery code after ${this.MAX_RETRIES} attempts`);
  }

  /**
   * Legacy method for fallback (with improved logic)
   */
  private static async generateNextCodeLegacy(toRouteId: string, date: Date): Promise<string> {
    const datePrefix = this.formatDatePrefix(date);

    // Find the highest sequence number for today and toRoute
    const lastCode = await this.findLastCodeForDate(datePrefix, toRouteId);

    let nextSequence = 1;
    if (lastCode) {
      const lastSequence = parseInt(lastCode.slice(-4)); // Get last 4 digits
      nextSequence = lastSequence + 1;
    }

    // Check if we've reached the maximum sequence number for the day
    if (nextSequence > this.MAX_SEQUENCE) {
      throw new Error(
        `Maximum number of deliveries (${this.MAX_SEQUENCE}) reached for date ${datePrefix}`
      );
    }

    // Format sequence number as 4-digit string with leading zeros
    const sequenceStr = String(nextSequence).padStart(4, '0');
    const newCode = `${datePrefix}${sequenceStr}`;

    // Verify the code doesn't already exist
    await this.validateCodeUniqueness(newCode, toRouteId, 'delivery');

    return newCode;
  }

  /**
   * Generate next money delivery code with format DDMMYY + sequence number (0001-9999)
   * @param toRouteId - Target route ID for sequence numbering (required)
   * @param date - Date for the money delivery (default: today)
   * @returns Promise<string> - Next available code
   */
  static async generateNextMoneyDeliveryCode(
    toRouteId: string,
    date: Date = new Date()
  ): Promise<string> {
    return this.generateNextMoneyDeliveryCodeWithRetry(toRouteId, date);
  }

  /**
   * Generate next money delivery code with retry mechanism
   */
  private static async generateNextMoneyDeliveryCodeWithRetry(
    toRouteId: string,
    date: Date
  ): Promise<string> {
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        // Try atomic generation first
        return await this.generateNextMoneyDeliveryCodeAtomic(toRouteId, date);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // If it's a duplicate code error and we have retries left, try fallback
        if (errorMessage.includes('already exists') && attempt < this.MAX_RETRIES - 1) {
          logger.warn(
            `Money delivery code generation attempt ${attempt + 1} failed due to duplicate, retrying...`
          );
          // Try legacy method as fallback
          try {
            return await this.generateNextMoneyDeliveryCodeLegacy(toRouteId, date);
          } catch (fallbackError) {
            // If fallback also fails, continue to next retry
            logger.warn(`Money delivery fallback method also failed on attempt ${attempt + 1}`);
            await this.sleep(Math.random() * 100); // Random delay before retry
            continue;
          }
        }

        // If it's not a duplicate error or we're out of retries, throw
        throw error;
      }
    }

    throw new Error(
      `Failed to generate unique money delivery code after ${this.MAX_RETRIES} attempts`
    );
  }

  /**
   * Legacy method for money delivery fallback
   */
  private static async generateNextMoneyDeliveryCodeLegacy(
    toRouteId: string,
    date: Date
  ): Promise<string> {
    const datePrefix = this.formatDatePrefix(date);

    // Find the highest sequence number for today and toRoute
    const lastCode = await this.findLastMoneyDeliveryCodeForDate(datePrefix, toRouteId);

    let nextSequence = 1;
    if (lastCode) {
      const lastSequence = parseInt(lastCode.slice(-4)); // Get last 4 digits
      nextSequence = lastSequence + 1;
    }

    // Check if we've reached the maximum sequence number for the day
    if (nextSequence > this.MAX_SEQUENCE) {
      throw new Error(
        `Maximum number of money deliveries (${this.MAX_SEQUENCE}) reached for date ${datePrefix}`
      );
    }

    // Format sequence number as 4-digit string with leading zeros
    const sequenceStr = String(nextSequence).padStart(4, '0');
    const newCode = `${datePrefix}${sequenceStr}`;

    // Verify the code doesn't already exist
    await this.validateCodeUniqueness(newCode, toRouteId, 'money-delivery');

    return newCode;
  }

  /**
   * Find the last delivery code for a specific date and toRoute
   */
  private static async findLastCodeForDate(
    datePrefix: string,
    toRouteId: string
  ): Promise<string | null> {
    try {
      const regex = new RegExp(`^${datePrefix}\\d{4}$`);
      const lastCode = await Delivery.findOne({
        code: regex,
        toRoute: new Types.ObjectId(toRouteId),
      })
        .sort({ code: -1 })
        .select('code')
        .lean();

      return lastCode ? lastCode.code : null;
    } catch (error) {
      logger.error('Error finding last code for date and toRoute:', error);
      return null;
    }
  }

  /**
   * Find the last money delivery code for a specific date and toRoute
   */
  private static async findLastMoneyDeliveryCodeForDate(
    datePrefix: string,
    toRouteId: string
  ): Promise<string | null> {
    try {
      const regex = new RegExp(`^${datePrefix}\\d{4}$`);
      const lastCode = await MoneyDelivery.findOne({
        code: regex,
        toRoute: new Types.ObjectId(toRouteId),
      })
        .sort({ code: -1 })
        .select('code')
        .lean();

      return lastCode ? lastCode.code : null;
    } catch (error) {
      logger.error('Error finding last money delivery code for date and toRoute:', error);
      return null;
    }
  }

  /**
   * Generate code with specific sequence number
   */
  private static async generateNextCodeWithSequence(
    datePrefix: string,
    toRouteId: string,
    sequence: number
  ): Promise<string> {
    if (sequence > 9999) {
      throw new Error(`Maximum number of deliveries (9999) reached for date ${datePrefix}`);
    }

    const sequenceStr = String(sequence).padStart(4, '0');
    const newCode = `${datePrefix}${sequenceStr}`;

    // Check if this code exists for the same toRoute
    const existingDelivery = await Delivery.findOne({
      code: newCode,
      toRoute: new Types.ObjectId(toRouteId),
    }).lean();
    if (existingDelivery) {
      // Try next sequence
      return this.generateNextCodeWithSequence(datePrefix, toRouteId, sequence + 1);
    }

    return newCode;
  }

  /**
   * Generate money delivery code with specific sequence number
   */
  private static async generateNextMoneyDeliveryCodeWithSequence(
    datePrefix: string,
    toRouteId: string,
    sequence: number
  ): Promise<string> {
    if (sequence > 9999) {
      throw new Error(`Maximum number of money deliveries (9999) reached for date ${datePrefix}`);
    }

    const sequenceStr = String(sequence).padStart(4, '0');
    const newCode = `${datePrefix}${sequenceStr}`;

    // Check if this code exists for the same toRoute
    const existingMoneyDelivery = await MoneyDelivery.findOne({
      code: newCode,
      toRoute: new Types.ObjectId(toRouteId),
    }).lean();
    if (existingMoneyDelivery) {
      // Try next sequence
      return this.generateNextMoneyDeliveryCodeWithSequence(datePrefix, toRouteId, sequence + 1);
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
   * Get delivery count for a specific date and toRoute
   */
  static async getDeliveryCountForDate(date: Date, toRouteId?: string): Promise<number> {
    try {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      const datePrefix = `${day}${month}${year}`;

      const regex = new RegExp(`^${datePrefix}\\d{4}$`);
      const query: { code: RegExp; toRoute?: Types.ObjectId } = { code: regex };
      if (toRouteId) {
        query.toRoute = new Types.ObjectId(toRouteId);
      }
      const count = await Delivery.countDocuments(query);

      return count;
    } catch (error) {
      logger.error('Error getting delivery count for date and toRoute:', error);
      throw error;
    }
  }

  /**
   * Get money delivery count for a specific date and toRoute
   */
  static async getMoneyDeliveryCountForDate(date: Date, toRouteId?: string): Promise<number> {
    try {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      const datePrefix = `${day}${month}${year}`;

      const regex = new RegExp(`^${datePrefix}\\d{4}$`);
      const query: { code: RegExp; toRoute?: Types.ObjectId } = { code: regex };
      if (toRouteId) {
        query.toRoute = new Types.ObjectId(toRouteId);
      }
      const count = await MoneyDelivery.countDocuments(query);

      return count;
    } catch (error) {
      logger.error('Error getting money delivery count for date and toRoute:', error);
      throw error;
    }
  }

  /**
   * Check if maximum deliveries reached for a date and toRoute
   */
  static async isMaxDeliveriesReached(date: Date, toRouteId?: string): Promise<boolean> {
    try {
      const count = await this.getDeliveryCountForDate(date, toRouteId);
      return count >= 9999;
    } catch (error) {
      logger.error('Error checking max deliveries reached:', error);
      throw error;
    }
  }

  /**
   * Check if maximum money deliveries reached for a date and toRoute
   */
  static async isMaxMoneyDeliveriesReached(date: Date, toRouteId?: string): Promise<boolean> {
    try {
      const count = await this.getMoneyDeliveryCountForDate(date, toRouteId);
      return count >= 9999;
    } catch (error) {
      logger.error('Error checking max money deliveries reached:', error);
      throw error;
    }
  }

  /**
   * Get next code preview without actually generating it
   * @param toRouteId - Target route ID for sequence numbering (required)
   * @param date - Date for the delivery (default: today)
   * @returns Promise<string> - Next available code preview
   */
  static async getNextCodePreview(toRouteId: string, date: Date = new Date()): Promise<string> {
    // Validate required toRouteId parameter
    if (!toRouteId) {
      throw new Error('toRouteId is required for code preview');
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(toRouteId)) {
      throw new Error('toRouteId must be a valid ObjectId');
    }

    try {
      // Format date as DDMMYY
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      const datePrefix = `${day}${month}${year}`;

      // Find the highest sequence number for today and toRoute
      const lastCode = await this.findLastCodeForDate(datePrefix, toRouteId);

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
