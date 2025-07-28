/** Authentication session manager for use with playwright
 * @internal This file contains implementation details that should not be directly imported
 * Use the public API exported from index.ts instead */

import type { APIRequestContext } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

import { getStorageDir } from './auth-storage-utils'
import { getGlobalAuthOptions } from './auth-configure'
import { getAuthProvider } from './auth-provider'
import { globalTokenCache } from './cache-manager'
import type {
  AuthSessionOptions,
  PlaywrightStorageState,
  DefaultTokenDataFormatter,
  RetryConfig
} from './types'
import { log } from '../../log'

/** Default retry configuration */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 100,
  backoffMultiplier: 2,
  maxDelayMs: 5000,
  enableJitter: true
}

/**
 * Sleep for a specified number of milliseconds
 * @param ms Milliseconds to sleep
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Calculate the delay for a retry attempt with exponential backoff and optional jitter
 * @param attempt The current attempt number (0-based)
 * @param config Retry configuration
 * @returns Delay in milliseconds
 */
const calculateRetryDelay = (
  attempt: number,
  config: Required<RetryConfig>
): number => {
  const baseDelay =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt)
  const clampedDelay = Math.min(baseDelay, config.maxDelayMs)

  if (config.enableJitter) {
    // Add random jitter ±25% to prevent thundering herd
    const jitter = clampedDelay * 0.25 * (Math.random() * 2 - 1)
    return Math.max(0, clampedDelay + jitter)
  }

  return clampedDelay
}

/**
 * Execute a function with retry logic and exponential backoff
 * @param fn Function to execute
 * @param config Retry configuration
 * @param context Context string for logging
 * @returns Promise that resolves to the function result
 */
const executeWithRetry = async <T>(
  fn: () => Promise<T> | T,
  config: RetryConfig = {},
  context: string = 'operation'
): Promise<T> => {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: Error | unknown
  const totalAttempts = retryConfig.maxRetries + 1 // 1 initial + maxRetries retries

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === totalAttempts - 1) {
        // Final attempt failed, throw the error
        throw error
      }

      const delay = calculateRetryDelay(attempt, retryConfig)
      log.warningSync(
        `${context} failed (attempt ${attempt + 1}/${totalAttempts}), retrying in ${delay.toFixed(0)}ms: ${
          error instanceof Error ? error.message : String(error)
        }`
      )

      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError
}

/**
 * Helper to check if an object matches the Playwright storage state structure
 */
const isPlaywrightStorageState = (data: unknown): boolean => {
  if (!data || typeof data !== 'object') return false

  const obj = data as Record<string, unknown>
  return 'cookies' in obj && Array.isArray(obj.cookies) && 'origins' in obj
}

/**
 * Helper to try parsing a JSON string
 */
const tryParseJson = (str: string): unknown => {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

/**
 * Extract token from a parsed JSON object if it has a token property
 */
const extractTokenFromObject = (obj: unknown): string => {
  if (obj && typeof obj === 'object' && 'token' in obj) {
    return String((obj as Record<string, unknown>).token || '')
  }
  return ''
}

/**
 * Extract token from a JSON string
 */
const extractTokenFromJsonString = (jsonString: string): string | unknown => {
  const parsed = tryParseJson(jsonString)

  // If it's a storage state, return the entire object
  if (parsed && isPlaywrightStorageState(parsed)) {
    return parsed
  }

  // Extract token from parsed object or use the input string
  if (parsed && typeof parsed === 'object') {
    const extractedToken = extractTokenFromObject(parsed)
    return extractedToken || jsonString
  }

  return jsonString
}

/**
 * Extract token from a string
 */
const extractTokenFromString = (str: string): string | unknown => {
  // Check if it's a JSON string
  if (str.trim().startsWith('{') && str.trim().endsWith('}')) {
    return extractTokenFromJsonString(str)
  }
  return str
}

/**
 * Default token formatter for the standard Playwright storage state format
 * This creates a properly formatted storage state with the raw token value
 */
export const defaultTokenFormatter: DefaultTokenDataFormatter = (
  tokenData: unknown,
  options?: Partial<AuthSessionOptions>
): PlaywrightStorageState => {
  // Check if tokenData is already a valid storage state object
  if (isPlaywrightStorageState(tokenData)) {
    return tokenData as PlaywrightStorageState
  }

  // Extract the token based on the input type
  let token: string | unknown = ''

  if (typeof tokenData === 'string') {
    token = extractTokenFromString(tokenData)
    // If a storage state was returned, just use it
    if (token && typeof token === 'object') {
      return token as PlaywrightStorageState
    }
  } else if (tokenData && typeof tokenData === 'object') {
    token = extractTokenFromObject(tokenData) || String(tokenData || '')
  } else {
    token = String(tokenData || '')
  }

  // Get cookie name from options or use a reasonable default
  const globalOptions = getGlobalAuthOptions() || {}
  const cookieName =
    options?.cookieName || globalOptions.cookieName || 'auth-token'

  // Get domain from environment or default to localhost
  const domain = extractDomain()

  // Return a clean Playwright storage state
  return {
    cookies: [
      {
        name: cookieName,
        value: String(token),
        domain,
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: true,
        sameSite: 'Lax' as const
      }
    ],
    origins: []
  }
}

// extractRawToken function has been integrated directly into defaultTokenFormatter
// for simplicity and to avoid unnecessary abstraction

/**
 * Helper to extract domain from environment
 */
function extractDomain(): string {
  const baseUrl = process.env.BASE_URL || process.env.TEST_URL
  if (!baseUrl) return 'localhost'

  try {
    return new URL(baseUrl).hostname
  } catch {
    return 'localhost'
  }
}

export class AuthSessionManager {
  // Changed from singleton to per-storageDir instance cache for proper user isolation
  private static instances: Map<string, AuthSessionManager> = new Map()
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
      // Always use storage-state.json as the standard format for both API and UI testing
      tokenFileName: 'storage-state.json',
      ...mergedOptions // Apply any user-provided options
    }

    // get the auth provider for environment and user identifier information
    const provider = getAuthProvider()

    // Extract the identifiers from options
    const { environment, userIdentifier } = this.options

    // get environment and user identifier from the provider (may apply defaults)
    const resolvedEnvironment = provider.getEnvironment({
      environment,
      userIdentifier
    })
    const resolvedUserIdentifier = provider.getUserIdentifier({
      environment,
      userIdentifier
    })

    // Simplified storage path logic for better consistency
    this.storageDir =
      this.options.storageDir ??
      getStorageDir({
        environment: resolvedEnvironment,
        userIdentifier: resolvedUserIdentifier
      })

    // Always construct the file path from the directory and filename
    this.storageFile = path.join(this.storageDir, this.options.tokenFileName!)

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true })
    }

    // Try to load existing token
    this.loadTokenFromStorage()

    if (this.options.debug) {
      log.infoSync(
        `Auth session manager initialized with storage at: ${this.storageFile}`
      )
    }
  }

  /**
   * Save token to storage and update cache
   * @param token The token to save - can be either a string or an object
   */
  public async saveToken(
    token: string | Record<string, unknown>
  ): Promise<void> {
    if (!token) {
      log.warningSync('Attempted to save empty token')
      return
    }

    // Convert object to string if needed
    const tokenStr = typeof token === 'string' ? token : JSON.stringify(token)

    this.token = tokenStr
    this.hasToken = true
    await this.saveTokenToStorageWithRetry(tokenStr)
    this.cacheToken(tokenStr)
  }

  /* Get instance for specific storageDir to ensure proper user isolation */
  public static getInstance(options?: AuthSessionOptions): AuthSessionManager {
    // Use provided options, fallback to global options, or throw if neither exists
    const resolvedOptions = options || getGlobalAuthOptions()
    if (!resolvedOptions) {
      throw new Error(
        'Auth session options must be provided either directly or via configureAuthSession'
      )
    }

    // Determine the storage directory for this instance
    const provider = getAuthProvider()
    const environment = provider.getEnvironment(resolvedOptions)
    const userIdentifier = provider.getUserIdentifier(resolvedOptions)

    const storageDir =
      resolvedOptions.storageDir ??
      getStorageDir({
        environment,
        userIdentifier
      })

    // Use storageDir as the key for instance caching to ensure user isolation
    const instanceKey = storageDir

    if (!AuthSessionManager.instances.has(instanceKey)) {
      AuthSessionManager.instances.set(
        instanceKey,
        new AuthSessionManager(resolvedOptions)
      )
    }

    return AuthSessionManager.instances.get(instanceKey)!
  }

  /** Load token from storage if it exists */
  private loadTokenFromStorage(): void {
    try {
      // Check in-memory cache first using new cache manager
      const cachedToken = globalTokenCache.get(this.storageFile)

      if (cachedToken) {
        // Use cached token if it's not expired
        this.token = cachedToken
        this.hasToken = true

        if (this.options.debug) {
          log.infoSync('Token loaded from advanced memory cache')
        }
        return
      }

      // If not in cache or expired, load from file system
      if (fs.existsSync(this.storageFile)) {
        try {
          // Read token directly from the file
          const data = fs.readFileSync(this.storageFile, 'utf8')
          const tokenData = JSON.parse(data)

          // Get provider for token validation
          const provider = getAuthProvider()

          // Extract raw token using the provider
          const token = provider.extractToken(tokenData)

          // Check if token is expired (if provider supports expiration checking)
          if (
            provider.isTokenExpired &&
            token &&
            provider.isTokenExpired(token)
          ) {
            if (this.options.debug) {
              log.infoSync(
                'Token from storage is expired, will fetch a new one'
              )
            }
            return
          }

          if (token) {
            this.token = token
            this.hasToken = true

            // Cache the loaded token using new cache manager
            globalTokenCache.set(this.storageFile, token)

            if (this.options.debug) {
              log.infoSync('Token loaded from storage')
            }
          }
        } catch (error) {
          log.errorSync(
            `Error parsing token data: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }
    } catch (error) {
      log.errorSync(
        `Error loading token from storage: ${error instanceof Error ? error.message : String(error)}`
      )
      // Continue with null token - will trigger fresh token acquisition
    }
  }

  /** Cache a token in memory using advanced cache manager */
  private cacheToken(token: string): void {
    try {
      // Use the advanced cache manager with default TTL
      globalTokenCache.set(this.storageFile, token)

      if (this.options.debug) {
        const status = globalTokenCache.getStatus()
        log.infoSync(
          `Token cached in advanced cache (${status.size}/${status.maxSize} entries, ${status.utilizationPercent.toFixed(1)}% utilized)`
        )
      }
    } catch (error) {
      log.errorSync(
        `Error caching token: ${error instanceof Error ? error.message : String(error)}`
      )
      // Continue without caching
    }
  }

  /** Save token to storage with retry logic and exponential backoff */
  private async saveTokenToStorageWithRetry(token: string): Promise<void> {
    const retryConfig = this.options.retryConfig || DEFAULT_RETRY_CONFIG

    await executeWithRetry(
      () => this.saveTokenToStorage(token),
      retryConfig,
      `Token save for ${this.options.environment}/${this.options.userIdentifier}`
    )
  }

  /** Save token to storage with file locking to prevent concurrent access issues */
  private saveTokenToStorage(token: string): void {
    try {
      // Create lock file path
      const lockFile = `${this.storageFile}.lock`
      const tempFile = `${this.storageFile}.tmp`
      let lockAcquired = false

      try {
        // Try to atomically create lock file
        fs.writeFileSync(lockFile, process.pid.toString(), { flag: 'wx' })
        lockAcquired = true

        // Format the token data
        const tokenFormatter =
          this.options.tokenDataFormatter || defaultTokenFormatter
        // Pass options to the formatter so custom formatters can access cookieName etc.
        const data = tokenFormatter(token, this.options)

        // Cache already keeps the token, no need to duplicate formatted data

        // Store the formatted data as JSON
        const jsonContent = JSON.stringify(data, null, 2)

        // Write to temporary file first (atomic operation)
        fs.writeFileSync(tempFile, jsonContent)

        // Rename temp file to actual file (atomic operation)
        fs.renameSync(tempFile, this.storageFile)

        if (this.options.debug) {
          log.infoSync('Token saved to storage with file locking')
        }
      } finally {
        // Always clean up - remove lock file and temp file if they exist
        if (lockAcquired && fs.existsSync(lockFile)) {
          fs.unlinkSync(lockFile)
        }
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile)
        }
      }
    } catch (error) {
      // If we couldn't acquire lock, another process is writing
      // or there was some other error
      const { environment, userIdentifier } = this.options
      const userInfo = `${environment}/${userIdentifier}`

      if (this.options.debug) {
        log.warningSync(
          `Could not save token for ${userInfo} to storage at ${this.storageFile}, using in-memory version`
        )
        log.errorSync(
          `Detailed error information: ${error instanceof Error ? error.message : String(error)}`
        )
      } else {
        // Limited logging in non-debug mode to avoid exposing sensitive info
        log.errorSync(
          `Error saving token to storage for ${userInfo}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
      // Continue with in-memory token only
    }
  }

  /**
   * Clear the token from storage
   * @returns Boolean indicating whether a token was successfully cleared
   */
  public clearToken(): boolean {
    try {
      // Extract user info for more detailed logging
      const { environment, userIdentifier } = this.options
      const userInfo = `${environment}/${userIdentifier}`

      // Clear from file storage if exists
      if (fs.existsSync(this.storageFile)) {
        fs.unlinkSync(this.storageFile)
        if (this.options.debug) {
          log.infoSync(
            `[Auth Session] Token for user ${userInfo} deleted: ${this.storageFile}`
          )
        }
      } else if (this.options.debug) {
        log.infoSync(
          `[Auth Session] No token for user ${userInfo} found at: ${this.storageFile}`
        )
      }

      // Clear from memory if exists
      if (this.hasToken && this.options.debug) {
        log.infoSync('[Auth Session] Token cleared from memory')
      }

      // Clear from advanced cache
      globalTokenCache.delete(this.storageFile)

      // Reset internal state
      this.token = null
      this.hasToken = false

      if (this.options.debug) {
        const cacheStatus = globalTokenCache.getStatus()
        log.successSync(
          `[Auth Session] Token cleared successfully (cache: ${cacheStatus.size}/${cacheStatus.maxSize})`
        )
      }

      // Always return true for better developer experience
      // This allows tests and scripts to proceed without having to check if a token existed
      return true
    } catch (error) {
      log.errorSync(
        `[Auth Session] Error clearing token: ${error instanceof Error ? error.message : String(error)}`
      )
      // Even in case of error, we consider the operation successful from a user's perspective
      // since the token state in memory has been reset
      return true
    }
  }

  /**
   * Get a new token using the AuthProvider
   *
   * @param request The Playwright API request context
   * @returns A promise that resolves to the authentication token string
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
      log.infoSync('Delegating token acquisition to AuthProvider')
    }

    // Use the provider to get the token - now returns a storage state object
    // We don't need to pass environment/userIdentifier options because the provider will use what it has configured
    const storageState = await provider.manageAuthToken(request, {})

    if (!storageState) {
      throw new Error(
        'AuthProvider.manageAuthToken returned empty or undefined storageState'
      )
    }

    // Extract raw token from storage state using the provider
    const rawToken = provider.extractToken(storageState)

    if (!rawToken) {
      throw new Error(
        'Could not extract token from storage state using provider.extractToken'
      )
    }

    // Return the extracted raw token string
    return rawToken
  }

  /**
   * Check if a token is expired
   * Uses the in-memory cache first, then falls back to storage
   * Avoids unnecessary file I/O operations
   */
  private isTokenExpired(): boolean {
    // Check if the token exists in memory first
    if (!this.hasToken || this.token === null) {
      return true
    }

    // Check the cache first to avoid file I/O
    if (this.checkTokenCacheExpiration()) {
      return true
    }

    // If not in cache, check with the provider
    if (this.checkProviderTokenExpiration()) {
      return true
    }

    // Check directly from storage as a last resort
    return this.checkStorageTokenExpiration()
  }

  /**
   * Check token expiration using the advanced cache manager
   */
  private checkTokenCacheExpiration(): boolean {
    // The advanced cache manager handles expiration automatically
    // If get() returns null, it means the token is expired or not found
    const cachedToken = globalTokenCache.get(this.storageFile)
    const isExpired = cachedToken === null

    if (this.options.debug && isExpired) {
      log.infoSync('Token expired or not found in advanced cache')
    }

    return isExpired
  }

  /**
   * Check token expiration using the auth provider
   */
  private checkProviderTokenExpiration(): boolean {
    try {
      const provider = getAuthProvider()
      if (
        provider &&
        typeof provider.isTokenExpired === 'function' &&
        this.token
      ) {
        const isExpired = provider.isTokenExpired(this.token)
        if (this.options.debug && isExpired) {
          log.infoSync('Token expired according to provider check')
        }
        return isExpired
      }
    } catch (error) {
      log.errorSync(
        `Error using provider to check token expiration: ${error instanceof Error ? error.message : String(error)}`
      )
    }
    return false
  }

  /**
   * Check token expiration by reading from storage
   */
  private checkStorageTokenExpiration(): boolean {
    let token: string | null = null
    if (fs.existsSync(this.storageFile)) {
      try {
        const data = fs.readFileSync(this.storageFile, 'utf8')
        const tokenData = JSON.parse(data)

        // Extract the token using the provider
        const provider = getAuthProvider()

        // First extract the token from the data
        const extractedToken = provider.extractToken(tokenData)

        // Then check if the token is expired using the extracted token string
        if (
          provider.isTokenExpired &&
          extractedToken &&
          provider.isTokenExpired(extractedToken)
        ) {
          if (this.options.debug) {
            log.infoSync('Token expired according to storage check')
          }
          return true
        }

        token = extractedToken
      } catch (error) {
        log.errorSync(
          `Error reading token from storage: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    const isExpired = token === null
    if (this.options.debug && isExpired) {
      log.infoSync('No valid token found in storage')
    }

    return isExpired
  }

  /**
   * Refresh the token if it's expired
   * @param request The Playwright API request context
   * @returns A promise that resolves to the refreshed token
   */
  private async refreshTokenIfNeeded(
    request: APIRequestContext
  ): Promise<string> {
    if (this.isTokenExpired()) {
      if (this.options.debug) {
        log.infoSync('Token expired, refreshing...')
      }

      // Get token from the auth provider
      const token = await this.getTokenFromProvider(request)
      this.token = token
      this.hasToken = true
      await this.saveTokenToStorageWithRetry(token)

      return token
    }

    // Token is still valid
    return this.token as string
  }

  /**
   * Manage the complete authentication token lifecycle
   * Handles checking existing tokens, fetching new ones if needed, and persistence
   * Uses advanced caching for better performance
   */
  public async manageAuthToken(request: APIRequestContext): Promise<string> {
    // Check advanced cache first for maximum efficiency
    const cachedToken = globalTokenCache.get(this.storageFile)

    if (cachedToken) {
      // Token exists in cache and is not expired
      if (this.options.debug) {
        log.infoSync('Using cached token from advanced cache')
      }

      // Update in-memory state
      this.token = cachedToken
      this.hasToken = true

      return cachedToken
    }

    // If we have a token in memory but it's not in cache
    if (this.hasToken && this.token) {
      // Check if it's expired and refresh if needed
      return this.refreshTokenIfNeeded(request)
    }

    // Get new token from the auth provider
    const token = await this.getTokenFromProvider(request)
    this.token = token
    this.hasToken = true

    // Cache the token in memory
    this.cacheToken(token)

    // Save to storage (with retry logic)
    await this.saveTokenToStorageWithRetry(token)

    return token
  }
}
