/**
 * Token utility functions for authentication
 * These functions handle token extraction and validation for the auth session management
 */

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
