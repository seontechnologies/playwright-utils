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
import * as fs from 'fs'
import * as path from 'path'
import * as lockfile from 'proper-lockfile'
import type {
  AuthSessionConfig,
  AuthIdentifiers,
  AuthStorageConfig
} from './types'
import { log } from '../../log'

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
 * Get the storage directory path based on environment, role, and optional user identifier
 * @param options Configuration options
 * @param options.environment Test environment (e.g., 'local', 'dev', 'staging')
 * @param options.userRole User role for storage separation
 * @param options.userIdentifier Optional unique identifier for multiple users with same role
 * @param options.basePath Base path for storage (defaults to current working directory)
 * @returns Path to the auth storage directory
 */
export const getStorageDir = (
  options?: AuthIdentifiers & AuthStorageConfig
): string => {
  const environment = getCurrentEnvironment(options)
  const userRole = getCurrentUserRole(options)

  // Create a unique directory path when userIdentifier is provided
  // This allows multiple users with the same role to have separate token storage
  const rolePath = options?.userIdentifier
    ? `${userRole}_${options.userIdentifier}`
    : userRole

  return path.join(process.cwd(), '.auth', environment, rolePath)
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
  options?: AuthIdentifiers & AuthStorageConfig
): string => path.join(getStorageDir(options), 'storage-state.json')

/**
 * Get the file path for token storage
 * @param options.environment Environment for storage separation
 * @param options.userRole User role for storage separation
 * @param options.userIdentifier Optional unique identifier for multiple users with same role
 * @param options.tokenFileName Custom token filename (ignored - always uses storage-state.json)
 * @param options.authStoragePath Custom storage path (defaults to process.cwd())
 * @param options.useDirectStoragePath Use direct storage path
 * @returns Path to the token file
 */
export const getTokenFilePath = (
  options?: AuthIdentifiers &
    AuthStorageConfig & {
      tokenFileName?: string
      useDirectStoragePath?: boolean
    }
): string => {
  if (options?.useDirectStoragePath) {
    const tokenFileName = options?.tokenFileName || 'storage-state.json'
    return options.storageDir
      ? path.join(options.storageDir, tokenFileName)
      : path.join(getStorageDir(options), tokenFileName)
  }

  return path.join(getStorageDir(options), 'storage-state.json')
}

// Default paths using the current environment
export const storageDir = getStorageDir()

/**
 * Save a complete storage state without any token extraction or processing
 * Useful for cookie-based authentication that needs entire storage state preserved
 *
 * @param tokenPath - The full path to save the storage state to
 * @param storageState - The storage state object (Playwright format with cookies and origins)
 * @returns boolean - Whether the save was successful
 */
export const saveStorageState = (
  tokenPath: string,
  storageState: Record<string, unknown>
): boolean => {
  try {
    // Create directory if needed
    const storageDir = path.dirname(tokenPath)
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true })
    }

    // Write storage state to file
    fs.writeFileSync(tokenPath, JSON.stringify(storageState, null, 2))
    // Only use sync logging because this might be called during process exit
    log.infoSync(`Storage state saved to ${tokenPath}`)
    return true
  } catch (error) {
    log.errorSync(`Error saving storage state to ${tokenPath}: ${error}`)
    return false
  }
}

export async function safeWriteJsonFile<T>(
  filePath: string,
  data: T,
  pretty = true
): Promise<void> {
  const dir = path.dirname(filePath)

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Generate temporary file path
  const tmpFilePath = `${filePath}.${Date.now()}.tmp`

  // Ensure directory exists before attempting to acquire a lock
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
  }

  let release: (() => Promise<void>) | null = null

  try {
    // Acquire a lock on the destination file
    release = await lockfile.lock(filePath, {
      retries: {
        retries: 5,
        factor: 2,
        minTimeout: 50,
        maxTimeout: 500
      },
      // Create an empty file if it doesn't exist yet
      realpath: false,
      onCompromised: (err) => {
        console.warn(`Lock was compromised for ${filePath}:`, err.message)
      }
    })

    // Write to temporary file first
    fs.writeFileSync(
      tmpFilePath,
      JSON.stringify(data, null, pretty ? 2 : 0),
      'utf8'
    )

    // Rename temp file to target file (atomic operation on most filesystems)
    fs.renameSync(tmpFilePath, filePath)

    // Release the lock
    if (release) await release()
    release = null
  } catch (err) {
    // Clean up temp file if something went wrong
    if (fs.existsSync(tmpFilePath)) {
      try {
        fs.unlinkSync(tmpFilePath)
      } catch {
        // Ignore cleanup errors
      }
    }

    // Always release lock if we have one
    if (release) {
      try {
        await release()
      } catch {
        // Ignore release errors
      }
    }

    throw err
  }
}

/**
 * Safely read a JSON file using file locking with retry mechanism and fallback for corrupted files
 *
 * @param filePath Path to the JSON file
 * @param defaultValue Default value to return if file doesn't exist or is corrupted
 * @param maxRetries Maximum number of retries
 * @returns Parsed JSON data or default value
 */
export async function safeReadJsonFile<T>(
  filePath: string,
  defaultValue: T,
  maxRetries = 3
): Promise<T> {
  if (!fs.existsSync(filePath)) {
    return defaultValue
  }

  let lastError: Error | null = null
  let release: (() => Promise<void>) | null = null

  try {
    // Note: proper-lockfile doesn't support shared locks in this version
    // We're using exclusive locks for both reading and writing
    release = await lockfile.lock(filePath, {
      retries: {
        retries: 5,
        factor: 2,
        minTimeout: 50,
        maxTimeout: 500
      },
      realpath: false,
      onCompromised: (err) => {
        console.warn(`Lock was compromised for ${filePath}:`, err.message)
      }
    })

    // Read the file with lock held
    const data = fs.readFileSync(filePath, 'utf8')
    const result = JSON.parse(data) as T

    // Release lock before returning
    if (release) await release()
    release = null

    return result
  } catch (err) {
    lastError = err as Error

    // Always release lock if we have one
    if (release) {
      try {
        await release()
      } catch {
        // Ignore release errors
      }
      release = null
    }

    // If read failed with lock, log the error
    console.warn(`Error reading ${filePath}: ${lastError.message}`)

    // Create a fresh file with the default value to prevent future errors
    try {
      await safeWriteJsonFile(filePath, defaultValue)
    } catch {
      // Ignore errors during recovery
    }

    return defaultValue
  }
}

export function authStorageInit(options?: AuthIdentifiers): AuthSessionConfig {
  const dir = getStorageDir(options)
  const statePath = getStorageStatePath(options)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // We need to ensure the storage state file exists synchronously
  // for Playwright to function correctly
  if (!fs.existsSync(statePath)) {
    // Create an empty storage state in Playwright's expected format
    const emptyState = { cookies: [], origins: [] }
    // Create file synchronously for initial setup
    fs.writeFileSync(statePath, JSON.stringify(emptyState), 'utf8')
  }

  // Return the paths for the caller to use
  return { storageDir: dir, storageStatePath: statePath }
}
