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
    local: 'http://localhost:3001',
    dev: 'https://dev.example.com/api',
    staging: 'https://staging.example.com/api',
    qa: 'https://qa.example.com/api',
    production: 'https://api.example.com'
  }

  // Return mapped URL or fallback to local if environment not recognized
  return urlMap[environment] || urlMap.local
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
  const endpoint = process.env.AUTH_TOKEN_ENDPOINT || '/auth/fake-token'
  const authUrl = `${authBaseUrl}${endpoint}`
  console.log(`[Custom Auth] Requesting token from ${authUrl}`)

  // Note: For a real implementation, we'd use credentials from getCredentialsForRole(userRole)
  // But the fake token endpoint doesn't require credentials

  // Make the authentication request - using GET for the fake token endpoint
  // In a real implementation this would likely be a POST with credentials
  const response = await request.get(authUrl)

  // Extract token from response - customize based on your API response format
  const data = await response.json()
  return data.access_token || data.token || data.accessToken
}
