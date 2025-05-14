/* eslint-disable @typescript-eslint/no-explicit-any */
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

/**  Pre-fetch authentication tokens during global setup
 *
 * This function creates a Playwright request context and fetches tokens
 * for specified roles or the default role, storing them for future test runs.
 *
 * Use this in your global setup to improve test performance by
 * avoiding repeated token fetches.
 *
 * @param options Configuration options
 * @param options.baseURL Application base URL (defaults to process.env.BASE_URL)
 * @param options.authBaseURL Authentication service base URL (defaults to options.baseURL or process.env.AUTH_BASE_URL)
 * @param options.userRoles Optional array of user roles to initialize tokens for (defaults to the provider's default role)
 * @param options.environment Optional environment override (defaults to the provider's default environment)
 * @returns Promise that resolves when auth initialization is complete
 */
export async function authGlobalInit(options?: {
  baseURL?: string
  authBaseURL?: string
  userRoles?: string[]
  environment?: string
}): Promise<boolean> {
  console.log('Initializing auth token')

  // Determine the effective base URLs with proper fallback chain
  const appBaseURL = options?.baseURL || process.env.BASE_URL
  const authBaseURL =
    options?.authBaseURL || process.env.AUTH_BASE_URL || appBaseURL

  // Create a request context with storageState option for auth persistence
  // Ensure we have a valid storage state object for Playwright
  const storageStatePath = getStorageStatePath()

  // Create or load the storage state
  const createEmptyStorageState = (): { cookies: any[]; origins: any[] } => ({
    cookies: [],
    origins: []
  })

  // Load storage state safely, with fallback to empty state
  const loadStorageState = (): { cookies: any[]; origins: any[] } => {
    try {
      // Try to load it as an object
      const fs = require('fs')
      if (fs.existsSync(storageStatePath)) {
        const content = fs.readFileSync(storageStatePath, 'utf8')
        try {
          return JSON.parse(content)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
          // If it can't be parsed, use an empty default
          return createEmptyStorageState()
        }
      }

      // Create empty storage state file if it doesn't exist
      const path = require('path')
      const dir = path.dirname(storageStatePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      // Create empty storage state with minimal valid structure
      const emptyState = createEmptyStorageState()
      fs.writeFileSync(storageStatePath, JSON.stringify(emptyState))
      return emptyState
    } catch (fsError) {
      console.error('Error handling storage state:', fsError)
      return createEmptyStorageState()
    }
  }

  // Get the storage state (with proper typing)
  const storageState = loadStorageState()

  // Create the request context with the proper object
  const requestContext = await request.newContext({
    baseURL: authBaseURL, // Use auth URL for the request context since we're fetching a token
    storageState
  })

  try {
    // If userRoles is provided, initialize tokens for each role
    if (options?.userRoles && options.userRoles.length > 0) {
      console.log(
        `Initializing tokens for roles: ${options.userRoles.join(', ')}`
      )

      // Initialize tokens for each specified role
      for (const role of options.userRoles) {
        try {
          console.log(`Initializing token for role: ${role}`)
          await getAuthToken(requestContext, {
            userRole: role,
            environment: options.environment
          })
          console.log(`Token for role '${role}' initialized successfully`)
        } catch (roleError) {
          console.error(
            `Failed to initialize token for role '${role}':`,
            roleError
          )
          // Continue with other roles even if one fails
        }
      }
    } else {
      // Get the default auth token if no roles specified
      await getAuthToken(requestContext, {
        environment: options?.environment
      })
      console.log('Default auth token initialized successfully')
    }
    return true
  } catch (error) {
    console.error('Failed to initialize auth tokens:', error)
    throw error
  } finally {
    await requestContext.dispose()
  }
}
