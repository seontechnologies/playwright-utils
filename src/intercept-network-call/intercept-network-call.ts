import type { Page, Route, Request } from '@playwright/test'
import { fulfillNetworkCall } from './core/fulfill-network-call'
import { observeNetworkCall } from './core/observe-network-call'
import type { NetworkCallResult } from './core/types'

type FulfillResponse = {
  status?: number
  headers?: Record<string, string>
  body?: unknown // Can be string, Buffer, or object
}

type InterceptOptions = {
  method?: string
  url?: string
  page: Page
  fulfillResponse?: FulfillResponse
  handler?: (route: Route, request: Request) => Promise<void> | void
}

/**
 * Intercepts a network request matching the given criteria.
 * - If `fulfillResponse` is provided, stubs the request and fulfills it with the given response.
 * - If `handler` is provided, uses it to handle the route.
 * - Otherwise, observes the request and returns its data.
 * @param {InterceptOptions} options - Options for matching and handling the request.
 * @returns {Promise<NetworkCallResult>}
 */
export async function interceptNetworkCall({
  method,
  url,
  page,
  fulfillResponse,
  handler
}: InterceptOptions): Promise<NetworkCallResult> {
  if (!page) {
    throw new Error('The `page` argument is required for network interception')
  }

  if (fulfillResponse || handler) {
    return fulfillNetworkCall(page, method, url, fulfillResponse, handler)
  } else {
    return observeNetworkCall(page, method, url)
  }
}

export type InterceptOptionsFixture = Omit<InterceptOptions, 'page'>

export type InterceptNetworkCallFn = (
  options: InterceptOptionsFixture
) => ReturnType<typeof interceptNetworkCall>
