/**
 * Token utility functions for authentication
 * These functions handle token extraction and validation for the auth session management
 */

// Cookie type definition matching Playwright's expectations
type Cookie = {
  name: string
  value: string
  domain?: string
  path?: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

/**
 * Extract JWT token from Playwright storage state format
 * @param tokenData Storage state object containing cookies
 * @returns JWT token value or null if not found
 */
export const extractToken = (
  tokenData: Record<string, unknown>
): string | null => {
  // If it's a storage state with cookies, extract the auth token value
  if (
    tokenData?.cookies &&
    Array.isArray(tokenData.cookies) &&
    tokenData.cookies.length > 0
  ) {
    // Find the auth cookie
    const authCookie = tokenData.cookies.find(
      (cookie) => cookie.name === 'app-jwt'
    )

    // Return the token value if found
    if (authCookie?.value) {
      return authCookie.value
    }
  }

  // Try to extract token from direct API format (in case it's not in cookie format)
  if (typeof tokenData.token === 'string') {
    return tokenData.token
  }

  return null
}

/**
 * Extract cookies from various token formats
 * Returns cookies ready to be applied to a browser context
 *
 * @param tokenData Storage state or user data object
 * @returns Array of cookie objects ready for browser context
 */
export const extractCookies = (
  tokenData: Record<string, unknown>
): Cookie[] => {
  // If it's already a storage state with cookies, return them directly
  if (
    tokenData?.cookies &&
    Array.isArray(tokenData.cookies) &&
    tokenData.cookies.length > 0
  ) {
    return tokenData.cookies
  }

  // If it's a string token, convert it to a cookie
  const token = extractToken(tokenData)
  if (token) {
    return [
      {
        name: 'app-jwt',
        value: token,
        domain: 'localhost',
        path: '/'
      }
    ]
  }

  // Return empty array if no cookies found
  return []
}

/**
 * Extract browser localStorage entries from token data.
 *
 * Demonstrates a localStorage-based auth provider: the same JWT that the
 * cookie path uses is also exposed as a `localStorage` entry for the app's
 * origin. Implementing this optional hook makes the provider work with
 * `applyUserStorageToBrowserContext` / `applyUserStorageToPage` and populates
 * the storage-state `origins` array, without affecting the cookie path.
 *
 * @param tokenData Storage state or user data object
 * @returns Per-origin localStorage entries for Playwright storage state
 */
export const extractStorage = (
  tokenData: Record<string, unknown>
): Array<{
  origin: string
  localStorage: Array<{ name: string; value: string }>
}> => {
  const token = extractToken(tokenData)
  if (!token) return []

  const origin =
    process.env.BASE_URL || process.env.TEST_URL || 'http://localhost:3000'
  return [{ origin, localStorage: [{ name: 'app-jwt', value: token }] }]
}
