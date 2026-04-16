/**
 * Mockoon implementation of the WebhookProvider interface.
 *
 * Works with any server running @mockoon/cli or the Mockoon desktop app
 * with the admin API enabled (on by default in @mockoon/cli).
 *
 * Limitation: Mockoon does not support deleting individual log entries by ID.
 * The `deleteById` method is a no-op — test isolation relies on the `since`
 * filter that the registry passes on every poll. Prefer `full-reset` cleanup
 * strategy unless you're running parallel workers that share the server.
 *
 * Mockoon caps the in-memory log at 100 entries by default. Raise it with
 * `--max-transaction-logs <n>` if your tests generate more webhook traffic.
 *
 * @example
 * const provider = new MockoonWebhookProvider('http://localhost:3000', request)
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

// ─── Mockoon-specific types ───────────────────────────────────────────────────

type MockoonHeader = { key: string; value: string }

type MockoonLogEntry = {
  request: {
    method: string
    urlPath: string
    headers: MockoonHeader[]
    body?: string
    queryParams?: Record<string, string>
  }
  response: {
    statusCode: number
    headers: MockoonHeader[]
    body?: string
  }
  timestampMs: number
  routeResponseUUID?: string
  routeUUID?: string
  proxied?: boolean
}

// Mockoon may return a plain array or a paginated object depending on version
type MockoonLogsResponse =
  | MockoonLogEntry[]
  | { data: MockoonLogEntry[]; total?: number }

// ─── Provider Implementation ──────────────────────────────────────────────────

export class MockoonWebhookProvider implements WebhookProvider {
  private readonly adminUrl: string

  constructor(
    baseUrl: string,
    private readonly request: APIRequestContext
  ) {
    this.adminUrl = baseUrl.replace(/\/$/, '')
  }

  /**
   * GET /mockoon-admin/logs
   * Returns all in-memory transaction logs; client-side filtered by since/method/urlPattern.
   * Raises if the log is full — increase --max-transaction-logs if needed.
   */
  async getReceivedWebhooks(
    filter?: WebhookQueryFilter
  ): Promise<ReceivedWebhook[]> {
    const { body } = await apiRequest<MockoonLogsResponse>({
      request: this.request,
      method: 'GET',
      path: '/mockoon-admin/logs',
      baseUrl: this.adminUrl,
      testStep: false,
      retryConfig: { maxRetries: 0 }
    })

    const entries = Array.isArray(body) ? body : (body.data ?? [])
    let webhooks = entries.map(mapMockoonEntry)

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

  /** POST /mockoon-admin/logs/purge — clears all in-memory transaction logs */
  async resetJournal(): Promise<void> {
    await apiRequest({
      request: this.request,
      method: 'POST',
      path: '/mockoon-admin/logs/purge',
      baseUrl: this.adminUrl,
      testStep: false,
      retryConfig: { maxRetries: 0 }
    })
  }

  /**
   * Mockoon does not support deleting individual log entries by ID.
   * This is intentionally a no-op — test isolation is handled by the `since`
   * filter the registry passes on every poll.
   */
  async deleteById(_id: string): Promise<void> {
    log.warningSync(
      'MockoonWebhookProvider: deleteById is not supported. ' +
        'Isolation relies on since-based filtering. Consider full-reset strategy.'
    )
  }

  /** Count by fetching all and measuring — Mockoon has no dedicated count endpoint */
  async getCount(): Promise<number> {
    const webhooks = await this.getReceivedWebhooks()
    return webhooks.length
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenMockoonHeaders(
  headers: MockoonHeader[]
): Record<string, string> {
  return headers.reduce<Record<string, string>>((acc, { key, value }) => {
    acc[key.toLowerCase()] = value
    return acc
  }, {})
}

let mockoonEntryCounter = 0

function mapMockoonEntry(entry: MockoonLogEntry): ReceivedWebhook {
  const rawBody = entry.request.body ?? ''
  let body: unknown
  let parseError = false

  if (rawBody) {
    try {
      body = JSON.parse(rawBody)
    } catch {
      log.warningSync('Failed to parse Mockoon webhook body as JSON')
      body = rawBody
      parseError = true
    }
  }

  // Mockoon log entries have no stable IDs — synthetic ID from timestampMs + counter
  const id = `${entry.timestampMs}-${++mockoonEntryCounter}`

  return {
    id,
    url: entry.request.urlPath,
    method: entry.request.method.toUpperCase(),
    headers: flattenMockoonHeaders(entry.request.headers),
    body,
    rawBody,
    parseError,
    receivedAt: new Date(entry.timestampMs)
  }
}
