/** Global initialization utilities for Playwright Auth Session
 * Consolidates functions related to storage and auth token initialization */

import { request } from '@playwright/test'
import { getAuthToken } from '../core'
import {
  authStorageInit as initStorage,
  getStorageStatePath
} from './auth-storage-utils'
import type { AuthSessionConfig, AuthIdentifiers } from './types'
// No filesystem operations needed with simplified implementation

/** Initialize auth session storage directories and files.
 * Creates necessary directories and empty storage state files for Playwright.
 * Call this in your global setup to ensure proper directory structure.
 *
 * @param options Optional environment and user role overrides
 * @returns Object containing created storage paths */
export const authStorageInit = (options?: AuthIdentifiers): AuthSessionConfig =>
  initStorage(options)

/**  Pre-fetch authentication token during global setup
 *
 * This function creates a Playwright request context and fetches a token
 * for the default environment and user role, storing it for future test runs.
 *
 * Use this in your global setup to improve test performance by
 * avoiding repeated token fetches.
 *
 * @param options Configuration options
 * @param options.baseURL Application base URL (defaults to process.env.BASE_URL)
 * @param options.authBaseURL Authentication service base URL (defaults to options.baseURL or process.env.AUTH_BASE_URL)
 * @returns Promise that resolves when auth initialization is complete
 */
export async function authGlobalInit(options?: {
  baseURL?: string
  authBaseURL?: string
}): Promise<boolean> {
  console.log('Initializing auth token')

  // Determine the effective base URLs with proper fallback chain
  const appBaseURL = options?.baseURL || process.env.BASE_URL
  const authBaseURL =
    options?.authBaseURL || process.env.AUTH_BASE_URL || appBaseURL

  // Create a request context with storageState option for auth persistence
  const requestContext = await request.newContext({
    baseURL: authBaseURL, // Use auth URL for the request context since we're fetching a token
    storageState: getStorageStatePath()
  })

  try {
    // Get the auth token (this will save it for future use)
    await getAuthToken(requestContext)
    console.log('Auth token initialized successfully')
    return true
  } catch (error) {
    console.error('Failed to initialize auth token:', error)
    throw error
  } finally {
    await requestContext.dispose()
  }
}
