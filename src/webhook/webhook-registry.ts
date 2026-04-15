/**
 * WebhookRegistry — thin wrapper around a WebhookProvider that adds
 * template matching and polling via the lib's `recurse` utility.
 *
 * @example
 * const registry = new WebhookRegistry(provider)
 * const webhook = await registry.waitFor(myTemplate)
 */

import type {
  WebhookProvider,
  WebhookTemplate,
  WebhookQueryFilter,
  ReceivedWebhook,
  WebhookRegistryConfig,
  CleanupStrategy,
  PayloadMatcher
} from './core/types'
import { WEBHOOK_DEFAULTS, WebhookTimeoutError } from './core/types'
import { matchesTemplate } from './core/matchers'
import { recurse, RecurseTimeoutError } from '../recurse'

export class WebhookRegistry {
  private readonly defaultTimeout: number
  private readonly defaultInterval: number
  private readonly cleanupStrategy: CleanupStrategy
  private readonly matchedIds: Set<string> = new Set()
  private readonly startedAt: Date

  constructor(
    private readonly provider: WebhookProvider,
    config?: WebhookRegistryConfig
  ) {
    this.defaultTimeout = config?.defaultTimeout ?? WEBHOOK_DEFAULTS.timeout
    this.defaultInterval = config?.defaultInterval ?? WEBHOOK_DEFAULTS.interval
    this.cleanupStrategy = config?.cleanupStrategy ?? 'full-reset'
    this.startedAt = new Date()
  }

  /**
   * Poll the provider until a webhook matching the template is found.
   * Uses the lib's `recurse` utility (Playwright's expect.poll under the hood).
   * Returns the first matching webhook.
   * Throws WebhookTimeoutError if not found within the timeout.
   */
  async waitFor<T = unknown>(
    template: WebhookTemplate<T>
  ): Promise<ReceivedWebhook<T>> {
    const timeout = template.timeout ?? this.defaultTimeout
    const interval = template.interval ?? this.defaultInterval

    let matched: ReceivedWebhook<T> | undefined
    let lastSnapshot: ReceivedWebhook[] = []

    try {
      await recurse<ReceivedWebhook[]>(
        () => this.provider.getReceivedWebhooks({ since: this.startedAt }),
        (received) => {
          lastSnapshot = received
          const found = received.find((w) =>
            matchesTemplate(w.body as T, template.matchers)
          )
          if (found) {
            matched = found as ReceivedWebhook<T>
            return true
          }
          return false
        },
        {
          timeout,
          interval,
          error: `Webhook "${template.name}" not received within ${timeout}ms`
        }
      )

      this.matchedIds.add(matched!.id)
      return matched!
    } catch (error) {
      if (error instanceof RecurseTimeoutError) {
        throw new WebhookTimeoutError(
          template.name,
          timeout,
          lastSnapshot,
          formatMatcherDetails(template.matchers)
        )
      }
      throw error
    }
  }

  /**
   * Poll the provider until `count` webhooks matching the template are found.
   * Returns all matching webhooks once the count is reached.
   * Throws WebhookTimeoutError if not enough matches within the timeout.
   */
  async waitForCount<T = unknown>(
    template: WebhookTemplate<T>,
    count: number
  ): Promise<ReceivedWebhook<T>[]> {
    const timeout = template.timeout ?? this.defaultTimeout
    const interval = template.interval ?? this.defaultInterval

    let allMatched: ReceivedWebhook<T>[] = []
    let lastSnapshot: ReceivedWebhook[] = []

    try {
      await recurse<ReceivedWebhook[]>(
        () => this.provider.getReceivedWebhooks({ since: this.startedAt }),
        (received) => {
          lastSnapshot = received
          const matches = received.filter((w) =>
            matchesTemplate(w.body as T, template.matchers)
          )
          if (matches.length >= count) {
            allMatched = matches.slice(0, count) as ReceivedWebhook<T>[]
            return true
          }
          return false
        },
        {
          timeout,
          interval,
          error: `${count} webhook(s) "${template.name}" not received within ${timeout}ms`
        }
      )

      for (const w of allMatched) {
        this.matchedIds.add(w.id)
      }
      return allMatched
    } catch (error) {
      if (error instanceof RecurseTimeoutError) {
        throw new WebhookTimeoutError(
          template.name,
          timeout,
          lastSnapshot,
          formatMatcherDetails(template.matchers)
        )
      }
      throw error
    }
  }

  /** Query all received webhooks (passthrough to provider) */
  async getReceived(filter?: WebhookQueryFilter): Promise<ReceivedWebhook[]> {
    return this.provider.getReceivedWebhooks(filter)
  }

  /** Reset the entire request journal on the provider */
  async resetJournal(): Promise<void> {
    await this.provider.resetJournal()
    this.matchedIds.clear()
  }

  /**
   * Clean up webhooks based on the configured strategy.
   * - 'full-reset': resets the entire journal (default)
   * - 'matched-only': deletes only webhooks matched by waitFor/waitForCount
   */
  async cleanup(): Promise<void> {
    if (this.cleanupStrategy === 'matched-only') {
      const deletions = [...this.matchedIds].map((id) =>
        this.provider.deleteById(id)
      )
      await Promise.all(deletions)
    } else {
      await this.provider.resetJournal()
    }
    this.matchedIds.clear()
  }
}

function formatMatcherDetails<T>(matchers: PayloadMatcher<T>[]): string[] {
  return matchers.map((m) => {
    switch (m.type) {
      case 'field':
        return `field(${m.path}=${JSON.stringify(m.value)})`
      case 'partial':
        return `partial(${JSON.stringify(m.expected)})`
      case 'predicate':
        return `predicate(${m.description})`
      default:
        return 'unknown'
    }
  })
}
