import type { Request } from '@playwright/test'

import picomatch from 'picomatch'

/** Creates a URL matcher function based on the provided glob pattern.
 * @param {string} [pattern] - Glob pattern to match URLs against.
 * @returns {(url: string) => boolean} - A function that takes a URL and returns whether it matches the pattern.
 */
const createUrlMatcher = (pattern?: string) => {
  if (!pattern) return () => true

  const globPattern = pattern.startsWith('**') ? pattern : `**${pattern}`
  const isMatch = picomatch(globPattern)

  return isMatch
}

/** Determines whether a network request matches the specified method and URL pattern.
 * * @param {Request} request - The network request to evaluate.
 * @param {string} [method] - HTTP method to match.
 * @param {string} [urlPattern] - URL pattern to match.
 * @returns {boolean} - `true` if the request matches both the method and URL pattern; otherwise, `false`.
 */
export const matchesRequest = (
  request: Request,
  method?: string,
  urlPattern?: string
): boolean => {
  const matchesMethod = !method || request.method() === method

  const matcher = createUrlMatcher(urlPattern) // Step 1: Create the matcher function
  const matchesUrl = matcher(request.url()) // Step 2: Use the matcher with the URL

  return matchesMethod && matchesUrl
}
