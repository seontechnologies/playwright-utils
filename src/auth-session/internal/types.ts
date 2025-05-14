// Type definitions for the authentication session manager

/* eslint-disable @typescript-eslint/no-explicit-any */

// We're removing TokenFetchOptions since we're making AuthProvider the only pattern for token acquisition

/**
 * Authentication storage configuration options for flexibility across different project structures
 */
export type AuthStorageConfig = {
  /** Root directory for auth session storage (fixed at process.cwd()/.auth) */
  storageDir?: string
  /** Debug mode to enable additional logging */
  debug?: boolean
}

/** Function type for customizing how token data is formatted before storage
 * This allows for complete customization of the token storage format
 *
 * Token data can be any format that the auth provider supports:
 * - Simple Bearer tokens (string)
 * - Playwright storage state (object with cookies and origins)
 * - Custom token formats from auth providers
 *
 * NOTE: For UI testing with Playwright's built-in storage state, this formatter is often
 * unnecessary and can be omitted entirely. The default implementation simply passes
 * the token through without modification.
 *
 * @param token The raw token data (could be string, object, etc.)
 * @param options Optional auth session options to customize formatting
 * @returns Formatted token data ready for storage
 */
export type TokenDataFormatter = (
  token: unknown,
  options?: Partial<AuthSessionOptions>
) => unknown

/** Options for the auth session */
export type AuthSessionOptions = AuthIdentifiers & {
  /** Root directory for auth session storage (default: process.cwd()/.auth)
   * Note: The environment and user role will be appended to this path by the provider */
  storageDir?: string
  /** Token filename (default: storage-state.json) */
  tokenFileName?: string
  /** Cookie name to use for authentication (default: auth-token) */
  cookieName?: string
  /** Custom token data formatter to control how tokens are saved */
  tokenDataFormatter?: TokenDataFormatter
  /** Debug mode (default: false) */
  debug?: boolean
}

/**
 * Full auth configuration that extends the base identifiers
 * Includes URLs and additional configuration beyond just identifiers
 */
export type AuthOptions = AuthIdentifiers & {
  /** Base URL to use for the browser context (the application URL)
   * If not provided, will be determined based on environment
   * @default process.env.BASE_URL || environment-specific URL */
  baseUrl?: string

  /** Base URL to use for authentication requests (the auth service URL)
   * This is often different from the application baseUrl
   * @default process.env.AUTH_BASE_URL || environment-specific auth URL */
  authBaseUrl?: string
}

/** For usage in test fixtures */
export type AuthFixtures = {
  /** Configuration options for authentication */
  authOptions: AuthOptions

  /** Authentication token for API requests */
  authToken: string

  /** Toggle to enable/disable authentication session
   * When false, auth token acquisition and applying to browser context is skipped
   * Set to false to completely disable auth for specific tests
   * @default true */
  authSessionEnabled: boolean

  // context and page are already part of the base Playwright test
}

/**
 * Base identification options used across the auth system
 * These identifiers determine which environment and role to use
 */
export type AuthIdentifiers = {
  /** Environment to use for authentication
   * @default process.env.TEST_ENV || 'local' */
  environment?: string

  /** User role to authenticate as
   * @default 'default' */
  userRole?: string

  /** User identifier; email or username */
  userIdentifier?: string

  /** User password */
  userPassword?: string
}

/**
 * Result of storage path resolution
 * Contains the actual filesystem paths for auth storage
 */
export type AuthSessionConfig = {
  /** Resolved directory for auth storage files */
  storageDir: string

  /** Full path to the Playwright storage state file */
  storageStatePath: string
}
