/**
 * Check if a token is expired
 * @param rawToken JWT token or stringified storage state
 * @returns true if token is expired or invalid, false if valid
 */
export const isTokenExpired = (rawToken: string): boolean => {
  // Handle storage state objects (which are serialized as JSON)
  if (rawToken.trim().startsWith('{')) {
    try {
      const storageState = JSON.parse(rawToken)

      // check if there are cookies
      if (
        storageState?.cookies &&
        Array.isArray(storageState.cookies) &&
        storageState.cookies.length > 0
      ) {
        type Cookie = { name: string; value: string; expires: number }
        const authCookie = storageState.cookies.find(
          (cookie: Cookie) => cookie.name === 'seon-jwt'
        )

        // If cookie exists, check its expiration
        if (authCookie) {
          const currentTime = Math.floor(Date.now() / 1000)
          return authCookie.expires < currentTime
        }
      }

      // No valid cookies found
      return true
    } catch (e) {
      console.error('Cannot parse the storage state JSON', e)
      return true
    }
  }

  // For non-JSON tokens (simple string tokens)
  // Sample implementation - replace with your actual token expiration logic
  try {
    // If token is in format Bearer <timestamp>
    if (rawToken.startsWith('Bearer ')) {
      const tokenTimestamp = new Date(rawToken.replace('Bearer ', '')).getTime()
      const currentTime = Date.now()
      // Check if token is more than 1 hour old
      return currentTime - tokenTimestamp > 3600 * 1000
    }
    return true // Unrecognized format, consider expired
  } catch (e) {
    console.error('Cannot check token expiration', e)
    return true
  }
}
