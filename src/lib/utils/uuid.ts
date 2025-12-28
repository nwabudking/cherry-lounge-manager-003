/**
 * Safe UUID generator with fallback support
 * Works in all environments: modern browsers, Docker, older Node.js
 */

// Fallback UUID generator using Math.random (RFC4122 v4 compliant)
function fallbackUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Check if crypto.randomUUID is available
function hasNativeUUID(): boolean {
  try {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';
  } catch {
    return false;
  }
}

/**
 * Generate a UUID v4 with automatic fallback
 * Uses crypto.randomUUID when available, falls back to Math.random-based generation
 */
export function generateUUID(): string {
  if (hasNativeUUID()) {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through to fallback
    }
  }
  return fallbackUUID();
}

/**
 * Generate a short unique ID for temporary/local use
 * Not suitable for database IDs but good for React keys
 */
export function generateShortId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}
