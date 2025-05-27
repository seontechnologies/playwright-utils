/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Token service implementation for the sample app
 * This implements a token service that matches the admin app's token structure
 * including cookie-based authentication and token refresh features
 */
import { setCookie, getCookie } from './cookie-utils'

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
export interface TokenService {
  getToken(): StorageState
  refreshToken(): StorageState
  isTokenValid(token: StorageState): boolean
  getAuthorizationHeader(): string
  /**
   * Synchronize cookies from StorageState to browser cookies
   * This is used when restoring state during test automation
   */
  syncCookiesToBrowser(): void
}

/**
 * Storage State Token Service - Implements the TokenService interface
 * with support for Playwright's storage state format
 */
export class StorageStateTokenService implements TokenService {
  private currentToken: StorageState | null = null

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

  /** Get the current token, refreshing if needed */
  getToken(): StorageState {
    if (!this.currentToken || !this.isTokenValid(this.currentToken)) {
      return this.refreshToken()
    }
    return this.currentToken
  }

  /** Generate a new token with the current timestamp */
  refreshToken(): StorageState {
    const timestamp = new Date().toISOString()
    const expires = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now

    this.currentToken = {
      cookies: [
        {
          name: 'sample-app-token',
          value: timestamp,
          domain: 'localhost',
          path: '/',
          expires,
          httpOnly: false, // Can't set httpOnly from client-side JS
          secure: window.location.protocol === 'https:',
          sameSite: 'Lax'
        }
      ],
      origins: []
    }

    // Sync to browser cookies
    this.syncCookiesToBrowser()

    return this.currentToken
  }

  /**
   * Check if the token is still valid
   */
  isTokenValid(token: StorageState): boolean {
    try {
      // Find the token cookie
      const cookie = token.cookies.find((c) => c.name === 'sample-app-token')
      if (!cookie) return false

      // Check if cookie is expired by timestamp
      const currentTime = Math.floor(Date.now() / 1000)
      if (cookie.expires < currentTime) return false

      // Also check the value itself which contains the timestamp
      const tokenDate = new Date(cookie.value)
      const currentDate = new Date()
      const tokenTime = tokenDate.getTime()
      const diffInSeconds = (currentDate.getTime() - tokenTime) / 1000

      // Valid if issued within the last 50 minutes (3000 seconds)
      return diffInSeconds >= 0 && diffInSeconds < 3000
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      return false
    }
  }

  /**
   * Get authorization header compatible with existing API
   * This maintains backward compatibility with the current implementation
   */
  getAuthorizationHeader(): string {
    const token = this.getToken()
    const cookie = token.cookies.find((c) => c.name === 'sample-app-token')
    return cookie ? `Bearer ${cookie.value}` : ''
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
   * Attempt to restore token from browser cookies
   * @returns true if token was successfully restored
   */
  private restoreFromBrowserCookies(): boolean {
    // Check for token cookie in browser
    const tokenValue = getCookie('sample-app-token')
    if (!tokenValue) return false

    // Create a storage state from the cookie
    const expires = Math.floor(Date.now() / 1000) + 3600 // Default to 1 hour from now

    this.currentToken = {
      cookies: [
        {
          name: 'sample-app-token',
          value: tokenValue,
          domain: window.location.hostname,
          path: '/',
          expires,
          httpOnly: false,
          secure: window.location.protocol === 'https:',
          sameSite: 'Lax'
        }
      ],
      origins: []
    }

    return true
  }
}

// Export a singleton instance for use throughout the app
export const tokenService = new StorageStateTokenService()
