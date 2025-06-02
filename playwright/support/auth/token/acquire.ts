import type { APIRequestContext } from '@playwright/test'
import { request } from '@playwright/test'
import { log } from '../../../../src/log'

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
 * Acquire a token and return a complete Playwright storage state object
 * This matches the pattern used in the SEON Admin app implementation
 */
export const acquireToken = async (
  _request: APIRequestContext, // We won't use the passed request, we'll create a fresh one
  environment: string,
  userRole: string,
  options: Record<string, string | undefined> = {}
): Promise<Record<string, unknown>> => {
  // Use the application-specific URL construction logic
  const authBaseUrl = getAuthBaseUrl(
    environment.toLowerCase(),
    options.authBaseUrl
  )

  // Get the endpoint (could also be environment-specific if needed)
  const endpoint = process.env.AUTH_TOKEN_ENDPOINT || '/auth/identity-token'
  const authUrl = `${authBaseUrl}${endpoint}`

  // Create a fresh request context that will capture cookies
  const context = await request.newContext()
  log.infoSync(`Making auth request to ${authUrl}`)

  // Make the auth request - this will set cookies via HTTP headers
  const response = await context.post(authUrl, {
    headers: {
      'Content-Type': 'application/json'
    },
    data: JSON.stringify({
      username: options.username || 'test-user',
      password: options.password || 'password123',
      role: userRole || 'admin'
    })
  })

  const status = response.status()
  const body = await response.json().catch(() => null)

  // Validate the response
  if (status !== 200 || !body) {
    throw new Error(
      `Auth request failed. Status: ${status}. Body: ${JSON.stringify(body)}`
    )
  }
  log.infoSync('Authentication successful')

  // PLAYWRIGHT MAGIC: context.storageState() does several powerful things:
  // 1. It automatically extracts all cookies that were set by the server via HTTP 'Set-Cookie' headers
  //    during any requests made with this context (in our case, the auth endpoint set the cookies)
  // 2. It formats them into a standardized storage state object structure
  // 3. No manual cookie handling is needed - Playwright automatically captures what the server set
  // 4. It also captures localStorage/sessionStorage from any origins that were visited
  // 5. The resulting object can be used directly with browser contexts or saved to disk
  const storageState = await context.storageState()

  // Validate cookies - there should be at least one cookie
  if (!storageState.cookies || storageState.cookies.length === 0) {
    throw new Error('No cookies found after authentication')
  }

  log.infoSync(
    `Captured ${storageState.cookies.length} cookies from auth endpoint`
  )

  // Clean up the context
  await context.dispose()

  // Return the complete storage state (cookies + origins if any)
  return storageState
}
