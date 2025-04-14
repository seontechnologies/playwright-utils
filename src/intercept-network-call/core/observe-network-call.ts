import type { Page } from '@playwright/test'
import type { NetworkCallResult } from './types'
import { matchesRequest } from './utils/matches-request'

export async function observeNetworkCall(
  page: Page,
  method?: string,
  url?: string
): Promise<NetworkCallResult> {
  const request = await page.waitForRequest((req) =>
    matchesRequest(req, method, url)
  )

  const response = await request.response()
  if (!response) {
    throw new Error('No response received for the request')
  }

  let data = null

  try {
    const contentType = response.headers()['content-type']
    if (contentType?.includes('application/json')) {
      data = await response.json()
    }
  } catch {
    // Response is not JSON
  }

  let requestJson = null
  try {
    requestJson = await request.postDataJSON()
  } catch {
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
