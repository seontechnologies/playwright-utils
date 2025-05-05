/**
 * URL utility functions for auth session management
 *
 * IMPORTANT: These should be configured by the user in their own implementation.
 * The default implementations here only provide a basic structure and fallbacks.
 */

/**
 * Get the application base URL for a specific environment
 *
 * @param options Options containing environment and optional explicit baseUrl
 * @returns The application base URL appropriate for the current environment
 */
export function getBaseUrl(options: {
  environment: string
  baseUrl?: string
}): string {
  // Priority order:
  // 1. Explicitly provided baseUrl in options
  // 2. Environment variable BASE_URL

  // First priority: explicit baseUrl from options
  if (options.baseUrl) {
    return options.baseUrl
  }

  // Second priority: environment variable
  if (process.env.BASE_URL) {
    return process.env.BASE_URL
  }

  // Fallback with warning: In a library, we shouldn't hardcode URLs
  console.warn(
    `[Auth] No baseUrl provided for environment '${options.environment}'. ` +
      'You should either:' +
      '\n  1. Pass baseUrl in options' +
      '\n  2. Set process.env.BASE_URL' +
      '\n  3. Implement your own auth provider with getBaseUrl override'
  )

  // Use an empty string as fallback - this will cause navigation to fail with
  // a clear error rather than silently using a hardcoded URL
  return ''
}

/**
 * Get the authentication service base URL for a specific environment
 *
 * Often the auth service is hosted at a different domain than the app itself
 *
 * @param options Options containing environment and optional explicit authBaseUrl
 * @returns The auth service base URL appropriate for the current environment
 */
export function getAuthBaseUrl(options: {
  environment: string
  authBaseUrl?: string
}): string {
  // Priority order:
  // 1. Explicitly provided authBaseUrl in options
  // 2. Environment variable AUTH_BASE_URL
  // 3. Fall back to baseUrl with a specific auth path

  // First priority: explicit authBaseUrl from options
  if (options.authBaseUrl) {
    return options.authBaseUrl
  }

  // Second priority: environment variable
  if (process.env.AUTH_BASE_URL) {
    return process.env.AUTH_BASE_URL
  }

  // Third priority: try to use BASE_URL with auth path
  if (process.env.BASE_URL) {
    return `${process.env.BASE_URL}/auth`
  }

  // Fallback with warning: In a library, we shouldn't hardcode URLs
  console.warn(
    `[Auth] No authBaseUrl provided for environment '${options.environment}'. ` +
      'You should either:' +
      '\n  1. Pass authBaseUrl in options' +
      '\n  2. Set process.env.AUTH_BASE_URL' +
      '\n  3. Implement your own auth provider with getAuthBaseUrl override'
  )

  // Use an empty string as fallback - this will cause navigation to fail with
  // a clear error rather than silently using a hardcoded URL
  return ''
}
