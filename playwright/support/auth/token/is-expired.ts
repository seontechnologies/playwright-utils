import { log } from '@seontechnologies/playwright-utils/log'
/* eslint-disable @typescript-eslint/no-use-before-define */

type Cookie = { name: string; value: string; expires: number }

/**
 * Check if a token is expired
 * @param rawToken JWT token or stringified storage state
 * @returns true if token is expired or invalid, false if valid
 */
export const isTokenExpired = (rawToken: string): boolean => {
  // Extract the JWT cookie from storage state JSON
  const jwtCookie = extractJwtCookie(rawToken)
  if (jwtCookie) {
    const currentTime = Math.floor(Date.now() / 1000)
    return jwtCookie.expires < currentTime
  }

  // Try to parse as raw JWT token
  const expiration = extractJwtExpiration(rawToken)
  if (expiration !== null) {
    const currentTime = Math.floor(Date.now() / 1000)
    const isExpired = expiration < currentTime
    if (isExpired) {
      log.infoSync('JWT token is expired based on payload expiration claim')
    }
    return isExpired
  }

  // Could not determine validity - assume expired
  log.debugSync('Could not determine token expiration - assuming expired')
  return true
}

function extractJwtCookie(rawToken: string): Cookie | null {
  if (!rawToken?.trim().startsWith('{')) {
    return null
  }

  try {
    const storageState = JSON.parse(rawToken)
    if (
      !storageState?.cookies ||
      !Array.isArray(storageState.cookies) ||
      storageState.cookies.length === 0
    ) {
      return null
    }

    return (
      storageState.cookies.find(
        (cookie: Cookie) => cookie.name === 'seon-jwt'
      ) || null
    )
  } catch (e) {
    log.errorSync(`Cannot parse the storage state JSON: ${e}`)
    return null
  }
}

function extractJwtExpiration(token: string): number | null {
  if (typeof token !== 'string' || token.split('.').length !== 3) {
    return null
  }

  try {
    const [, payload] = token.split('.')
    // @ts-expect-error okay here
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'))
    return decoded.exp || null
  } catch (err) {
    log.debugSync(`Error parsing JWT token: ${err}`)
    return null
  }
}
