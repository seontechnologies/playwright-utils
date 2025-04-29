// Type definitions for the authentication session manager

/* eslint-disable @typescript-eslint/no-explicit-any */

type TokenFetchOptions = {
  path: string
  baseUrl?: string
  method?: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'
  body?: any
  headers?: Record<string, string>
}

/** Auth token storage format *
 * Extensible to support different authentication systems and token formats.
 * Only 'token' and 'createdAt' are required, all other fields are optional. */
export type AuthTokenData = {
  token: string
  createdAt: string
  expiresAt?: string
  refreshToken?: string
  tokenType?: string
  [key: string]: unknown
}

/** Function type for customizing how token data is formatted before storage
 * This allows for complete customization of the token storage format */
export type TokenDataFormatter = (token: string) => AuthTokenData

/** Options for the auth session */
export type AuthSessionOptions = {
  /** Root directory for auth session storage (default: pw/.auth-sessions)
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

export type AuthOptions = {
  /** Environment to use for authentication
   * @default process.env.TEST_ENV || 'local' */
  environment?: string

  /** User role to authenticate as
   * @default 'default' */
  userRole?: string

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
