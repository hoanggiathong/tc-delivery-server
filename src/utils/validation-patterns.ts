/**
 * Centralized validation patterns for the TC Delivery Server
 * This file contains all regex patterns used for validation across the application
 */

// Route code validation patterns
export const ROUTE_CODE_PATTERN = /^[A-Z]([A-Z]|\d+)$/;

// Delivery identifier validation patterns
export const DELIVERY_IDENTIFIER_PATTERN = /^\d{10}[A-Z]([A-Z]|\d+)[A-Z]([A-Z]|\d+)$/;

// Money delivery identifier validation patterns
export const MONEY_DELIVERY_IDENTIFIER_PATTERN = /^\d{10}[A-Z]([A-Z]|\d+)[A-Z]([A-Z]|\d+)-T$/;

// Parsing patterns for delivery services
export const DELIVERY_IDENTIFIER_PARSE_PATTERN = /^(\d{10})([A-Z]([A-Z]|\d+))([A-Z]([A-Z]|\d+))$/;
export const MONEY_DELIVERY_IDENTIFIER_PARSE_PATTERN =
  /^(\d{10})([A-Z]([A-Z]|\d+))([A-Z]([A-Z]|\d+))-T$/;

// Error messages
export const VALIDATION_MESSAGES = {
  ROUTE_CODE:
    'Code must start with a letter followed by another letter or numbers (e.g., T1, T2, AB, CD)',
  DELIVERY_IDENTIFIER:
    'Invalid delivery identifier format. Expected: codeFromRouteToRoute (e.g., 0907250001T4T1, 0907250001ABCD)',
  MONEY_DELIVERY_IDENTIFIER:
    'Invalid money delivery identifier format. Expected: codeFromRouteToRoute-T (e.g., 0907250001T4T1-T, 0907250001ABCD-T)',
} as const;

// Pattern explanations for documentation
export const PATTERN_EXPLANATIONS = {
  ROUTE_CODE: {
    pattern: '^[A-Z]([A-Z]|\\d+)$',
    description:
      'Route code: Single uppercase letter followed by either another uppercase letter or one or more digits',
    examples: ['T1', 'T2', 'A1', 'AB', 'CD', 'TK'],
    invalidExamples: ['t1', 'AB1', '1A', 'ABC'],
  },
  DELIVERY_IDENTIFIER: {
    pattern: '^\\d{10}[A-Z]([A-Z]|\\d+)[A-Z]([A-Z]|\\d+)$',
    description: 'Delivery identifier: 10 digits followed by two route codes',
    examples: ['0907250001T4T1', '0907250001ABCD', '0907250001T1AB'],
    invalidExamples: ['090725001T4T1', '0907250001t4T1', '0907250001T4'],
  },
  MONEY_DELIVERY_IDENTIFIER: {
    pattern: '^\\d{10}[A-Z]([A-Z]|\\d+)[A-Z]([A-Z]|\\d+)-T$',
    description: 'Money delivery identifier: 10 digits followed by two route codes and "-T" suffix',
    examples: ['0907250001T4T1-T', '0907250001ABCD-T', '0907250001T1AB-T'],
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
