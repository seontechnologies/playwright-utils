/**
 * Playwright fixture for webhook testing.
 *
 * Service repos provide their WebhookProvider implementation
 * via the { option: true } fixture pattern:
 *
 * @example
 * // Using the built-in WireMock provider:
 * import { test as webhookFixture } from '@seontechnologies/playwright-utils/webhook/fixtures'
 * import { WireMockWebhookProvider } from '@seontechnologies/playwright-utils/webhook'
 *
 * const test = base.extend({
 *   webhookProvider: async ({ request }, use) => {
 *     await use(new WireMockWebhookProvider('http://localhost:8080', request))
 *   },
 * })
 */

import { test as base } from '@playwright/test'
import { WebhookRegistry } from './webhook-registry'
import { log } from '../log'
import type { WebhookProvider, WebhookRegistryConfig } from './core/types'

export type WebhookFixtureOptions = {
  webhookProvider: WebhookProvider | undefined
  webhookConfig: WebhookRegistryConfig
}

export type WebhookFixtures = {
  webhookRegistry: WebhookRegistry
}

export const test = base.extend<WebhookFixtures & WebhookFixtureOptions>({
  webhookProvider: [undefined, { option: true }],
  webhookConfig: [{}, { option: true }],

  webhookRegistry: async ({ webhookProvider, webhookConfig }, use) => {
    if (!webhookProvider) {
      throw new Error(
        'webhookProvider fixture option is required. ' +
          'Provide a WebhookProvider implementation via test.extend().'
      )
    }

    await webhookProvider.setup?.()

    const registry = new WebhookRegistry(webhookProvider, webhookConfig)
    await use(registry)

    try {
      await registry.cleanup()
    } catch (error) {
      log.warningSync(
        `Webhook registry cleanup failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    try {
      await webhookProvider.teardown?.()
    } catch (error) {
      log.warningSync(
        `Webhook provider teardown failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
})
