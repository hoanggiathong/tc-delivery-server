/**
 * Application configuration
 * Centralized configuration for application settings
 */

/**
 * Get the base URL for the application
 * Used for generating full URLs for images and other resources
 *
 * Priority:
 * 1. Environment variable BASE_URL
 * 2. Fallback to localhost with PORT from env or default 3000
 */
export const getBaseUrl = (): string => {
  // If BASE_URL is explicitly set, use it
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }

  // Fallback to localhost with configured port
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
};

/**
 * Application configuration object
 */
export const appConfig = {
  baseUrl: getBaseUrl(),
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
};
