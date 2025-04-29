// TODO: it is best if the user implements this in their own code, these are different everywhere

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
  // 3. Environment-specific URL mapping

  // First priority: explicit baseUrl from options
  if (options.baseUrl) {
    return options.baseUrl
  }

  // Second priority: environment variable
  if (process.env.BASE_URL) {
    return process.env.BASE_URL
  }

  // Third priority: environment-specific mapping
  const { environment } = options

  // Map environments to base URLs
  // This could be extended with more environments or moved to configuration
  switch (environment) {
    case 'local':
      return `http://localhost:${process.env.PORT || '8080'}`
    case 'dev':
      return 'https://dev.example.com'
    case 'staging':
      return 'https://staging.example.com'
    case 'production':
      return 'https://example.com'
    default:
      // If unknown environment, use local as fallback with warning
      console.warn(
        `[Auth] Unknown environment '${environment}', falling back to localhost`
      )
      return `http://localhost:${process.env.PORT || '8080'}`
  }
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
  // 3. Environment-specific auth URL mapping

  // First priority: explicit authBaseUrl from options
  if (options.authBaseUrl) {
    return options.authBaseUrl
  }

  // Second priority: environment variable
  if (process.env.AUTH_BASE_URL) {
    return process.env.AUTH_BASE_URL
  }

  // Third priority: environment-specific mapping
  const { environment } = options

  // Map environments to auth base URLs
  // This could be extended with more environments or moved to configuration
  switch (environment) {
    case 'local':
      return `http://localhost:${process.env.AUTH_PORT || '8081'}/auth`
    case 'dev':
      return 'https://auth.dev.example.com'
    case 'staging':
      return 'https://auth.staging.example.com'
    case 'production':
      return 'https://auth.example.com'
    default:
      // If unknown environment, use local as fallback with warning
      console.warn(
        `[Auth] Unknown environment '${environment}' for auth URL, falling back to localhost`
      )
      return `http://localhost:${process.env.AUTH_PORT || '8081'}/auth`
  }
}
