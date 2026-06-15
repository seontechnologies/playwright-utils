/**
 * Shared extraction logic for localStorage-based auth, used by both
 * apply-user-storage-to-browser-context and apply-user-storage-to-page.
 *
 * Scope is `localStorage` only — Playwright storage state `origins` does not
 * carry `sessionStorage`.
 */
import { getAuthProvider } from './auth-provider'

export type StorageOrigin = {
  origin: string
  localStorage: Array<{ name: string; value: string }>
}

/**
 * Normalize an origin or full URL to a bare origin (scheme + host + port, no
 * trailing slash or path). Lets providers return `http://host/` or a full URL
 * without silently failing exact-string origin comparisons.
 */
export const normalizeOrigin = (urlOrOrigin: string): string => {
  try {
    return new URL(urlOrOrigin).origin
  } catch {
    return urlOrOrigin.replace(/\/+$/, '')
  }
}

/**
 * Extract localStorage origins from token data via the configured provider's
 * optional extractStorage() hook. Returns an empty array when the provider
 * does not implement the hook, so cookie-only setups are unaffected.
 */
export const extractStorageOrigins = (
  tokenData: Record<string, unknown>
): Array<StorageOrigin> => {
  const authProvider = getAuthProvider()

  if (typeof authProvider.extractStorage !== 'function') {
    return []
  }

  const origins = authProvider.extractStorage(tokenData)
  return Array.isArray(origins) ? origins : []
}
