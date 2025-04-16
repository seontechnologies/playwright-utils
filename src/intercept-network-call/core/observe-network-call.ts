/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Page } from '@playwright/test'
import type { NetworkCallResult } from './types'
import { matchesRequest } from './utils/matches-request'

export async function observeNetworkCall(
  page: Page,
  method?: string,
  url?: string,
  timeout?: number
): Promise<NetworkCallResult> {
  const request = await page.waitForRequest(
    (req) => matchesRequest(req, method, url),
    { timeout }
  )

  const response = await request.response()
  if (!response) {
    throw new Error('No response received for the request')
  }

  let data: unknown = null

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

  let requestJson: unknown = null
  try {
    requestJson = await request.postDataJSON()
  } catch (_error) {
    // Request has no post data or is not JSON
  }

  return {
    request,
    response,
    responseJson: data,
    status: response.status(),
    requestJson
  }
}
