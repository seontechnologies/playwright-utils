/** Authentication session manager for use with playwright
 * @internal This file contains implementation details that should not be directly imported
 * Use the public API exported from index.ts instead */

import type { APIRequestContext } from '@playwright/test'
import { getStorageDir, getTokenFilePath } from './auth-storage-utils'
import * as fs from 'fs'
import * as path from 'path'
import type { AuthSessionOptions, TokenDataFormatter } from './types'
import { getGlobalAuthOptions } from './auth-configure'
import { getAuthProvider } from './auth-provider'
import {
  applyAuthToBrowserContext as applyAuthToBrowserContextCore,
  loadTokenFromStorage,
  saveTokenToStorage
} from '../core'

export const defaultTokenFormatter: TokenDataFormatter = (
  tokenData: unknown
): unknown => {
  // Return the token as-is without any modification
  // This works with any token format (string, object, Playwright storage state, etc.)
  return tokenData
}

// Re-export the function from core to avoid circular dependencies
export const applyAuthToBrowserContext = applyAuthToBrowserContextCore

export class AuthSessionManager {
  private static instance: AuthSessionManager
  private readonly storageDir: string
  private readonly storageFile: string
  private readonly options: AuthSessionOptions
  private hasToken: boolean = false
  private token: string | null = null

  private constructor(options: AuthSessionOptions) {
    // get global options as fallback
    const mergedOptions = { ...getGlobalAuthOptions(), ...options }

    // Users must implement and set a custom AuthProvider through setAuthProvider()
    // This simplifies the design and makes responsibilities clearer

    // Set up the options with sensible defaults
    this.options = {
      debug: false,
      tokenFileName: 'auth-token.json',
      ...mergedOptions // Apply any user-provided options
    }

    // get the auth provider for environment and role information
    const provider = getAuthProvider()
    // get environment and user role from the provider
    const environment = provider.getEnvironment()
    const userRole = provider.getUserRole()

    // Get storage paths based on environment and user role from the provider
    this.storageDir =
      this.options.storageDir ||
      getStorageDir({
        environment,
        userRole
      })

    this.storageFile = this.options.storageDir
      ? path.join(this.storageDir, this.options.tokenFileName!)
      : getTokenFilePath({
          environment,
          userRole,
          tokenFileName: this.options.tokenFileName
        })

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true })
    }

    // Try to load existing token
    this.loadTokenFromStorage()

    if (this.options.debug) {
      console.log(
        `Auth session manager initialized with storage at: ${this.storageFile}`
      )
    }
  }

  /* Get singleton instance with options */
  public static getInstance(options?: AuthSessionOptions): AuthSessionManager {
    // Use provided options, fallback to global options, or throw if neither exists
    const resolvedOptions = options || getGlobalAuthOptions()
    if (!resolvedOptions) {
      throw new Error(
        'Auth session options must be provided either directly or via configureAuthSession'
      )
    }

    if (!AuthSessionManager.instance) {
      AuthSessionManager.instance = new AuthSessionManager(resolvedOptions)
    } else if (options) {
      // If new options are provided, warn that they won't be used as instance already exists
      console.warn(
        'Auth session manager already initialized - new options ignored'
      )
    }

    return AuthSessionManager.instance
  }

  /** Load token from storage if it exists */
  private loadTokenFromStorage(): void {
    try {
      // Use core loadTokenFromStorage function with token expiration check
      const token = loadTokenFromStorage(this.storageFile, true)

      if (token) {
        this.token = token
        this.hasToken = true

        if (this.options.debug) {
          console.log('Token loaded from storage')
        }
      }
    } catch (error) {
      console.error('Error loading token from storage:', error)
    }
  }

  /** Save token to storage */
  private saveTokenToStorage(token: string): void {
    try {
      // Create metadata using the token formatter
      const tokenFormatter =
        this.options.tokenDataFormatter || defaultTokenFormatter
      const data = tokenFormatter(token)

      // Since token data can be any format now, we need to handle it properly
      // The core saveTokenToStorage expects a string token and object metadata

      // Store the formatted data directly as JSON
      const jsonContent = JSON.stringify(data, null, 2)

      // Use core saveTokenToStorage function
      saveTokenToStorage({
        tokenPath: this.storageFile,
        token: jsonContent, // Pass the stringified version of the data
        metadata: {}, // Empty object for metadata (type-safe)
        debug: this.options.debug
      })
    } catch (error) {
      console.error('Error saving token to storage:', error)
    }
  }

  /**
   * Clear the token from storage
   * @returns Boolean indicating whether a token was successfully cleared
   */
  public clearToken(): boolean {
    try {
      // Track if a token was actually cleared
      let tokenCleared = false

      // Clear from file storage if exists
      if (fs.existsSync(this.storageFile)) {
        fs.unlinkSync(this.storageFile)
        tokenCleared = true
      }

      // Clear from memory if exists
      if (this.hasToken) {
        tokenCleared = true
      }

      this.token = null
      this.hasToken = false

      if (this.options.debug) {
        console.log('Token cleared from storage')
      }

      return tokenCleared
    } catch (error) {
      console.error('Error clearing token from storage:', error)
      return false
    }
  }

  /**
   * Get a new token using the AuthProvider
   *
   * @param request The Playwright API request context
   * @returns A promise that resolves to the authentication token
   */
  private async getTokenFromProvider(
    request: APIRequestContext
  ): Promise<string> {
    // Get the auth provider
    const provider = getAuthProvider()

    if (!provider) {
      throw new Error(
        'No auth provider configured. You must call setAuthProvider() with your custom provider.'
      )
    }

    if (this.options.debug) {
      console.log('Delegating token acquisition to AuthProvider')
    }

    // Use the provider to get the token
    // We don't need to pass environment/userRole options because the provider will use what it has configured
    const token = await provider.manageAuthToken(request, {})

    if (!token) {
      throw new Error(
        'AuthProvider.manageAuthToken returned an empty or undefined token'
      )
    }

    return token
  }

  /**
   * Check if a token is expired
   * Relies on loadTokenFromStorage which uses the registered token expiration function
   */
  private isTokenExpired(): boolean {
    // Check if the token exists in memory first
    if (!this.hasToken || this.token === null) {
      return true
    }

    // Try to load from storage - this will apply our expiration check
    // If loadTokenFromStorage returns null, the token is considered expired
    const token = loadTokenFromStorage(this.storageFile, true)
    const isExpired = token === null

    if (this.options.debug && isExpired) {
      console.log('Token expired according to expiration check function')
    }

    return isExpired
  }

  /**
   * Refresh the token if it's expired
   *
   * @param request The Playwright API request context
   * @returns A promise that resolves to the refreshed token
   */
  private async refreshTokenIfNeeded(
    request: APIRequestContext
  ): Promise<string> {
    if (this.isTokenExpired()) {
      if (this.options.debug) {
        console.log('Token expired, refreshing...')
      }

      // Get token from the auth provider
      const token = await this.getTokenFromProvider(request)
      this.token = token
      this.hasToken = true
      this.saveTokenToStorage(token)

      return token
    }

    // Token is still valid
    return this.token as string
  }

  /**
   * Manage the complete authentication token lifecycle
   * Handles checking existing tokens, fetching new ones if needed, and persistence
   */
  public async manageAuthToken(request: APIRequestContext): Promise<string> {
    if (this.hasToken && this.token) {
      // Even if we have a token, check if it's expired and refresh if needed
      return this.refreshTokenIfNeeded(request)
    }

    // Get token from the auth provider
    const token = await this.getTokenFromProvider(request)
    this.token = token
    this.hasToken = true
    this.saveTokenToStorage(token)

    return token
  }
}
