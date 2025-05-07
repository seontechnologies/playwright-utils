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
import {
  getStorageStatePath,
  safeWriteJsonFile,
  safeReadJsonFile
} from './internal/auth-storage-utils'
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

// Re-export the default token formatter and AuthSessionManager class
// AuthSessionManager is exported for internal usage only (not part of public API)
export { defaultTokenFormatter, AuthSessionManager }

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
/**
 * Save an authentication token to storage with metadata
 *
 * @param options Configuration options
 */
export function saveTokenToStorage(options: {
  /** Path to save the token file */
  tokenPath: string
  /** The authentication token */
  token: string
  /** Optional metadata to include with the token */
  metadata?: Record<string, unknown>
  /** Enable debug logging */
  debug?: boolean
}): void {
  const { tokenPath, token, metadata = {}, debug = false } = options
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
 * @returns Boolean indicating whether a token was successfully cleared
 */
export function clearAuthToken(options?: AuthIdentifiers): boolean {
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
  // Return success indicator
  return authManager.clearToken()
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
  options?: AuthIdentifiers & {
    /**
     * URL to navigate to for initializing auth (defaults to '/' using baseURL from context)
     * Set to null to skip navigation entirely
     */
    navigationUrl?: string | null
  }
): Promise<void> {
  const statePath = getStorageStatePath(options)

  // Save the current state to a temporary path first to avoid race conditions
  const tmpStatePath = `${statePath}.${Date.now()}.tmp`

  try {
    // Save to temporary file first
    await context.storageState({ path: tmpStatePath })

    // Read the temporary file - await the async operation
    const stateData = await safeReadJsonFile(tmpStatePath, {
      cookies: [],
      origins: []
    })

    // Write atomically to the final location - await the async operation
    await safeWriteJsonFile(statePath, stateData)

    // Clean up temp file
    if (fs.existsSync(tmpStatePath)) {
      fs.unlinkSync(tmpStatePath)
    }
  } catch (err) {
    const error = err as Error
    console.warn(`Error saving storage state: ${error.message}`)
    // Clean up temp file if it exists
    if (fs.existsSync(tmpStatePath)) {
      try {
        fs.unlinkSync(tmpStatePath)
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  // Add the auth token to localStorage using an init script
  await context.addInitScript((token: string) => {
    window.localStorage.setItem('authToken', token)
  }, token)

  // Skip navigation if explicitly set to null
  if (options?.navigationUrl !== null) {
    // Create a new page for token initialization
    const page = await context.newPage()

    try {
      // Navigate to the specified URL or default to root
      const url = options?.navigationUrl || '/'
      await page.goto(url, { timeout: 10000 }).catch((error) => {
        console.warn(`Navigation to ${url} failed: ${error.message}`)
        console.warn('Auth token was added via script, but navigation failed.')
        console.warn(
          'This may affect cookies. Consider using options.navigationUrl to specify a valid URL.'
        )
      })
    } finally {
      // Always close the page, even if navigation fails
      await page.close()
    }
  } else {
    console.log(
      'Navigation skipped (options.navigationUrl=null). Token added via script only.'
    )
  }

  // Save the state with the token using safe file operations
  const finalStatePath = `${statePath}.${Date.now()}.tmp`

  try {
    // Save to temporary file first
    await context.storageState({ path: finalStatePath })

    // Read the temporary file - await the async operation
    const stateData = await safeReadJsonFile(finalStatePath, {
      cookies: [],
      origins: []
    })

    // Write atomically to the final location - await the async operation
    await safeWriteJsonFile(statePath, stateData)

    // Clean up temp file
    if (fs.existsSync(finalStatePath)) {
      fs.unlinkSync(finalStatePath)
    }
  } catch (err) {
    const error = err as Error
    console.warn(`Error saving storage state: ${error.message}`)
    // Clean up temp file if it exists
    if (fs.existsSync(finalStatePath)) {
      try {
        fs.unlinkSync(finalStatePath)
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
