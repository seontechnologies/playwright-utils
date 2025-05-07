/** Auth Provider Interface
 * Defines the contract for authentication providers */
import type { APIRequestContext, BrowserContext } from '@playwright/test'
import type {
  AuthOptions,
  AuthSessionOptions,
  TokenDataFormatter
} from './types'

/* eslint-disable @typescript-eslint/no-require-imports */

/** AuthProvider interface defines the contract for custom authentication providers
 * Applications can implement this interface to provide their own authentication logic */
export interface AuthProvider {
  /** Get the current environment (e.g., 'local', 'staging', 'production')
   * @param options Optional options that might override the default environment
   * @returns The current environment to use   */
  getEnvironment(options?: Partial<AuthOptions>): string

  /** Get the current user role (e.g., 'admin', 'user', 'guest')
   * @param options Optional options that might override the default role
   * @returns The current user role to use */
  getUserRole(options?: Partial<AuthOptions>): string

  /** Manage the complete authentication token lifecycle
   * This method handles the entire token management process:
   * 1. Check for existing token in storage first (avoid unnecessary auth)
   * 2. Initialize storage directories if needed
   * 3. Acquire a new token only if no valid token exists
   * 4. Save the token with metadata for future reuse
   * @param request Playwright APIRequestContext for making HTTP requests
   * @param options Optional auth options that might override defaults
   * @returns Promise resolving to the authentication token */
  manageAuthToken(
    request: APIRequestContext,
    options?: Partial<AuthOptions>
  ): Promise<string>

  /** Apply authentication to a browser context for UI testing
   * @param context Playwright BrowserContext to apply authentication to
   * @param token Authentication token
   * @param options Optional auth options that might override defaults   */
  applyToBrowserContext(
    context: BrowserContext,
    token: string,
    options?: Partial<AuthOptions>
  ): Promise<void>

  /** Clear authentication token
   * @param options Optional auth options that might override defaults   */
  clearToken(options?: Partial<AuthOptions>): void
}

/** Default auth provider factory.
 * Creates a default implementation of AuthProvider that uses the built-in session manager. */
/**
 * Create a default auth provider instance with the supplied options
 * @param options Configuration options for the default auth provider
 * @returns A fully configured AuthProvider instance
 */
function createDefaultAuthProvider(
  options: {
    /** Default auth options (environment/role settings) */
    authOptions?: Partial<AuthOptions>
    /** Session configuration options */
    sessionOptions?: Partial<AuthSessionOptions>
    /** Optional token formatter function */
    tokenDataFormatter?: TokenDataFormatter
  } = {}
): AuthProvider {
  // Import from core directly - this avoids directly importing from internal/auth-session
  // which helps reduce the public API surface
  const {
    AuthSessionManager,
    clearAuthToken,
    applyAuthToBrowserContext
  } = require('../core')

  // Define the provider methods first to avoid 'this' reference issues
  const getEnvironment = (requestOptions: Partial<AuthOptions> = {}): string =>
    requestOptions.environment ||
    options.authOptions?.environment ||
    process.env.TEST_ENV ||
    'local'

  const getUserRole = (requestOptions: Partial<AuthOptions> = {}): string =>
    requestOptions.userRole || options.authOptions?.userRole || 'default'

  // Return the provider implementation
  return {
    getEnvironment,
    getUserRole,

    manageAuthToken: async (request, requestOptions = {}) => {
      // Get environment and role from provider methods
      const environment = getEnvironment(requestOptions)
      const userRole = getUserRole(requestOptions)

      // Prepare storage path using environment and role
      const storageBase = options.sessionOptions?.storageDir
      const storagePath = storageBase
        ? `${storageBase}/${environment}/${userRole}`
        : undefined

      // Create combined auth options
      const authOptions: AuthSessionOptions = {
        // Base options from sessionOptions
        ...options.sessionOptions,
        // Override with specific options
        storageDir: storagePath,
        // Set token formatter if provided
        tokenDataFormatter: options.tokenDataFormatter,
        // Default debug to false if not specified
        debug: options.sessionOptions?.debug ?? false
      }

      // Get token directly from the AuthSessionManager
      const authManagerInstance = AuthSessionManager.getInstance(authOptions)
      const token = await authManagerInstance.manageAuthToken(request)

      // Ensure we're returning a string
      return typeof token === 'string'
        ? token
        : token.token || JSON.stringify(token)
    },

    applyToBrowserContext: async (context, token, requestOptions = {}) => {
      // Use provider methods to get environment and role
      const finalOptions = {
        environment: getEnvironment(requestOptions),
        userRole: getUserRole(requestOptions),
        ...requestOptions
      }
      return applyAuthToBrowserContext(context, token, finalOptions)
    },

    clearToken: (requestOptions = {}) => {
      // Use provider methods to get environment and role
      const finalOptions = {
        environment: getEnvironment(requestOptions),
        userRole: getUserRole(requestOptions),
        ...requestOptions
      }
      clearAuthToken(finalOptions)
    }
  }
}

// Global provider instance that can be configured
let globalAuthProvider: AuthProvider | null = null

/**
 * Set the global auth provider
 * @param provider Custom auth provider implementation
 */
export function setAuthProvider(provider: AuthProvider): void {
  globalAuthProvider = provider
}

/**
 * Get the configured auth provider or create a default one
 * Requires that configuration has been set up before use
 */
export function getAuthProvider(): AuthProvider {
  // Create default provider if none exists
  if (!globalAuthProvider) {
    globalAuthProvider = createDefaultAuthProvider()
  }
  return globalAuthProvider
}
