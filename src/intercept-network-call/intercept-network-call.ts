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
  timeout?: number // Timeout in milliseconds
}

/**
 * Base implementation for network interception
 */
const interceptNetworkCallBase = async ({
  method,
  url,
  page,
  fulfillResponse,
  handler,
  timeout
}: InterceptOptions): Promise<NetworkCallResult> => {
  if (!page) {
    throw new Error('The `page` argument is required for network interception')
  }

  if (fulfillResponse || handler) {
    return fulfillNetworkCall(
      page,
      method,
      url,
      fulfillResponse,
      handler,
      timeout
    )
  } else {
    return observeNetworkCall(page, method, url, timeout)
  }
}

/** Gets the common components for step names */
const getStepNameComponents = (
  options: InterceptOptions
): {
  operation: string
  methodStr: string
  urlStr: string
} => {
  const operation = options.fulfillResponse
    ? 'Mock'
    : options.handler
      ? 'Modify'
      : 'Observe'

  const methodStr = options.method || ''

  const urlStr = options.url || ''

  return { operation, methodStr, urlStr }
}

/** Creates a step name based on the network interception options */
const createStepName = (options: InterceptOptions): string => {
  const { operation, methodStr, urlStr } = getStepNameComponents(options)
  return `${operation} ${methodStr} ${urlStr}`
}

/** Creates a description for when network call completes */
const createCompletedStepName = (
  options: InterceptOptions,
  result: NetworkCallResult
): string => {
  const { operation, methodStr, urlStr } = getStepNameComponents(options)
  const statusStr = result.status ? ` (${result.status})` : ''

  return `Received response for ${operation} ${methodStr} ${urlStr}${statusStr}`
}

export const interceptNetworkCall = async (
  options: InterceptOptions
): Promise<NetworkCallResult> => {
  // Main step for setting up the interception
  return test.step(createStepName(options), async () => {
    // Store the result promise
    const resultPromise = interceptNetworkCallBase(options)

    // Wait for the result
    const result = await resultPromise

    // Add a nested step that shows when the response is received
    await test.step(createCompletedStepName(options, result), async () => {
      // Just a marker step - no additional logic needed
      return
    })

    return result
  })
}

export type InterceptOptionsFixture = Omit<InterceptOptions, 'page'>

export type InterceptNetworkCallFn = (
  options: InterceptOptionsFixture
) => Promise<NetworkCallResult>

export type InterceptNetworkCall = ReturnType<typeof interceptNetworkCall>
