# Playwright Utils

A collection of utilities for Playwright tests at SEON Technologies, designed to make testing more efficient and maintainable.

All utilities can be used as Playwright fixtures by importing the test object:

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

test('example', async ({ recurse }) => {
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

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute to this library.

### Examples

#### GET Request with Authentication

```typescript
import { test } from '@seon/playwright-utils/api-request/fixtures'

test('fetch user profile', async ({ apiRequest }) => {
  const { status, body } = await apiRequest<UserProfile>({
    method: 'GET',
    path: '/api/profile',
    headers: {
      Authorization: 'Bearer token123'
    }
  })

  expect(status).toBe(200)
  expect(body.email).toBeDefined()
})
```

#### POST Request with Body

```typescript
import { test } from '@seon/playwright-utils/api-request/fixtures'

test('create new item', async ({ apiRequest }) => {
  const { status, body } = await apiRequest<CreateItemResponse>({
    method: 'POST',
    path: '/api/items',
    baseUrl: 'https://api.example.com', // override default baseURL
    body: {
      name: 'New Item',
      price: 19.99
    },
    headers: { 'Content-Type': 'application/json' }
  })

  expect(status).toBe(201)
  expect(body.id).toBeDefined()
})
```

#### Using URL Resolution Strategy

```typescript
import { test } from '@seon/playwright-utils/api-request/fixtures'

test('demonstrates URL resolution', async ({ apiRequest }) => {
  // 1. Explicit baseUrl takes precedence
  await apiRequest({
    method: 'GET',
    path: '/users',
    baseUrl: 'https://api.explicit.com', // This will be used
    configBaseUrl: 'https://api.config.com'
  })
  // Results in: https://api.explicit.com/users

  // 2. Falls back to configBaseUrl if no explicit baseUrl
  await apiRequest({
    method: 'GET',
    path: '/users',
    configBaseUrl: 'https://api.config.com'
  })
  // Results in: https://api.config.com/users

  // 3. Uses path directly if no base URLs provided
  await apiRequest({
    method: 'GET',
    path: '/users'
  })
  // Results in: /users

  // 4. Works with absolute URLs in path
  await apiRequest({
    method: 'GET',
    path: 'https://api.absolute.com/users'
  })
  // Results in: https://api.absolute.com/users
})
```
