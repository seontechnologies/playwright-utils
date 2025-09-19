import { log } from '@seontechnologies/playwright-utils/log'

/**
 * Extracts the expiration timestamp from a JWT token payload
 *
 * Handles base64url encoding (replacing '-' with '+' and '_' with '/').
 * Adds padding as needed before decoding.
 * Returns the 'exp' claim from the JWT payload which represents the expiration timestamp in seconds since Unix epoch.
 *
 * @param token - Raw JWT token string in format header.payload.signature
 * @returns The expiration timestamp in seconds since epoch, or null if unable to extract
 */
const extractJwtExpiration = (token: string): number | null => {
  if (typeof token !== 'string' || token.split('.').length !== 3) {
    return null
  }

  try {
    const [, payload] = token.split('.')
    if (!payload) {
      log.debugSync('Invalid JWT token format; no payload')
      return null
    }
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '='
    )
    const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'))
    return decoded.exp || null
  } catch (err) {
    log.debugSync(`Error parsing JWT token: ${err}`)
    return null
  }
}

/**
 * Check if a token is expired
 * @param rawToken JWT token or stringified storage state
 * @returns true if token is expired or invalid, false if valid
 */
export const isTokenExpired = (rawToken: string): boolean => {
  const expiration = extractJwtExpiration(rawToken)
  if (expiration !== null) {
    const currentTime = Math.floor(Date.now() / 1000)
    const isExpired = expiration < currentTime
    if (isExpired) {
      log.infoSync('JWT token is expired based on payload expiration claim')
    }
    return isExpired
  }

  log.infoSync('Could not determine token expiration - assuming expired')
  return true
}
