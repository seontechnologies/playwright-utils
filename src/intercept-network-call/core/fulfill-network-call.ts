import type { Page, Request, Route } from '@playwright/test'
import { matchesRequest } from './utils/matches-request'
import type { NetworkCallResult } from './types'

type FulfillResponse = {
  status?: number
  headers?: Record<string, string>
  body?: unknown // Can be string, Buffer, or object
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
const prepareResponse = (
  fulfillResponse?: FulfillResponse
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

export async function fulfillNetworkCall(
  page: Page,
  method?: string,
  url?: string,
  fulfillResponse?: FulfillResponse,
  handler?: (route: Route, request: Request) => Promise<void> | void
): Promise<NetworkCallResult> {
  const routePattern = url?.startsWith('**') ? url : `**${url || '*'}`
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

  // Wait for the request to be captured
  const request = await requestPromise
  let requestJson = null
  try {
    requestJson = await request.postDataJSON()
  } catch {
    // Request has no post data or is not JSON
  }

  return {
    request,
    response: null,
    responseJson: fulfillResponse?.body ?? null,
    status: fulfillResponse?.status ?? 200,
    requestJson
  }
}
