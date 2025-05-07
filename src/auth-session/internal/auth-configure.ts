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

// Dynamically calculate storage paths based on configuration

/** Configure minimal auth storage settings required by custom auth providers
 *
 * This function only sets up storage paths and debugging options.
 * It does NOT handle token acquisition or environment/role management (that should be done by the auth provider).
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

  // Create the configuration file path
  const configFilePath = path.join(storageDir, 'auth-config.json')

  // Extract only the core options needed for storage and debugging
  const coreConfig = {
    storageDir: options.storageDir || storageDir,
    debug: options.debug || false,
    configId: uuidv4(),
    timestamp: new Date().toISOString()
  }

  fs.writeFileSync(configFilePath, JSON.stringify(coreConfig, null, 2))
  console.log(`Auth storage configuration saved to ${configFilePath}`)
}

/** Get the current global auth session options
 * @returns The global auth options or null if not configured */
export function getGlobalAuthOptions(): AuthSessionOptions | null {
  try {
    // We have a standard location for the auth configuration
    const storageDir = getStorageDir()
    const configFilePath = path.join(storageDir, 'auth-config.json')

    if (fs.existsSync(configFilePath)) {
      const configData = fs.readFileSync(configFilePath, 'utf8')
      return JSON.parse(configData)
    }
  } catch (error) {
    console.error('Error reading auth configuration:', error)
  }
  return null
}

/**  Initialize auth configuration with project defaults
 * @returns The configuration options that were applied */
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
