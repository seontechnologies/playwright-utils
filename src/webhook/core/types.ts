/**
 * Core types for the webhook testing module.
 *
 * Provides a provider-agnostic interface for querying webhook mock servers,
 * template-based matching, and typed webhook data structures.
 */

// ─── Provider Interface ───────────────────────────────────────────────────────

/**
 * Generic contract for a webhook mock server backend.
 * Implement this interface for any mock server (WireMock, MockServer, custom, etc.).
 */
export interface WebhookProvider {
  /** Query webhooks received by the mock server */
  getReceivedWebhooks(filter?: WebhookQueryFilter): Promise<ReceivedWebhook[]>

  /** Reset the mock server's request journal */
  resetJournal(): Promise<void>

  /** Delete a single webhook by ID */
  deleteById(id: string): Promise<void>

  /** Count requests matching the given criteria (provider-specific filtering) */
  getCount(criteria?: Record<string, unknown>): Promise<number>

  /** Remove requests matching provider-specific criteria */
  removeByCriteria?(criteria: Record<string, unknown>): Promise<void>

  /** Optional setup hook — called before the provider is used (e.g. health checks, stub registration) */
  setup?(): Promise<void>
  /** Optional teardown hook — called after the provider is done (e.g. cleanup resources) */
  teardown?(): Promise<void>
}

// ─── Data Types ───────────────────────────────────────────────────────────────

export type ReceivedWebhook<TPayload = unknown> = {
  id: string
  url: string
  method: string
  headers: Record<string, string>
  body: TPayload
  rawBody?: string
  parseError?: boolean
  receivedAt: Date
}

export type WebhookQueryFilter = {
  /** URL pattern to filter (glob or regex string) */
  urlPattern?: string
  /** HTTP method filter */
  method?: string
  /** Only return webhooks received after this timestamp */
  since?: Date
}

// ─── Template Types ───────────────────────────────────────────────────────────

export type WebhookTemplate<TPayload = unknown> = {
  /** Human-readable name for logging and error messages */
  name: string
  /** Array of matchers — all must pass for a webhook to match this template */
  matchers: PayloadMatcher<TPayload>[]
  /** Timeout in ms to wait for this webhook (overrides registry default) */
  timeout?: number
  /** Polling interval in ms (overrides registry default) */
  interval?: number
}

export type PayloadMatcher<TPayload = unknown> =
  | { type: 'field'; path: string; value: unknown }
  | { type: 'partial'; expected: DeepPartial<TPayload> }
  | {
      type: 'predicate'
      description: string
      fn: (payload: TPayload) => boolean
    }

export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T

// ─── Config ───────────────────────────────────────────────────────────────────

export type CleanupStrategy = 'matched-only' | 'full-reset'

export type WebhookRegistryConfig = {
  /** Default timeout in ms for waitFor calls (default: 30000) */
  defaultTimeout?: number
  /** Default polling interval in ms (default: 1000) */
  defaultInterval?: number
  /** Strategy for cleanup: 'matched-only' deletes only matched webhooks, 'full-reset' resets the entire journal (default: 'full-reset') */
  cleanupStrategy?: CleanupStrategy
}

export const WEBHOOK_DEFAULTS = {
  timeout: 30_000,
  interval: 1_000
} as const

// ─── Errors ───────────────────────────────────────────────────────────────────

export class WebhookTimeoutError extends Error {
  readonly name = 'WebhookTimeoutError'
  readonly totalReceived: number
  readonly receivedWebhooks: ReceivedWebhook[]

  constructor(
    public readonly templateName: string,
    public readonly timeoutMs: number,
    receivedWebhooks: ReceivedWebhook[],
    public readonly matcherDetails: string[] = []
  ) {
    const total = receivedWebhooks.length
    const truncated =
      total > 10 ? receivedWebhooks.slice(-10) : receivedWebhooks
    const countInfo =
      total > 10
        ? `${total} webhook(s) were received (showing last 10) but none matched.`
        : `${total} webhook(s) were received but none matched.`
    const matcherInfo =
      matcherDetails.length > 0
        ? ` Matchers: ${matcherDetails.join(', ')}.`
        : ''
    const parseFailures = truncated.filter((w) => w.parseError)
    const parseInfo =
      parseFailures.length > 0
        ? ` ${parseFailures.length} webhook(s) failed to parse as JSON: ${parseFailures.map((w) => JSON.stringify(w.rawBody)).join(', ')}.`
        : ''
    super(
      `Webhook "${templateName}" not received within ${timeoutMs}ms. ` +
        `${countInfo}${matcherInfo}${parseInfo}`
    )
    this.totalReceived = total
    this.receivedWebhooks = truncated
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      templateName: this.templateName,
      timeoutMs: this.timeoutMs,
      totalReceived: this.totalReceived,
      receivedWebhooks: this.receivedWebhooks,
      matcherDetails: this.matcherDetails,
      stack: this.stack
    }
  }
}
