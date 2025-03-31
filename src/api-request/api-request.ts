import { type APIRequestContext } from '@playwright/test'

export type ApiRequestParams = {
  request: APIRequestContext
  method: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'
  path: string
  baseUrl?: string
  configBaseUrl?: string // configBaseUrl from Playwright config
  body?: unknown
  headers?: Record<string, string>
  params?: Record<string, string | boolean | number>
}

export type ApiRequestResponse<T = unknown> = {
  status: number
  body: T
}

/**
 * Simplified helper for making API requests and returning the status and JSON body.
 * This helper automatically performs the request based on the provided method, path, body, and headers.
 * It handles URL construction with proper slash handling and response parsing based on content type.
 *
 * @param {Object} params - The parameters for the request.
 * @param {APIRequestContext} params.request - The Playwright request object, used to make the HTTP request.
 * @param {string} params.method - The HTTP method to use (POST, GET, PUT, DELETE, PATCH, HEAD).
 * @param {string} params.path - The path or endpoint to send the request to (e.g., '/api/users').
 * @param {string} [params.baseUrl] - The base URL to prepend to the path (e.g., 'https://api.example.com').
 * @param {string} [params.configBaseUrl] - Fallback base URL, typically from Playwright config.
 * @param {unknown} [params.body=null] - The body to send with the request (for POST, PUT, and PATCH requests).
 * @param {Record<string, string> | undefined} [params.headers] - The headers to include with the request.
 * @param {Record<string, string | boolean | number> | undefined} [params.params] - Query parameters to include with the request.
 * @returns {Promise<ApiRequestResponse<T>>} - An object containing the status code and the parsed response body.
 *    - `status`: The HTTP status code returned by the server.
 *    - `body`: The parsed response body from the server, typed as T.
 *
 * @example
 * // GET request to an endpoint
 * test('fetch user data', async ({ apiRequest }) => {
 *   const { status, body } = await apiRequest<UserResponse>({
 *     method: 'GET',
 *     url: '/api/users/123',
 *     headers: { 'Authorization': 'Bearer token' }
 *   });
 *
 *   expect(status).toBe(200);
 *   expect(body.name).toBe('John Doe');
 * });
 *
 * @example
 * // POST request with a body
 * test('create new item', async ({ apiRequest }) => {
 *   const { status, body } = await apiRequest<CreateItemResponse>({
 *     method: 'POST',
 *     url: '/api/items',
 *     baseUrl: 'https://api.example.com', // override default baseURL
 *     body: { name: 'New Item', price: 19.99 },
 *     headers: { 'Content-Type': 'application/json' }
 *   });
 *
 *   expect(status).toBe(201);
 *   expect(body.id).toBeDefined();
 * });
 */
export async function apiRequest<T = unknown>({
  request,
  method,
  path,
  baseUrl,
  configBaseUrl = '', // configBaseUrl from Playwright config
  body = null,
  headers,
  params
}: ApiRequestParams): Promise<ApiRequestResponse<T>> {
  // common options; if there's a prop, add it to the options object
  const options = Object.assign(
    {},
    body && { body },
    headers && { headers },
    params && { params }
  )

  // Three-tier URL resolution strategy:
  // 1. Use explicitly provided baseUrl if available (e.g. baseUrl='https://api.example.com/')
  // 2. Otherwise fall back to Playwright config's configBaseUrl (e.g. configBaseUrl='https://api-dev.com/')
  // 3. If neither is available, use empty string
  const effectiveBaseUrl = baseUrl || configBaseUrl || ''
  // Combine effectiveBaseUrl with path
  // When base exists: https://api-dev.com/ + /users = https://api-dev.com/users
  // When no base: /users = /users
  const fullUrl = effectiveBaseUrl ? joinUrlParts(effectiveBaseUrl, path) : path

  // map methods to PW request functions
  const methodMap = {
    POST: () => request.post(fullUrl, options),
    GET: () => request.get(fullUrl, options),
    PUT: () => request.put(fullUrl, options),
    DELETE: () => request.delete(fullUrl, options),
    PATCH: () => request.patch(fullUrl, options),
    HEAD: () => request.head(fullUrl, options)
  }

  const requestFn = methodMap[method]
  if (!requestFn) throw new Error(`Unsupported HTTP method: ${method}`)

  // execute the request
  const response = await requestFn()
  const status = response.status()

  // parse response body based on content type
  const contentType = response.headers()['content-type'] || ''
  const parseResponseBody = async (): Promise<unknown> => {
    try {
      if (contentType.includes('application/json')) {
        return await response.json()
      } else if (contentType.includes('text/')) {
        return await response.text()
      }
      return null
    } catch (err) {
      // TODO: use log-utils
      console.warn(`Failed to parse response body for status ${status}: ${err}`)
      return null
    }
  }

  const responseBody = await parseResponseBody()

  return { status, body: responseBody as T }
}

/** URL normalization to handle edge cases with slashes */
const joinUrlParts = (base: string, path: string): string => {
  if (!base) return path

  // Ensure base has trailing slash and path doesn't have leading slash
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path

  return `${normalizedBase}${normalizedPath}`
}
