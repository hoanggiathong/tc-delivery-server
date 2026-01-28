/**
 * Centralized validation patterns for the TC Delivery Server
 * This file contains all regex patterns used for validation across the application
 */

// Phone number validation pattern (international format)
export const PHONE_NUMBER_PATTERN = /^\+?[1-9]\d{1,14}$/;

// MongoDB ObjectId validation pattern
export const OBJECTID_PATTERN = /^[0-9a-fA-F]{24}$/;

// Route code validation patterns
// Allows: AB, T1, T2, 3H (letter+letter, letter+digits, or digits+letter)
export const ROUTE_CODE_PATTERN = /^([A-Z]([A-Z]|\d+)|\d+[A-Z])$/;

// Delivery identifier validation patterns
// Supports route codes like: AB, T1, 3H
export const DELIVERY_IDENTIFIER_PATTERN = /^\d{10}([A-Z]([A-Z]|\d+)|\d+[A-Z])([A-Z]([A-Z]|\d+)|\d+[A-Z])$/;

// Money delivery identifier validation patterns
// Supports route codes like: AB, T1, 3H
export const MONEY_DELIVERY_IDENTIFIER_PATTERN = /^\d{10}([A-Z]([A-Z]|\d+)|\d+[A-Z])([A-Z]([A-Z]|\d+)|\d+[A-Z])-T$/;

// Date validation pattern (YYYY-MM-DD format)
export const DATE_YYYY_MM_DD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Parsing patterns for delivery services
// Supports route codes like: AB, T1, 3H
export const DELIVERY_IDENTIFIER_PARSE_PATTERN = /^(\d{10})([A-Z]([A-Z]|\d+)|\d+[A-Z])([A-Z]([A-Z]|\d+)|\d+[A-Z])$/;
export const MONEY_DELIVERY_IDENTIFIER_PARSE_PATTERN =
  /^(\d{10})([A-Z]([A-Z]|\d+)|\d+[A-Z])([A-Z]([A-Z]|\d+)|\d+[A-Z])-T$/;

// Error messages
export const VALIDATION_MESSAGES = {
  PHONE_NUMBER: 'Please enter a valid phone number (international format, e.g., +84901234567)',
  OBJECTID: 'Invalid ID format',
  ROUTE_CODE:
    'Code must be letter+letter, letter+numbers, or numbers+letter (e.g., T1, T2, AB, CD, 3H)',
  DELIVERY_IDENTIFIER:
    'Invalid delivery identifier format. Expected: codeFromRouteToRoute (e.g., 0907250001T4T1, 0907250001ABCD)',
  MONEY_DELIVERY_IDENTIFIER:
    'Invalid money delivery identifier format. Expected: codeFromRouteToRoute-T (e.g., 0907250001T4T1-T, 0907250001ABCD-T)',
  DATE_YYYY_MM_DD: 'Date must be in YYYY-MM-DD format',
} as const;

// Pattern explanations for documentation
export const PATTERN_EXPLANATIONS = {
  PHONE_NUMBER: {
    pattern: '^\\+?[1-9]\\d{1,14}$',
    description:
      'Phone number: International format, optional + prefix, starts with 1-9, total 2-15 digits',
    examples: ['+84901234567', '84901234567', '1234567890'],
    invalidExamples: ['0901234567', '+0901234567', '123', 'abc123'],
  },
  OBJECTID: {
    pattern: '^[0-9a-fA-F]{24}$',
    description: 'MongoDB ObjectId: 24-character hexadecimal string',
    examples: ['507f1f77bcf86cd799439011', '60d5ec49f1b2c72b8c8e4a01'],
    invalidExamples: ['invalid-id', '507f1f77bcf86cd79943901', '507f1f77bcf86cd799439011Z'],
  },
  ROUTE_CODE: {
    pattern: '^([A-Z]([A-Z]|\\d+)|\\d+[A-Z])$',
    description:
      'Route code: Letter+letter, letter+digits, or digits+letter',
    examples: ['T1', 'T2', 'A1', 'AB', 'CD', 'TK', '3H', '12A'],
    invalidExamples: ['t1', 'AB1', '123', 'ABC'],
  },
  DELIVERY_IDENTIFIER: {
    pattern: '^\\d{10}([A-Z]([A-Z]|\\d+)|\\d+[A-Z])([A-Z]([A-Z]|\\d+)|\\d+[A-Z])$',
    description: 'Delivery identifier: 10 digits followed by two route codes',
    examples: ['0907250001T4T1', '0907250001ABCD', '0907250001T1AB', '09072500013HT1'],
    invalidExamples: ['090725001T4T1', '0907250001t4T1', '0907250001T4'],
  },
  MONEY_DELIVERY_IDENTIFIER: {
    pattern: '^\\d{10}([A-Z]([A-Z]|\\d+)|\\d+[A-Z])([A-Z]([A-Z]|\\d+)|\\d+[A-Z])-T$',
    description: 'Money delivery identifier: 10 digits followed by two route codes and "-T" suffix',
    examples: ['0907250001T4T1-T', '0907250001ABCD-T', '0907250001T1AB-T', '09072500013HT1-T'],
    invalidExamples: ['0907250001T4T1', '0907250001ABCD-t', '090725001T4T1-T'],
  },
} as const;

/**
 * Helper function to validate route code
 */
export const isValidRouteCode = (code: string): boolean => {
  return ROUTE_CODE_PATTERN.test(code);
};

/**
 * Helper function to validate delivery identifier
 */
export const isValidDeliveryIdentifier = (identifier: string): boolean => {
  return DELIVERY_IDENTIFIER_PATTERN.test(identifier);
};

/**
 * Helper function to validate money delivery identifier
 */
export const isValidMoneyDeliveryIdentifier = (identifier: string): boolean => {
  return MONEY_DELIVERY_IDENTIFIER_PATTERN.test(identifier);
};

/**
 * Helper function to parse delivery identifier
 */
export const parseDeliveryIdentifier = (
  identifier: string
): { code: string; fromRouteCode: string; toRouteCode: string } | null => {
  const match = identifier.match(DELIVERY_IDENTIFIER_PARSE_PATTERN);
  if (!match) {
    return null;
  }

  const [, code, fromRouteCode, , toRouteCode] = match;
  return { code, fromRouteCode, toRouteCode };
};

/**
 * Helper function to parse money delivery identifier
 */
export const parseMoneyDeliveryIdentifier = (
  identifier: string
): { code: string; fromRouteCode: string; toRouteCode: string } | null => {
  const match = identifier.match(MONEY_DELIVERY_IDENTIFIER_PARSE_PATTERN);
  if (!match) {
    return null;
  }

  const [, code, fromRouteCode, , toRouteCode] = match;
  return { code, fromRouteCode, toRouteCode };
};

/**
 * Helper function to validate phone number
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  return PHONE_NUMBER_PATTERN.test(phone);
};

/**
 * Helper function to validate MongoDB ObjectId
 */
export const isValidObjectId = (id: string): boolean => {
  return OBJECTID_PATTERN.test(id);
};

/**
 * Helper function to convert phone number from international format (+84) to local format (0)
 * Examples:
 *   +84901234567 -> 0901234567
 *   84901234567  -> 0901234567
 *   0901234567   -> 0901234567 (unchanged)
 */
export const convertPhoneToLocalFormat = (phone: string): string => {
  if (!phone) {
    return phone;
  }
  // Remove +84 or 84 prefix and replace with 0
  return phone.replace(/^(\+84|84)/, '0');
};

/**
 * Helper function to convert phone number to Zalo API format (84...)
 * Examples:
 *   +84901234567 -> 84901234567
 *   84901234567  -> 84901234567 (unchanged)
 *   0901234567   -> 84901234567
 */
export const convertPhoneToZaloFormat = (phone: string): string => {
  if (!phone) {
    return phone;
  }
  // Remove + prefix if exists, then convert 0 prefix to 84
  const cleaned = phone.replace(/^\+/, '');
  if (cleaned.startsWith('0')) {
    return '84' + cleaned.slice(1);
  }
  if (!cleaned.startsWith('84')) {
    return '84' + cleaned;
  }
  return cleaned;
};
