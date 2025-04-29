/** Global initialization utilities for Playwright Auth Session
 * Consolidates functions related to storage and auth token initialization */

import { request } from '@playwright/test'
import { getAuthToken } from '../core'
import {
  authStorageInit as initStorage,
  getStorageStatePath
} from './auth-storage-utils'
import type { StoragePaths, AuthIdentifiers } from './types'

/** Initialize auth session storage directories and files.
 * Creates necessary directories and empty storage state files for Playwright.
 * Call this in your global setup to ensure proper directory structure.
 *
 * @param options Optional environment and user role overrides
 * @returns Object containing created storage paths */
export const authStorageInit = (options?: AuthIdentifiers): StoragePaths =>
  initStorage(options)

/**  Pre-fetch authentication token during global setup
 *
 * This function creates a Playwright request context and fetches a token
 * for the default environment and user role, storing it for future test runs.
 *
 * Use this in your global setup to improve test performance by
 * avoiding repeated token fetches.
 *
 * @returns Promise that resolves when auth initialization is complete */
export async function authGlobalInit(): Promise<boolean> {
  console.log('Initializing auth token')

  // Create a request context with storageState option for auth persistence
  const requestContext = await request.newContext({
    // TODO: here we should use the base url from  Playwright config, we do this in a few other places in playwright-utils
    baseURL: process.env.BASE_URL || `http://localhost:${process.env.PORT}`,
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
