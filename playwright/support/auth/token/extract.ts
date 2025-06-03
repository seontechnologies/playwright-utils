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
      (cookie) => cookie.name === 'seon-jwt'
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
        name: 'seon-jwt',
        value: token,
        domain: 'localhost',
        path: '/'
      }
    ]
  }

  // Return empty array if no cookies found
  return []
}
