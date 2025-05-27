/** Cookie utilities for managing browser cookies in a type-safe way */

/**
 * Options for setting a cookie
 */
type SameSiteValue = 'Strict' | 'Lax' | 'None'

/**
 * Validate a SameSite value, defaulting to 'Lax' if invalid
 */
const validateSameSite = (value: string | undefined): SameSiteValue => {
  if (!value) return 'Lax'

  // Normalize to Title Case
  const normalized =
    value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()

  if (['Strict', 'Lax', 'None'].includes(normalized)) {
    return normalized as SameSiteValue
  }

  // Default to a safe value
  console.warn(`Invalid SameSite value: ${value}. Defaulting to 'Lax'.`)
  return 'Lax'
}

/**
 * Options for setting a cookie
 */
export type CookieOptions = {
  /** Domain for the cookie (default: current domain) */
  domain?: string
  /** Path for the cookie (default: '/') */
  path?: string
  /** Expiration date in seconds since epoch */
  expires?: number
  /** Whether the cookie is HTTP only (default: false) */
  httpOnly?: boolean
  /** Whether the cookie requires HTTPS (default: false) */
  secure?: boolean
  /** SameSite cookie policy (default: 'Lax') */
  sameSite?: string
}

/**
 * Set a cookie in the browser
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 */
export const setCookie = (
  name: string,
  value: string,
  options: CookieOptions = {}
): void => {
  // Default options
  const defaultOptions: Required<CookieOptions> = {
    domain: window.location.hostname,
    path: '/',
    expires: 0, // Session cookie by default
    httpOnly: false, // Can't set true from client-side JavaScript
    secure: window.location.protocol === 'https:',
    sameSite: 'Lax'
  }

  // Merge with provided options
  const cookieOptions = { ...defaultOptions, ...options }

  // Build cookie string
  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`

  // Add options
  if (cookieOptions.expires > 0) {
    cookieString += `; expires=${new Date(
      cookieOptions.expires * 1000
    ).toUTCString()}`
  }

  cookieString += `; path=${cookieOptions.path}`

  if (cookieOptions.domain) {
    cookieString += `; domain=${cookieOptions.domain}`
  }

  if (cookieOptions.secure) {
    cookieString += '; secure'
  }

  // Validate and apply SameSite attribute
  const validSameSite = validateSameSite(cookieOptions.sameSite)
  cookieString += `; samesite=${validSameSite}`

  // Set the cookie
  document.cookie = cookieString
}

/**
 * Get a cookie value by name
 * @param name - Cookie name
 * @returns Cookie value or null if not found
 */
export const getCookie = (name: string): string | null => {
  const cookieString = document.cookie

  // Early return if no cookies exist
  if (!cookieString) {
    return null
  }

  const cookies = cookieString.split('; ')

  for (const cookie of cookies) {
    const parts = cookie.split('=')
    // parts[0] will always exist even if it's an empty string
    const cookieName = parts[0] || ''
    const cookieValue = parts.slice(1).join('=') || ''
    if (decodeURIComponent(cookieName) === name) {
      return decodeURIComponent(cookieValue)
    }
  }

  return null
}

/**
 * Delete a cookie by name
 * @param name - Cookie name
 * @param options - Cookie options (domain and path must match the cookie to delete)
 */
export const deleteCookie = (
  name: string,
  options: Pick<CookieOptions, 'domain' | 'path'> = {}
): void => {
  // Set expiration to the past to delete the cookie
  setCookie(name, '', {
    domain: options.domain || undefined,
    path: options.path || '/',
    expires: Math.floor(Date.now() / 1000) - 86400, // Set to yesterday
    httpOnly: false,
    secure: false,
    sameSite: 'Lax'
  })
}
