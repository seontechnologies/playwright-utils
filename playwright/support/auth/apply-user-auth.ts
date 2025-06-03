/**
 * Utility to apply user authentication to a browser context
 *
 * This utility takes a user's token and applies it to a browser context
 * without persisting it to disk, making it ideal for ephemeral test users.
 */
import type { BrowserContext } from '@playwright/test'
import { log } from '../../../src/log'
import type { UserData } from '../../../sample-app/shared/user-factory'

// Type definition for storage state objects
type StorageState = {
  cookies?: Array<{
    name: string
    value: string
    domain: string
    path: string
    expires?: number
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'Strict' | 'Lax' | 'None'
  }>
  origins?: Array<{
    origin: string
    localStorage?: Array<{
      name: string
      value: string
    }>
  }>
}

/**
 * Apply a user's authentication token to a browser context
 *
 * @param context The browser context to apply the auth token to
 * @param userData The user data containing the token
 * @returns The context with auth applied
 */
export async function applyUserAuth(
  context: BrowserContext,
  userData: UserData
): Promise<BrowserContext> {
  log.infoSync(`Applying user auth for ${userData.username}`)

  // If userData.token is a string JWT token
  if (typeof userData.token === 'string') {
    // Convert to the storage state format that Playwright expects
    // This assumes your app is using cookies for auth
    await context.addCookies([
      {
        name: 'seon-jwt',
        value: userData.token,
        domain: 'localhost',
        path: '/'
      }
    ])
  }
  // If userData.token is already a storage state object
  else if (userData.token && typeof userData.token === 'object') {
    // Handle token as a storage state object
    // Cast to StorageState type for proper type checking
    const token = userData.token as unknown as StorageState

    // If it's a standard Playwright storage state with cookies
    if (token.cookies && Array.isArray(token.cookies)) {
      await context.addCookies(token.cookies)
    }
  }

  return context
}
