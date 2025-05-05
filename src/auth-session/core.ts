/**
 * Core authentication functionality for the auth session library
 * This file is the single source of truth for the public API
 * following SEON's functional programming principles
 */

import type { APIRequestContext, BrowserContext } from '@playwright/test'
import {
  configureAuthSession as configureAuth,
  getGlobalAuthOptions
} from './internal/auth-configure'
import { getStorageStatePath } from './internal/auth-storage-utils'
import * as fs from 'fs'
import * as path from 'path'
import type {
  AuthSessionOptions,
  AuthTokenData,
  AuthIdentifiers
} from './internal/types'
import {
  AuthSessionManager,
  defaultTokenFormatter
} from './internal/auth-session'
import { getAuthProvider } from './internal/auth-provider'

// Re-export the default token formatter for users to extend
export { defaultTokenFormatter }

// Re-export set auth provider for token operations
export { setAuthProvider } from './internal/auth-provider'

/**
 * Load a token from storage if one exists
 * Handles token expiration checking
 *
 * @param tokenPath Path to the token file
 * @param debug Whether to log debug information
 * @returns The token if valid, or null if not found or expired
 */
export function loadTokenFromStorage(
  tokenPath: string,
  debug = false
): string | null {
  if (fs.existsSync(tokenPath)) {
    try {
      const data = fs.readFileSync(tokenPath, 'utf8')
      const tokenData = JSON.parse(data) as AuthTokenData

      // Check if token is expired
      if (tokenData.expiresAt && new Date(tokenData.expiresAt) < new Date()) {
        if (debug) {
          console.log(
            `Token expired at ${tokenData.expiresAt}, will fetch new one`
          )
        }
        return null
      }

      if (debug) {
        console.log(`Loaded token from ${tokenPath}`)
      }

      return tokenData.token
    } catch (error) {
      console.error(`Error loading token from ${tokenPath}:`, error)
      return null
    }
  }
  return null
}

/**
 * Save a token to storage with optional metadata
 * Ensures the storage directory exists
 *
 * @param tokenPath Path to save the token file
 * @param token The token string to save
 * @param metadata Additional metadata to store with the token
 * @param debug Whether to log debug information
 */
export function saveTokenToStorage(
  tokenPath: string,
  token: string,
  metadata: Record<string, unknown> = {},
  debug = false
): void {
  try {
    const storageDir = path.dirname(tokenPath)

    // Ensure the storage directory exists
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true })
      if (debug) {
        console.log(`Created directory ${storageDir} for token storage`)
      }
    }

    // Save token with metadata
    fs.writeFileSync(
      tokenPath,
      JSON.stringify(
        {
          token,
          createdAt: new Date().toISOString(),
          ...metadata
        },
        null,
        2
      )
    )

    if (debug) {
      console.log(`Saved token to ${tokenPath}`)
    }
  } catch (error) {
    console.error(`Error saving token to ${tokenPath}:`, error)
  }
}

/**
 * Configure the authentication session with the provided options
 * This is the main entry point for setting up the auth system
 */
export const configureAuthSession = (options: AuthSessionOptions) =>
  configureAuth(options)

/**
 * Get an authentication token, fetching a new one if needed
 * @param request The Playwright APIRequestContext
 * @param options Optional environment and user role overrides
 * @returns A promise that resolves to the authentication token
 */
export async function getAuthToken(
  request: APIRequestContext,
  options?: AuthIdentifiers
): Promise<string> {
  // Step 1: Check if basic configuration exists (from configureAuthSession)
  const globalOptions = getGlobalAuthOptions()
  if (!globalOptions) {
    throw new Error(
      'Basic auth configuration missing. You must call configureAuthSession() first to set up storage paths.'
    )
  }

  // Step 2: Check if a custom provider is configured (from setAuthProvider)
  const provider = getAuthProvider()
  if (!provider) {
    throw new Error(
      'No auth provider configured. You must call setAuthProvider() with your custom provider.'
    )
  }

  // Step 3: Use the custom provider with configuration from both sources
  return provider.manageAuthToken(request, {
    environment: options?.environment,
    userRole: options?.userRole
  })
}

/**
 * Clear the authentication token from storage
 * @param options Optional environment and user role overrides
 */
export function clearAuthToken(options?: AuthIdentifiers): void {
  // Get global auth options
  const globalOptions = getGlobalAuthOptions()
  if (!globalOptions) {
    throw new Error(
      'Auth session not configured. Call configureAuthSession first.'
    )
  }

  // Create full options
  const fullOptions: AuthSessionOptions = {
    ...globalOptions,
    ...options
  }

  const authManager = AuthSessionManager.getInstance(fullOptions)
  authManager.clearToken()
}

/**
 * Apply the authentication token to a browser context for UI testing
 * @param context The Playwright BrowserContext
 * @param token The authentication token to apply
 * @param options Optional environment and user role overrides
 * @returns A promise that resolves when the token has been applied
 */
export async function applyAuthToBrowserContext(
  context: BrowserContext,
  token: string,
  options?: AuthIdentifiers
): Promise<void> {
  const statePath = getStorageStatePath(options)

  // save the current state
  await context.storageState({ path: statePath })

  // add the auth token to localStorage
  await context.addInitScript((token: string) => {
    window.localStorage.setItem('authToken', token)
  }, token)

  // TODO: Make the navigation URL configurable. In a library context, users should
  // be able to specify which URL to navigate to for initializing auth, or we should
  // make this step optional with clear documentation about the consequences.
  const page = await context.newPage()
  await page.goto('/')
  await page.close()

  // Save the state with the token
  await context.storageState({ path: statePath })
}
