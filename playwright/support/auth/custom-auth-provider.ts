/**
 * Example of a custom auth provider implementation
 *
 * This demonstrates how to create a fully custom authentication provider
 * that can handle specialized auth flows beyond the default implementation.
 *
 * The provider is the source of truth for environment and role information.
 */
import * as path from 'path'
import type { APIRequestContext } from '@playwright/test'
import {
  type AuthProvider,
  type AuthOptions,
  AuthSessionManager,
  getTokenFilePath,
  authStorageInit,
  loadStorageState,
  getStorageDir
} from '../../../src/auth-session'
import { log } from '../../../src/log'
import { acquireToken } from './acquire-token'

// Create a fully custom provider implementation
const myCustomProvider: AuthProvider = {
  // Get the current environment to use
  // Options are passed when calling auth.useEnvironment() in tests
  // or when directly calling getAuthToken/clearAuthToken with options
  getEnvironment(options: AuthOptions = {}) {
    // Environment priority:
    // 1. Options passed from test via auth.useEnvironment({ environment: 'staging' })
    // 2. Environment variables
    // 3. Default environment
    return options.environment || process.env.TEST_ENV || 'local'
  },

  // Get the current user role to use
  // Options are passed when calling auth.useRole() in tests
  // or when directly calling getAuthToken/clearAuthToken with options
  getUserRole(options: AuthOptions = {}) {
    // Role priority:
    // 1. Options passed from test via auth.useRole({ userRole: 'admin' })
    // 2. Default role based on environment
    const environment = this.getEnvironment(options)
    // You could implement environment-specific default roles
    let defaultRole = 'default' // Match the core library default role
    if (environment === 'staging') defaultRole = 'tester'
    if (environment === 'production') defaultRole = 'readonly'
    return options.userRole || process.env.TEST_USER_ROLE || defaultRole
  },

  // Extract the raw token from token data structure
  // The standardized storage-state.json format makes this simpler
  extractToken(tokenData: Record<string, unknown> | string): string | null {
    // Handle stringified JSON if needed
    if (typeof tokenData === 'string') {
      try {
        return this.extractToken(JSON.parse(tokenData))
      } catch {
        // If it's a string but not valid JSON, assume it's a raw token
        return tokenData
      }
    }

    // example: Handle standard Playwright storage state format with cookies
    if ('cookies' in tokenData && Array.isArray(tokenData.cookies)) {
      // Look for the standard auth cookie name
      const authCookie = tokenData.cookies.find(
        (cookie) => cookie.name === 'seon-jwt'
      )

      if (authCookie?.value) {
        return String(authCookie.value)
      }
    }

    // example: For API testing: direct token field
    if ('token' in tokenData && tokenData.token) {
      return String(tokenData.token)
    }

    log.warningSync('Unknown token format, cannot extract')
    return null
  },

  // Check if a token is expired
  // For our sample app, the token format is always: "Bearer TIMESTAMP"
  // We just parse the timestamp and compare it to the current time
  isTokenExpired(rawToken: string): boolean {
    try {
      // This method now receives the raw token directly from extractToken
      // Clean up the token by removing Bearer prefix if present
      const tokenString = rawToken.replace('Bearer ', '')

      // This example assumes timestamp tokens like:
      // '2025-05-07T23:20:48.311Z' or 'Bearer 2025-05-07T23:20:48.311Z'
      // Your application likely has a different token format

      // Check token age
      const timeoutInSeconds = 60 * 60 // 1 hour timeout
      // const timeoutInSeconds = 1 // for quick testing for refresh
      const tokenTime = new Date(tokenString).getTime()
      const currentTime = new Date().getTime()
      const diffInSeconds = (currentTime - tokenTime) / 1000

      const isExpired = !(
        diffInSeconds >= 0 && diffInSeconds <= timeoutInSeconds
      )

      // Use synchronous logging
      log.infoSync(`Token age: ${diffInSeconds} seconds, expired: ${isExpired}`)
      return isExpired
    } catch (error) {
      // Use synchronous error logging
      log.errorSync(
        `Error checking token expiration: ${error instanceof Error ? error.message : String(error)}`
      )
      return true // Fail safe: consider expired if validation fails
    }
  },

  /**
   * Main token management method
   * Can be called directly for API testing, or will be called by fixture for UI testing
   * @param request - APIRequestContext from Playwright
   * @param options - Optional auth options (like environment or userRole)
   */
  async manageAuthToken(
    request: APIRequestContext,
    options: AuthOptions = {}
  ): Promise<Record<string, unknown>> {
    const environment = this.getEnvironment(options)
    const userRole = this.getUserRole(options)
    const userIdentifier = options.userIdentifier

    // Use the utility functions to get standardized paths with the fixed storage location
    const tokenPath = getTokenFilePath({
      environment,
      userRole,
      userIdentifier
    })

    // STEP 1: Check if we already have a valid token using the enhanced utility
    log.infoSync(`ℹ Checking for existing token at ${tokenPath}`)
    const existingStorageState = loadStorageState(tokenPath, true)
    if (existingStorageState) {
      log.infoSync(`✓ Using existing token from ${tokenPath}`)
      return existingStorageState
    }

    // STEP 2: Initialize storage directories using the core utility
    log.infoSync('==== Initializing storage directories ====')
    authStorageInit({ environment, userRole, userIdentifier })

    // STEP 3: Acquire a new token (since no valid token exists)
    log.infoSync(`==== Fetching new token for ${environment}/${userRole} ====`)
    const rawToken = await acquireToken(request, environment, userRole, options)

    // STEP 3.5: Format token in the Playwright-compatible format
    // Convert string token to storage state object (You might not have to do this in a Seon app)
    const storageState = {
      cookies: [
        {
          name: 'seon-jwt',
          value:
            typeof rawToken === 'string' ? rawToken : JSON.stringify(rawToken),
          domain: 'localhost',
          path: '/',
          expires: -1,
          httpOnly: true,
          secure: false,
          sameSite: 'Lax'
        }
      ],
      origins: []
    }

    // STEP 4: Save the token with metadata for future reuse
    const authManager = AuthSessionManager.getInstance({
      debug: true,
      storageDir: path.dirname(tokenPath)
    })
    authManager.saveToken(storageState)
    log.successSync(`Token saved to ${tokenPath}`)

    // Return the object directly for use with Playwright APIs
    return storageState
  },

  // Clear token when needed
  clearToken(options: AuthOptions = {}) {
    const environment = this.getEnvironment(options)
    const userRole = this.getUserRole(options)
    const userIdentifier = options.userIdentifier

    // Get the storage directory with correct user-specific path
    const storageDir = getStorageDir({
      environment,
      userRole,
      userIdentifier
    })

    // Get the AuthSessionManager instance with the proper directory
    const authManager = AuthSessionManager.getInstance({
      debug: true,
      storageDir
    })

    // Use the AuthSessionManager's clearToken method
    log.infoSync(
      `Clearing token for ${environment}/${userRole}${userIdentifier ? `/${userIdentifier}` : ''}`
    )
    authManager.clearToken()

    return true
  }
}
// Export for using in global setup
export default myCustomProvider
