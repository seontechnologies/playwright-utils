/* eslint-disable complexity */
/**
 * AuthProvider validation utilities
 * Ensures AuthProvider implementations meet the required interface contract
 */

import type { AuthProvider } from './auth-provider'
import type { AuthOptions } from './types'
import { log } from '../../log'

/** Configuration for validation behavior */
export type ValidationConfig = {
  /** Whether to throw errors on validation failures (default: true) */
  throwOnError?: boolean
  /** Whether to run performance benchmarks (default: false) */
  enableBenchmarks?: boolean
  /** Custom logger function for validation messages */
  logger?: (message: string) => void
}

/** Validation result information */
export type ValidationResult = {
  isValid: boolean
  errors: string[]
  warnings: string[]
  benchmarks?: Record<string, number>
}

/** Required methods that every AuthProvider must implement */
const REQUIRED_METHODS = [
  'getEnvironment',
  'getUserIdentifier',
  'extractToken',
  'extractCookies',
  'manageAuthToken',
  'clearToken'
] as const

/** Optional methods that can be implemented for enhanced functionality */
const OPTIONAL_METHODS = ['isTokenExpired', 'getBaseUrl'] as const

/**
 * Validate that an AuthProvider implements all required methods with correct signatures
 * @param provider The AuthProvider to validate
 * @param config Optional validation configuration
 * @returns Validation result with errors, warnings, and optional benchmarks
 */
export function validateAuthProvider(
  provider: AuthProvider,
  config: ValidationConfig = {}
): ValidationResult {
  const {
    throwOnError = true,
    enableBenchmarks = false,
    logger = log.infoSync
  } = config

  const errors: string[] = []
  const warnings: string[] = []
  const benchmarks: Record<string, number> = {}

  if (!provider) {
    const error = 'AuthProvider is null or undefined'
    errors.push(error)
    if (throwOnError) {
      throw new Error(`AuthProvider Validation Failed: ${error}`)
    }
    return { isValid: false, errors, warnings }
  }

  // Validate required methods exist and are functions
  for (const method of REQUIRED_METHODS) {
    if (!(method in provider)) {
      errors.push(`Missing required method: ${method}`)
    } else if (typeof provider[method] !== 'function') {
      errors.push(
        `${method} is not a function (found: ${typeof provider[method]})`
      )
    }
  }

  // Check optional methods if they exist
  for (const method of OPTIONAL_METHODS) {
    if (method in provider && typeof provider[method] !== 'function') {
      warnings.push(
        `Optional method ${method} exists but is not a function (found: ${typeof provider[method]})`
      )
    }
  }

  // Method signature validation with safe testing
  try {
    validateMethodSignatures(provider, errors, warnings)
  } catch (error) {
    errors.push(
      `Error during method signature validation: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Performance benchmarks (optional)
  if (enableBenchmarks && errors.length === 0) {
    try {
      runPerformanceBenchmarks(provider, benchmarks, logger)
    } catch (error) {
      warnings.push(
        `Benchmark error: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  const isValid = errors.length === 0

  if (!isValid && throwOnError) {
    throw new Error(`AuthProvider Validation Failed:\n${errors.join('\n')}`)
  }

  if (warnings.length > 0) {
    logger(`AuthProvider validation warnings:\n${warnings.join('\n')}`)
  }

  return {
    isValid,
    errors,
    warnings,
    ...(enableBenchmarks && { benchmarks })
  }
}

/**
 * Validate method signatures by testing with safe inputs
 */
function validateMethodSignatures(
  provider: AuthProvider,
  errors: string[],
  warnings: string[]
): void {
  const testOptions: Partial<AuthOptions> = {
    environment: 'test',
    userIdentifier: 'test-user'
  }

  // Test getEnvironment
  try {
    const env = provider.getEnvironment(testOptions)
    if (typeof env !== 'string') {
      errors.push(`getEnvironment should return string, got: ${typeof env}`)
    }
  } catch (error) {
    warnings.push(
      `getEnvironment threw error with test options: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Test getUserIdentifier
  try {
    const userId = provider.getUserIdentifier(testOptions)
    if (typeof userId !== 'string') {
      errors.push(
        `getUserIdentifier should return string, got: ${typeof userId}`
      )
    }
  } catch (error) {
    warnings.push(
      `getUserIdentifier threw error with test options: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Test extractToken with mock storage state
  try {
    const mockStorageState = {
      cookies: [{ name: 'test', value: 'token' }],
      origins: []
    }
    const token = provider.extractToken(mockStorageState)
    if (token !== null && typeof token !== 'string') {
      errors.push(
        `extractToken should return string or null, got: ${typeof token}`
      )
    }
  } catch (error) {
    warnings.push(
      `extractToken threw error with mock data: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Test extractCookies
  try {
    const mockStorageState = {
      cookies: [{ name: 'test', value: 'token' }],
      origins: []
    }
    const cookies = provider.extractCookies(mockStorageState)
    if (!Array.isArray(cookies)) {
      errors.push(`extractCookies should return array, got: ${typeof cookies}`)
    }
  } catch (error) {
    warnings.push(
      `extractCookies threw error with mock data: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Test optional methods if they exist
  if (provider.isTokenExpired) {
    try {
      const result = provider.isTokenExpired('test-token')
      if (typeof result !== 'boolean') {
        warnings.push(
          `isTokenExpired should return boolean, got: ${typeof result}`
        )
      }
    } catch (error) {
      warnings.push(
        `isTokenExpired threw error: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  if (provider.getBaseUrl) {
    try {
      const baseUrl = provider.getBaseUrl(testOptions)
      if (baseUrl !== undefined && typeof baseUrl !== 'string') {
        warnings.push(
          `getBaseUrl should return string or undefined, got: ${typeof baseUrl}`
        )
      }
    } catch (error) {
      warnings.push(
        `getBaseUrl threw error: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}

/**
 * Run performance benchmarks on provider methods
 */
function runPerformanceBenchmarks(
  provider: AuthProvider,
  benchmarks: Record<string, number>,
  logger: (message: string) => void
): void {
  const testOptions: Partial<AuthOptions> = {
    environment: 'test',
    userIdentifier: 'test-user'
  }

  // Benchmark synchronous methods
  const syncMethods = [
    { name: 'getEnvironment', fn: () => provider.getEnvironment(testOptions) },
    {
      name: 'getUserIdentifier',
      fn: () => provider.getUserIdentifier(testOptions)
    },
    {
      name: 'extractToken',
      fn: () => provider.extractToken({ cookies: [], origins: [] })
    },
    {
      name: 'extractCookies',
      fn: () => provider.extractCookies({ cookies: [], origins: [] })
    }
  ]

  for (const { name, fn } of syncMethods) {
    try {
      const iterations = 1000
      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        fn()
      }

      const endTime = performance.now()
      const avgTime = (endTime - startTime) / iterations
      benchmarks[name] = Number(avgTime.toFixed(4))

      if (avgTime > 1) {
        // Warn if average execution > 1ms
        logger(
          `Performance warning: ${name} averages ${avgTime.toFixed(4)}ms per call`
        )
      }
    } catch (error) {
      logger(
        `Benchmark failed for ${name}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}

/**
 * Convenience function to validate and set an AuthProvider with proper error handling
 * @param provider The AuthProvider to validate and set
 * @param config Optional validation configuration
 * @returns Promise that resolves to whether the provider was successfully validated and set
 */
export async function validateAndSetAuthProvider(
  provider: AuthProvider,
  config: ValidationConfig = {}
): Promise<boolean> {
  try {
    const result = validateAuthProvider(provider, {
      ...config,
      throwOnError: false
    })

    if (!result.isValid) {
      log.errorSync(
        `AuthProvider validation failed:\n${result.errors.join('\n')}`
      )
      return false
    }

    if (result.warnings.length > 0) {
      log.warningSync(
        `AuthProvider validation warnings:\n${result.warnings.join('\n')}`
      )
    }

    // Import and set the provider only after successful validation
    const { setAuthProvider } = await import('./auth-provider')
    setAuthProvider(provider, true) // Skip validation since we already validated

    log.successSync('AuthProvider validated and set successfully')
    return true
  } catch (error) {
    log.errorSync(
      `Failed to validate AuthProvider: ${error instanceof Error ? error.message : String(error)}`
    )
    return false
  }
}
