/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Playwright Auth Session Test Fixtures
 * Provides factory functions to create test fixtures for authentication
 */

import type { APIRequestContext, BrowserContext, Page } from '@playwright/test'
import { getAuthProvider } from './internal/auth-provider'
import { getStorageStatePath } from './internal/auth-storage-utils'
import type { AuthIdentifiers, AuthOptions } from './internal/types'
import { log } from '../log'

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

      // Get token using the auth provider - now returns Record<string, unknown>
      const storageState = await authProvider.manageAuthToken(
        request,
        authOptions
      )

      // Extract raw token from storage state
      const provider = getAuthProvider()
      const rawToken = provider.extractToken(storageState) || ''

      // Use the extracted token
      await use(rawToken)
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
      // Get browser's default context options to preserve settings like baseURL
      const browserContextOptions =
        (browser._options && browser._options.contextOptions) || {}

      // Create context with preserved baseURL and other settings from Playwright config
      const context = await browser.newContext({
        // Preserve all browser context options from Playwright config
        ...browserContextOptions,
        // Override with user-provided baseURL if specified in authOptions
        baseURL:
          authOptions.baseUrl || browserContextOptions.baseURL || undefined,
        // Only use storage state if auth session is enabled
        ...(authSessionEnabled
          ? {
              storageState: getStorageStatePath(authOptions)
            }
          : {})
      })

      // Only apply auth if session is enabled
      if (authSessionEnabled) {
        // Get token using the auth provider - this saves token to storage
        await authProvider.manageAuthToken(request, authOptions)

        // No need to explicitly apply token to browser context
        // Playwright's native storage state functionality handles this automatically
        // through the storageState option when creating the context
      } else {
        log.infoSync(
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
      {
        context,
        authOptions: _authOptions
      }: { context: BrowserContext; authOptions: AuthOptions },
      use: (page: Page) => Promise<void>
    ) => {
      // Create a page from the existing authenticated context
      const page = await context.newPage()

      // If needed, we can use baseURL from authOptions during navigation
      // This removes the need to create a new context with different baseURL
      // Example: if (authOptions.baseUrl) await page.goto(authOptions.baseUrl + '/path')

      // Let Playwright manage the page lifecycle - context.close() will close all pages
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
