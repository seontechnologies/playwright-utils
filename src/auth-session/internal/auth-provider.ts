/** Auth Provider Interface
 * Defines the contract for authentication providers */
import type { APIRequestContext } from '@playwright/test'
import type { AuthOptions, AuthSessionOptions } from './types'

/**
 * Interface for auth provider implementations
 *
 * This allows for custom authentication logic to be plugged into the auth session system
 * For example, you could implement an OAuth provider, a JWT provider, etc.
 */
export interface AuthProvider {
  /**
   * Get the current environment
   * @param options Optional auth options that may override the provider's defaults
   */
  getEnvironment(options?: Partial<AuthOptions>): string

  /**
   * Get the current user role
   * @param options Optional auth options that may override the provider's defaults
   */
  getUserRole(options?: Partial<AuthOptions>): string

  /**
   * Extract the raw token from formatted token data
   * This allows providers to access tokens from their specific formats
   *
   * @param tokenData The formatted token data
   * @returns The raw token string or null if not extractable
   */
  extractToken(tokenData: Record<string, unknown>): string | null

  /**
   * Extract cookies from formatted token data
   * This allows providers to access cookies from their specific formats
   *
   * @param tokenData The formatted token data
   * @returns Array of cookie objects ready for browser context
   */
  extractCookies(tokenData: Record<string, unknown>): Array<{
    name: string
    value: string
    domain?: string
    path?: string
    expires?: number
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'Strict' | 'Lax' | 'None'
  }>

  /**
   * Check if a token is expired
   * This allows providers to implement custom expiration logic
   *
   * @param rawToken The raw token string to check for expiration
   * @returns True if the token is expired, false otherwise
   */
  isTokenExpired?(rawToken: string): boolean

  /**
   * Manage authentication token lifecycle
   * This handles checking storage, acquiring tokens when needed, and saving tokens
   *
   * @param request The Playwright API request context
   * @param options Optional auth options that may override the provider's defaults
   * @returns A storage state object compatible with Playwright's context APIs
   */
  manageAuthToken(
    request: APIRequestContext,
    options?: Partial<AuthOptions>
  ): Promise<Record<string, unknown>>

  /**
   * Clear the authentication token
   * @param options Optional auth options that may override the provider's defaults
   */
  clearToken(options?: Partial<AuthOptions>): void
}

// Global provider instance that can be configured
let globalAuthProvider: AuthProvider | null = null

/**
 * Set the auth provider to use for all auth session operations
 * This is the recommended way to configure authentication
 * Users MUST implement their own provider and set it here
 *
 * @param provider The auth provider to use
 */
export function setAuthProvider(provider: AuthProvider): void {
  globalAuthProvider = provider
}

/**
 * Get the configured auth provider
 * Returns the global provider if set, otherwise throws an error
 */
export function getAuthProvider(): AuthProvider {
  if (!globalAuthProvider) {
    throw new Error(
      'No auth provider configured. You must call setAuthProvider() with a custom provider implementation ' +
        'before using any auth session functionality. See the documentation for examples.'
    )
  }
  return globalAuthProvider
}

// Import this dynamically to avoid circular dependency
export function getGlobalAuthOptions(): AuthSessionOptions {
  return require('./auth-configure').getGlobalAuthOptions()
}
