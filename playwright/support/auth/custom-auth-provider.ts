/**
 * Example of a custom auth provider implementation
 *
 * This demonstrates how to create a fully custom authentication provider
 * that can handle specialized auth flows beyond the default implementation.
 *
 * The provider is the source of truth for environment and role information.
 */
import {
  type AuthProvider,
  getTokenFilePath,
  authStorageInit
} from '../../../src/auth-session'

// Since these are now internal functions not exposed via the public API,
// we import them directly from their source module
import {
  loadTokenFromStorage,
  saveTokenToStorage
} from '../../../src/auth-session/core'

import * as fs from 'fs'
import { acquireToken } from './acquire-token'

// Create a fully custom provider implementation
const myCustomProvider: AuthProvider = {
  // Get the current environment to use
  // Options are passed when calling auth.useEnvironment() in tests
  // or when directly calling getAuthToken/clearAuthToken with options
  getEnvironment(options = {}) {
    // Environment priority:
    // 1. Options passed from test via auth.useEnvironment({ environment: 'staging' })
    // 2. Environment variables
    // 3. Default environment
    return options.environment || process.env.TEST_ENV || 'local'
  },

  // Get the current user role to use
  // Options are passed when calling auth.useRole() in tests
  // or when directly calling getAuthToken/clearAuthToken with options
  getUserRole(options = {}) {
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

  // How to extract the raw token from token data structure
  extractToken(tokenData: Record<string, unknown>): string | null {
    // For API testing: simple token object format
    if ('token' in tokenData && tokenData.token) {
      return String(tokenData.token)
    }

    // Example: Handle Playwright storage state format with cookies
    if ('cookies' in tokenData && Array.isArray(tokenData.cookies)) {
      // For Admin app: extract JWT from specific cookie
      const jwtCookie = tokenData.cookies.find((c) => c.name === 'seon-jwt')
      if (jwtCookie && 'value' in jwtCookie) {
        return jwtCookie.value
      }

      // Try other common auth cookie names if needed
      const authCookie = tokenData.cookies.find(
        (c) => c.name === 'auth-token' || c.name === 'auth_token'
      )
      if (authCookie && 'value' in authCookie) {
        return authCookie.value
      }
    }

    // Could not determine token format
    console.warn('Unknown token format, cannot extract')
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

      // Use console.log for synchronous context
      console.log(`Token age: ${diffInSeconds} seconds, expired: ${isExpired}`)
      return isExpired
    } catch (error) {
      // Use console.error for synchronous context
      console.error('Error checking token expiration:', error)
      return true // Fail safe: consider expired if validation fails
    }
  },

  /**
   * Manage the complete authentication token lifecycle
   * This method handles the entire token management process:
   * STEP 1: Check for existing token in storage first (avoid unnecessary auth)
   * STEP 2: Initialize storage directories if needed
   * STEP 3: Acquire a new token only if no valid token exists
   * STEP 4: Save the token with metadata for future reuse
   */
  async manageAuthToken(request, options = {}) {
    // Use our own methods to ensure consistency
    const environment = this.getEnvironment(options)
    const userRole = this.getUserRole(options)

    // Use the utility functions to get standardized paths with the fixed storage location
    const tokenPath = getTokenFilePath({
      environment,
      userRole,
      tokenFileName: 'auth-token.json'
    })
    // STEP 1: Check if we already have a valid token using the core utility
    console.log(`ℹ Checking for existing token at ${tokenPath}`)
    const existingToken = loadTokenFromStorage(tokenPath, true)
    if (existingToken) {
      console.log(`✓ Using existing token from ${tokenPath}`)
      return existingToken
    }

    // STEP 2: Initialize storage directories (in case you're not using authGlobalInit() in global-setup)
    console.log('==== Initializing storage directories ====')
    authStorageInit({ environment, userRole })

    // STEP 3: Acquire a new token using our custom auth flow
    // Call our application-specific token acquisition logic
    console.log(`==== Fetching new token for ${environment}/${userRole} ====`)
    const token = await acquireToken(request, environment, userRole, options)

    // STEP 4: Save the token with metadata for future reuse
    // We turn on debug mode to get logging
    console.log(`ℹ Saving token to ${tokenPath}`)
    // Save token with debug logging enabled
    console.log('🔍 Saving token with debug logging enabled')
    saveTokenToStorage({
      tokenPath,
      token,
      debug: true // Enable logging
    })
    return token
  },

  // Example: Apply the token to a browser context for UI testing
  async applyToBrowserContext(context, token, options = {}) {
    // Get environment for domain configuration
    const environment = this.getEnvironment(options)
    // Set domain based on environment
    const domain =
      environment === 'local' ? 'localhost' : `${environment}.example.com`
    // Log what we're doing
    console.log(`ℹ Applying token to browser context for ${environment}`)
    // Example: Set authentication cookie
    console.log('==== Setting authentication cookie ====')
    await context.addCookies([
      {
        name: 'auth_token',
        value: token,
        domain,
        path: '/',
        httpOnly: true,
        secure: environment !== 'local',
        sameSite: 'Lax'
      }
    ])
    // Example: Set localStorage (alternative auth method)
    await context.addInitScript(`
      localStorage.setItem('token', '${token}');
      // Use browser console for client-side logging
      console.log('Set token in localStorage');
    `)
    console.log('🔍 Set token in localStorage')
    // You could also:
    // - Set headers for all requests
    // - Modify the page before it loads
    // - Inject scripts
  },
  // Clear token when needed
  clearToken(options = {}) {
    // Use our own methods to ensure consistency
    const environment = this.getEnvironment(options)
    const userRole = this.getUserRole(options)
    // Use the utility function to get the token path - same as in getToken
    const tokenPath = getTokenFilePath({
      environment,
      userRole,
      tokenFileName: 'auth-token.json'
    })
    // Delete the token file if it exists
    if (fs.existsSync(tokenPath)) {
      console.log(`[Custom Auth] Clearing token at ${tokenPath}`)
      fs.unlinkSync(tokenPath)
    }
  }
}
// Export for using in global setup
export default myCustomProvider
