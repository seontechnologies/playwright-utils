/**
 * Built-in WireMock implementation of the WebhookProvider interface.
 *
 * Uses the lib's apiRequest for all HTTP calls (retry, backoff, typed responses).
 * Requires Playwright's APIRequestContext to be injected.
 *
 * @example
 * const provider = new WireMockWebhookProvider('http://localhost:5025', request)
 * const webhooks = await provider.getReceivedWebhooks()
 */

import type { APIRequestContext } from '@playwright/test'
import { apiRequest } from '../../api-request'
import type {
  WebhookProvider,
  ReceivedWebhook,
  WebhookQueryFilter
} from './types'

// ─── WireMock-specific types ──────────────────────────────────────────────────

export type WireMockRequestCriteria = {
  method?: string
  url?: string
  urlPattern?: string
  headers?: Record<string, { matches?: string; equalTo?: string }>
  bodyPatterns?: Record<string, unknown>[]
}

type WireMockRequest = {
  id: string
  request: {
    url: string
    absoluteUrl: string
    method: string
    headers: Record<string, string>
    body: string
  }
  responseDefinition: Record<string, unknown>
  loggedDate: number
  loggedDateString: string
}

type WireMockRequestsResponse = {
  requests: WireMockRequest[]
  meta: { total: number }
  requestJournalDisabled: boolean
}

type WireMockCountResponse = {
  count: number
}

// ─── Provider Implementation ──────────────────────────────────────────────────

export class WireMockWebhookProvider implements WebhookProvider {
  private readonly adminUrl: string

  constructor(
    baseUrl: string,
    private readonly request: APIRequestContext
  ) {
    this.adminUrl = baseUrl.replace(/\/$/, '') + '/__admin'
  }

  /** GET /__admin/requests — query all received requests */
  async getReceivedWebhooks(
    filter?: WebhookQueryFilter
  ): Promise<ReceivedWebhook[]> {
    const { body } = await apiRequest<WireMockRequestsResponse>({
      request: this.request,
      method: 'GET',
      path: '/requests',
      baseUrl: this.adminUrl,
      testStep: false,
      retryConfig: { maxRetries: 0 }
    })

    let webhooks = body.requests.map(mapWireMockRequest)

    if (filter?.since) {
      const since = filter.since.getTime()
      webhooks = webhooks.filter((w) => w.receivedAt.getTime() >= since)
    }

    if (filter?.method) {
      const method = filter.method.toUpperCase()
      webhooks = webhooks.filter((w) => w.method === method)
    }

    if (filter?.urlPattern) {
      let pattern: RegExp
      try {
        pattern = new RegExp(filter.urlPattern)
      } catch {
        throw new Error(`Invalid urlPattern regex: "${filter.urlPattern}"`)
      }
      webhooks = webhooks.filter((w) => pattern.test(w.url))
    }

    return webhooks
  }

  /** DELETE /__admin/requests — reset the entire request journal */
  async resetJournal(): Promise<void> {
    await apiRequest({
      request: this.request,
      method: 'DELETE',
      path: '/requests',
      baseUrl: this.adminUrl,
      testStep: false,
      retryConfig: { maxRetries: 0 }
    })
  }

  /** DELETE /__admin/requests/{id} — delete a single request by ID */
  async deleteById(id: string): Promise<void> {
    await apiRequest({
      request: this.request,
      method: 'DELETE',
      path: `/requests/${id}`,
      baseUrl: this.adminUrl,
      testStep: false,
      retryConfig: { maxRetries: 0 }
    })
  }

  /** POST /__admin/requests/count — count requests matching criteria */
  async getCount(criteria?: WireMockRequestCriteria): Promise<number> {
    const { body } = await apiRequest<WireMockCountResponse>({
      request: this.request,
      method: 'POST',
      path: '/requests/count',
      baseUrl: this.adminUrl,
      body: criteria ?? {},
      testStep: false,
      retryConfig: { maxRetries: 0 }
    })

    return body.count
  }

  /** POST /__admin/requests/remove — remove requests matching criteria */
  async removeByCriteria(criteria: WireMockRequestCriteria): Promise<void> {
    await apiRequest({
      request: this.request,
      method: 'POST',
      path: '/requests/remove',
      baseUrl: this.adminUrl,
      body: criteria,
      testStep: false,
      retryConfig: { maxRetries: 0 }
    })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapWireMockRequest(wmRequest: WireMockRequest): ReceivedWebhook {
  let body: unknown
  try {
    body = JSON.parse(wmRequest.request.body)
  } catch {
    body = wmRequest.request.body
  }

  return {
    id: wmRequest.id,
    url: wmRequest.request.absoluteUrl || wmRequest.request.url,
    method: wmRequest.request.method,
    headers: wmRequest.request.headers,
    body,
    receivedAt: new Date(wmRequest.loggedDate)
  }
}
