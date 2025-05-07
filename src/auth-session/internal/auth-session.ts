/** Authentication session manager for use with playwright
 * @internal This file contains implementation details that should not be directly imported
 * Use the public API exported from index.ts instead */

import type { APIRequestContext } from '@playwright/test'
import { getStorageDir, getTokenFilePath } from './auth-storage-utils'
import * as fs from 'fs'
import * as path from 'path'
import type {
  AuthSessionOptions,
  AuthTokenData,
  TokenDataFormatter
} from './types'
import { getGlobalAuthOptions } from './auth-configure'
import { getAuthProvider } from './auth-provider'
import { applyAuthToBrowserContext as applyAuthToBrowserContextCore } from '../core'

// Public API is now exclusively in core.ts

/** Default token data formatter that creates the basic token structure
 * Can be overridden by providing a custom formatter in AuthSessionOptions */
export const defaultTokenFormatter: TokenDataFormatter = (
  token: string
): AuthTokenData => ({
  token,
  createdAt: new Date().toISOString(),
  expiresAt: null
})

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
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, 'utf8')
        const parsed = JSON.parse(data) as AuthTokenData

        // Check if token is expired
        if (
          parsed.expiresAt &&
          new Date(parsed.expiresAt).getTime() < Date.now()
        ) {
          if (this.options.debug) {
            console.log('Token expired, will fetch a new one')
          }
          return
        }

        this.token = parsed.token
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
      // Use custom formatter if provided or default formatter
      const tokenFormatter =
        this.options.tokenDataFormatter || defaultTokenFormatter
      const data = tokenFormatter(token)

      fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2))

      if (this.options.debug) {
        console.log('Token saved to storage')
      }
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
   * Manage the complete authentication token lifecycle
   * Handles checking existing tokens, fetching new ones if needed, and persistence
   */
  public async manageAuthToken(request: APIRequestContext): Promise<string> {
    if (this.hasToken && this.token) {
      if (this.options.debug) {
        console.log('Using cached token')
      }
      return this.token
    }

    // Get token from the auth provider
    const token = await this.getTokenFromProvider(request)
    this.token = token
    this.hasToken = true
    this.saveTokenToStorage(token)

    return token
  }
}
