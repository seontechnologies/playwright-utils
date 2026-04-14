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
import type { WebhookProvider, WebhookRegistryConfig } from './core/types'

export type WebhookFixtureOptions = {
  webhookProvider: WebhookProvider
  webhookConfig: WebhookRegistryConfig
}

export type WebhookFixtures = {
  webhookRegistry: WebhookRegistry
}

export const test = base.extend<WebhookFixtures & WebhookFixtureOptions>({
  webhookProvider: [undefined as unknown as WebhookProvider, { option: true }],
  webhookConfig: [{}, { option: true }],

  webhookRegistry: async ({ webhookProvider, webhookConfig }, use) => {
    if (!webhookProvider) {
      throw new Error(
        'webhookProvider fixture option is required. ' +
          'Provide a WebhookProvider implementation via test.extend().'
      )
    }

    const registry = new WebhookRegistry(webhookProvider, webhookConfig)
    await use(registry)
    await registry.cleanup()
  }
})
