/**
 * Utility to apply user authentication to a browser context
 *
 * This utility takes a user's token and applies it to a browser context
 * without persisting it to disk, making it ideal for ephemeral test users.
 */
import type { BrowserContext } from '@playwright/test'
import { log } from '../log'
import { getAuthProvider } from './internal/auth-provider'
/**
 * Apply a user's authentication token to a browser context
 * Uses the auth provider to extract and apply cookies to a browser context
 *
 * @param context The browser context to apply the auth token to
 * @param tokenData The storage state object or user data containing the token
 * @returns The context with auth applied
 */
export async function applyUserCookiesToBrowserContext(
  context: BrowserContext,
  tokenData: Record<string, unknown>
): Promise<BrowserContext> {
  // Get cookies from the auth provider
  const authProvider = getAuthProvider()
  const cookies = authProvider.extractCookies(tokenData)

  // Log what we're doing
  await log.info(`Applying user auth with ${cookies.length} cookies`)

  if (cookies.length > 0) {
    // Apply the cookies to the browser context
    await context.addCookies(cookies)
    await log.info('Successfully applied auth cookies to browser context')
  } else {
    await log.warning('No auth cookies found to apply')
  }

  // Always return the context
  return context
}
