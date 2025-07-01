/**
 * Global setup script for Playwright testing
 *
 * This script handles initial setup tasks before tests run:
 * Explicitly configures authentication through a two-step process:
 *    - Step 1: Configure auth storage settings with configureAuthSession
 *    - Step 2: Register an auth provider implementation with setAuthProvider
 *
 * To use this, add to your playwright config:
 * ```
 * globalSetup: '../support/global-setup.ts'
 * ```
 */

import {
  authStorageInit,
  setAuthProvider,
  configureAuthSession,
  authGlobalInit
} from '../../src/auth-session'

type UserOptions = {
  admin: string
  fraudAnalystUser: string
  settingsAdminUser: string
  freeUser: string
  shopifyUser: string
}

export const VALID_TEST_USERS: UserOptions = {
  admin: 'admin',
  freeUser: 'freeUser',
  settingsAdminUser: 'settingsAdminUser',
  fraudAnalystUser: 'fraudAnalystUser',
  shopifyUser: 'shopifyUser'
}

// Uncomment to use the custom auth provider
import myCustomProvider from './auth/custom-auth-provider'

/**
 * Global setup function that runs before tests
 */
async function globalSetup() {
  console.log('Running global setup')

  // ========================================================================
  // STEP 1: Configure minimal auth storage settings
  // ========================================================================
  // Ensure storage directories exist (required for both auth approaches)

  // if single role
  // authStorageInit()

  // if multiple roles
  for (const role of Object.values(VALID_TEST_USERS)) {
    authStorageInit({
      userRole: role
    })
  }
  // This just sets up where tokens will be stored and debug options
  configureAuthSession({
    debug: true
  })

  // ========================================================================
  // STEP 2: Set up custom auth provider
  // ========================================================================
  // This defines HOW authentication tokens are acquired and used

  setAuthProvider(myCustomProvider)

  // Optional: pre-fetch all tokens in the beginning
  await authGlobalInit()
  // if the authUrl is different from the appUrl, you can pass it as an option
  // by default it takes AUTH_BASE_URL (if it exists) or baseURL/BASE_URL
  // await authGlobalInit({
  //   authBaseURL: 'https://auth.example.com'
  // })
}

export default globalSetup
