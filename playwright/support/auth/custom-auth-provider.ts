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
  type AuthOptions,
  type AuthProvider,
  AuthSessionManager,
  authStorageInit,
  getStorageDir,
  getTokenFilePath,
  saveStorageState
} from '../../../src/auth-session'
import { log } from '../../../src/log'
import { acquireToken } from './token/acquire'
import { checkTokenValidity } from './token/check-validity'
import { isTokenExpired } from './token/is-expired'
import { extractToken, extractCookies } from './token/extract'
import { getEnvironment } from './get-environment'
import { getUserRole } from './get-user-role'
import { getBaseUrl } from './get-base-url'

// Create a fully custom provider implementation
const myCustomProvider: AuthProvider = {
  // Get the current base URL to use
  getBaseUrl,

  // Get the current environment to use
  getEnvironment,

  // Get the current user role to use
  getUserRole,

  /** Extract JWT token from Playwright storage state format */
  extractToken,

  extractCookies,

  /** Check if a token is expired */
  isTokenExpired,

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

    // STEP 1: Check if we already have a valid token using the dedicated module
    const validToken = await checkTokenValidity(tokenPath)
    if (validToken) {
      return validToken
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
