/**
 * Token renewal utility for Playwright tests
 * Based on the Admin app's renewAdminTokenApiRequest but adapted for the sample app
 */
import { request } from '@playwright/test'
import { log } from '../../../src/log'
import { apiRequest } from '../../../src/api-request'
import { API_URL } from '@playwright/config/local.config'

type StorageStateType = {
  storageState: string
}

/**
 * Renew JWT token using refresh token cookie
 *
 * @param storageState - Storage state containing the refresh token cookie
 * @returns Updated body response from renewal request
 */
export async function renewToken(storageState: StorageStateType) {
  const storageStatePath = storageState.storageState
  const context = await request.newContext({ storageState: storageStatePath })

  try {
    const { status, body } = await apiRequest({
      request: context,
      method: 'POST',
      path: '/auth/renew',
      baseUrl: API_URL
    })

    // Verify response is successful
    if (status !== 200 || !body) {
      throw new Error(
        `Renewing the token failed with Status: ${status}\nBody: ${JSON.stringify(body)}`
      )
    }

    // Verify storage state cookies
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

    // Overriding the storage state file with the new one
    await context.storageState({ path: storageStatePath })

    log.infoSync(`Token renewed successfully and saved to ${storageStatePath}`)
    return body
  } finally {
    await context.dispose()
  }
}

/**
 * Check if the token needs renewal (JWT expired but refresh token valid)
 *
 * @param storageState - Storage state object with cookies
 * @returns True if token renewal is needed
 */
export function needsTokenRenewal(
  storageState: Record<string, unknown>
): boolean {
  if (!storageState?.cookies || !Array.isArray(storageState.cookies)) {
    return false
  }

  type Cookie = { name: string; value: string; expires: number }
  const currentTime = Math.floor(Date.now() / 1000)

  // Find the JWT and refresh tokens
  const jwtCookie = storageState.cookies.find(
    (cookie: Cookie) => cookie.name === 'seon-jwt'
  )

  const refreshCookie = storageState.cookies.find(
    (cookie: Cookie) => cookie.name === 'seon-refresh'
  )

  // JWT is expired but refresh token is valid
  return (
    jwtCookie !== undefined &&
    refreshCookie !== undefined &&
    jwtCookie.expires < currentTime &&
    refreshCookie.expires > currentTime
  )
}
