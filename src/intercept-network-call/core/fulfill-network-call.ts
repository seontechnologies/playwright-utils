import type { Page, Request, Route } from '@playwright/test'
import { matchesRequest } from './utils/matches-request'
import type { NetworkCallResult } from './types'
import { NetworkInterceptError, NetworkTimeoutError } from './types'

type FulfillResponse<T = unknown> = {
  status?: number
  headers?: Record<string, string>
  body?: T // Can be string, Buffer, or object - now generic
}

type PreparedResponse = {
  status?: number
  headers?: Record<string, string>
  body?: string | Buffer
}

/**
 * Prepares the response by stringifying the body if it's an object and setting appropriate headers.
 * @param {FulfillResponse} fulfillResponse - The response details.
 * @returns {PreparedResponse | undefined} - The prepared response.
 */
const prepareResponse = <T>(
  fulfillResponse?: FulfillResponse<T>
): PreparedResponse | undefined => {
  if (!fulfillResponse) return undefined

  const { status = 200, headers = {}, body } = fulfillResponse
  const contentType = headers['Content-Type'] || 'application/json'

  return {
    status,
    headers: {
      'Content-Type': contentType,
      ...headers
    },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  }
}

export async function fulfillNetworkCall<
  TRequest = unknown,
  TResponse = unknown
>(
  page: Page,
  method?: string,
  url?: string,
  fulfillResponse?: FulfillResponse<TResponse>,
  handler?: (route: Route, request: Request) => Promise<void> | void,
  timeout?: number
): Promise<NetworkCallResult<TRequest, TResponse>> {
  const routePattern = url
    ? url.startsWith('**')
      ? url
      : `**${url.startsWith('/') ? '' : '/'}${url}`
    : '**/*'
  const preparedResponse = prepareResponse(fulfillResponse)

  // Create a promise that will resolve with the request data
  let resolveRequest: (request: Request) => void
  const requestPromise = new Promise<Request>((resolve) => {
    resolveRequest = resolve
  })

  await page.route(routePattern, async (route, request) => {
    if (matchesRequest(request, method, url)) {
      // Capture the request before handling it
      resolveRequest(request)

      if (handler) {
        await handler(route, request)
      } else if (preparedResponse) {
        await route.fulfill(preparedResponse)
      }
    } else {
      await route.continue()
    }
  })

  try {
    // Wait for the request to be captured with timeout if specified
    const request = await Promise.race([
      requestPromise,
      // If timeout is specified, create a rejection promise that triggers after timeout
      ...(timeout
        ? [
            new Promise<Request>((_, reject) =>
              setTimeout(
                () =>
                  reject(
                    new NetworkTimeoutError(
                      `Request timeout after ${timeout}ms`,
                      'fulfill',
                      timeout,
                      url,
                      method
                    )
                  ),
                timeout
              )
            )
          ]
        : [])
    ])

    let requestJson: TRequest | null = null
    try {
      requestJson = await request.postDataJSON()
    } catch {
      // Request has no post data or is not JSON
    }

    return {
      request,
      response: null,
      responseJson: (fulfillResponse?.body ?? null) as TResponse | null,
      status: fulfillResponse?.status ?? 200,
      requestJson: requestJson
    }
  } catch (error) {
    // Re-throw our custom errors
    if (
      error instanceof NetworkTimeoutError ||
      error instanceof NetworkInterceptError
    ) {
      throw error
    }

    // Wrap other errors
    throw new NetworkInterceptError(
      `Failed to fulfill network call: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'fulfill',
      url,
      method
    )
  }
}
