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
 * Sample app token lifetime in seconds (5 minutes, matching server-config.ts)
 */
const SAMPLE_APP_TOKEN_LIFETIME_SECONDS = 300

/**
 * Extracts expiration from sample app's custom token format: "Bearer <ISO-timestamp>:{identity}"
 * The expiration is calculated as: timestamp + SAMPLE_APP_TOKEN_LIFETIME_SECONDS
 *
 * @param token - Token string in format "Bearer <ISO-timestamp>:..." or URL-encoded equivalent
 * @returns The expiration timestamp in seconds since epoch, or null if unable to extract
 */
const extractSampleAppTokenExpiration = (token: string): number | null => {
  if (typeof token !== 'string') {
    return null
  }

  try {
    // URL-decode the token if needed (Playwright stores cookie values URL-encoded)
    const decodedToken = decodeURIComponent(token)

    // Check for sample app format: "Bearer <timestamp>:..." or just "<timestamp>:..."
    let tokenContent = decodedToken

    // Strip "Bearer " prefix if present
    if (tokenContent.toLowerCase().startsWith('bearer ')) {
      tokenContent = tokenContent.slice(7)
    }

    // Extract timestamp before the ":{" delimiter
    const colonIndex = tokenContent.indexOf(':{')
    if (colonIndex === -1) {
      // Try simpler format without identity: "Bearer <timestamp>"
      const simpleTimestamp = new Date(tokenContent)
      if (!isNaN(simpleTimestamp.getTime())) {
        // Calculate expiration: creation time + token lifetime
        return (
          Math.floor(simpleTimestamp.getTime() / 1000) +
          SAMPLE_APP_TOKEN_LIFETIME_SECONDS
        )
      }
      return null
    }

    const timestampStr = tokenContent.substring(0, colonIndex)
    const timestamp = new Date(timestampStr)

    if (isNaN(timestamp.getTime())) {
      log.debugSync(`Invalid timestamp in sample app token: ${timestampStr}`)
      return null
    }

    // Calculate expiration: creation time + token lifetime
    return (
      Math.floor(timestamp.getTime() / 1000) + SAMPLE_APP_TOKEN_LIFETIME_SECONDS
    )
  } catch (err) {
    log.debugSync(`Error parsing sample app token: ${err}`)
    return null
  }
}

/**
 * Check if a token is expired
 * Supports multiple token formats:
 * 1. Standard JWT tokens (header.payload.signature with base64-encoded exp claim)
 * 2. Sample app custom tokens (Bearer <ISO-timestamp>:{identity})
 *
 * @param rawToken JWT token, sample app token, or stringified storage state
 * @returns true if token is expired or invalid, false if valid
 */
export const isTokenExpired = (rawToken: string): boolean => {
  // First, try to parse as a standard JWT
  const jwtExpiration = extractJwtExpiration(rawToken)
  if (jwtExpiration !== null) {
    const currentTime = Math.floor(Date.now() / 1000)
    const isExpired = jwtExpiration < currentTime
    if (isExpired) {
      log.infoSync('JWT token is expired based on payload expiration claim')
    }
    return isExpired
  }

  // Second, try to parse as sample app's custom token format
  const sampleAppExpiration = extractSampleAppTokenExpiration(rawToken)
  if (sampleAppExpiration !== null) {
    const currentTime = Math.floor(Date.now() / 1000)
    const isExpired = sampleAppExpiration < currentTime
    if (isExpired) {
      log.infoSync(
        'Sample app token is expired based on timestamp + lifetime calculation'
      )
    } else {
      const remainingSeconds = sampleAppExpiration - currentTime
      log.debugSync(
        `Sample app token is valid, expires in ${remainingSeconds} seconds`
      )
    }
    return isExpired
  }

  log.infoSync('Could not determine token expiration - assuming expired')
  return true
}
