import type { Page, Route, Request } from '@playwright/test'
import { test } from '@playwright/test'
import { fulfillNetworkCall } from './core/fulfill-network-call'
import { observeNetworkCall } from './core/observe-network-call'
import type { NetworkCallResult } from './core/types'

type FulfillResponse<T = unknown> = {
  status?: number
  headers?: Record<string, string>
  body?: T // Can be string, Buffer, or object - now generic
}

type InterceptOptions<TResponse = unknown> = {
  method?: string
  url?: string
  page: Page
  fulfillResponse?: FulfillResponse<TResponse>
  handler?: (route: Route, request: Request) => Promise<void> | void
  timeout?: number // Timeout in milliseconds
}

/**
 * Base implementation for network interception
 */
const interceptNetworkCallBase = async <
  TRequest = unknown,
  TResponse = unknown
>({
  method,
  url,
  page,
  fulfillResponse,
  handler,
  timeout
}: InterceptOptions<TResponse>): Promise<
  NetworkCallResult<TRequest, TResponse>
> => {
  if (!page) {
    throw new Error('The `page` argument is required for network interception')
  }

  if (fulfillResponse || handler) {
    return fulfillNetworkCall<TRequest, TResponse>(
      page,
      method,
      url,
      fulfillResponse,
      handler,
      timeout
    )
  } else {
    return observeNetworkCall<TRequest, TResponse>(page, method, url, timeout)
  }
}

/** Gets the common components for step names */
const getStepNameComponents = <TResponse = unknown>(
  options: InterceptOptions<TResponse>
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
const createStepName = <TResponse = unknown>(
  options: InterceptOptions<TResponse>
): string => {
  const { operation, methodStr, urlStr } = getStepNameComponents(options)
  return `${operation} ${methodStr} ${urlStr}`
}

/** Creates a description for when network call completes */
const createCompletedStepName = <TRequest = unknown, TResponse = unknown>(
  options: InterceptOptions<TResponse>,
  result: NetworkCallResult<TRequest, TResponse>
): string => {
  const { operation, methodStr, urlStr } = getStepNameComponents(options)
  const statusStr = result.status ? ` (${result.status})` : ''

  return `Received response for ${operation} ${methodStr} ${urlStr}${statusStr}`
}

export const interceptNetworkCall = async <
  TRequest = unknown,
  TResponse = unknown
>(
  options: InterceptOptions<TResponse>
): Promise<NetworkCallResult<TRequest, TResponse>> => {
  // Main step for setting up the interception
  return test.step(createStepName<TResponse>(options), async () => {
    // Store the result promise
    const resultPromise = interceptNetworkCallBase<TRequest, TResponse>(options)

    // Wait for the result
    const result = await resultPromise

    // Add a nested step that shows when the response is received
    await test.step(
      createCompletedStepName<TRequest, TResponse>(options, result),
      async () => {
        // Just a marker step - no additional logic needed
        return
      }
    )

    return result
  })
}

export type InterceptOptionsFixture<TResponse = unknown> = Omit<
  InterceptOptions<TResponse>,
  'page'
>

export type InterceptNetworkCallFn<TRequest = unknown, TResponse = unknown> = (
  options: InterceptOptionsFixture<TResponse>
) => Promise<NetworkCallResult<TRequest, TResponse>>

export type InterceptNetworkCall<
  TRequest = unknown,
  TResponse = unknown
> = ReturnType<typeof interceptNetworkCall<TRequest, TResponse>>
