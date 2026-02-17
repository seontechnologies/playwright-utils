import { type APIRequestContext, type Page } from '@playwright/test'
import { test } from '@playwright/test'
import { getLogger } from '../internal'
import {
  addApiCardToUI,
  type RequestDataInterface,
  type ResponseDataInterface
} from './ui-display'
import {
  createEnhancedResponse,
  type EnhancedApiResponse
} from './schema-validation/internal/response-extension'
import {
  createEnhancedPromise,
  type EnhancedApiPromise
} from './schema-validation/internal/promise-extension'

/** Retry configuration for API requests (like Cypress - only retries 5xx server errors, never 4xx client errors) */
export type ApiRetryConfig = {
  /** Maximum number of retry attempts for server errors (default: 3) */
  maxRetries?: number
  /** Initial delay between retries in milliseconds (default: 100ms) */
  initialDelayMs?: number
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier?: number
  /** Maximum delay between retries in milliseconds (default: 5000ms) */
  maxDelayMs?: number
  /** Whether to add random jitter to delays (default: true) */
  enableJitter?: boolean
  /** Which status codes to retry (default: [500, 502, 503, 504] - only 5xx server errors) */
  retryStatusCodes?: number[]
}

/** Custom error type for API request failures */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response?: unknown,
    public readonly attempt?: number
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

/** Network-level error for connection issues */
export class ApiNetworkError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'ApiNetworkError'
  }
}

export type ApiRequestParams = {
  request: APIRequestContext
  method: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'
  path: string
  baseUrl?: string
  configBaseUrl?: string // configBaseUrl from Playwright config
  body?: unknown
  headers?: Record<string, string>
  params?: Record<string, string | boolean | number>
  testStep?: boolean // Whether to wrap the call in test.step (defaults to true)
  uiMode?: boolean // Whether to show rich UI display (defaults to false, unless API_E2E_UI_MODE env var is set)
  page?: Page // Page context for UI display (automatically provided by fixtures)
  /** Retry configuration for handling failed requests (enabled by default like Cypress - set maxRetries: 0 to disable) */
  retryConfig?: ApiRetryConfig
}

/** Structural shape for operation definitions — works with any code generator (duck typing) */
export type OperationShape = {
  path: string
  method: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'
  response: unknown
  request: unknown
  query?: unknown
}

/**
 * Parameters for the operation-based apiRequest overload.
 * Mutually exclusive with classic params: method/path are forbidden here.
 */
export type OperationRequestParams<Op extends OperationShape> = {
  request: APIRequestContext
  operation: Op
  body?: Op['request']
  query?: Op['query']
  /** Raw params escape hatch — merged with serialized query (params wins on conflict) */
  params?: Record<string, string | boolean | number>
  baseUrl?: string
  configBaseUrl?: string
  headers?: Record<string, string>
  testStep?: boolean
  uiMode?: boolean
  page?: Page
  retryConfig?: ApiRetryConfig
  /** Forbidden in operation mode — enforced at type level */
  method?: never
  path?: never
}

export type ApiRequestResponse<T = unknown> = {
  status: number
  body: T
}

/** Creates a step name for API requests that will appear in the Playwright UI */
const createStepName = ({
  method,
  path,
  baseUrl,
  configBaseUrl = ''
}: ApiRequestParams): string => {
  const effectiveBaseUrl = baseUrl || configBaseUrl || ''
  const fullPath = effectiveBaseUrl
    ? joinUrlParts(effectiveBaseUrl, path)
    : path

  return `API ${method} ${fullPath}`
}
/** Default retry configuration following Cypress patterns - only retries 5xx server errors, not 4xx client errors */
const DEFAULT_RETRY_CONFIG: Required<ApiRetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 100,
  backoffMultiplier: 2,
  maxDelayMs: 5000,
  enableJitter: true,
  retryStatusCodes: [500, 502, 503, 504] // Only 5xx server errors (transient issues), never 4xx client errors
}

/**
 * Sleep for a specified number of milliseconds
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Calculate the delay for a retry attempt with exponential backoff and optional jitter
 */
const calculateRetryDelay = (
  attempt: number,
  config: Required<ApiRetryConfig>
): number => {
  const baseDelay =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt)
  const clampedDelay = Math.min(baseDelay, config.maxDelayMs)

  if (config.enableJitter) {
    // Add random jitter ±25% to prevent thundering herd
    const jitter = clampedDelay * 0.25 * (Math.random() * 2 - 1)
    return Math.max(0, clampedDelay + jitter)
  }

  return clampedDelay
}

/**
 * Determine if a status code should trigger a retry
 */
const shouldRetry = (status: number, retryStatusCodes: number[]): boolean => {
  return retryStatusCodes.includes(status)
}

/**
 * Execute API request with retry logic (similar to Cypress)
 */
const executeWithRetry = async <T>(
  requestFn: () => Promise<{ status: number; body: T }>,
  config: Required<ApiRetryConfig>,
  context: string
): Promise<{ status: number; body: T }> => {
  let lastError: Error | undefined
  let lastResponse: { status: number; body: T } | undefined

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await requestFn()

      // Check if response status should trigger a retry
      if (
        attempt < config.maxRetries &&
        shouldRetry(response.status, config.retryStatusCodes)
      ) {
        lastResponse = response
        const delay = calculateRetryDelay(attempt, config)

        await getLogger().warning(
          `${context} returned ${response.status} (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay.toFixed(0)}ms`
        )

        await sleep(delay)
        continue
      }

      // Success or non-retryable status code
      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === config.maxRetries) {
        // Final attempt failed with an error
        throw new ApiNetworkError(
          `${context} failed after ${config.maxRetries + 1} attempts: ${lastError.message}`,
          lastError
        )
      }

      const delay = calculateRetryDelay(attempt, config)
      await getLogger().warning(
        `${context} failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay.toFixed(0)}ms: ${lastError.message}`
      )

      await sleep(delay)
    }
  }

  // This should not be reached, but if we have a response with retryable status
  if (lastResponse) {
    throw new ApiRequestError(
      `${context} failed with status ${lastResponse.status} after ${config.maxRetries + 1} attempts`,
      lastResponse.status,
      lastResponse.body,
      config.maxRetries + 1
    )
  }

  // Fallback error
  throw new ApiNetworkError(
    `${context} failed after ${config.maxRetries + 1} attempts`,
    lastError
  )
}
/**
 * Base implementation of API request without test step wrapping
 */
const apiRequestBase = async <T = unknown>({
  request,
  method,
  path,
  baseUrl,
  configBaseUrl = '', // configBaseUrl from Playwright config
  body = null,
  headers,
  params,
  uiMode = false,
  page,
  retryConfig
}: ApiRequestParams): Promise<ApiRequestResponse<T>> => {
  // common options; if there's a prop, add it to the options object
  // Note: Playwright expects 'data' for the request body, not 'body'
  const options = Object.assign(
    {},
    body && { data: body }, // Map 'body' to 'data' for Playwright
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
  // Merge retry config with defaults
  const effectiveRetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  const context = `${method} ${fullUrl}`

  // Define the request execution function for retry logic
  const executeRequest = async (): Promise<{ status: number; body: T }> => {
    // Execute the request with timing
    const startTime = Date.now()
    const response = await requestFn()
    const duration = Date.now() - startTime
    const status = response.status()

    // Parse response body based on content type
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
        await getLogger().warning(
          `Failed to parse response body for status ${status}: ${err}`
        )
        return null
      }
    }

    const responseBody = await parseResponseBody()

    // Display UI if uiMode is enabled or environment variable is set
    if (uiMode || shouldDisplayApiUI()) {
      await displayApiUI({
        url: fullUrl,
        method,
        headers,
        data: body,
        params,
        response,
        responseBody,
        duration,
        status,
        page,
        uiMode
      })
    }

    return { status, body: responseBody as T }
  }

  // Use retry logic by default (like Cypress), only disable if explicitly set to maxRetries: 0
  if (retryConfig?.maxRetries === 0) {
    // Explicitly disabled - execute directly without retry
    return executeRequest()
  } else {
    // Default retry behavior (like Cypress) - always retry 5xx errors
    return executeWithRetry(executeRequest, effectiveRetryConfig, context)
  }
}
/**
 * Determines if API UI should be displayed based on environment variables
 */
const shouldDisplayApiUI = (): boolean => {
  const envUiMode = process.env.API_E2E_UI_MODE
  if (envUiMode === 'true') return true
  if (envUiMode === 'false') return false

  // Default is false unless explicitly enabled
  return false
}

/**
 * Display API call information in UI format
 */
const displayApiUI = async (params: {
  url: string
  method: string
  headers?: Record<string, string>
  data?: unknown
  params?: Record<string, string | boolean | number>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any
  responseBody: unknown
  duration: number
  status: number
  page?: Page
  uiMode?: boolean
}): Promise<void> => {
  try {
    const requestData: RequestDataInterface = {
      url: params.url,
      method: params.method.toUpperCase(),
      headers: params.headers,
      data: params.data,
      params: params.params
    }

    const responseData: ResponseDataInterface = {
      status: params.status,
      statusClass: Math.floor(params.status / 100) + 'xx',
      statusText: params.response.statusText(),
      headers: params.response.headers(),
      body: params.responseBody,
      duration: params.duration
    }

    await addApiCardToUI(requestData, responseData, params.page, params.uiMode)
  } catch (error) {
    // Silently fail if UI display doesn't work (e.g., no page context)
    await getLogger().debug(`UI display failed: ${error}`)
  }
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
 * // GET request with default retry behavior (like Cypress - only retries 5xx server errors)
 * test('fetch user data', async ({ apiRequest }) => {
 *   const { status, body } = await apiRequest<UserResponse>({
 *     method: 'GET',
 *     url: '/api/users/123',
 *     headers: { 'Authorization': 'Bearer token' }
 *     // Automatically retries 500, 502, 503, 504 errors (3 attempts with exponential backoff)
 *     // Never retries 4xx client errors (400, 401, 403, 404, etc.)
 *   });
 *
 *   expect(status).toBe(200);
 *   expect(body.name).toBe('John Doe');
 * });
 *
 * @example
 * // 4xx errors fail immediately without retry (good for idempotency)
 * test('handle validation error', async ({ apiRequest }) => {
 *   const { status, body } = await apiRequest({
 *     method: 'POST',
 *     url: '/api/users',
 *     body: { name: '' } // Invalid data
 *     // 400 Bad Request will NOT be retried - fails fast
 *   });
 *
 *   expect(status).toBe(400);
 * });
 *
 * @example
 * // Disable retry when testing error scenarios
 * test('test server error handling', async ({ apiRequest }) => {
 *   const { status } = await apiRequest({
 *     method: 'GET',
 *     url: '/api/fail-endpoint',
 *     retryConfig: { maxRetries: 0 } // Disable retry to test error handling
 *   });
 *
 *   expect(status).toBe(500);
 * });
 */
type ApiRequestFn = {
  /** Operation-based overload: types inferred from operation definition */
  <Op extends OperationShape>(
    options: OperationRequestParams<Op>
  ): EnhancedApiPromise<Op['response']>
  /** Classic overload: manual method/path/body (unchanged) */
  <T = unknown>(options: ApiRequestParams): EnhancedApiPromise<T>
}

export const apiRequest: ApiRequestFn = (<T = unknown>(
  options: ApiRequestParams | OperationRequestParams<OperationShape>
): EnhancedApiPromise<T> => {
  const normalizedOptions: ApiRequestParams = isOperationRequest(options)
    ? normalizeOperationParams(options)
    : (options as ApiRequestParams)

  // By default, wrap in test.step unless explicitly disabled
  const useTestStep = normalizedOptions.testStep !== false

  const promise = (async (): Promise<EnhancedApiResponse<T>> => {
    let baseResponse: ApiRequestResponse<T>

    if (useTestStep) {
      baseResponse = await test.step(
        createStepName(normalizedOptions),
        async () => apiRequestBase<T>(normalizedOptions)
      )
    } else {
      // When used outside of test context (e.g., global setup)
      baseResponse = await apiRequestBase<T>(normalizedOptions)
    }

    // Create enhanced response with validateSchema method
    return createEnhancedResponse(baseResponse, {
      method: normalizedOptions.method,
      path: normalizedOptions.path,
      body: normalizedOptions.body,
      headers: normalizedOptions.headers,
      page: normalizedOptions.page,
      uiMode: normalizedOptions.uiMode
    })
  })()

  // Return enhanced promise with validateSchema method
  return createEnhancedPromise(promise)
}) as ApiRequestFn

/** Serialize nested query object into flat bracket-notation params (best-effort) */
const serializeQuery = (
  obj: Record<string, unknown>,
  prefix?: string
): Record<string, string> => {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue
    const fullKey = prefix ? `${prefix}[${key}]` : key
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item === null || item === undefined) return
        if (typeof item === 'object') {
          Object.assign(
            result,
            serializeQuery(
              item as Record<string, unknown>,
              `${fullKey}[${index}]`
            )
          )
        } else {
          result[`${fullKey}[${index}]`] = String(item)
        }
      })
    } else if (typeof value === 'object') {
      Object.assign(
        result,
        serializeQuery(value as Record<string, unknown>, fullKey)
      )
    } else {
      result[fullKey] = String(value)
    }
  }
  return result
}

/** Runtime type guard with shape validation — classic fields win for backward compat */
const isOperationRequest = (
  options: ApiRequestParams | OperationRequestParams<OperationShape>
): options is OperationRequestParams<OperationShape> => {
  // If classic method+path are present as strings, always use classic path
  // (protects against variable-based calls that might have extra properties)
  const opts = options as Record<string, unknown>
  if (typeof opts.method === 'string' && typeof opts.path === 'string')
    return false

  if (!('operation' in options) || options.operation == null) return false
  const op = options.operation
  return (
    typeof op === 'object' &&
    typeof op.path === 'string' &&
    typeof op.method === 'string'
  )
}

/** Convert operation params to classic ApiRequestParams (only reads method/path, never response/request) */
const normalizeOperationParams = (
  options: OperationRequestParams<OperationShape>
): ApiRequestParams => {
  const { operation, body, query, params: rawParams, ...rest } = options
  const serializedQuery = query
    ? serializeQuery(query as Record<string, unknown>)
    : {}
  const mergedParams = { ...serializedQuery, ...rawParams }
  const hasParams = Object.keys(mergedParams).length > 0

  return {
    ...rest,
    method: operation.method,
    path: operation.path,
    body,
    params: hasParams ? mergedParams : undefined
  } as ApiRequestParams
}

/** URL normalization to handle edge cases with slashes */
const joinUrlParts = (base: string, path: string): string => {
  if (!base) return path

  // Ensure base has trailing slash and path doesn't have leading slash
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path

  return `${normalizedBase}${normalizedPath}`
}
