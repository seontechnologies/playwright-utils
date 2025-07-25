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
 * This allows for complete customization of the token storage format with type safety
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
 * @template TInput The type of the input token data
 * @template TOutput The type of the formatted output data
 * @param token The raw token data
 * @param options Optional auth session options to customize formatting
 * @returns Formatted token data ready for storage
 */
export type TokenDataFormatter<TInput = unknown, TOutput = unknown> = (
  token: TInput,
  options?: Partial<AuthSessionOptions>
) => TOutput

/**
 * Standard Playwright storage state format for type safety
 * This represents the expected structure for browser context storage state
 */
export type PlaywrightStorageState = {
  cookies: Array<{
    name: string
    value: string
    domain?: string
    path?: string
    expires?: number
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'Strict' | 'Lax' | 'None'
  }>
  origins: Array<{
    origin: string
    localStorage: Array<{
      name: string
      value: string
    }>
  }>
}

/** Default token data formatter type that converts unknown input to Playwright storage state */
export type DefaultTokenDataFormatter = TokenDataFormatter<
  unknown,
  PlaywrightStorageState
>

/** Retry configuration for error recovery */
export type RetryConfig = {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Initial delay between retries in milliseconds (default: 100ms) */
  initialDelayMs?: number
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier?: number
  /** Maximum delay between retries in milliseconds (default: 5000ms) */
  maxDelayMs?: number
  /** Whether to add random jitter to delays (default: true) */
  enableJitter?: boolean
}

/** Options for the auth session */
export type AuthSessionOptions = AuthIdentifiers & {
  /** Root directory for auth session storage (default: process.cwd()/.auth)
   * Note: The environment and user identifier will be appended to this path by the provider */
  storageDir?: string
  /** Token filename (default: storage-state.json) */
  tokenFileName?: string
  /** Cookie name to use for authentication (default: auth-token) */
  cookieName?: string
  /** Custom token data formatter to control how tokens are saved */
  tokenDataFormatter?: TokenDataFormatter<unknown, PlaywrightStorageState>
  /** Debug mode (default: false) */
  debug?: boolean
  /** Retry configuration for error recovery (default: { maxRetries: 3, initialDelayMs: 100 }) */
  retryConfig?: RetryConfig
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
 * These identifiers determine which environment and user identifier to use
 */
export type AuthIdentifiers = {
  /** Environment to use for authentication
   * @default process.env.TEST_ENV || 'local' */
  environment?: string

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
