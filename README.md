# Playwright Utils

A collection of utilities for Playwright tests at SEON Technologies, designed to make testing more efficient and maintainable.

All utilities can be used as Playwright fixtures by importing the test object

- [Playwright Utils](#playwright-utils)
  - [Installation](#installation)
  - [Available Utilities](#available-utilities)
    - [API Request](#api-request)
    - [Recurse (Polling)](#recurse-polling)
    - [Logging](#logging)
    - [Network Interception](#network-interception)

## Installation

```bash
npm install @seon/playwright-utils
```

## Available Utilities

The library provides the following utilities, each with both direct function imports and Playwright fixtures:

### [API Request](./docs/api-request.md)

A typed, flexible HTTP client for making API requests in tests.

```typescript
// Direct import
import { apiRequest } from '@seon/playwright-utils'

test('example', async ({ request }) => {
  const { status, body } = await apiRequest({
    request, // need to pass in request context when using this way
    method: 'GET',
    path: '/api/users/123'
  })
})

// As a fixture
import { test } from '@seon/playwright-utils/fixtures'
// or use your own main fixture (with mergeTests) and import from there

test('example', async ({ apiRequest }) => {
  const { status, body } = await apiRequest({
    method: 'GET',
    path: '/api/users/123'
  })
})
```

[→ API Request Documentation](./docs/api-request.md)

### [Recurse (Polling)](./docs/recurse.md)

A powerful polling utility for waiting on asynchronous conditions.

```typescript
// note that there is no need to pass in request or page context from Playwright

// Direct import
import { recurse } from '@seon/playwright-utils'

test('example', async ({}) => {
  const result = await recurse({
    command: () => fetchData(),
    predicate: (data) => data.status === 'ready',
    options: { timeout: 30000 }
  })
})

// As a fixture
import { test } from '@seon/playwright-utils/fixtures'
// or use your own main fixture (with mergeTests) and import from there

test('example', async ({ recurse }) => {
  const result = await recurse({
    command: () => fetchData(),
    predicate: (data) => data.status === 'ready',
    options: { timeout: 30000 }
  })
})
```

[→ Recurse Documentation](./docs/recurse.md)

### [Logging](./docs/log.md)

A specialized logging utility that integrates with Playwright's test reports.

```typescript
// Direct import
import { log } from '@seon/playwright-utils'

await log.info('Information message')
await log.step('Starting a new test step')
await log.error('Something went wrong', false) // Disable console output
```

```typescript
// As a fixture
import { test } from '@seon/playwright-utils/log/fixtures'

test('example', async ({ log }) => {
  await log({
    message: 'Starting test',
    level: 'step'
  })
})
```

[→ Logging Documentation](./docs/log.md)

### [Network Interception](./docs/intercept-network-call.md)

A powerful utility for intercepting, observing, and mocking network requests in Playwright tests.

```typescript
// Direct import
import { interceptNetworkCall } from '@seon/playwright-utils'

test('example', async ({ page }) => {
  // Set up an interception - returns a Promise that resolves when the network call is made
  const networkCall = interceptNetworkCall({
    page,
    method: 'GET',
    url: '/api/users',
    fulfillResponse: {
      status: 200,
      body: { data: [{ id: 1, name: 'Test User' }] }
    }
  })

  // Navigate to page that will trigger the network call
  await page.goto('/users')

  // Await the network call and access the result
  const { responseJson, status } = await networkCall
})

// As a fixture
import { test } from '@seon/playwright-utils/fixtures'

test('example', async ({ page, interceptNetworkCall }) => {
  // With fixture, you don't need to pass the page object
  const userDataCall = interceptNetworkCall({
    method: 'GET',
    url: '/api/users',
    fulfillResponse: {
      status: 200,
      body: { data: [] }
    }
  })

  await page.goto('/')
  await userDataCall // Wait for the network call to complete
})
```

[→ Network Interception Documentation](./docs/intercept-network-call.md)
