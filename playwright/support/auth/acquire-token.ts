import type { APIRequestContext } from '@playwright/test'

/**
 * Application-specific auth URL construction based on environment
 * @param environment The target environment (local, dev, staging, etc)
 * @param customUrl Optional override URL
 * @returns The appropriate base URL for authentication
 */
const getAuthBaseUrl = (environment: string, customUrl?: string) => {
  // Override with custom URL if provided (useful for testing)
  if (customUrl) return customUrl

  // Support for environment variables
  if (process.env.AUTH_BASE_URL) return process.env.AUTH_BASE_URL

  // Environment-specific URL mapping (customize as needed for your application)
  const urlMap: Record<string, string> = {
    local: 'http://localhost:3000/api',
    dev: 'https://dev.example.com/api',
    staging: 'https://staging.example.com/api',
    qa: 'https://qa.example.com/api',
    production: 'https://api.example.com'
  }

  // Return mapped URL or fallback to local if environment not recognized
  return urlMap[environment] || urlMap.local
}

/** Utility function to get credentials for a specific user role */
const getCredentialsForRole = (
  role: string
): { username: string; password: string } => {
  const credentialMap: Record<string, { username: string; password: string }> =
    {
      admin: {
        username: process.env.ADMIN_USERNAME || 'admin@example.com',
        password: process.env.ADMIN_PASSWORD || 'admin123'
      },
      regular: {
        username: process.env.USER_USERNAME || 'user@example.com',
        password: process.env.USER_PASSWORD || 'user123'
      },
      guest: {
        username: process.env.GUEST_USERNAME || 'guest@example.com',
        password: process.env.GUEST_PASSWORD || 'guest123'
      }
    }
  // Ensure we always return a valid credential object
  return (
    credentialMap[role] ||
    credentialMap.default || {
      username: process.env.DEFAULT_USERNAME || 'default@example.com',
      password: process.env.DEFAULT_PASSWORD || 'default123'
    }
  )
}

/**
 * Simple token acquisition helper function
 * This would be customized for each application's specific auth needs
 */
export const acquireToken = async (
  request: APIRequestContext,
  environment: string,
  userRole: string,
  options: Record<string, string | undefined> = {}
): Promise<string> => {
  // Use the application-specific URL construction logic
  // Following functional patterns with explicit null checking
  const authBaseUrl = getAuthBaseUrl(
    environment.toLowerCase(),
    options.authBaseUrl
  )

  // Get the endpoint (could also be environment-specific if needed)
  const endpoint = process.env.AUTH_TOKEN_ENDPOINT || '/token'
  const authUrl = `${authBaseUrl}${endpoint}`
  console.log(`[Custom Auth] Requesting token from ${authUrl}`)

  // Get immutable credentials object for the current role
  const credentials = getCredentialsForRole(userRole)

  // Make the authentication request with the appropriate credentials
  const response = await request.post(authUrl, {
    data: credentials,
    headers: {
      'Content-Type': 'application/json'
    }
  })

  // Extract token from response - customize based on your API response format
  const data = await response.json()
  return data.access_token || data.token || data.accessToken
}
