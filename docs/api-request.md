# API Request Utility

The API Request utility provides a clean, typed interface for making HTTP requests in Playwright tests. It handles URL construction, header management, and response parsing with proper TypeScript support.

## Features

- Strong TypeScript typing for request parameters and responses
- Three-tier URL resolution strategy (explicit baseUrl, config baseURL, or direct path)
- Proper handling of URL path normalization and slashes
- Content-type based response parsing
- Support for all common HTTP methods

## Usage

The utility can be used in two ways:

### 1. As a Plain Function

```typescript
import { apiRequest } from '@seon/playwright-utils'

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

### 2. As a Playwright Fixture

```typescript
// Import the fixture
import { test } from '@seon/playwright-utils/fixtures'

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

## API Reference

### apiRequest Function

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

### Parameters

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

### Return Type

```typescript
type ApiRequestResponse<T = unknown> = {
  status: number // HTTP status code
  body: T // Response body, typed as T
}
```

## Examples

### URL Resolution Strategies

```typescript
test('demonstrates URL resolution', async ({ apiRequest }) => {
  // 1. Explicit baseUrl takes precedence
  await apiRequest({
    method: 'GET',
    path: '/users',
    baseUrl: 'https://api.example.com' // This will be used
    // configBaseUrl is ignored when baseUrl is provided
  })

  // 2. Playwright config baseURL is used when no explicit baseUrl is provided
  await apiRequest({
    method: 'GET',
    path: '/users'
    // Uses the baseURL from playwright.config.ts
  })

  // 3. Direct paths (with protocol) are used as-is
  await apiRequest({
    method: 'GET',
    path: 'https://api.example.com/users' // Used directly, ignores baseUrl
  })
})
```

### Handling Query Parameters

```typescript
test('demonstrates query parameters', async ({ apiRequest }) => {
  // Query parameters are properly encoded
  const { status, body } = await apiRequest({
    method: 'GET',
    path: '/search',
    params: {
      q: 'search term',
      page: 1,
      active: true
    }
  })
  // Makes a request to /search?q=search%20term&page=1&active=true
})
```

### Handling Different Response Types

```typescript
test('handles different response types', async ({ apiRequest }) => {
  // JSON responses are automatically parsed
  const jsonResponse = await apiRequest<UserData>({
    method: 'GET',
    path: '/api/users/1'
  })
  // jsonResponse.body is typed as UserData

  // Text responses are returned as strings
  const textResponse = await apiRequest<string>({
    method: 'GET',
    path: '/api/plain-text',
    headers: {
      Accept: 'text/plain'
    }
  })
  // textResponse.body is a string
})
```
