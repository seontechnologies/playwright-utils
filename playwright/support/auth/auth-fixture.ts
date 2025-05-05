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
  type AuthFixtures
} from '../../../src/auth-session'

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

  // Use the other fixtures directly
  authToken: fixtures.authToken,
  context: fixtures.context,
  page: fixtures.page
})
