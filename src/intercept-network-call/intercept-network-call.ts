import type { Page, Route, Request } from '@playwright/test'
import { test } from '@playwright/test'
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
 * Base implementation for network interception
 */
const interceptNetworkCallBase = async ({
  method,
  url,
  page,
  fulfillResponse,
  handler
}: InterceptOptions): Promise<NetworkCallResult> => {
  if (!page) {
    throw new Error('The `page` argument is required for network interception')
  }

  if (fulfillResponse || handler) {
    return fulfillNetworkCall(page, method, url, fulfillResponse, handler)
  } else {
    return observeNetworkCall(page, method, url)
  }
}

/** Creates a step name based on the network interception options */
const createStepName = (options: InterceptOptions): string => {
  const operation = options.fulfillResponse
    ? 'Mock'
    : options.handler
      ? 'Modify'
      : 'Observe'
  const methodStr = options.method ? options.method : ''
  const urlStr = options.url ? options.url : ''

  return `${operation} ${methodStr} ${urlStr}`
}

/**
 * Intercepts a network request matching the given criteria.
 * - If `fulfillResponse` is provided, stubs the request and fulfills it with the given response.
 * - If `handler` is provided, uses it to handle the route.
 * - Otherwise, observes the request and returns its data.
 * @param {InterceptOptions} options - Options for matching and handling the request.
 * @returns {Promise<NetworkCallResult>}
 */
export const interceptNetworkCall = async (
  options: InterceptOptions
): Promise<NetworkCallResult> =>
  test.step(createStepName(options), async () =>
    interceptNetworkCallBase(options)
  )

export type InterceptOptionsFixture = Omit<InterceptOptions, 'page'>

export type InterceptNetworkCallFn = (
  options: InterceptOptionsFixture
) => Promise<NetworkCallResult>
