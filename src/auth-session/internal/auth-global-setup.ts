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
import { log } from '../../log'
// No filesystem operations needed with simplified implementation

/** Initialize auth session storage directories and files.
 * Creates necessary directories and empty storage state files for Playwright.
 * Call this in your global setup to ensure proper directory structure.
 *
 * @param options Optional environment and user identifier overrides
 * @returns Object containing created storage paths */
export const authStorageInit = (options?: AuthIdentifiers): AuthSessionConfig =>
  initStorage(options)

/**  Pre-fetch authentication tokens during global setup
 *
 * This function creates per-user Playwright request contexts and fetches tokens
 * for specified user identifiers, storing them in isolated per-user storage locations.
 * This ensures proper user isolation during global setup, matching the test execution phase.
 *
 * Use this in your global setup to improve test performance by
 * avoiding repeated token fetches.
 *
 * @param options Configuration options
 * @param options.baseURL Application base URL (defaults to process.env.BASE_URL)
 * @param options.authBaseURL Authentication service base URL (defaults to options.baseURL or process.env.AUTH_BASE_URL)
 * @param options.userIdentifiers Optional array of user identifiers to initialize tokens for (defaults to the provider's default identifier)
 * @param options.environment Optional environment override (defaults to the provider's default environment)
 * @returns Promise that resolves when auth initialization is complete
 */
export async function authGlobalInit(options?: {
  baseURL?: string
  authBaseURL?: string
  userIdentifiers?: string[]
  environment?: string
}): Promise<boolean> {
  log.infoSync('Initializing auth tokens with per-user isolation')

  // Determine the effective base URLs with proper fallback chain
  const appBaseURL = options?.baseURL || process.env.BASE_URL
  const authBaseURL =
    options?.authBaseURL || process.env.AUTH_BASE_URL || appBaseURL

  // Helper function to create empty storage state
  const createEmptyStorageState = (): { cookies: any[]; origins: any[] } => ({
    cookies: [],
    origins: []
  })

  // Helper function to load or create storage state for a specific user
  const loadOrCreateStorageState = (
    userStorageStatePath: string
  ): { cookies: any[]; origins: any[] } => {
    try {
      const fs = require('fs')
      if (fs.existsSync(userStorageStatePath)) {
        const content = fs.readFileSync(userStorageStatePath, 'utf8')
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
      const dir = path.dirname(userStorageStatePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      // Create empty storage state with minimal valid structure
      const emptyState = createEmptyStorageState()
      fs.writeFileSync(userStorageStatePath, JSON.stringify(emptyState))
      return emptyState
    } catch (fsError) {
      log.errorSync(
        `Error handling storage state for ${userStorageStatePath}: ${fsError instanceof Error ? fsError.message : String(fsError)}`
      )
      return createEmptyStorageState()
    }
  }

  try {
    // If userIdentifiers is provided, initialize tokens for each user with isolated storage
    if (options?.userIdentifiers && options.userIdentifiers.length > 0) {
      log.infoSync(
        `Initializing isolated tokens for users: ${options.userIdentifiers.join(', ')}`
      )

      // Initialize tokens for each specified user with per-user request contexts
      for (const identifier of options.userIdentifiers) {
        let userRequestContext
        try {
          log.infoSync(`Initializing isolated token for user: ${identifier}`)

          // Get per-user storage state path
          const userStorageStatePath = getStorageStatePath({
            userIdentifier: identifier,
            environment: options.environment
          })

          // Load or create per-user storage state
          const userStorageState =
            loadOrCreateStorageState(userStorageStatePath)

          // Create per-user request context with isolated storage
          userRequestContext = await request.newContext({
            baseURL: authBaseURL,
            storageState: userStorageState
          })

          // Fetch token for this specific user
          await getAuthToken(userRequestContext, {
            userIdentifier: identifier,
            environment: options.environment
          })

          log.successSync(
            `Isolated token for user '${identifier}' initialized successfully at: ${userStorageStatePath}`
          )
        } catch (userError) {
          log.errorSync(
            `Failed to initialize isolated token for user '${identifier}': ${
              userError instanceof Error ? userError.message : String(userError)
            }`
          )
          // Continue with other users even if one fails
        } finally {
          // Clean up per-user request context
          if (userRequestContext) {
            await userRequestContext.dispose()
          }
        }
      }
    } else {
      // Handle default user case with isolated storage
      let defaultRequestContext
      try {
        // Get default storage state path (no user identifier)
        const defaultStorageStatePath = getStorageStatePath({
          environment: options?.environment
        })

        // Load or create default storage state
        const defaultStorageState = loadOrCreateStorageState(
          defaultStorageStatePath
        )

        // Create request context with default storage
        defaultRequestContext = await request.newContext({
          baseURL: authBaseURL,
          storageState: defaultStorageState
        })

        // Get the default auth token
        await getAuthToken(defaultRequestContext, {
          environment: options?.environment
        })

        log.successSync(
          `Default auth token initialized successfully at: ${defaultStorageStatePath}`
        )
      } finally {
        if (defaultRequestContext) {
          await defaultRequestContext.dispose()
        }
      }
    }
    return true
  } catch (error) {
    log.errorSync(
      `Failed to initialize auth tokens: ${error instanceof Error ? error.message : String(error)}`
    )
    throw error
  }
}
