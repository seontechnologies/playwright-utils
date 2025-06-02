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
  role: string
}

export interface TokenService {
  getToken(): StorageState
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

  /**
   * Explicitly set the token state
   * This is useful when we receive token information from an API response
   * when working with httpOnly cookies that JavaScript can't access directly
   */
  setToken(token: StorageState): void {
    console.log('Setting token state explicitly')
    this.currentToken = token
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

  /**
   * Refresh the token by calling the renewal endpoint
   * Uses the refresh token to get a new JWT token
   */
  async refreshToken(): Promise<StorageState> {
    try {
      // Check if we have a refresh token before attempting renewal
      if (!this.currentToken || !this.isRefreshTokenValid(this.currentToken)) {
        console.warn('No valid refresh token available - cannot renew')
        return this.currentToken || { cookies: [], origins: [] }
      }

      console.log('Attempting to refresh token with /auth/renew endpoint')

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

      // The server sets the cookies via Set-Cookie headers
      // We need to manually update our storage state to reflect these changes

      // Wait a moment for cookies to be set by browser
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Capture the current cookies from the browser
      const restored = this.restoreFromBrowserCookies()

      if (!restored) {
        console.warn('Failed to restore cookies after token refresh')
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
  isJwtValid(token: StorageState): boolean {
    if (!token || !token.cookies || !Array.isArray(token.cookies)) {
      return false
    }

    try {
      // Find the JWT cookie
      const cookie = token.cookies.find((c) => c.name === 'seon-jwt')
      if (!cookie) {
        console.debug('No JWT cookie found')
        return false
      }

      // Check if cookie is expired by timestamp
      const currentTime = Math.floor(Date.now() / 1000)
      if (cookie.expires < currentTime) {
        console.debug('JWT cookie is expired')
        return false
      }

      // Extract timestamp from Bearer token
      const tokenValue = cookie.value.replace(/^Bearer\s+/i, '')

      // Check the extracted timestamp
      const tokenDate = new Date(tokenValue)

      // Check if the date is valid
      if (isNaN(tokenDate.getTime())) {
        console.debug('JWT contains invalid date')
        return false
      }

      const currentDate = new Date()
      const tokenTime = tokenDate.getTime()
      const diffInSeconds = (currentDate.getTime() - tokenTime) / 1000

      // Valid if issued within the last 5 minutes (300 seconds) - shortened for demo purposes
      // In production, this would typically be 5-15 minutes
      const isValid = diffInSeconds >= 0 && diffInSeconds < 300

      if (!isValid) {
        console.debug(
          `JWT age (${diffInSeconds}s) exceeds validity window (300s)`
        )
      }

      return isValid
    } catch (error) {
      console.error('Error checking JWT validity:', error)
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

    // Extract the actual token value without the Bearer prefix
    // since Axios will add it back as part of the Authorization header
    const tokenValue = cookie.value.replace(/^Bearer\s+/i, '')
    return tokenValue
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
   * Set the current user identity information
   * @param identity User identity object containing userId, username, and role
   */
  setCurrentUser(identity: UserIdentity): void {
    this.currentUser = identity
    // Store user identity in localStorage for persistence
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('seon-user-identity', JSON.stringify(identity))
      } catch (e) {
        console.error('Failed to store user identity in localStorage', e)
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
   * Clear tokens and user information
   * This is used for logout functionality
   */
  clearTokens(): void {
    this.currentToken = null
    this.currentUser = null

    // Clear cookies
    if (typeof window !== 'undefined') {
      // Clear JWT and refresh cookies by setting expired date
      document.cookie =
        'seon-jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie =
        'seon-refresh=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'

      // Remove from localStorage
      localStorage.removeItem('seon-user-identity')
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
        console.log('Found JWT cookie, adding to storage state')
        cookies.push({
          name: 'seon-jwt',
          value: jwtValue,
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

      return true
    } catch (error) {
      console.error('Error restoring token from browser cookies:', error)
      return false
    }
    return true
  }
}

// Export a singleton instance for use throughout the app
export const tokenService = new StorageStateTokenService()
