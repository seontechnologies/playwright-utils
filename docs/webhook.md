---
title: Webhook Testing
description: Poll, match, and assert on webhooks received by a mock server during Playwright tests
---

## Webhook Testing

Webhooks are outbound HTTP callbacks your application fires when events happen (`movie.created`, `payment.succeeded`). Instead of consumers polling for changes, your system pushes event data to subscribed endpoints as soon as the event occurs.

This module is a provider-agnostic layer for waiting on those webhooks during E2E tests. Three built-in providers ship out of the box — WireMock, MockServer, and Mockoon — and you can plug in any backend by implementing the `WebhookProvider` interface.

## Why Webhook Tests Are Hard

Webhook delivery is eventually consistent — you can't assert immediately. Worse:

- Parallel workers share the same mock server journal, so one worker's teardown can wipe records another test is still polling
- Timeout failures tell you nothing without knowing what actually arrived
- Cleanup is easy to get wrong, leaving leaked test data and flaky suites

This module gives you deterministic polling, typed matchers, rich timeout errors, and cleanup strategies that are safe under `fullyParallel: true`.

## Setup

### As a Playwright Fixture (recommended)

Wire the provider once in your central fixtures file. Tests that use `webhookRegistry` get setup and cleanup automatically; tests that don't pay nothing.

```typescript
import { test as base, mergeTests } from '@playwright/test'
import { test as webhookFixture } from '../../src/webhook/fixtures'
import { WireMockWebhookProvider } from '../../src/webhook'
import { API_URL } from '../config/local.config'

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
  // ...your other fixtures...
  webhookFixture,
  webhookProviderFixture
)

// matched-only: each test only deletes the webhooks it matched.
// full-reset races under fullyParallel: true — one worker's teardown can wipe
// the journal while another test is still mid-poll.
test.use({ webhookConfig: { cleanupStrategy: 'matched-only' } })

export { test }
```

The fixture calls `provider.setup()` before the test and `registry.cleanup()` + `provider.teardown()` after — no manual cleanup.

For a complete test using this setup, see the [Full E2E Example](#full-e2e-example).

**With MockServer** — swap the provider class, everything else is identical:

```typescript
import { test as base, mergeTests } from '@playwright/test'
import { test as webhookFixture } from '../../src/webhook/fixtures'
import { MockServerWebhookProvider } from '@seontechnologies/playwright-utils/webhook'
import { API_URL } from '../config/local.config'

const webhookProviderFixture = base.extend<{
  webhookProvider: MockServerWebhookProvider
}>({
  webhookProvider: async ({ request }, use) => {
    await use(new MockServerWebhookProvider(API_URL, request))
  }
})

const test = mergeTests(
  base,
  /* ...your other fixtures... */ webhookFixture,
  webhookProviderFixture
)

// MockServer has no delete-by-ID on log entries — use full-reset for explicit cleanup
test.use({ webhookConfig: { cleanupStrategy: 'full-reset' } })

export { test }
```

**With Mockoon** — same pattern, admin API enabled by default in `@mockoon/cli`:

```typescript
import { test as base, mergeTests } from '@playwright/test'
import { test as webhookFixture } from '../../src/webhook/fixtures'
import { MockoonWebhookProvider } from '@seontechnologies/playwright-utils/webhook'
import { API_URL } from '../config/local.config'

const webhookProviderFixture = base.extend<{
  webhookProvider: MockoonWebhookProvider
}>({
  webhookProvider: async ({ request }, use) => {
    await use(new MockoonWebhookProvider(API_URL, request))
  }
})

const test = mergeTests(
  base,
  /* ...your other fixtures... */ webhookFixture,
  webhookProviderFixture
)

// Mockoon has no delete-by-ID on log entries — use full-reset for explicit cleanup
test.use({ webhookConfig: { cleanupStrategy: 'full-reset' } })

export { test }
```

### With a Custom Provider (not WireMock)

If your mock server isn't WireMock-compatible, implement the `WebhookProvider` interface against whatever API it exposes. The registry only cares about the contract — not the backend.

```typescript
// support/providers/custom-webhook-provider.ts
import type {
  WebhookProvider,
  ReceivedWebhook,
  WebhookQueryFilter
} from '@seontechnologies/playwright-utils/webhook'
import type { APIRequestContext } from '@playwright/test'

export class CustomWebhookProvider implements WebhookProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly request: APIRequestContext
  ) {}

  async getReceivedWebhooks(
    filter?: WebhookQueryFilter
  ): Promise<ReceivedWebhook[]> {
    const params = new URLSearchParams()
    if (filter?.since) params.set('since', filter.since.toISOString())
    if (filter?.method) params.set('method', filter.method)

    const response = await this.request.get(
      `${this.baseUrl}/webhooks/received?${params}`
    )
    const { webhooks } = await response.json()
    return webhooks.map((w: Record<string, unknown>) => ({
      id: w.id,
      url: w.url,
      method: w.method,
      headers: w.headers,
      body: w.body,
      receivedAt: new Date(w.receivedAt as string)
    }))
  }

  async resetJournal(): Promise<void> {
    await this.request.delete(`${this.baseUrl}/webhooks/received`)
  }

  async deleteById(id: string): Promise<void> {
    await this.request.delete(`${this.baseUrl}/webhooks/received/${id}`)
  }

  async getCount(): Promise<number> {
    const response = await this.request.get(`${this.baseUrl}/webhooks/count`)
    const { count } = await response.json()
    return count as number
  }
}
```

Wire it up identically to the WireMock setup — only the provider class changes:

```typescript
// support/merged-fixtures.ts
import { test as base, mergeTests } from '@playwright/test'
import { test as webhookFixture } from '../../src/webhook/fixtures'
import { CustomWebhookProvider } from './providers/custom-webhook-provider'
import { API_URL } from '../config/local.config'

const webhookProviderFixture = base.extend<{
  webhookProvider: CustomWebhookProvider
}>({
  webhookProvider: async ({ request }, use) => {
    const provider = new CustomWebhookProvider(API_URL, request)
    await use(provider)
  }
})

const test = mergeTests(base, webhookFixture, webhookProviderFixture)

test.use({ webhookConfig: { cleanupStrategy: 'matched-only' } })

export { test }
```

The rest of your tests — `waitFor`, `waitForCount`, `getReceived`, templates, matchers — are identical regardless of provider.

### Direct Instantiation

> **Note (theoretical):** Valid in non-Playwright contexts (global setup helpers, Node scripts). In test files, use the fixture — it handles lifecycle automatically.

```typescript
import {
  WireMockWebhookProvider,
  WebhookRegistry
} from '@seontechnologies/playwright-utils/webhook'

const provider = new WireMockWebhookProvider('http://localhost:8080', request)
const registry = new WebhookRegistry(provider, { defaultTimeout: 15_000 })

const webhook = await registry.waitFor(template)
```

## Building Templates

Templates describe which webhook you're waiting for. Define them as factory functions so each test gets a fresh instance scoped to its own IDs — this is what prevents cross-contamination between parallel workers.

```typescript
const movieCreated = (movieId: number) =>
  webhookTemplate<{ event: string; data: { id: number } }>('movie.created')
    .matchField('event', 'movie.created')
    .matchField('data.id', movieId)
    .withTimeout(10_000)
    .withInterval(500)
    .build()

const movieDeleted = (movieId: number) =>
  webhookTemplate<{ event: string; data: { id: number } }>('movie.deleted')
    .matchField('event', 'movie.deleted')
    .matchField('data.id', movieId)
    .withTimeout(10_000)
    .withInterval(500)
    .build()
```

> **Note (illustrative):** All available builder methods — these are not derived from the sample suite. See the E2E suite for working examples of `matchPartial` and `matchPredicate`.

```typescript
import { webhookTemplate } from '@seontechnologies/playwright-utils/webhook'

// Exact field match (dot-path traversal into nested objects)
const orderCompleted = webhookTemplate<OrderPayload>('order.completed')
  .matchField('event', 'order.completed')
  .matchField('data.orderId', orderId)
  .build()

// Deep subset check — extra fields in the payload are ignored
const paymentConfirmed = webhookTemplate('payment.confirmed')
  .matchPartial({ data: { status: 'CONFIRMED', currency: 'EUR' } })
  .build()

// Custom predicate for anything the other matchers can't express
const highValue = webhookTemplate<OrderPayload>('high-value-order')
  .matchField('event', 'order.completed')
  .matchPredicate('amount > 1000', (p) => p.data.amount > 1000)
  .build()

// Per-template timeout and polling interval overrides
const slowWebhook = webhookTemplate('slow-provider')
  .matchField('event', 'batch.finished')
  .withTimeout(60_000)
  .withInterval(2_000)
  .build()
```

All matcher types can be combined — a webhook must pass **every** matcher to match.

### Cloning Templates

> **Note (theoretical):** `clone()` is available on the builder. Not used in the E2E suite. Use it when multiple tests share the same base template with slight field variations.

```typescript
const base = webhookTemplate<OrderPayload>('order').matchField(
  'event',
  'order.completed'
)

const forOrderA = base.clone().matchField('data.orderId', 'A').build()
const forOrderB = base.clone().matchField('data.orderId', 'B').build()
```

## Waiting for Webhooks

### Single Webhook

```typescript
const webhook = await webhookRegistry.waitFor(movieCreated(movieId))

// webhook is typed as ReceivedWebhook<{ event: string; data: { id: number } }>
expect(webhook.body).toMatchObject({
  event: 'movie.created',
  timestamp: expect.any(String),
  data: {
    id: movieId,
    name: movie.name,
    year: movie.year,
    rating: movie.rating
  }
})
```

### Multiple Webhooks

```typescript
// Template filters by ID — prevents cross-contamination in parallel workers
const webhooks = await webhookRegistry.waitForCount(batchTemplate, 2)

expect(webhooks).toHaveLength(2)
const receivedIds = webhooks.map((w) => w.body.data.id)
expect(receivedIds).toContain(id1)
expect(receivedIds).toContain(id2)
```

### Query Without Waiting

```typescript
const all = await webhookRegistry.getReceived()
expect(all.length).toBeGreaterThanOrEqual(1)

const match = all.find(
  (w) => (w.body as { event: string; data: { id: number } }).data.id === movieId
)
expect(match).toBeDefined()

// Method filter — all sample-app webhooks are delivered via POST
const postOnly = await webhookRegistry.getReceived({ method: 'POST' })
expect(postOnly.length).toBeGreaterThanOrEqual(1)
expect(postOnly.every((w) => w.method === 'POST')).toBe(true)
```

## Cleanup Strategies

| Strategy                 | Behaviour                                                 | When to use                                                |
| ------------------------ | --------------------------------------------------------- | ---------------------------------------------------------- |
| `'full-reset'` (default) | Deletes the entire journal after each test                | Single-worker or isolated mock servers                     |
| `'matched-only'`         | Deletes only webhooks matched by `waitFor`/`waitForCount` | Multi-worker (`fullyParallel: true`) with a shared journal |

Configure via `test.use()` in your fixtures file (project-wide) or per describe block:

```typescript
const test = base.extend({
  webhookConfig: [{ cleanupStrategy: 'matched-only' }, { option: true }]
})
```

## Timeout Errors

When a webhook isn't received in time, `WebhookTimeoutError` gives you everything you need to debug:

```text
WebhookTimeoutError: Webhook "order.completed" not received within 10000ms.
  3 webhook(s) were received but none matched.
  Matchers: field(event="order.completed"), field(data.orderId="abc-123").
```

Error properties:

- `templateName` — which template timed out
- `timeoutMs` — the configured timeout
- `totalReceived` — how many webhooks arrived (but didn't match)
- `receivedWebhooks` — last 10 payloads for inspection
- `matcherDetails` — human-readable summary of each matcher
- `toJSON()` — serializes all fields for CI log output

The E2E test suite validates this error shape in CI.

## Matchers In Depth

### Field Matcher

```typescript
const movieCreated = (movieId: number) =>
  webhookTemplate<{ event: string; data: { id: number } }>('movie.created')
    .matchField('event', 'movie.created') // exact string match
    .matchField('data.id', movieId) // dot-path into nested object
    .withTimeout(10_000)
    .withInterval(500)
    .build()
```

> **Note (illustrative):** Dot-path supports deep nesting and array index access:

```typescript
.matchField('data.order.id', 'ord-123')
.matchField('data.items.0.sku', 'WIDGET-A')
```

Returns `false` if any path segment is missing — never throws.

### Partial Matcher

Recursive deep subset check: every key in `expected` must exist with a matching value in the payload. Extra keys in the payload are ignored.

```typescript
const partialTemplate = webhookTemplate<{
  event: string
  data: { id: number; name: string }
}>('movie.created.partial')
  .matchPartial({ event: 'movie.created', data: { id: movieId } })
  .withTimeout(10_000)
  .withInterval(500)
  .build()
```

Arrays use **strict length matching** — `[1, 2, 3]` does not match `[1, 2]`.

### Predicate Matcher

Arbitrary function for anything the other matchers can't express. Always provide a description — it shows up in `WebhookTimeoutError.matcherDetails` when the timeout fires.

```typescript
// Template filters by ID so parallel workers don't cross-contaminate
const batchTemplate = webhookTemplate<{
  event: string
  data: { id: number }
}>('movie.created.batch')
  .matchField('event', 'movie.created')
  .matchPredicate(
    `data.id is ${id1} or ${id2}`,
    (p) => p.data.id === id1 || p.data.id === id2
  )
  .withTimeout(15_000)
  .withInterval(500)
  .build()
```

## WireMock Provider

The built-in `WireMockWebhookProvider` works with any server that exposes WireMock's `/__admin/requests` API:

| Method                       | WireMock endpoint               | Description                                                                |
| ---------------------------- | ------------------------------- | -------------------------------------------------------------------------- |
| `getReceivedWebhooks()`      | `GET /__admin/requests`         | Query received webhooks — supports `since`, `method`, `urlPattern` filters |
| `resetJournal()`             | `DELETE /__admin/requests`      | Clear all stored requests                                                  |
| `deleteById(id)`             | `DELETE /__admin/requests/{id}` | Remove a single request                                                    |
| `getCount(criteria)`         | `POST /__admin/requests/count`  | Count matching requests                                                    |
| `removeByCriteria(criteria)` | `POST /__admin/requests/remove` | Remove requests matching criteria                                          |

### MockServer Provider

`MockServerWebhookProvider` works with any server exposing MockServer's `/mockserver` admin API (common in Java/Spring stacks).

```typescript
// support/merged-fixtures.ts
import { test as base, mergeTests } from '@playwright/test'
import { test as webhookFixture } from '../../src/webhook/fixtures'
import { MockServerWebhookProvider } from '@seontechnologies/playwright-utils/webhook'
import { API_URL } from '../config/local.config'

const webhookProviderFixture = base.extend<{
  webhookProvider: MockServerWebhookProvider
}>({
  webhookProvider: async ({ request }, use) => {
    const provider = new MockServerWebhookProvider(API_URL, request)
    await use(provider)
  }
})

const test = mergeTests(base, webhookFixture, webhookProviderFixture)

// Use full-reset with MockServer — matched-only cleanup is a no-op
// (MockServer has no delete-by-ID on log entries; since-filter handles isolation)
test.use({ webhookConfig: { cleanupStrategy: 'full-reset' } })

export { test }
```

| Method                  | MockServer endpoint                               | Description                                                                                      |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `getReceivedWebhooks()` | `PUT /mockserver/retrieve?type=REQUEST_RESPONSES` | Fetch all logged request/response pairs; `since`/`method`/`urlPattern` filtered client-side      |
| `resetJournal()`        | `PUT /mockserver/clear?type=log`                  | Clear the request log, preserves stubs                                                           |
| `deleteById(id)`        | —                                                 | **No-op** — MockServer has no delete-by-ID on log entries; isolation relies on `since` filtering |
| `getCount()`            | —                                                 | Client-side count of `getReceivedWebhooks()` result                                              |

> **Note:** `matched-only` cleanup silently skips deletion. Tests remain isolated via the registry's `since` filter, but the log grows until reset. Use `full-reset` for explicit cleanup.

### Mockoon Provider

`MockoonWebhookProvider` works with any server running `@mockoon/cli` or the Mockoon desktop app. The admin API is enabled by default — no extra flags needed.

```typescript
// support/merged-fixtures.ts
import { test as base, mergeTests } from '@playwright/test'
import { test as webhookFixture } from '../../src/webhook/fixtures'
import { MockoonWebhookProvider } from '@seontechnologies/playwright-utils/webhook'
import { API_URL } from '../config/local.config'

const webhookProviderFixture = base.extend<{
  webhookProvider: MockoonWebhookProvider
}>({
  webhookProvider: async ({ request }, use) => {
    const provider = new MockoonWebhookProvider(API_URL, request)
    await use(provider)
  }
})

const test = mergeTests(base, webhookFixture, webhookProviderFixture)

// Use full-reset with Mockoon — matched-only cleanup is a no-op
// (Mockoon has no delete-by-ID on log entries; since-filter handles isolation)
test.use({ webhookConfig: { cleanupStrategy: 'full-reset' } })

export { test }
```

| Method                  | Mockoon endpoint                 | Description                                                                                   |
| ----------------------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| `getReceivedWebhooks()` | `GET /mockoon-admin/logs`        | Fetch in-memory transaction log; `since`/`method`/`urlPattern` filtered client-side           |
| `resetJournal()`        | `POST /mockoon-admin/logs/purge` | Clear all in-memory transaction logs                                                          |
| `deleteById(id)`        | —                                | **No-op** — Mockoon has no delete-by-ID on log entries; isolation relies on `since` filtering |
| `getCount()`            | —                                | Client-side count of `getReceivedWebhooks()` result                                           |

> **Note:** Mockoon caps the in-memory log at 100 entries by default. Raise it with `--max-transaction-logs <n>` if your tests generate more webhook traffic than that.

### Custom Provider

> **Note (theoretical):** How to implement a custom provider against the `WebhookProvider` interface. The E2E suite uses the built-in `WireMockWebhookProvider`.

```typescript
import type {
  WebhookProvider,
  ReceivedWebhook
} from '@seontechnologies/playwright-utils/webhook'

class MyCustomProvider implements WebhookProvider {
  async getReceivedWebhooks(filter?) {
    /* ... */
  }
  async resetJournal() {
    /* ... */
  }
  async deleteById(id) {
    /* ... */
  }
  async getCount(criteria?) {
    /* ... */
  }

  // Optional lifecycle hooks
  async setup() {
    /* health check, register stubs */
  }
  async teardown() {
    /* release connections */
  }
}
```

### Community Providers

#### Simplehook — real webhook delivery

[`@simplehook/playwright`](https://www.npmjs.com/package/@simplehook/playwright) lets you test against real webhook events from Stripe, GitHub, Twilio, and any provider instead of mocking them. Events are delivered through [Simplehook](https://simplehook.dev) (a stable webhook URL service) and pulled into the provider's in-memory journal via the Pull API.

Each provider instance generates a unique listener ID, so parallel test workers never collide.

```bash
npm install @simplehook/playwright
```

```typescript
import { test } from '@seontechnologies/playwright-utils/webhook/fixtures'
import { SimplehookWebhookProvider } from '@simplehook/playwright'

// Reads SIMPLEHOOK_KEY from the environment by default
const webhookTest = test.extend({
  webhookProvider: async ({}, use) => {
    await use(new SimplehookWebhookProvider())
  }
})

webhookTest.use({ webhookConfig: { cleanupStrategy: 'matched-only' } })

webhookTest('processes real Stripe charge', async ({ webhookRegistry }) => {
  const webhook = await webhookRegistry.waitFor(
    webhookTemplate('stripe-charge')
      .matchField('type', 'charge.succeeded')
      .build()
  )

  expect(webhook.body.data.object.amount).toBe(500)
})
```

> This provider and its integration were built with [Claude Code](https://claude.ai/code). Source and tests: [github.com/bnbarak/antiwebhook/tree/main/javascript/sdk/playwright](https://github.com/bnbarak/antiwebhook/tree/main/javascript/sdk/playwright).

## Full E2E Example

```typescript
// Template factory — reusable across tests, scoped to a specific movieId
const movieCreated = (movieId: number) =>
  webhookTemplate<{ event: string; data: { id: number } }>('movie.created')
    .matchField('event', 'movie.created')
    .matchField('data.id', movieId)
    .withTimeout(10_000)
    .withInterval(500)
    .build()

test('movie creation triggers a webhook with correct payload', async ({
  authToken,
  addMovie,
  deleteMovie,
  webhookRegistry
}) => {
  const movie = generateMovieWithoutId()

  const { body: createResponse } = await addMovie(authToken, movie)

  const movieId = createResponse.data.id

  const webhook = await webhookRegistry.waitFor(movieCreated(movieId))

  expect(webhook.body).toMatchObject({
    event: 'movie.created',
    timestamp: expect.any(String),
    data: {
      id: movieId,
      name: movie.name,
      year: movie.year,
      rating: movie.rating
    }
  })

  await deleteMovie(authToken, movieId)
})
```

## API Reference

### WebhookTemplate

| Property   | Type               | Description                                     |
| ---------- | ------------------ | ----------------------------------------------- |
| `name`     | `string`           | Human-readable name for logs and error messages |
| `matchers` | `PayloadMatcher[]` | All matchers must pass for a webhook to match   |
| `timeout`  | `number?`          | Override default timeout (ms)                   |
| `interval` | `number?`          | Override default polling interval (ms)          |

### WebhookRegistryConfig

| Property          | Type              | Default        | Description                         |
| ----------------- | ----------------- | -------------- | ----------------------------------- |
| `defaultTimeout`  | `number`          | `30000`        | Default timeout for `waitFor` calls |
| `defaultInterval` | `number`          | `1000`         | Default polling interval            |
| `cleanupStrategy` | `CleanupStrategy` | `'full-reset'` | `'full-reset'` or `'matched-only'`  |

### ReceivedWebhook

| Property     | Type                     | Description                                          |
| ------------ | ------------------------ | ---------------------------------------------------- |
| `id`         | `string`                 | Unique ID from the mock server                       |
| `url`        | `string`                 | Request URL                                          |
| `method`     | `string`                 | HTTP method                                          |
| `headers`    | `Record<string, string>` | Request headers                                      |
| `body`       | `TPayload`               | Parsed JSON body (raw string if JSON parsing failed) |
| `rawBody`    | `string?`                | Original body string                                 |
| `parseError` | `boolean?`               | `true` if JSON parsing failed                        |
| `receivedAt` | `Date`                   | Timestamp when the webhook was received              |
