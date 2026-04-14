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
  WebhookRegistryConfig
} from './core/types'
import { WEBHOOK_DEFAULTS, WebhookTimeoutError } from './core/types'
import { matchesTemplate } from './core/matchers'
import { recurse, RecurseTimeoutError } from '../recurse'

export class WebhookRegistry {
  private readonly defaultTimeout: number
  private readonly defaultInterval: number

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

    try {
      const webhooks = await recurse<ReceivedWebhook[]>(
        () => this.provider.getReceivedWebhooks(),
        (received) =>
          received.some((w) => matchesTemplate(w.body as T, template.matchers)),
        {
          timeout,
          interval,
          error: `Webhook "${template.name}" not received within ${timeout}ms`
        }
      )

      const match = webhooks.find((w) =>
        matchesTemplate(w.body as T, template.matchers)
      )

      return match as ReceivedWebhook<T>
    } catch (error) {
      if (error instanceof RecurseTimeoutError) {
        const allWebhooks = await this.provider.getReceivedWebhooks()
        throw new WebhookTimeoutError(template.name, timeout, allWebhooks)
      }
      throw error
    }
  }

  /** Query all received webhooks (passthrough to provider) */
  async getReceived(filter?: WebhookQueryFilter): Promise<ReceivedWebhook[]> {
    return this.provider.getReceivedWebhooks(filter)
  }

  /** Reset the provider's request journal */
  async cleanup(): Promise<void> {
    await this.provider.resetJournal()
  }
}
