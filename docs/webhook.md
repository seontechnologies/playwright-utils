---
title: Webhook Testing
description: Poll, match, and assert on webhooks received by a mock server during Playwright tests
---

# Webhook Testing

The webhook module lets you wait for webhooks during E2E tests the same way you wait for API responses — with polling, template matching, and clear timeout errors.

It is provider-agnostic: a built-in WireMock provider is included, but you can plug in any mock server by implementing the `WebhookProvider` interface.

## Features

- Template-based matching with field paths, partial payloads, and custom predicates
- Fluent builder for composing templates
- Automatic polling via the library's [`recurse`](/recurse) utility
- Two cleanup strategies: reset the whole journal or delete only matched webhooks
- Rich timeout errors showing received payloads and which matchers failed
- Playwright fixture with setup/teardown lifecycle

## Usage

### 1. As a Playwright Fixture

<!-- webhook-e2e.spec.ts:8-35 -->

```typescript
import { test as base, mergeTests, expect } from '@playwright/test'
import { test as apiRequestFixture } from '../../../src/api-request/fixtures'
import { test as webhookFixture } from '../../../src/webhook/fixtures'
import {
  WireMockWebhookProvider,
  WebhookTimeoutError,
  webhookTemplate
} from '../../../src/webhook'

const API_URL = process.env.VITE_API_URL || 'http://localhost:3001'

// Wire up the webhook provider pointing to the sample-app's built-in receiver
const providerFixture = base.extend<{
  webhookProvider: WireMockWebhookProvider
}>({
  webhookProvider: async ({ request }, use) => {
    const provider = new WireMockWebhookProvider(API_URL, request)
    await use(provider)
  }
})

const test = mergeTests(
  base,
  apiRequestFixture,
  webhookFixture,
  providerFixture
)
```

The fixture calls `provider.setup()` before the test and `registry.cleanup()` + `provider.teardown()` after it — you don't need manual cleanup.

For a complete test using this setup, see the [Full E2E Example](#full-e2e-example).

### 2. As a Plain Class

> **Note (theoretical):** Direct instantiation is valid in non-Playwright contexts (global setup helpers, Node scripts). In test files, prefer the fixture pattern above — it handles setup, teardown, and cleanup automatically. The `WebhookRegistry` class is defined in `webhook-registry.ts:23`.

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

Templates describe which webhook you're waiting for. The template factories from the sample app E2E suite:

<!-- webhook-e2e.spec.ts:51-65 -->

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

> **Note (illustrative):** The following demonstrates all available builder methods (`webhook-template.ts:15-84`) using generic domain names. They are not derived from the E2E suite — see the factories above for working samples, and the E2E suite for `matchPartial` (`webhook-e2e.spec.ts:226-233`) and `matchPredicate` (`webhook-e2e.spec.ts:277-288`).

```typescript
import { webhookTemplate } from '@seontechnologies/playwright-utils/webhook'

// Match by exact field values (dot-path traversal)
const orderCompleted = webhookTemplate<OrderPayload>('order.completed')
  .matchField('event', 'order.completed')
  .matchField('data.orderId', orderId)
  .build()

// Match a partial payload structure (deep subset check)
const paymentConfirmed = webhookTemplate('payment.confirmed')
  .matchPartial({ data: { status: 'CONFIRMED', currency: 'EUR' } })
  .build()

// Match with a custom predicate
const highValue = webhookTemplate<OrderPayload>('high-value-order')
  .matchField('event', 'order.completed')
  .matchPredicate('amount > 1000', (p) => p.data.amount > 1000)
  .build()

// Override timeout and polling interval per template
const slowWebhook = webhookTemplate('slow-provider')
  .matchField('event', 'batch.finished')
  .withTimeout(60_000)
  .withInterval(2_000)
  .build()
```

All three matcher types can be combined — a webhook must pass **every** matcher to match.

### Cloning Templates

> **Note (theoretical):** `clone()` is defined in `webhook-template.ts:67-74`. No E2E test currently demonstrates this pattern. Use it when multiple tests need the same base template with slight field variations.

```typescript
const base = webhookTemplate<OrderPayload>('order').matchField(
  'event',
  'order.completed'
)

const forOrderA = base.clone().matchField('data.orderId', 'A').build()
const forOrderB = base.clone().matchField('data.orderId', 'B').build()
```

## Waiting for Webhooks

### Wait for a Single Webhook

<!-- webhook-e2e.spec.ts:88-99 -->

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

### Wait for Multiple Webhooks

<!-- webhook-e2e.spec.ts:291-296 -->

```typescript
// batchTemplate defined at webhook-e2e.spec.ts:277-288 — matches event type
// and filters by specific IDs to prevent cross-contamination in parallel workers
const webhooks = await webhookRegistry.waitForCount(batchTemplate, 2)

expect(webhooks).toHaveLength(2)
const receivedIds = webhooks.map((w) => w.body.data.id)
expect(receivedIds).toContain(id1)
expect(receivedIds).toContain(id2)
```

### Query Without Waiting

<!-- webhook-e2e.spec.ts:182-195 -->

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

> **Note (theoretical):** The default `'full-reset'` strategy is exercised by every test in the E2E suite (see `webhook-fixture.ts:33-66`). The `'matched-only'` configuration below is illustrative — no E2E test currently exercises it. Use it in multi-worker setups where multiple test workers share the same mock server journal.

Configure via `WebhookRegistryConfig.cleanupStrategy`:

| Strategy                 | Behaviour                                                       | When to use                                                   |
| ------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------- |
| `'full-reset'` (default) | Deletes the entire request journal after each test              | Single-worker configs or when you don't share the mock server |
| `'matched-only'`         | Deletes only the webhooks that `waitFor`/`waitForCount` matched | Multi-worker configs where other tests may share the journal  |

```typescript
const test = base.extend({
  webhookConfig: [{ cleanupStrategy: 'matched-only' }, { option: true }]
})
```

## Timeout Errors

<!-- types.ts:104-151 -->

When a webhook isn't received in time, `WebhookTimeoutError` gives you everything you need to debug:

```
WebhookTimeoutError: Webhook "order.completed" not received within 10000ms.
  3 webhook(s) were received but none matched.
  Matchers: field(event="order.completed"), field(data.orderId="abc-123").
```

The error includes:

- `templateName` — which template timed out
- `timeoutMs` — the timeout value
- `totalReceived` — how many webhooks arrived (but didn't match)
- `receivedWebhooks` — the last 10 payloads for inspection
- `matcherDetails` — human-readable summary of each matcher
- `toJSON()` — serializes all fields for CI log output

The E2E test at `webhook-e2e.spec.ts:315-340` validates this full error shape in CI.

## Matchers in Depth

### Field Matcher

<!-- webhook-e2e.spec.ts:51-57 -->

```typescript
const movieCreated = (movieId: number) =>
  webhookTemplate<{ event: string; data: { id: number } }>('movie.created')
    .matchField('event', 'movie.created') // exact string match
    .matchField('data.id', movieId) // dot-path into nested object
    .withTimeout(10_000)
    .withInterval(500)
    .build()
```

> **Note (illustrative):** The following demonstrates the full dot-path traversal capability of `getFieldValue` (`matchers.ts:27-43`):

```typescript
// Deeply nested path
.matchField('data.order.id', 'ord-123')

// Array index access
.matchField('data.items.0.sku', 'WIDGET-A')
```

Returns `false` if any segment in the path is missing — never throws.

### Partial Matcher

<!-- webhook-e2e.spec.ts:226-233 -->

```typescript
// matchPartial checks a subset — extra fields in the payload are ignored
const partialTemplate = webhookTemplate<{
  event: string
  data: { id: number; name: string }
}>('movie.created.partial')
  .matchPartial({ event: 'movie.created', data: { id: movieId } })
  .withTimeout(10_000)
  .withInterval(500)
  .build()
```

Recursive deep subset check (`matchers.ts:57-85`): every key in `expected` must exist with an equal value in the payload. Extra keys in the payload are ignored.

Arrays are compared element-by-element with **strict length matching** — `[1, 2, 3]` does not match `[1, 2]`.

### Predicate Matcher

<!-- webhook-e2e.spec.ts:277-288 -->

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

Arbitrary function for anything the other matchers can't express. Always provide a `description` — it appears in `WebhookTimeoutError.matcherDetails` when the timeout fires.

## WireMock Provider

<!-- wiremock-provider.ts:57-159 -->

The built-in `WireMockWebhookProvider` works with any server that implements WireMock's `/__admin/requests` API:

| Method                       | WireMock endpoint               | Description                                                                       |
| ---------------------------- | ------------------------------- | --------------------------------------------------------------------------------- |
| `getReceivedWebhooks()`      | `GET /__admin/requests`         | Query received webhooks with optional `since`, `method`, and `urlPattern` filters |
| `resetJournal()`             | `DELETE /__admin/requests`      | Clear all stored requests                                                         |
| `deleteById(id)`             | `DELETE /__admin/requests/{id}` | Remove a single request                                                           |
| `getCount(criteria)`         | `POST /__admin/requests/count`  | Count matching requests                                                           |
| `removeByCriteria(criteria)` | `POST /__admin/requests/remove` | Remove requests matching criteria                                                 |

### Custom Provider

<!-- types.ts:14-34 -->

> **Note (theoretical):** The following shows how to implement a custom provider against the `WebhookProvider` interface. The E2E suite uses the built-in `WireMockWebhookProvider` — this code is illustrative of how the abstraction works.

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

  // Optional hooks
  async setup() {
    /* health check, register stubs */
  }
  async teardown() {
    /* release connections */
  }
}
```

## Full E2E Example

<!-- webhook-e2e.spec.ts:51-108 -->

```typescript
// Template factory — reusable across tests
const movieCreated = (movieId: number) =>
  webhookTemplate<{ event: string; data: { id: number } }>('movie.created')
    .matchField('event', 'movie.created')
    .matchField('data.id', movieId)
    .withTimeout(10_000)
    .withInterval(500)
    .build()

test('movie creation triggers a webhook with correct payload', async ({
  apiRequest,
  webhookRegistry
}) => {
  const token = await getAdminAuthToken(apiRequest)
  const movie = generateMovieWithoutId()

  const { body: createResponse } = await apiRequest<{
    data: { id: number; name: string }
  }>({
    method: 'POST',
    path: '/movies',
    baseUrl: API_URL,
    body: movie,
    headers: { Cookie: `app-jwt=${token}` }
  })

  const movieId = createResponse.data.id

  try {
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
  } finally {
    await apiRequest({
      method: 'DELETE',
      path: `/movies/${movieId}`,
      baseUrl: API_URL,
      headers: { Cookie: `app-jwt=${token}` }
    })
  }
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

| Property     | Type                     | Description                                      |
| ------------ | ------------------------ | ------------------------------------------------ |
| `id`         | `string`                 | Unique ID from the mock server                   |
| `url`        | `string`                 | Request URL                                      |
| `method`     | `string`                 | HTTP method                                      |
| `headers`    | `Record<string, string>` | Request headers                                  |
| `body`       | `TPayload`               | Parsed JSON body (or raw string if parse failed) |
| `rawBody`    | `string?`                | Original body string                             |
| `parseError` | `boolean?`               | `true` if JSON parsing failed                    |
| `receivedAt` | `Date`                   | Timestamp when the webhook was received          |
