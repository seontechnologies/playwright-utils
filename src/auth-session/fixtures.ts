/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Playwright Auth Session Test Fixtures
 * Provides factory functions to create test fixtures for authentication
 */

import {
  type BrowserContext,
  type Page,
  type APIRequestContext
} from '@playwright/test'
import { getAuthProvider } from './internal/auth-provider'
import { getStorageStatePath } from './internal/auth-storage-utils'
import type { AuthIdentifiers, AuthOptions } from './internal/types'

/**
 * Creates auth fixtures that can be used to extend Playwright's test object
 * @returns An object with fixtures that can be used with test.extend()
 */
export function createAuthFixtures() {
  const defaultAuthOptions: AuthIdentifiers = {
    environment: process.env.TEST_ENV || 'local',
    userRole: 'default'
  }

  const authProvider = getAuthProvider()

  return {
    /** Auth options to configure environment and user role
     * @default { environment: process.env.TEST_ENV || 'local', userRole: 'default' }     */
    authOptions: [defaultAuthOptions, { option: true }],

    /** Toggle to enable/disable authentication session
     * When false, auth token acquisition and applying to browser context will be skipped
     * @default true */
    authSessionEnabled: [true, { option: true }],

    /**
     * Authentication token fixture that reuses tokens across tests
     * @example
     * ```ts
     * test('use auth token', async ({ authToken }) => {
     *   // Use the token in API calls
     *   const response = await fetch('/api/data', {
     *     headers: { Authorization: authToken }
     *   })
     * })
     * ```
     */
    authToken: async (
      {
        request,
        authOptions,
        authSessionEnabled
      }: {
        request: APIRequestContext
        authOptions: AuthOptions
        authSessionEnabled: boolean
      },
      use: (token: string) => Promise<void>
    ) => {
      // Skip auth token acquisition if auth session is disabled
      if (!authSessionEnabled) {
        console.log('Auth session disabled - skipping token acquisition')
        await use('') // Return empty token if auth is disabled
        return
      }

      // Get token using the auth provider
      const token = await authProvider.manageAuthToken(request, authOptions)
      await use(token)
    },

    /**
     * Browser context with authentication applied
     * @example
     * ```ts
     * test('use authenticated context', async ({ context }) => {
     *   const page = await context.newPage()
     *   await page.goto('/protected-page')
     *   // Auth is already set up!
     * })
     * ```
     */
    context: async (
      {
        browser,
        request,
        authOptions,
        authSessionEnabled
      }: {
        browser: any
        request: APIRequestContext
        authOptions: AuthOptions
        authSessionEnabled: boolean
      },
      use: (context: BrowserContext) => Promise<void>
    ) => {
      // Create context with user-provided baseURL directly
      const context = await browser.newContext({
        // User can provide baseURL in test configuration or through authOptions
        baseURL: authOptions.baseUrl || undefined,
        // Only use storage state if auth session is enabled
        ...(authSessionEnabled
          ? {
              storageState: getStorageStatePath(authOptions)
            }
          : {})
      })

      // Only apply auth if session is enabled
      if (authSessionEnabled) {
        // Get token using the auth provider
        const token = await authProvider.manageAuthToken(request, authOptions)

        // Apply auth token to browser context
        await authProvider.applyToBrowserContext(context, token, authOptions)
      } else {
        console.log(
          'Auth session disabled - skipping token application to browser context'
        )
      }

      // use and clean up
      await use(context)
      await context.close()
    },

    /**
     * Page with authentication applied
     * @example
     * ```ts
     * test('use authenticated page', async ({ page }) => {
     *   await page.goto('/protected-page')
     *   // Auth is already set up!
     * })
     * ```
     */
    page: async (
      { context }: { context: BrowserContext },
      use: (page: Page) => Promise<void>
    ) => {
      const page = await context.newPage()
      await use(page)
    }
  }
}

/**
 * Creates role-specific test fixtures
 * @param testBase The base test object to extend
 * @param role The user role to authenticate as
 * @returns A test object configured for the specified role
 */
export const createRoleSpecificTest = (testBase: any, role: string) =>
  testBase.extend({
    authOptions: { userRole: role }
  })
