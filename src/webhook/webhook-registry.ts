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
  PayloadMatcher
} from './core/types'
import { WEBHOOK_DEFAULTS, WebhookTimeoutError } from './core/types'
import { matchesTemplate } from './core/matchers'
import { recurse, RecurseTimeoutError } from '../recurse'

export class WebhookRegistry {
  private readonly defaultTimeout: number
  private readonly defaultInterval: number
  private readonly matchedIds: Set<string> = new Set()

  constructor(
    private readonly provider: WebhookProvider,
    config?: WebhookRegistryConfig
  ) {
    this.defaultTimeout = config?.defaultTimeout ?? WEBHOOK_DEFAULTS.timeout
    this.defaultInterval = config?.defaultInterval ?? WEBHOOK_DEFAULTS.interval
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
        () => this.provider.getReceivedWebhooks(),
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

  /** Query all received webhooks (passthrough to provider) */
  async getReceived(filter?: WebhookQueryFilter): Promise<ReceivedWebhook[]> {
    return this.provider.getReceivedWebhooks(filter)
  }

  /** Delete only the webhooks matched by this registry instance */
  async cleanup(): Promise<void> {
    const deletions = [...this.matchedIds].map((id) =>
      this.provider.deleteById(id)
    )
    await Promise.all(deletions)
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
