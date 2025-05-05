// Type definitions for the authentication session manager

/* eslint-disable @typescript-eslint/no-explicit-any */

type TokenFetchOptions = {
  path: string
  baseUrl?: string
  method?: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'
  body?: any
  headers?: Record<string, string>
}

/**
 * Storage configuration options for flexibility across different project structures
 */
export type StorageOptions = {
  /** Root directory for auth session storage (fixed at process.cwd()/.auth-sessions) */
  storageDir?: string
  /** Debug mode to enable additional logging */
  debug?: boolean
}

/** Auth token storage format
 * Extensible to support different authentication systems and token formats.
 * Only 'token' and 'createdAt' are required, all other fields are optional. */
export type AuthTokenData = {
  token: string
  createdAt: string
  expiresAt?: string | null
  refreshToken?: string
  tokenType?: string
  [key: string]: unknown
}

/** Function type for customizing how token data is formatted before storage
 * This allows for complete customization of the token storage format */
export type TokenDataFormatter = (token: string) => AuthTokenData

/** Options for the auth session */
export type AuthSessionOptions = {
  /** Root directory for auth session storage (default: process.cwd()/.auth-sessions)
   * Note: The environment and user role will be appended to this path by the provider */
  storageDir?: string
  /** Token filename (default: auth-token.json) */
  tokenFileName?: string
  /** Function to extract the token from a response */
  tokenExtractor?: (data: any) => string
  /** Custom token data formatter to control how tokens are saved */
  tokenDataFormatter?: TokenDataFormatter
  /** Token fetch configuration */
  tokenFetch?: TokenFetchOptions
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
  authOptions: AuthOptions
  authToken: string
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
}

/**
 * Result of storage path resolution
 * Contains the actual filesystem paths for auth storage
 */
export type StoragePaths = {
  /** Resolved directory for auth storage files */
  storageDir: string

  /** Full path to the Playwright storage state file */
  storageStatePath: string
}
