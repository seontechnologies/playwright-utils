# Playwright Utils

A collection of utilities for Playwright tests at SEON Technologies, designed to make testing more efficient and maintainable.

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

// As a fixture
import { test } from '@seon/playwright-utils/fixtures'

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
// Direct import
import { recurse } from '@seon/playwright-utils'

// As a fixture
import { test } from '@seon/playwright-utils/fixtures'

test('example', async ({ recurse }) => {
  const result = await recurse({
    command: () => fetchData(),
    predicate: (data) => data.status === 'ready',
    options: { timeout: 30000 }
  })
})
```

[→ Recurse Documentation](./docs/recurse.md)

## Using Fixtures

All utilities can be used as Playwright fixtures by importing the test object:

```typescript
import { test } from '@seon/playwright-utils/fixtures'

// Now you have access to all fixtures
test('using multiple utilities', async ({ apiRequest, recurse }) => {
  // Your test code here
})
```

## TypeScript Support

This library is built with TypeScript and provides full type definitions for all utilities. It follows SEON's TypeScript best practices, including:

- Using primitive types over interfaces (e.g., `boolean` instead of `Boolean`)
- Providing explicit return types for functions
- Leveraging discriminated unions for complex states

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
