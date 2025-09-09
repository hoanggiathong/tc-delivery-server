import { Delivery } from '@/models/delivery.model';
import { MoneyDelivery } from '@/models/money-delivery.model';
import { Route } from '@/models/route.model';
import { Types } from 'mongoose';
import logger from '@/utils/logger';

export class CodeGeneratorService {
  private static readonly MAX_RETRIES = 50;
  private static readonly MIN_SEQUENCE = 1;
  private static readonly MAX_SEQUENCE = 9999;

  /**
   * Generate unique code for delivery or money delivery
   * Format: YYMMDD + random sequence (0001-9999)
   * @param toRouteId - Target route ID
   * @param fromRouteId - Source route ID
   * @param type - Type of delivery ('delivery' | 'money-delivery')
   * @param date - Date for the code generation (default: today)
   * @returns Promise<{code: string, fullCode: string, subCode: string}>
   */
  static async generateCode(
    toRouteId: string,
    fromRouteId: string,
    type: 'delivery' | 'money-delivery',
    date: Date = new Date()
  ): Promise<{ code: string; fullCode: string; subCode: string }> {
    // Validate required parameters
    if (!toRouteId || !fromRouteId) {
      throw new Error('toRouteId and fromRouteId are required for code generation');
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(toRouteId) || !Types.ObjectId.isValid(fromRouteId)) {
      throw new Error('toRouteId and fromRouteId must be valid ObjectIds');
    }

    try {
      // Get route codes
      const [toRoute, fromRoute] = await Promise.all([
        Route.findById(toRouteId).select('code').lean(),
        Route.findById(fromRouteId).select('code').lean(),
      ]);

      if (!toRoute || !fromRoute) {
        throw new Error('Route not found');
      }

      const datePrefix = this.formatDatePrefix(date);
      const timestamp = Math.floor(Date.now() / 1000);

      // Try to generate unique code with random sequence
      for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
        const sequence = this.generateRandomSequence();
        const sequenceStr = String(sequence).padStart(4, '0');
        const code = `${datePrefix}${sequenceStr}`;

        // Generate fullCode based on type (MoneyDelivery gets -T suffix)
        const baseFullCode = `${code}${fromRoute.code}${toRoute.code}`;
        const fullCode = type === 'money-delivery' ? `${baseFullCode}-T` : baseFullCode;

        // Generate subCode: timestamp + sequence from code (last 4 digits)
        const codeSequence = code.substring(6, 10); // Extract XXXX from YYMMDDXXXX
        const subCode = `${timestamp}${codeSequence}`;

        // Check if fullCode already exists
        const exists = await this.checkFullCodeExists(fullCode);
        if (!exists) {
          return { code, fullCode, subCode };
        }

        // If this is the last attempt, log warning
        if (attempt === this.MAX_RETRIES - 1) {
          logger.warn(
            `Failed to generate unique ${type} code after ${this.MAX_RETRIES} attempts for date ${datePrefix}`
          );
        }
      }

      throw new Error(`Failed to generate unique ${type} code after ${this.MAX_RETRIES} attempts`);
    } catch (error) {
      logger.error(`Error generating ${type} code:`, error);
      throw error;
    }
  }

  /**
   * Generate next delivery code
   * @param toRouteId - Target route ID
   * @param fromRouteId - Source route ID
   * @param date - Date for the delivery (default: today)
   * @returns Promise<{code: string, fullCode: string, subCode: string}>
   */
  static async generateNextCode(
    toRouteId: string,
    fromRouteId: string,
    date: Date = new Date()
  ): Promise<{ code: string; fullCode: string; subCode: string }> {
    return this.generateCode(toRouteId, fromRouteId, 'delivery', date);
  }

  /**
   * Generate next money delivery code
   * @param toRouteId - Target route ID
   * @param fromRouteId - Source route ID
   * @param date - Date for the money delivery (default: today)
   * @returns Promise<{code: string, fullCode: string, subCode: string}>
   */
  static async generateNextMoneyDeliveryCode(
    toRouteId: string,
    fromRouteId: string,
    date: Date = new Date()
  ): Promise<{ code: string; fullCode: string; subCode: string }> {
    return this.generateCode(toRouteId, fromRouteId, 'money-delivery', date);
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
   * Generate random sequence number between 0001 and 9999
   */
  private static generateRandomSequence(): number {
    return (
      Math.floor(Math.random() * (this.MAX_SEQUENCE - this.MIN_SEQUENCE + 1)) + this.MIN_SEQUENCE
    );
  }

  /**
   * Check if fullCode already exists in either delivery or money delivery collections
   */
  private static async checkFullCodeExists(fullCode: string): Promise<boolean> {
    try {
      const [deliveryExists, moneyDeliveryExists] = await Promise.all([
        Delivery.exists({ fullCode }).lean(),
        MoneyDelivery.exists({ fullCode }).lean(),
      ]);

      return Boolean(deliveryExists || moneyDeliveryExists);
    } catch (error) {
      logger.error('Error checking fullCode existence:', error);
      throw error;
    }
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

    // Extract date parts (YYMMDD format)
    const year = parseInt(code.slice(0, 2));
    const month = parseInt(code.slice(2, 4));
    const day = parseInt(code.slice(4, 6));
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

    // Additional date validation (assume 00-99 means 20xx for delivery codes)
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

    const year = parseInt(code.slice(0, 2));
    const month = parseInt(code.slice(2, 4));
    const day = parseInt(code.slice(4, 6));
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
      const datePrefix = this.formatDatePrefix(date);
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
      const datePrefix = this.formatDatePrefix(date);
      const regex = new RegExp(`^${datePrefix}\\d{4}$`);
      const count = await MoneyDelivery.countDocuments({ code: regex });
      return count;
    } catch (error) {
      logger.error('Error getting money delivery count for date:', error);
      throw error;
    }
  }

  /**
   * Get next code preview without actually generating it
   * @param toRouteId - Target route ID
   * @param fromRouteId - Source route ID
   * @param date - Date for the delivery (default: today)
   * @returns Promise<{code: string, fullCode: string, subCode: string}>
   */
  static async getNextCodePreview(
    toRouteId: string,
    fromRouteId: string,
    date: Date = new Date()
  ): Promise<{ code: string; fullCode: string; subCode: string }> {
    // Validate required parameters
    if (!toRouteId || !fromRouteId) {
      throw new Error('toRouteId and fromRouteId are required for code preview');
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(toRouteId) || !Types.ObjectId.isValid(fromRouteId)) {
      throw new Error('toRouteId and fromRouteId must be valid ObjectIds');
    }

    try {
      // Get route codes
      const [toRoute, fromRoute] = await Promise.all([
        Route.findById(toRouteId).select('code').lean(),
        Route.findById(fromRouteId).select('code').lean(),
      ]);

      if (!toRoute || !fromRoute) {
        throw new Error('Route not found');
      }

      const datePrefix = this.formatDatePrefix(date);
      const timestamp = Math.floor(Date.now() / 1000);

      // Generate a sample sequence for preview
      const sequence = this.generateRandomSequence();
      const sequenceStr = String(sequence).padStart(4, '0');
      const code = `${datePrefix}${sequenceStr}`;

      // Generate fullCode (Note: preview doesn't specify type, so assume delivery)
      const fullCode = `${code}${fromRoute.code}${toRoute.code}`;

      // Generate subCode: timestamp + sequence from code (last 4 digits)
      const codeSequence = code.substring(6, 10); // Extract XXXX from YYMMDDXXXX
      const subCode = `${timestamp}${codeSequence}`;

      return { code, fullCode, subCode };
    } catch (error) {
      logger.error('Error getting next code preview:', error);
      throw error;
    }
  }
}
