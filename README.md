# Playwright Utils

A collection of utilities for Playwright tests at SEON Technologies.

## Installation

```bash
npm install @seon/playwright-utils
```

## API Request Utility

The API Request utility provides a clean, typed interface for making HTTP requests in Playwright tests. It handles URL construction, header management, and response parsing with proper TypeScript support.

### Features

- Strong TypeScript typing for request parameters and responses
- Three-tier URL resolution strategy (explicit baseUrl, config baseURL, or direct path)
- Proper handling of URL path normalization and slashes
- Content-type based response parsing
- Support for all common HTTP methods

### Usage

The utility can be used in two ways:

#### 1. As a Plain Function

```typescript
import { apiRequest } from '@seon/playwright-utils/api-request'

// Inside a test or another function
const response = await apiRequest({
  request: context.request, // Playwright request context
  method: 'GET',
  path: '/api/users',
  baseUrl: 'https://api.example.com',
  headers: { Authorization: 'Bearer token' }
})

console.log(response.status) // HTTP status code
console.log(response.body) // Parsed response body
```

#### 2. As a Playwright Fixture

```typescript
// Import the fixture

// Use the fixture in your tests
test('should fetch user data', async ({ apiRequest }) => {
  const { status, body } = await apiRequest<UserResponse>({
    method: 'GET',
    path: '/api/users/123',
    headers: { Authorization: 'Bearer token' }
  })

  // Assertions
  expect(status).toBe(200)
  expect(body.name).toBe('John Doe')
})
```

### API Reference

#### apiRequest Function

```typescript
async function apiRequest<T = unknown>({
  request,
  method,
  path,
  baseUrl,
  configBaseUrl,
  body,
  headers,
  params
}: ApiRequestParams): Promise<ApiRequestResponse<T>>
```

#### Parameters

| Parameter     | Type                                                      | Description                              |
| ------------- | --------------------------------------------------------- | ---------------------------------------- |
| request       | APIRequestContext                                         | The Playwright request context           |
| method        | 'GET' \| 'POST' \| 'PUT' \| 'DELETE' \| 'PATCH' \| 'HEAD' | HTTP method to use                       |
| path          | string                                                    | The URL path (e.g., '/api/users')        |
| baseUrl       | string (optional)                                         | Base URL to prepend to the path          |
| configBaseUrl | string (optional)                                         | Fallback base URL from Playwright config |
| body          | unknown (optional)                                        | Request body for POST/PUT/PATCH          |
| headers       | Record<string, string> (optional)                         | HTTP headers                             |
| params        | Record<string, string \| boolean \| number> (optional)    | Query parameters                         |

#### Return Type

```typescript
type ApiRequestResponse<T = unknown> = {
  status: number // HTTP status code
  body: T // Response body, typed as T
}
```

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
