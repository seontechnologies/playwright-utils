/**
 * Core authentication functionality for the auth session library
 * This file is the single source of truth for the public API
 * following SEON's functional programming principles
 */

import type { APIRequestContext } from '@playwright/test'
import {
  configureAuthSession as configureAuth,
  getGlobalAuthOptions
} from './internal/auth-configure'
import * as fs from 'fs'
import type { AuthSessionOptions, AuthIdentifiers } from './internal/types'
import { AuthSessionManager } from './internal/auth-session'
import { getAuthProvider } from './internal/auth-provider'
import { getTokenFilePath } from './internal/auth-storage-utils'
import { log } from '../log'

// Export AuthSessionManager class for internal usage only (not part of public API)
export { AuthSessionManager }

// Re-export set auth provider for token operations
export { setAuthProvider } from './internal/auth-provider'

/** Extract the raw token from provider-specific token data
 * Uses the provider's knowledge of its own token format */
function extractTokenFromData(
  tokenData: Record<string, unknown>
): string | null {
  try {
    // Use the provider to extract the token
    const provider = require('./internal/auth-provider').getAuthProvider()

    // Provider must implement extractToken method
    if (provider && typeof provider.extractToken === 'function') {
      return provider.extractToken(tokenData)
    }

    // No extractToken method implemented
    log.warningSync('Provider does not implement extractToken method')
    return null
  } catch (error) {
    log.errorSync(
      `Error extracting token: ${error instanceof Error ? error.message : String(error)}`
    )
    return null
  }
}

/** Internal function to check if a token is expired
 * Uses the provider's isTokenExpired method if implemented */
function checkTokenExpiration(tokenData: Record<string, unknown>): boolean {
  try {
    // Extract the raw token first
    const rawToken = extractTokenFromData(tokenData)
    if (rawToken === null) {
      log.warningSync('Cannot extract token, considering expired')
      return true // Can't extract token, consider expired
    }

    // Use provider's isTokenExpired if implemented
    const provider = require('./internal/auth-provider').getAuthProvider()
    if (provider && typeof provider.isTokenExpired === 'function') {
      return provider.isTokenExpired(rawToken)
    }

    // If the provider doesn't implement isTokenExpired, consider the token valid
    // This encourages implementing the method in the provider
    return false
  } catch (error) {
    log.errorSync(
      `Error checking token expiration: ${error instanceof Error ? error.message : String(error)}`
    )
    return true // Consider token expired if we encounter an error
  }
}

/**
 * Load a token from storage if one exists
 * Handles token expiration checking using registered token expiration function
 *
 * @param tokenPath Path to the token file
 * @param checkExpiration Whether to check if the token is expired (defaults to true)
 */
export function loadTokenFromStorage(
  tokenPath: string,
  checkExpiration: boolean = true
): string | null {
  // Check if token file exists
  if (!fs.existsSync(tokenPath)) {
    // No token file exists
    return null
  }

  try {
    const rawData = fs.readFileSync(tokenPath, 'utf8')
    const tokenData = JSON.parse(rawData)

    // Extract token using provider-specific extraction logic
    const token = extractTokenFromData(tokenData)
    if (token === null) {
      return null // Could not extract token
    }

    // Skip expiration check if explicitly disabled
    if (!checkExpiration) {
      return token
    }

    // Check if token is expired using provider-specific expiration logic
    if (checkTokenExpiration(tokenData)) {
      // Token is expired
      return null
    }

    return token
  } catch (err) {
    log.errorSync(
      `Error loading token from ${tokenPath}: ${err instanceof Error ? err.message : String(err)}`
    )
    return null
  }
}

/**
 * Save a token to storage
 * @param tokenPath Path to the token file
 * @param token Token to save
 * @returns Boolean indicating whether the token was successfully saved
 */
export function saveTokenToStorage(tokenPath: string, token: string): boolean {
  try {
    // Ensure the directory exists
    const dir = require('path').dirname(tokenPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Write token to file
    fs.writeFileSync(tokenPath, token)
    return true
  } catch (err) {
    log.errorSync(
      `Error saving token to ${tokenPath}: ${err instanceof Error ? err.message : String(err)}`
    )
    return false
  }
}

/**
 * Load a storage state file and parse it into an object in one step
 * This simplifies token management by handling both loading and parsing
 *
 * @param tokenPath Path to the storage state file
 * @param skipIfExpired Whether to check if the token is expired
 * @returns The parsed storage state object or null if invalid/expired
 */
export function loadStorageState(
  tokenPath: string,
  skipIfExpired = true
): Record<string, unknown> | null {
  try {
    // First check if we have a valid token string using existing function
    if (!fs.existsSync(tokenPath)) {
      return null
    }

    // Read and parse the raw storage state file
    const rawData = fs.readFileSync(tokenPath, 'utf8')
    if (!rawData?.trim()) {
      return null
    }

    const storageState = JSON.parse(rawData)

    // Validate the token if needed
    if (skipIfExpired && checkTokenExpiration(storageState)) {
      return null // Token is expired
    }

    return storageState
  } catch (error) {
    log.errorSync(
      `Error loading storage state from ${tokenPath}: ${error instanceof Error ? error.message : String(error)}`
    )
    return null
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
 * @param options Optional environment and user identifier overrides
 * @returns A promise that resolves to a storage state object compatible with Playwright context
 */
export async function getAuthToken(
  request: APIRequestContext,
  options?: AuthIdentifiers
): Promise<Record<string, unknown>> {
  const provider = getAuthProvider()
  const environment = provider.getEnvironment(options)
  const userIdentifier = provider.getUserIdentifier(options)

  // Initialize the AuthSessionManager for centralized token management
  // Convert AuthIdentifiers to AuthSessionOptions
  const sessionOptions: AuthSessionOptions = {
    debug: true // Enable debug by default for auth operations
  }
  const sessionManager = AuthSessionManager.getInstance(sessionOptions)

  // Get the token file path based on environment and user
  const tokenPath = getTokenFilePath({
    environment,
    userIdentifier
  })

  // Try to load an existing storage state with all parsing handled for us
  const existingStorageState = loadStorageState(tokenPath, true)
  if (existingStorageState) {
    return existingStorageState
  }

  // If no valid token exists, request a new one from the provider
  const storageState = await provider.manageAuthToken(request, {
    environment,
    userIdentifier,
    ...options
  })

  // Save the storage state for future use
  // Convert to string for storage while preserving the object for return
  if (storageState) {
    const tokenString = JSON.stringify(storageState)
    sessionManager.saveToken(tokenString)
  }

  // Return the storage state object for use with Playwright context
  return storageState
}

/**
 * Clear the authentication token from storage
 * @param options Optional environment and user identifier overrides
 * @returns Boolean indicating whether a token was successfully cleared
 */
export function clearAuthToken(options?: AuthIdentifiers): boolean {
  // Get global auth options
  const globalOptions = getGlobalAuthOptions()

  // If auth session isn't configured, create a minimal configuration
  // This allows the function to work even when called directly
  if (!globalOptions) {
    log.infoSync(
      'Auth session not explicitly configured. Using default configuration.'
    )

    // Use default options
    const defaultOptions: AuthSessionOptions = {
      debug: false,
      storageDir: process.env.AUTH_STORAGE_DIR || './.auth',
      ...options
    }

    // Create auth manager with minimal config
    const authManager = AuthSessionManager.getInstance(defaultOptions)
    return authManager.clearToken()
  }

  // Normal path when auth session is configured properly
  const fullOptions: AuthSessionOptions = {
    ...globalOptions,
    ...options
  }

  const authManager = AuthSessionManager.getInstance(fullOptions)
  // Return success indicator
  return authManager.clearToken()
}
