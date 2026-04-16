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

<!-- webhook-fixture.ts:33-66 -->

```typescript
import { test as base, mergeTests } from '@playwright/test'
import { test as webhookFixture } from '@seontechnologies/playwright-utils/webhook/fixtures'
import { WireMockWebhookProvider } from '@seontechnologies/playwright-utils/webhook'

// Provide the WireMock provider via the fixture option pattern
const providerFixture = base.extend({
  webhookProvider: async ({ request }, use) => {
    await use(new WireMockWebhookProvider('http://localhost:8080', request))
  }
})

const test = mergeTests(base, webhookFixture, providerFixture)

test('webhook arrives after order creation', async ({ webhookRegistry }) => {
  // ... trigger the action that sends the webhook ...

  const webhook = await webhookRegistry.waitFor(orderCreatedTemplate)
  expect(webhook.body).toMatchObject({ event: 'order.created' })
})
```

The fixture calls `provider.setup()` before the test and `registry.cleanup()` + `provider.teardown()` after it — you don't need manual cleanup.

### 2. As a Plain Class

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

Templates describe which webhook you're waiting for. Use the fluent builder:

<!-- webhook-template.ts:15-84 -->

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

Use `clone()` to create variations without mutating the original:

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

<!-- webhook-registry.ts:46-89 -->

```typescript
const webhook = await webhookRegistry.waitFor(orderCompleted)

// webhook is typed as ReceivedWebhook<OrderPayload>
expect(webhook.body.data.orderId).toBe(orderId)
expect(webhook.headers['content-type']).toContain('application/json')
```

### Wait for Multiple Webhooks

<!-- webhook-registry.ts:96-142 -->

```typescript
// Wait until 3 webhooks matching the template arrive
const webhooks = await webhookRegistry.waitForCount(batchItemTemplate, 3)

expect(webhooks).toHaveLength(3)
webhooks.forEach((w) => {
  expect(w.body.event).toBe('batch.item.processed')
})
```

### Query Without Waiting

```typescript
const all = await webhookRegistry.getReceived()
const postOnly = await webhookRegistry.getReceived({ method: 'POST' })
```

## Cleanup Strategies

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

When a webhook isn't received in time, `WebhookTimeoutError` gives you everything you need to debug:

<!-- types.ts:104-151 -->

```
WebhookTimeoutError: Webhook "order.completed" not received within 10000ms.
  3 webhook(s) were received but none matched.
  Matchers: field(event=order.completed), field(data.orderId="abc-123").
```

The error includes:

- `templateName` — which template timed out
- `timeoutMs` — the timeout value
- `totalReceived` — how many webhooks arrived (but didn't match)
- `receivedWebhooks` — the last 10 payloads for inspection
- `matcherDetails` — human-readable summary of each matcher

## Matchers in Depth

### Field Matcher

Traverses the payload by dot-separated path. Supports nested objects and array indices:

<!-- matchers.ts:27-43 -->

```typescript
// Nested path
.matchField('data.order.id', 'ord-123')

// Array index
.matchField('data.items.0.sku', 'WIDGET-A')
```

Returns `false` if any segment in the path is missing — never throws.

### Partial Matcher

Recursive deep subset check. Every key in `expected` must exist with an equal value in the payload. Extra keys in the payload are ignored:

<!-- matchers.ts:57-85 -->

```typescript
.matchPartial({
  data: {
    status: 'SUCCESS',
    order: { name: 'premium-plan' }
  }
})
```

Arrays are compared element-by-element with **strict length matching** — `[1, 2, 3]` does not match `[1, 2]`.

### Predicate Matcher

Arbitrary function for anything the other matchers can't express. Always provide a `description` — it appears in timeout errors:

```typescript
.matchPredicate(
  'amount between 100 and 500',
  (p) => p.data.amount >= 100 && p.data.amount <= 500
)
```

## WireMock Provider

The built-in `WireMockWebhookProvider` works with any server that implements WireMock's `/__admin/requests` API:

<!-- wiremock-provider.ts:57-159 -->

| Method                       | WireMock endpoint               | Description                                                                       |
| ---------------------------- | ------------------------------- | --------------------------------------------------------------------------------- |
| `getReceivedWebhooks()`      | `GET /__admin/requests`         | Query received webhooks with optional `since`, `method`, and `urlPattern` filters |
| `resetJournal()`             | `DELETE /__admin/requests`      | Clear all stored requests                                                         |
| `deleteById(id)`             | `DELETE /__admin/requests/{id}` | Remove a single request                                                           |
| `getCount(criteria)`         | `POST /__admin/requests/count`  | Count matching requests                                                           |
| `removeByCriteria(criteria)` | `POST /__admin/requests/remove` | Remove requests matching criteria                                                 |

### Custom Provider

Implement `WebhookProvider` for any mock server:

<!-- types.ts:14-34 -->

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

This example from the sample app shows the complete flow — create a resource, wait for its webhook, assert on the payload, clean up:

<!-- webhook-e2e.spec.ts:47-106 -->

```typescript
import { webhookTemplate } from '@seontechnologies/playwright-utils/webhook'

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

  // Create a movie via API
  const { body: created } = await apiRequest<{
    data: { id: number; name: string }
  }>({
    method: 'POST',
    path: '/movies',
    baseUrl: API_URL,
    body: movie,
    headers: { Cookie: `app-jwt=${token}` }
  })

  // Wait for the webhook — polls until the template matches
  const webhook = await webhookRegistry.waitFor(movieCreated(created.data.id))

  // Assert on the full payload
  expect(webhook.body).toMatchObject({
    event: 'movie.created',
    timestamp: expect.any(String),
    data: {
      id: created.data.id,
      name: movie.name,
      year: movie.year,
      rating: movie.rating
    }
  })

  // Cleanup: delete the movie
  await apiRequest({
    method: 'DELETE',
    path: `/movies/${created.data.id}`,
    baseUrl: API_URL,
    headers: { Cookie: `app-jwt=${token}` }
  })
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
