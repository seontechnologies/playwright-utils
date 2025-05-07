/**
 * Extended test fixture that adds authentication support for both API and UI testing
 *
 * @see https://playwright.dev/docs/test-fixtures
 * @see https://playwright.dev/docs/api-testing#authentication
 * @see https://playwright.dev/docs/auth
 */

import { test as base } from '@playwright/test'
import {
  createAuthFixtures,
  type AuthOptions,
  type AuthFixtures,
  setAuthProvider
} from '../../../src/auth-session'

// Import our custom auth provider
import myCustomProvider from './custom-auth-provider'

// Register the custom auth provider early to ensure it's available for all tests
setAuthProvider(myCustomProvider)

// Default auth options using the current environment
const defaultAuthOptions: AuthOptions = {
  environment: process.env.TEST_ENV || 'local',
  userRole: 'default'
}

// Get the fixtures from the factory function
const fixtures = createAuthFixtures()

// Export the test object with auth fixtures
export const test = base.extend<AuthFixtures>({
  // For authOptions, we need to define it directly using the Playwright array format
  authOptions: [defaultAuthOptions, { option: true }],

  // Auth session toggle - enables/disables auth functionality completely
  // Default: true (auth enabled)
  authSessionEnabled: [true, { option: true }],

  // Use the other fixtures directly
  authToken: fixtures.authToken,
  context: fixtures.context,
  page: fixtures.page
})
