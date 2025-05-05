/**
 * Storage utilities for Playwright testing
 * Simple, explicit functions for managing test storage files
 *
 * Uses Playwright's storage state for auth sessions:
 * @see https://playwright.dev/docs/api-testing#reusing-authentication-state
 * @see https://playwright.dev/docs/api/class-apirequestcontext#api-request-context-storage-state
 * @see https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs'
import path from 'node:path'
import type { StoragePaths, AuthIdentifiers, StorageOptions } from './types'

/**  Default environment when none is specified */
const DEFAULT_ENVIRONMENT = 'local'

/** Default user role when none is specified */
const DEFAULT_USER_ROLE = 'default'

/**
 * Get environment from the auth provider or fallback to environment variables
 * @param options Optional overrides
 * */
const getCurrentEnvironment = (options?: { environment?: string }): string => {
  try {
    // try to get from provider first
    const { getAuthProvider } = require('./auth-provider')
    const provider = getAuthProvider()
    return provider.getEnvironment(options)
  } catch (error) {
    // Fallback to environment variables
    return options?.environment || process.env.TEST_ENV || DEFAULT_ENVIRONMENT
  }
}

/**
 * Get current user role from the auth provider or fallback to default
 * @param options Optional overrides
 */
const getCurrentUserRole = (options?: { userRole?: string }): string => {
  try {
    // try to get from provider first
    const { getAuthProvider } = require('./auth-provider')
    const provider = getAuthProvider()
    return provider.getUserRole(options)
  } catch (error) {
    // Fallback to default or provided value
    return options?.userRole || DEFAULT_USER_ROLE
  }
}

/**
 * Get the storage directory path based on environment and user role
 * @param options Configuration options
 * @param options.environment Test environment (e.g., 'local', 'dev', 'staging')
 * @param options.userRole User role for storage separation
 * @param options.basePath Base path for storage (defaults to current working directory)
 * @returns Path to the auth storage directory
 */
// Simple fixed directory for auth storage
export const getStorageDir = (
  options?: AuthIdentifiers & StorageOptions
): string => {
  // Always use a fixed path at repo root, organized by environment and role
  return path.join(
    process.cwd(),
    '.auth-sessions',
    getCurrentEnvironment(options),
    getCurrentUserRole(options)
  )
}

/**
 * Get the storage state path for a specific environment and user role
 * @param options Configuration options
 * @param options.environment Test environment (e.g., 'local', 'dev', 'staging')
 * @param options.userRole User role for storage separation
 * @param options.authStoragePath Custom storage path (defaults to process.cwd())
 * @returns Path to the storage state file
 */
export const getStorageStatePath = (
  options?: AuthIdentifiers & StorageOptions
): string => path.join(getStorageDir(options), 'storage-state.json')

/**
 * Generate a token file path based on environment and user role
 * @param options Options for token file path generation
 * @param options.environment Environment for storage separation
 * @param options.userRole User role for storage separation
 * @param options.tokenFileName Custom token filename
 * @param options.authStoragePath Custom storage path (defaults to process.cwd())
 * @param options.useDirectStoragePath Use direct storage path
 * @returns Path to the token file
 */
export function getTokenFilePath(
  options?: AuthIdentifiers &
    StorageOptions & {
      tokenFileName?: string
      useDirectStoragePath?: boolean
    }
): string {
  const tokenFileName = options?.tokenFileName || 'auth-token.json'
  return path.join(getStorageDir(options), tokenFileName)
}

// Default paths using the current environment
export const storageDir = getStorageDir()

/**
 * Initialize storage for auth sessions
 * This ensures the directory structure is ready for auth session storage
 *
 * Creates an empty storage state compatible with Playwright's storageState option:
 * @see https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state
 *
 * @param options Configuration options
 * @param options.environment Test environment (e.g., 'local', 'dev', 'staging')
 * @param options.userRole User role for storage separation
 * @returns Object containing the created storage paths
 */
/**
 * Safely write a JSON file using an atomic write operation
 * This prevents file corruption during concurrent access
 *
 * @param filePath Path to the JSON file
 * @param data Data to write
 * @param pretty Whether to pretty-print the JSON
 */
export function safeWriteJsonFile<T>(
  filePath: string,
  data: T,
  pretty = true
): void {
  const dir = path.dirname(filePath)

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Generate temporary file path
  const tmpFilePath = `${filePath}.${Date.now()}.tmp`

  try {
    // Write to temporary file first
    fs.writeFileSync(
      tmpFilePath,
      JSON.stringify(data, null, pretty ? 2 : 0),
      'utf8'
    )

    // Rename temp file to target file (atomic operation on most filesystems)
    fs.renameSync(tmpFilePath, filePath)
  } catch (err) {
    // Clean up temp file if something went wrong
    if (fs.existsSync(tmpFilePath)) {
      try {
        fs.unlinkSync(tmpFilePath)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    throw err
  }
}

/**
 * Safely read a JSON file with retry mechanism and fallback for corrupted files
 *
 * @param filePath Path to the JSON file
 * @param defaultValue Default value to return if file doesn't exist or is corrupted
 * @param maxRetries Maximum number of retries
 * @returns Parsed JSON data or default value
 */
export function safeReadJsonFile<T>(
  filePath: string,
  defaultValue: T,
  maxRetries = 3
): T {
  if (!fs.existsSync(filePath)) {
    return defaultValue
  }

  let lastError: Error | null = null

  // Try a few times in case the file is being written to by another process
  for (let i = 0; i < maxRetries; i++) {
    try {
      const data = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(data) as T
    } catch (err) {
      lastError = err as Error

      // Small backoff between retries
      if (i < maxRetries - 1) {
        // Simple synchronous sleep
        const startTime = Date.now()
        while (Date.now() - startTime < 100 * (i + 1)) {
          // Empty loop for a simple delay
        }
      }
    }
  }

  // If we get here, all retries failed
  console.warn(
    `Failed to read JSON file ${filePath} after ${maxRetries} attempts. Using default value.`
  )
  console.warn(`Last error: ${lastError?.message}`)

  // Create a fresh file with the default value to prevent future errors
  try {
    safeWriteJsonFile(filePath, defaultValue)
  } catch (e) {
    // Ignore errors during recovery
  }

  return defaultValue
}

export function authStorageInit(options?: AuthIdentifiers): StoragePaths {
  const dir = getStorageDir(options)
  const statePath = getStorageStatePath(options)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Safely write storage state file using atomic operations to prevent corruption
  safeWriteJsonFile(
    statePath,
    // Default empty storage state in Playwright's expected format
    // See: https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state
    { cookies: [], origins: [] }
  )

  return { storageDir: dir, storageStatePath: statePath }
}
