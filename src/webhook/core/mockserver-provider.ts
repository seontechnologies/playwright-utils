/**
 * MockServer implementation of the WebhookProvider interface.
 *
 * Works with any server exposing MockServer's /mockserver admin API.
 *
 * Limitation: MockServer does not support deleting individual log entries by ID.
 * The `deleteById` method is a no-op — test isolation relies on the `since`
 * filter that the registry passes on every poll. Prefer `full-reset` cleanup
 * strategy unless you're running parallel workers that share the server.
 *
 * Start MockServer with log recording enabled (default in most configs).
 *
 * @example
 * const provider = new MockServerWebhookProvider('http://localhost:1080', request)
 * const webhooks = await provider.getReceivedWebhooks()
 */

import type { APIRequestContext } from '@playwright/test'
import { apiRequest } from '../../api-request'
import { log } from '../../log'
import type {
  WebhookProvider,
  ReceivedWebhook,
  WebhookQueryFilter
} from './types'

// ─── MockServer-specific types ────────────────────────────────────────────────

type MockServerKeyToMultiValue = Array<{ name: string; values: string[] }>

type MockServerBody =
  | { type?: string; string?: string; json?: string; bytes?: string }
  | string

type MockServerRequestResponse = {
  httpRequest: {
    method?: string
    path?: string
    headers?: MockServerKeyToMultiValue
    body?: MockServerBody
  }
  httpResponse?: unknown
  timestamp?: string
}

// ─── Provider Implementation ──────────────────────────────────────────────────

export class MockServerWebhookProvider implements WebhookProvider {
  private readonly adminUrl: string

  constructor(
    baseUrl: string,
    private readonly request: APIRequestContext
  ) {
    this.adminUrl = baseUrl.replace(/\/$/, '') + '/mockserver'
  }

  /**
   * PUT /mockserver/retrieve?type=REQUEST_RESPONSES&format=JSON
   * Returns all logged request/response pairs; client-side filtered by since/method/urlPattern.
   */
  async getReceivedWebhooks(
    filter?: WebhookQueryFilter
  ): Promise<ReceivedWebhook[]> {
    const { body } = await apiRequest<MockServerRequestResponse[]>({
      request: this.request,
      method: 'PUT',
      path: '/retrieve?type=REQUEST_RESPONSES&format=JSON',
      baseUrl: this.adminUrl,
      body: {},
      testStep: false,
      retryConfig: { maxRetries: 0 }
    })

    let webhooks = body.map(mapMockServerEntry)

    if (filter?.since) {
      const sinceMs = filter.since.getTime()
      webhooks = webhooks.filter((w) => w.receivedAt.getTime() >= sinceMs)
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

  /** PUT /mockserver/clear?type=log — clears the request log, preserves stubs */
  async resetJournal(): Promise<void> {
    await apiRequest({
      request: this.request,
      method: 'PUT',
      path: '/clear?type=log',
      baseUrl: this.adminUrl,
      testStep: false,
      retryConfig: { maxRetries: 0 }
    })
  }

  /**
   * MockServer does not support deleting individual log entries by ID.
   * This is intentionally a no-op — test isolation is handled by the `since`
   * filter the registry passes on every poll.
   */
  async deleteById(_id: string): Promise<void> {
    log.warningSync(
      'MockServerWebhookProvider: deleteById is not supported. ' +
        'Isolation relies on since-based filtering. Consider full-reset strategy.'
    )
  }

  /** Count by fetching all and measuring — MockServer has no count endpoint for log entries */
  async getCount(): Promise<number> {
    const webhooks = await this.getReceivedWebhooks()
    return webhooks.length
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenMockServerHeaders(
  headers?: MockServerKeyToMultiValue
): Record<string, string> {
  if (!headers) return {}
  return headers.reduce<Record<string, string>>((acc, { name, values }) => {
    acc[name.toLowerCase()] = values.join(', ')
    return acc
  }, {})
}

function extractMockServerBody(raw: MockServerBody | undefined): {
  body: unknown
  rawBody: string
  parseError: boolean
} {
  if (!raw) return { body: undefined, rawBody: '', parseError: false }

  const rawBody =
    typeof raw === 'string' ? raw : (raw.json ?? raw.string ?? raw.bytes ?? '')

  if (!rawBody) return { body: undefined, rawBody: '', parseError: false }

  try {
    return { body: JSON.parse(rawBody), rawBody, parseError: false }
  } catch {
    log.warningSync('Failed to parse MockServer webhook body as JSON')
    return { body: rawBody, rawBody, parseError: true }
  }
}

let mockServerEntryCounter = 0

function mapMockServerEntry(entry: MockServerRequestResponse): ReceivedWebhook {
  const req = entry.httpRequest
  const { body, rawBody, parseError } = extractMockServerBody(req.body)
  const receivedAt = entry.timestamp ? new Date(entry.timestamp) : new Date()

  // MockServer log entries have no stable IDs — synthetic ID from timestamp + counter
  const id = `${receivedAt.getTime()}-${++mockServerEntryCounter}`

  return {
    id,
    url: req.path ?? '',
    method: (req.method ?? 'UNKNOWN').toUpperCase(),
    headers: flattenMockServerHeaders(req.headers),
    body,
    rawBody,
    parseError,
    receivedAt
  }
}
