/**
 * Global setup helper for Playwright Auth Session
 * Provides utilities for initializing authentication in global setup
 */
import type { APIRequestContext } from '@playwright/test'
import { getAuthToken } from './core'

/**
 * Initialize authentication token during Playwright's global setup.
 * This helper simplifies the integration into the globalSetup function.
 *
 * @param request - Playwright APIRequestContext for making API calls
 * @param options - Optional environment and user role settings
 * @returns Promise that resolves when auth initialization is complete
 */
export async function initializeAuthForGlobalSetup(
  request: APIRequestContext,
  options?: { environment?: string; userRole?: string }
): Promise<void> {
  console.log('Initializing auth token')

  try {
    // Fetch and store the token
    await getAuthToken(request, options)
    console.log('Auth token initialized successfully')
    // Function returns void, no need to return the token
  } catch (error) {
    console.error('Failed to initialize auth token:', error)
    throw error
  }
}
