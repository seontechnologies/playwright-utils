/** Auth session setup for the current project
 * Manages global authentication configuration */

import { config as dotenvConfig } from 'dotenv'
import path from 'node:path'
import { storageDir } from './auth-storage-utils'
import type { AuthSessionOptions } from './types'
import fs from 'node:fs'
// eslint-disable-next-line import/named
import { v4 as uuidv4 } from 'uuid'

// Load environment variables
dotenvConfig({
  path: path.resolve(__dirname, '../../.env')
})

// File path for storing configuration
const CONFIG_FILE_PATH = path.join(storageDir, 'auth-config.json')

// Create the storage directory if it doesn't exist
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true })
}

/** Configure minimal auth storage settings required by custom auth providers
 *
 * This function only sets up storage paths and debugging options.
 * It does NOT handle token acquisition or environment/role management (that should be done by the auth provider). */
export function configureAuthSession(
  options: Partial<AuthSessionOptions> = {}
) {
  // Extract only the core options needed for storage and debugging
  const coreConfig = {
    storageDir: options.storageDir || storageDir,
    debug: options.debug || false,
    configId: uuidv4(),
    timestamp: new Date().toISOString()
  }

  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(coreConfig, null, 2))
  console.log(`Auth storage configuration saved to ${CONFIG_FILE_PATH}`)
}

/** Get the current global auth session options
 * @returns The global auth options or null if not configured */
export function getGlobalAuthOptions(): AuthSessionOptions | null {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const configData = fs.readFileSync(CONFIG_FILE_PATH, 'utf8')
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
  const defaultOptions: AuthSessionOptions = {
    storageDir,
    debug: true
  }

  configureAuthSession(defaultOptions)

  // Return the applied options (immutable copy)
  return { ...defaultOptions }
}
