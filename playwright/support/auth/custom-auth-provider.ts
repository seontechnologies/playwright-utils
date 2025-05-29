/**
 * Example of a custom auth provider implementation
 *
 * This demonstrates how to create a fully custom authentication provider
 * that can handle specialized auth flows beyond the default implementation.
 *
 * The provider is the source of truth for environment and role information.
 */
import type { APIRequestContext } from '@playwright/test'
import {
  type AuthProvider,
  type AuthOptions,
  AuthSessionManager,
  getTokenFilePath,
  authStorageInit,
  loadStorageState,
  getStorageDir,
  saveStorageState
} from '../../../src/auth-session'
import { log } from '../../../src/log'
import { acquireToken } from './acquire-token'
import { needsTokenRenewal, renewToken } from './renew-token'

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

  /** Extract JWT token from Playwright storage state format */
  extractToken: (tokenData: Record<string, unknown>): string | null => {
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

    return null
  },

  isTokenExpired: (rawToken: string): boolean => {
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

    // Not a valid storage state format
    return true
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
      userIdentifier,
      tokenFileName: 'storage-state.json'
    })

    // STEP 1: Check if we already have a valid token using the enhanced utility
    const existingStorageState = loadStorageState(tokenPath, true)
    if (existingStorageState) {
      // Check if token needs renewal (JWT expired but refresh token valid)
      if (needsTokenRenewal(existingStorageState)) {
        log.infoSync(
          'ℹ️ JWT token expired, attempting to renew token using refresh token'
        )
        try {
          // Call our renewal helper function with the storage path
          await renewToken({ storageState: tokenPath })

          // Load the updated storage state after successful renewal
          const renewedStorageState = loadStorageState(tokenPath, false)
          if (!renewedStorageState) {
            throw new Error('Failed to load renewed storage state')
          }
          log.infoSync(`✓ Successfully renewed token from ${tokenPath}`)
          return renewedStorageState
        } catch (error) {
          // If renewal fails, we'll proceed to get a new token via full login
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          log.infoSync(`⚠️ Failed to renew token: ${errorMessage}`)
          log.infoSync('⚠️ Will attempt to acquire a new token')
        }
      } else {
        // Token is still valid, use it
        log.infoSync(`✓ Using existing token from ${tokenPath}`)
        return existingStorageState
      }
    }

    // No valid token found, continue with getting a new one

    // STEP 2: Initialize storage directories using the core utility
    authStorageInit({ environment, userRole, userIdentifier })

    // STEP 3: Acquire a new token (since no valid token exists)
    const storageState = await acquireToken(
      request,
      environment,
      userRole,
      options
    )

    // STEP 4: Save the token for future reuse
    saveStorageState(tokenPath, storageState)

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
