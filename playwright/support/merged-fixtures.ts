import { test as base, mergeTests } from '@playwright/test'
import { test as apiRequest } from '../../src/api-request/fixtures'
import { test as validateSchema } from '../../src/api-request/schema-validation/fixture'
import { test as fileUtils } from '../../src/file-utils/file-utils-fixture'
import { test as interceptNetworkCall } from '../../src/intercept-network-call/fixtures'
import { captureTestContext } from '../../src/log'
import { test as networkRecorder } from '../../src/network-recorder/fixtures'
import { test as authFixture } from './auth/auth-fixture'
import { test as crudHelper } from './fixtures/crud-helper-fixture'
import { test as networkErrorMonitorFixture } from '../../src/network-error-monitor/fixtures'
import { test as webhookFixture } from '../../src/webhook/fixtures'
import { WireMockWebhookProvider } from '../../src/webhook'
import { API_URL } from '../config/local.config'

// a hook that will run before each test in the suite
base.beforeEach(async ({}, testInfo) => {
  captureTestContext(testInfo)
})

// Wire up the WireMock-compatible webhook provider for all tests that use webhookRegistry.
// Lazy-initialized by Playwright — no cost for tests that don't request webhookRegistry.
const webhookProviderFixture = base.extend<{
  webhookProvider: WireMockWebhookProvider
}>({
  webhookProvider: async ({ request }, use) => {
    const provider = new WireMockWebhookProvider(API_URL, request)
    await use(provider)
  }
})

const test = mergeTests(
  base,
  authFixture,
  interceptNetworkCall,
  apiRequest,
  validateSchema,
  crudHelper,
  fileUtils,
  networkRecorder,
  networkErrorMonitorFixture,
  webhookFixture,
  webhookProviderFixture
)

// Use matched-only cleanup project-wide: each test only deletes the webhooks it
// matched, so a parallel worker's teardown cannot wipe the shared journal while
// another test is still mid-flight (fullyParallel: true race condition).
test.use({ webhookConfig: { cleanupStrategy: 'matched-only' } })

const expect = base.expect
export { expect, test }
