/** Cookie utilities for managing browser cookies in a type-safe way */

/**
 * Options for setting a cookie
 */
type CookieOptions = {
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
  sameSite?: 'Strict' | 'Lax' | 'None'
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

  cookieString += `; samesite=${cookieOptions.sameSite}`

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
  const cookies = cookieString.split('; ')

  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split('=')
    if (decodeURIComponent(cookieName as string) === name) {
      return decodeURIComponent(cookieValue as string)
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
    expires: 0,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax'
  })
}
