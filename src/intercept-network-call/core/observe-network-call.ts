/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Page } from '@playwright/test'
import type { NetworkCallResult } from './types'
import { NetworkInterceptError, NetworkTimeoutError } from './types'
import { matchesRequest } from './utils/matches-request'

export async function observeNetworkCall<
  TRequest = unknown,
  TResponse = unknown
>(
  page: Page,
  method?: string,
  url?: string,
  timeout?: number
): Promise<NetworkCallResult<TRequest, TResponse>> {
  try {
    const request = await page.waitForRequest(
      (req) => matchesRequest(req, method, url),
      { timeout }
    )

    const response = await request.response()
    if (!response) {
      throw new NetworkInterceptError(
        'No response received for the request',
        'observe',
        url,
        method
      )
    }

    let data: TResponse | null = null

    try {
      data = await response.json()
    } catch (_error) {
      const contentType =
        response.headers()['content-type'] ||
        response.headers()['Content-Type'] ||
        ''

      if (!contentType.includes('application/json')) {
        data = null
      } else {
        console.warn(
          'Failed to parse JSON response despite Content-Type indicating JSON'
        )
      }
    }

    let requestJson: TRequest | null = null
    try {
      requestJson = await request.postDataJSON()
    } catch (_error) {
      // Request has no post data or is not JSON
    }

    return {
      request,
      response,
      responseJson: data as TResponse,
      status: response.status(),
      requestJson: requestJson as TRequest
    }
  } catch (error) {
    // Handle timeout errors specifically
    if (error instanceof Error && error.message.includes('Timeout')) {
      throw new NetworkTimeoutError(
        'Request timeout while observing network call',
        'observe',
        timeout || 30000,
        url,
        method
      )
    }

    // Re-throw our custom errors
    if (error instanceof NetworkInterceptError) {
      throw error
    }

    // Wrap other errors
    throw new NetworkInterceptError(
      `Failed to observe network call: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'observe',
      url,
      method
    )
  }
}
