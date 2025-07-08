/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Token service implementation for the sample app
 * This implements a token service that matches the admin app's token structure
 * including cookie-based authentication and token refresh features
 */
import { setCookie, getCookie } from './cookie-utils'
import axios from 'axios'

const API_URL = 'http://localhost:3001'

// Using types instead of interfaces since they're not used outside this file
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StorageState = {
  cookies: Cookie[]
  origins: Origin[]
}

type Cookie = {
  name: string
  value: string
  domain: string
  path: string
  expires: number
  httpOnly: boolean
  secure: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

type Origin = {
  origin: string
  localStorage: LocalStorageItem[]
}

type LocalStorageItem = {
  name: string
  value: string
}

/**
 * Token service interface defining the contract for token operations
 */
// User identity interface
export interface UserIdentity {
  userId: string
  username: string
  userIdentifier: string
}

export interface TokenService {
  getToken(): StorageState
  validateAuthWithBackend(): Promise<boolean>
  /**
   * Explicitly set the token state
   * This is useful when we receive token information from an API response
   */
  setToken(token: StorageState): void
  refreshToken(): Promise<StorageState>
  isTokenValid(token: StorageState): boolean
  isJwtValid(token: StorageState): boolean
  isRefreshTokenValid(token: StorageState): boolean
  getAuthorizationHeader(): string
  /**
   * Synchronize cookies from StorageState to browser cookies
   * This is used when restoring state during test automation
   */
  syncCookiesToBrowser(): void
  /**
   * Update token state from browser cookies
   * This is used after a server sets cookies via HTTP headers
   */
  updateFromBrowserCookies(): boolean
  /**
   * Set the current user identity information
   */
  setCurrentUser(identity: UserIdentity): void
  /**
   * Get the current user identity information
   */
  getCurrentUser(): UserIdentity | null
  /**
   * Clear tokens and user information
   */
  clearTokens(): void
}

/**
 * Storage State Token Service - Implements the TokenService interface
 * with support for Playwright's storage state format
 */
export class StorageStateTokenService implements TokenService {
  private currentToken: StorageState | null = null
  private currentUser: UserIdentity | null = null
  private storageState: StorageState | null = null
  private lastSetTime: number | null = null

  /**
   * Explicitly set the token state
   * This is useful when we receive token information from an API response
   * when working with httpOnly cookies that JavaScript can't access directly
   */
  setToken(state: StorageState): void {
    this.storageState = state
    this.lastSetTime = Date.now()

    // Store identity in localStorage from the JWT cookie if available
    try {
      const jwtCookie = state.cookies.find((c) => c.name === 'seon-jwt')
      if (jwtCookie && jwtCookie.value.includes(':')) {
        const [, identityPart] = jwtCookie.value.split(':')
        if (identityPart) {
          const identity = JSON.parse(identityPart)
          localStorage.setItem('seon-user-identity', JSON.stringify(identity))
          console.log(
            'Identity extracted from token and saved to localStorage:',
            identity
          )
          this.setCurrentUser(identity)
        }
      }
    } catch (e) {
      console.warn('Failed to extract identity from token:', e)
    }

    this.syncCookiesToBrowser()
  }

  constructor() {
    // Check if running in a Playwright test context with an injected token
    if (typeof window !== 'undefined' && (window as any).authToken) {
      try {
        const authToken = (window as any).authToken
        this.currentToken =
          typeof authToken === 'string' ? JSON.parse(authToken) : authToken

        // If we have a token from test context, sync it to browser cookies
        if (this.currentToken) {
          this.syncCookiesToBrowser()
        }
      } catch (e) {
        console.error('Failed to parse injected auth token', e)
      }
    } else {
      // Try to restore token from browser cookies
      this.restoreFromBrowserCookies()
    }
  }

  /**
   * Get the current token, refreshing if needed
   * If the JWT is expired but refresh token is valid, it will automatically renew
   */
  getToken(): StorageState {
    if (!this.currentToken) {
      console.warn('No token available - will need authentication')
      // Just return an empty token structure - the API call will fail but this is expected
      // for initial authentication flows
      return { cookies: [], origins: [] }
    }

    try {
      // Check if JWT is valid - if so, return current token
      if (this.isJwtValid(this.currentToken)) {
        return this.currentToken
      }

      // JWT is expired, check if refresh token is valid
      if (this.isRefreshTokenValid(this.currentToken)) {
        // JWT is expired but refresh token is valid - trigger renewal
        console.log('JWT expired but refresh token valid - refreshing...')
        // Start the refresh process but don't wait for it
        // This maintains the synchronous API while still allowing refresh
        void this.refreshToken() // Using void to explicitly ignore the Promise
      } else {
        console.warn('Both JWT and refresh token are expired or invalid')
      }
    } catch (error) {
      console.error('Error in getToken:', error)
    }

    // Return the current token state (even if invalid)
    // The API request will fail with 401 which will trigger proper auth
    return this.currentToken
  }

  // Track in-flight refresh operations to prevent duplicate refreshes
  private refreshInProgress: Promise<StorageState> | null = null

  /**
   * Refresh the token by calling the renewal endpoint
   * Uses the refresh token to get a new JWT token
   * Prevents multiple simultaneous refresh requests by tracking in-flight operations
   */
  async refreshToken(): Promise<StorageState> {
    // If a refresh is already in progress, return that promise to avoid duplicate requests
    if (this.refreshInProgress) {
      console.log('Reusing in-progress token refresh request')
      return this.refreshInProgress
    }

    // Start a new refresh operation and track it
    this.refreshInProgress = this.executeRefresh()

    try {
      // Wait for the refresh to complete
      return await this.refreshInProgress
    } finally {
      // Clear the tracking promise when done (regardless of success or failure)
      this.refreshInProgress = null
    }
  }

  /**
   * Internal method that performs the actual token refresh operation
   * Extracted to make tracking the in-flight promise cleaner
   */
  private async executeRefresh(): Promise<StorageState> {
    try {
      // Check if we have a refresh token before attempting renewal
      if (!this.currentToken || !this.isRefreshTokenValid(this.currentToken)) {
        console.warn('No valid refresh token available - cannot renew')
        return this.currentToken || { cookies: [], origins: [] }
      }

      console.log('Attempting to refresh token with /auth/renew endpoint')
      console.log('Current cookies before refresh:', document.cookie)

      // Call the renewal endpoint
      const response = await axios.post(
        `${API_URL}/auth/renew`,
        {},
        { withCredentials: true } // Ensures cookies are sent
      )

      if (response.status !== 200) {
        throw new Error(`Token refresh failed with status: ${response.status}`)
      }

      console.log('Token refresh successful - updating storage state')
      console.log('Response headers:', response.headers)
      console.log('Cookies after refresh response:', document.cookie)

      // The server sets the cookies via Set-Cookie headers
      // We need to manually update our storage state to reflect these changes

      // Wait a bit longer for cookies to be properly set by browser
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Log cookies again after wait
      console.log('Cookies after waiting period:', document.cookie)

      // Capture the current cookies from the browser
      const restored = this.restoreFromBrowserCookies()

      if (!restored) {
        console.warn('Failed to restore cookies after token refresh')
        // Try one more time with a delay
        await new Promise((resolve) => setTimeout(resolve, 500))
        const secondAttempt = this.restoreFromBrowserCookies()
        if (secondAttempt) {
          console.log('Successfully restored cookies on second attempt')
        } else {
          console.error('All attempts to restore cookies failed')
        }
      } else {
        console.log('Successfully restored cookies after refresh')
      }

      if (!this.currentToken) {
        // Safety check in case restoreFromBrowserCookies didn't set the token
        this.currentToken = { cookies: [], origins: [] }
      }

      return this.currentToken
    } catch (error) {
      console.error('Failed to refresh token:', error)

      // If refresh fails, create a minimal token structure
      // This ensures the app doesn't crash, but authentication will likely fail
      this.currentToken = this.currentToken || { cookies: [], origins: [] }
      return this.currentToken
    }
  }

  /**
   * Check if the token is still valid
   * A token is valid if either:
   * 1. The JWT is valid, or
   * 2. The JWT is expired but the refresh token is valid
   */
  isTokenValid(token: StorageState): boolean {
    return this.isJwtValid(token) || this.isRefreshTokenValid(token)
  }

  /**
   * Check if the JWT token is valid
   */
  /**
   * Check if the JWT token is still valid.
   * Assumes cookie.value is URL-encoded and follows:
   *   "Bearer <ISO-8601-timestamp>:<JSON-identity>"
   */
  isJwtValid(token: StorageState): boolean {
    // 1) Basic sanity checks
    if (!token?.cookies || !Array.isArray(token.cookies)) {
      return false
    }

    const cookie = token.cookies.find((c) => c.name === 'seon-jwt')
    if (!cookie) {
      return false
    }

    // 2) Check the cookie's expiry (Unix seconds)
    const nowSec = Math.floor(Date.now() / 1000)
    if (cookie.expires < nowSec) {
      return false
    }

    // 3) Decode the URL-encoded value
    let decoded: string
    try {
      decoded = decodeURIComponent(cookie.value)
    } catch {
      return false
    }

    // 4) Strip any "Bearer " prefix
    if (decoded.toLowerCase().startsWith('bearer ')) {
      decoded = decoded.slice(7)
    }

    // 5) Split off the JSON identity by looking for the first ':{
    //    (timestamp itself can contain colons, so indexOf(':') is too naive)
    const sepIndex = decoded.indexOf(':{')
    const timestampPart = sepIndex > 0 ? decoded.slice(0, sepIndex) : decoded

    // 6) Parse the timestamp portion
    const ts = new Date(timestampPart)
    if (isNaN(ts.getTime())) {
      return false
    }

    // 7) Check age against a validity window (24 hours for sample app)
    const ageSeconds = (Date.now() - ts.getTime()) / 1000
    const VALID_WINDOW = 86400 // 24 hours in seconds
    return ageSeconds >= 0 && ageSeconds < VALID_WINDOW
  }

  /**
   * Validate a token timestamp
   * @param tokenContent The token content to validate
   * @returns boolean indicating if the token timestamp is valid
   */
  private validateTokenTimestamp(tokenContent: string): boolean {
    try {
      // Extract timestamp part - handle both formats:
      // 1. "timestamp:JSON" format (backend auth provider)
      // 2. "timestamp" format (direct frontend login)
      let timestamp = tokenContent
      const colonPos = tokenContent.indexOf(':')

      if (colonPos > 0) {
        // Format is timestamp:JSON - extract timestamp without the colon
        timestamp = tokenContent.substring(0, colonPos)
        console.debug('Extracted timestamp from compound token:', timestamp)
      } else {
        // No colon found, assume the entire token is a timestamp
        console.debug('Using entire token as timestamp:', timestamp)
      }

      // Safety check to ensure timestamp is a valid string
      if (!timestamp || typeof timestamp !== 'string') {
        console.debug('Invalid timestamp format')
        return false
      }

      // Parse the timestamp as a date
      const tokenDate = new Date(timestamp)

      // Check if the date is valid
      if (isNaN(tokenDate.getTime())) {
        console.debug('JWT contains invalid date')
        return false
      }

      const currentDate = new Date()
      const tokenTime = tokenDate.getTime()
      const diffInSeconds = (currentDate.getTime() - tokenTime) / 1000

      // For sample app purposes, use a very generous validity window (24 hours)
      const validityWindow = 86400 // 24 hours in seconds for testing
      const isValid = diffInSeconds >= 0 && diffInSeconds < validityWindow

      if (!isValid) {
        console.debug(
          `JWT age (${diffInSeconds}s) exceeds validity window (${validityWindow}s)`
        )
      } else {
        console.debug(
          `JWT is valid, age: ${diffInSeconds}s within window: ${validityWindow}s`
        )
      }

      return isValid
    } catch (error) {
      console.error('Error validating token timestamp:', error)
      return false
    }
  }

  /**
   * Check if the refresh token is valid
   */
  isRefreshTokenValid(token: StorageState): boolean {
    if (!token || !token.cookies || !Array.isArray(token.cookies)) {
      return false
    }

    try {
      // Find the refresh token cookie
      const cookie = token.cookies.find((c) => c.name === 'seon-refresh')
      if (!cookie) {
        console.debug('No refresh token cookie found')
        return false
      }

      // Check if cookie is expired by timestamp
      const currentTime = Math.floor(Date.now() / 1000)
      const isValid = cookie.expires > currentTime

      if (!isValid) {
        console.debug('Refresh token is expired')
      }

      return isValid
    } catch (error) {
      console.error('Error checking refresh token validity:', error)
      return false
    }
  }

  /**
   * Get authorization header compatible with existing API
   * This maintains backward compatibility with the current implementation
   */
  getAuthorizationHeader(): string {
    const token = this.getToken()
    const cookie = token.cookies.find((c) => c.name === 'seon-jwt')
    if (!cookie) return ''

    // Remove Bearer prefix if present
    let tokenValue = cookie.value.replace(/^Bearer\s+/i, '')

    // Check if token is just a timestamp without the identity part
    if (!tokenValue.includes(':')) {
      // Get the user identity or create a default one
      const userIdentity = this.getCurrentUser() || {
        id: 'user123',
        userIdentifier: 'user'
      }

      // Convert identity to JSON string and append to timestamp
      const identityJson = JSON.stringify(userIdentity)
      tokenValue = `${tokenValue}:${identityJson}`
      console.log(
        'Added missing identity to token in getAuthorizationHeader:',
        userIdentity
      )
    }

    // Add the Bearer prefix
    return `Bearer ${tokenValue}`
  }

  /**
   * Synchronize StorageState cookies to browser cookies
   * This is used for test automation and to persist authentication state
   */
  syncCookiesToBrowser(): void {
    if (!this.currentToken) return

    // Set each cookie from the storage state to the browser
    this.currentToken.cookies.forEach((cookie) => {
      setCookie(cookie.name, cookie.value, {
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        secure: cookie.secure,
        sameSite: cookie.sameSite
      })
    })
  }

  /**
   * Update token state from browser cookies
   * This is a public method that wraps the private restoreFromBrowserCookies
   * method, allowing external code to update the token state after HTTP operations
   */
  updateFromBrowserCookies(): boolean {
    return this.restoreFromBrowserCookies()
  }

  /**
   * Set the current user's identity in memory and localStorage
   * This is the ONLY method that should be used to update the user identity
   * @param identity The user identity object to store
   */
  setCurrentUser(identity: UserIdentity): void {
    if (typeof window !== 'undefined') {
      if (identity) {
        // Store user identity in localStorage for persistence
        try {
          localStorage.setItem('seon-user-identity', JSON.stringify(identity))
          this.currentUser = identity

          // Update the JWT token to include the user identity if it exists
          if (this.currentToken) {
            const jwtCookie = this.currentToken.cookies.find(
              (c) => c.name === 'seon-jwt'
            )
            if (jwtCookie) {
              // Only append identity if not already present
              let tokenValue = jwtCookie.value.replace(/^Bearer\s+/i, '')
              if (!tokenValue.includes(':')) {
                tokenValue = `${tokenValue}:${JSON.stringify(identity)}`
                jwtCookie.value = tokenValue
                // Sync the updated token to browser cookies
                this.syncCookiesToBrowser()
              }
            }
          }
        } catch (e) {
          console.error('Failed to store user identity in localStorage', e)
        }
      } else {
        localStorage.removeItem('seon-user-identity')
        this.currentUser = null
      }
    }
  }

  /**
   * Get the current user identity information
   * @returns The current user identity or null if not authenticated
   */
  getCurrentUser(): UserIdentity | null {
    // If we already have a user in memory, return it
    if (this.currentUser) {
      return this.currentUser
    }

    // Try to restore from localStorage
    if (typeof window !== 'undefined') {
      try {
        const storedIdentity = localStorage.getItem('seon-user-identity')
        if (storedIdentity) {
          this.currentUser = JSON.parse(storedIdentity)
          return this.currentUser
        }
      } catch (e) {
        console.error('Failed to retrieve user identity from localStorage', e)
      }
    }

    return null
  }

  /**
   * Validate authentication with backend
   * This makes an API call to check if the current cookies are valid
   * and updates the current user if they are
   */
  async validateAuthWithBackend(): Promise<boolean> {
    try {
      console.log('Validating authentication with backend...')
      const response = await axios.get(`${API_URL}/auth/validate`, {
        withCredentials: true // Important: send cookies with the request
      })

      if (response.status === 200 && response.data.authenticated) {
        // Update the current user from the response
        if (response.data.user) {
          this.setCurrentUser({
            userId: response.data.user.id || response.data.user.userId,
            username: response.data.user.username,
            userIdentifier: response.data.user.userIdentifier
          })
        }

        // Update the token state from browser cookies
        this.updateFromBrowserCookies()

        console.log('Authentication validated successfully')
        return true
      }

      console.warn('Authentication validation failed', response.data)
      return false
    } catch (error) {
      console.error('Error validating authentication:', error)
      return false
    }
  }

  /**
   * Clear all tokens and user state
   * This includes both the internal state and browser cookies
   */
  clearTokens(): void {
    this.currentToken = null
    this.currentUser = null

    // Clear browser cookies if in browser
    if (typeof window !== 'undefined') {
      // Clear localStorage items
      localStorage.removeItem('seon-user-identity')

      // Use the setCookie helper to properly clear cookies with all attributes
      const cookieOptions = {
        path: '/',
        domain: window.location.hostname,
        expires: 0, // Set to 0 for immediate expiration (epoch time 0 = 1970-01-01)
        secure: window.location.protocol === 'https:',
        sameSite: 'strict' as const
      }

      // Clear JWT and refresh token cookies with proper attributes
      setCookie('seon-jwt', '', cookieOptions)
      setCookie('seon-refresh', '', cookieOptions)

      // Double-check cookies were cleared
      if (getCookie('seon-jwt') || getCookie('seon-refresh')) {
        console.warn(
          'Failed to clear auth cookies on first attempt, trying alternate method'
        )
        // Fallback: Try standard document.cookie method as well for better compatibility
        document.cookie =
          'seon-jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        document.cookie =
          'seon-refresh=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      }
    }
  }

  /**
   * Attempt to restore token from browser cookies
   * @returns true if token was successfully restored
   */
  private restoreFromBrowserCookies(): boolean {
    try {
      // Log all cookies for debugging
      console.debug('All document cookies:', document.cookie)

      // Check for JWT cookie in browser
      const jwtValue = getCookie('seon-jwt')
      const refreshValue = getCookie('seon-refresh')

      console.debug('Restoring cookies from browser:', {
        jwtValue,
        refreshValue
      })

      if (!jwtValue && !refreshValue) {
        console.warn('No tokens found in browser cookies')
        return false
      }

      // Create a storage state from the cookies
      // Use longer expiration times than the actual cookies to prevent edge cases
      const jwtExpires = Math.floor(Date.now() / 1000) + 300 // 5 minutes for JWT
      const refreshExpires = Math.floor(Date.now() / 1000) + 86400 // 24 hours for refresh token

      const cookies = []

      if (jwtValue) {
        console.log('Found JWT cookie, adding to storage state', jwtValue)

        // Normalize the JWT value and add identity if needed
        let normalizedValue = jwtValue

        // Check if token is just a timestamp without the identity part
        if (!normalizedValue.includes(':')) {
          // Get the user identity or create a default one
          const userIdentity = this.getCurrentUser() || {
            id: 'user123',
            userIdentifier: 'user'
          }

          // Convert identity to JSON string and append to timestamp
          const identityJson = JSON.stringify(userIdentity)
          normalizedValue = `${normalizedValue}:${identityJson}`
          console.log('Added missing identity to token:', userIdentity)
        }

        // We should NOT add Bearer prefix to cookie values,
        // only to Authorization headers
        // Remove Bearer prefix if it accidentally exists in cookie
        if (normalizedValue.startsWith('Bearer ')) {
          normalizedValue = normalizedValue.replace(/^Bearer\s+/i, '')
          console.log('Removed incorrect Bearer prefix from cookie token')
        }

        cookies.push({
          name: 'seon-jwt',
          value: normalizedValue,
          domain: window.location.hostname,
          path: '/',
          expires: jwtExpires,
          httpOnly: false,
          secure: window.location.protocol === 'https:',
          sameSite: 'Lax' as const // Type assertion to match Cookie.sameSite
        })
      }

      if (refreshValue) {
        console.log('Found refresh cookie, adding to storage state')
        cookies.push({
          name: 'seon-refresh',
          value: refreshValue,
          domain: window.location.hostname,
          path: '/',
          expires: refreshExpires,
          httpOnly: false,
          secure: window.location.protocol === 'https:',
          sameSite: 'Lax' as const // Type assertion to match Cookie.sameSite
        })
      }

      this.currentToken = {
        cookies,
        origins: []
      }

      // After setting the current token, also sync it back to browser cookies
      // This ensures consistent state between our internal representation and browser
      this.syncCookiesToBrowser()
      console.log('Synchronized token state back to browser cookies')

      return true
    } catch (error) {
      console.error('Error restoring token from browser cookies:', error)
      return false
    }
  }
}

// Export a singleton instance for use throughout the app
export const tokenService = new StorageStateTokenService()
