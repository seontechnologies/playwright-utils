/** Auth session setup for the current project
 * Manages global authentication configuration */

import { config as dotenvConfig } from 'dotenv'
import path from 'node:path'
import { getStorageDir } from './auth-storage-utils'
import type { AuthSessionOptions, AuthStorageConfig } from './types'
import fs from 'node:fs'
// eslint-disable-next-line import/named
import { v4 as uuidv4 } from 'uuid'

// Load environment variables
dotenvConfig({
  path: path.resolve(__dirname, '../../.env')
})

/**
 * Standard empty Playwright storage state format
 */
const EMPTY_STORAGE_STATE = {
  cookies: [],
  origins: []
}

/** Configure auth storage settings required by auth providers
 *
 * @param options Configuration options including storage paths and debug settings
 */
export function configureAuthSession(
  options: Partial<AuthSessionOptions & AuthStorageConfig> = {}
) {
  // Get the storage directory
  const storageDir = getStorageDir()

  // Ensure the directory exists
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true })
  }

  // Single path for configuration and token storage
  const storageStatePath = path.join(storageDir, 'storage-state.json')

  // Extract core configuration options
  const configMetadata = {
    storageDir: options.storageDir || storageDir,
    debug: options.debug || false,
    configId: uuidv4(),
    timestamp: new Date().toISOString()
  }

  // Create a valid Playwright storage state with embedded configuration
  let storageState = {
    ...EMPTY_STORAGE_STATE,
    _authConfig: configMetadata
  }

  // If storage state already exists, preserve existing cookies and origins
  if (fs.existsSync(storageStatePath)) {
    try {
      const existingData = fs.readFileSync(storageStatePath, 'utf8')
      if (existingData && existingData.trim()) {
        const parsed = JSON.parse(existingData)
        storageState = {
          cookies: parsed.cookies || [],
          origins: parsed.origins || [],
          _authConfig: configMetadata
        }
      }
    } catch (error) {
      console.warn(
        `Error reading existing storage state: ${error}, creating new file`
      )
    }
  }

  // Write the storage state file
  fs.writeFileSync(storageStatePath, JSON.stringify(storageState, null, 2))
  console.log(`Auth configuration saved to ${storageStatePath}`)
}

/**
 * Get the current global auth session options
 * @returns The global auth options or null if not configured
 */
export function getGlobalAuthOptions(): AuthSessionOptions | null {
  try {
    // We have a standard location for auth configuration
    const storageDir = getStorageDir()
    const storageStatePath = path.join(storageDir, 'storage-state.json')

    if (fs.existsSync(storageStatePath)) {
      try {
        const storageData = fs.readFileSync(storageStatePath, 'utf8')
        const parsedStorage = JSON.parse(storageData)

        // Get config from storage state
        if (parsedStorage._authConfig) {
          return parsedStorage._authConfig
        }
      } catch (storageError) {
        console.warn(`Error reading storage state file: ${storageError}`)
      }
    }
  } catch (error) {
    console.error('Error accessing auth configuration:', error)
  }
  return null
}

/**
 * Initialize auth configuration with project defaults
 * @returns The configuration options that were applied
 */
export function initializeDefaultConfiguration(): AuthSessionOptions {
  // Get default storage directory path
  const defaultStorageDir = getStorageDir()
  const defaultOptions: AuthSessionOptions = {
    storageDir: defaultStorageDir,
    debug: true
  }

  configureAuthSession(defaultOptions)

  // Return the applied options (immutable copy)
  return { ...defaultOptions }
}
