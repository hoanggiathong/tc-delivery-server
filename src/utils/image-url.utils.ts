/**
 * Utility functions for generating versioned image URLs with cache busting
 */

/**
 * Generate a versioned URL with timestamp query parameter for cache busting
 * @param basePath - The base path of the image (e.g., '/uploads/customers/123/image.png')
 * @param timestamp - Optional timestamp, defaults to current time
 * @returns Versioned URL with query parameter (e.g., '/uploads/customers/123/image.png?v=1734567890123')
 */
export function generateVersionedUrl(basePath: string, timestamp?: number): string {
  const version = timestamp || Date.now();
  const separator = basePath.includes('?') ? '&' : '?';
  return `${basePath}${separator}v=${version}`;
}

/**
 * Generate a full image URL with domain, path, and version parameter
 * @param basePath - The base path of the image (e.g., '/uploads/customers/123/image.png')
 * @param baseUrl - The base URL/domain (e.g., 'https://uat.giaphuocexpress.vn')
 * @param timestamp - Optional timestamp, defaults to current time
 * @returns Full URL with domain and version (e.g., 'https://uat.giaphuocexpress.vn/uploads/customers/123/image.png?v=1734567890123')
 */
export function generateFullImageUrl(
  basePath: string,
  baseUrl: string,
  timestamp?: number
): string {
  // Remove trailing slash from baseUrl if present
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  // Ensure basePath starts with /
  const cleanBasePath = basePath.startsWith('/') ? basePath : `/${basePath}`;

  // Generate versioned URL
  const versionedPath = generateVersionedUrl(cleanBasePath, timestamp);

  return `${cleanBaseUrl}${versionedPath}`;
}

/**
 * Extract base path from versioned URL by removing version parameter
 * @param versionedUrl - URL with version parameter
 * @returns Base path without version parameter
 */
export function extractBasePath(versionedUrl: string): string {
  const urlParts = versionedUrl.split('?');
  if (urlParts.length === 1) {
    return versionedUrl; // No query parameters
  }

  const basePath = urlParts[0];
  const queryString = urlParts[1];

  if (!queryString) {
    return basePath;
  }

  // Remove version parameter while keeping other parameters
  const params = new URLSearchParams(queryString);
  params.delete('v');

  const remainingParams = params.toString();
  return remainingParams ? `${basePath}?${remainingParams}` : basePath;
}

/**
 * Check if URL already has version parameter
 * @param url - URL to check
 * @returns True if URL contains version parameter
 */
export function hasVersionParameter(url: string): boolean {
  const urlParts = url.split('?');
  if (urlParts.length < 2) {
    return false;
  }

  const params = new URLSearchParams(urlParts[1]);
  return params.has('v');
}

/**
 * Update version parameter in existing versioned URL
 * @param versionedUrl - Existing versioned URL
 * @param newTimestamp - New timestamp for version
 * @returns Updated versioned URL
 */
export function updateVersionParameter(versionedUrl: string, newTimestamp?: number): string {
  const basePath = extractBasePath(versionedUrl);
  return generateVersionedUrl(basePath, newTimestamp);
}
