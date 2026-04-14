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
}

// ─── Data Types ───────────────────────────────────────────────────────────────

export type ReceivedWebhook<TPayload = unknown> = {
  id: string
  url: string
  method: string
  headers: Record<string, string>
  body: TPayload
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

export type WebhookRegistryConfig = {
  /** Default timeout in ms for waitFor calls (default: 30000) */
  defaultTimeout?: number
  /** Default polling interval in ms (default: 1000) */
  defaultInterval?: number
}

export const WEBHOOK_DEFAULTS = {
  timeout: 30_000,
  interval: 1_000
} as const

// ─── Errors ───────────────────────────────────────────────────────────────────

export class WebhookTimeoutError extends Error {
  readonly name = 'WebhookTimeoutError'

  constructor(
    public readonly templateName: string,
    public readonly timeoutMs: number,
    public readonly receivedWebhooks: ReceivedWebhook[]
  ) {
    const received = receivedWebhooks.length
    super(
      `Webhook "${templateName}" not received within ${timeoutMs}ms. ` +
        `${received} webhook(s) were received but none matched.`
    )
  }
}
