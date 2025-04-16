# Network Interception Utility

- [Network Interception Utility](#network-interception-utility)
  - [Why Use This Instead of Native Playwright?](#why-use-this-instead-of-native-playwright)
  - [Comparison with Native Playwright](#comparison-with-native-playwright)
    - [Spying on the network](#spying-on-the-network)
    - [Stubbing the network](#stubbing-the-network)
    - [URL Pattern Matching Simplification](#url-pattern-matching-simplification)
  - [Usage](#usage)
    - [Direct Import](#direct-import)
    - [As a Fixture](#as-a-fixture)
  - [API Reference](#api-reference)
    - [`interceptNetworkCall(options)`](#interceptnetworkcalloptions)
      - [Options](#options)
      - [`fulfillResponse` Object](#fulfillresponse-object)
      - [Return Value](#return-value)
  - [URL Pattern Matching](#url-pattern-matching)
  - [Examples](#examples)
    - [Observing a Network Request](#observing-a-network-request)
    - [Mocking a Response](#mocking-a-response)
    - [Using a Custom Handler](#using-a-custom-handler)
    - [Using URL Patterns](#using-url-patterns)
    - [Intercepting Multiple Requests](#intercepting-multiple-requests)
    - [Error Simulation](#error-simulation)

The Network Interception utility provides a powerful way to observe, intercept, and mock network requests in Playwright tests. This utility significantly improves upon Playwright's built-in network handling capabilities by offering a more intuitive API, automatic response parsing, and a cleaner fixture-based approach.

## Why Use This Instead of Native Playwright?

While Playwright offers built-in network interception via `page.route()` and `page.waitForResponse()`, our utility addresses several common pain points:

| Native Playwright                                             | Our Network Interception Utility                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Requires separate code paths for interception vs. observation | Unified API for both interception and observation                              |
| Manual JSON parsing with `await response.json()`              | Automatic JSON parsing with strongly-typed results                             |
| Complex filter predicates for response matching               | Simple declarative options with powerful glob pattern matching using picomatch |
| Verbose syntax, especially for conditional handling           | Concise, readable API with flexible handler options                            |
| Limited type safety for response data                         | Full TypeScript support with type assertions                                   |
| Route setup and response waiting in separate steps            | Single declarative call that returns a Promise                                 |

## Comparison with Native Playwright

### Spying on the network

**With Native Playwright:**

```typescript
test('Spy on the network - original', async ({ page }) => {
  // Set up the interception before navigating
  await page.route('*/**/api/v1/fruits', (route) => route.continue())

  await page.goto('https://demo.playwright.dev/api-mocking')

  // Wait for the intercepted response
  const fruitsResponse = await page.waitForResponse('*/**/api/v1/fruits')
  // verify the network
  const fruitsResponseBody = await fruitsResponse.json()
  const status = fruitsResponse.status()
  expect(fruitsResponseBody.length).toBeGreaterThan(0)
  expect(status).toBe(200)
})
```

**With Our Utility:**

```typescript
test('Spy on the network', async ({ page, interceptNetworkCall }) => {
  // Set up the interception before navigating
  const fruitsResponse = interceptNetworkCall({
    url: '**/fruits'
  })

  await page.goto('https://demo.playwright.dev/api-mocking')

  // Wait for the intercepted response
  const { responseJson, status } = await fruitsResponse
  // verify the network
  expect(responseJson.length).toBeGreaterThan(0)
  expect(status).toBe(200)
})
```

### Stubbing the network

**With Native Playwright:**

```typescript
test('Stub the network - original', async ({ page }) => {
  const fruit = { name: 'Guava', id: 12 }

  // Set up the interception before navigating
  await page.route('*/**/api/v1/fruits', (route) =>
    route.fulfill({
      json: [fruit]
    })
  )

  await page.goto('https://demo.playwright.dev/api-mocking')

  // Wait for the intercepted response
  const fruitsResponse = await page.waitForResponse('*/**/api/v1/fruits')
  // verify the network
  const fruitsResponseBody = await fruitsResponse.json()
  expect(fruitsResponseBody).toEqual([fruit])

  await expect(page.getByText(fruit.name)).toBeVisible()
})
```

**With Our Utility:**

```typescript
test('Stub the network', async ({ page, interceptNetworkCall }) => {
  const fruit = { name: 'Guava', id: 12 }

  // Set up the interception before navigating
  const fruitsResponse = interceptNetworkCall({
    url: '/api/*/fruits', // just a specificity on '**/fruits'
    fulfillResponse: {
      body: [fruit]
    }
  })

  await page.goto('https://demo.playwright.dev/api-mocking')

  // Wait for the intercepted response
  const { responseJson } = await fruitsResponse
  // verify the network
  expect(responseJson).toEqual([fruit])

  await expect(page.getByText(fruit.name)).toBeVisible()
})
```

### URL Pattern Matching Simplification

One of the most significant improvements our utility offers is the use of picomatch for URL pattern matching. This dramatically simplifies how you target specific network requests:

**With Native Playwright:**

```typescript
// Complex predicate with multiple conditions to match similar URLs
const predicate = (response) => {
  const url = response.url()
  return (
    // Match exact endpoint
    url.endsWith('/api/users') ||
    // Match user by ID pattern
    url.match(/\/api\/users\/\d+/) ||
    // Match specific subpaths
    (url.includes('/api/users/') && url.includes('/profile'))
  )
}

// Have to use this complex predicate in every listener
page.waitForResponse(predicate)
```

**With Our Utility:**

```typescript
// Simple, readable glob patterns to match the same URLs
interceptNetworkCall({ url: '/api/users' }) // Exact endpoint
interceptNetworkCall({ url: '/api/users/*' }) // User by ID pattern
interceptNetworkCall({ url: '/api/users/*/profile' }) // Specific subpaths

// Or even match all of them with a single pattern
interceptNetworkCall({ url: '/api/users/**' })
```

This makes tests more maintainable, less error-prone, and much easier to read and understand.

## Usage

### Direct Import

The network interception utility works by setting up interceptions that return promises which resolve when the network call is made:

```typescript
import { interceptNetworkCall } from '@seon/playwright-utils'
import { test } from '@playwright/test'

test('intercept example', async ({ page }) => {
  // Set up interception before navigating
  const dataCall = interceptNetworkCall({
    page,
    method: 'GET',
    url: '/api/data',
    fulfillResponse: {
      status: 200,
      body: { data: [{ id: 1, name: 'Test Item' }] }
    }
  })

  // Navigate to the page that will trigger the network call
  await page.goto('https://example.com')

  // Wait for the network call to complete and access the result
  const { responseJson, status } = await dataCall
})
```

### As a Fixture

The fixture version simplifies your test code by automatically injecting the page context:

```typescript
import { test } from '@seon/playwright-utils/fixtures'

test('intercept fixture example', async ({ page, interceptNetworkCall }) => {
  // Set up interception - notice 'page' is not needed in the options
  const dataCall = interceptNetworkCall({
    method: 'GET',
    url: '/api/data',
    fulfillResponse: {
      status: 200,
      body: { data: [] }
    }
  })

  // Navigate to the page
  await page.goto('https://example.com')

  // Wait for the network call to complete
  await dataCall

  // You can also access the response data with type assertions
  const {
    responseJson: { data }
  } = await dataCall
})
```

## API Reference

### `interceptNetworkCall(options)`

The main function to intercept network requests.

#### Options

| Parameter         | Type       | Description                                                           |
| ----------------- | ---------- | --------------------------------------------------------------------- |
| `page`            | `Page`     | Required: Playwright page object                                      |
| `method`          | `string`   | Optional: HTTP method to match (e.g., 'GET', 'POST')                  |
| `url`             | `string`   | Optional: URL pattern to match (supports glob patterns via picomatch) |
| `fulfillResponse` | `object`   | Optional: Response to use when mocking                                |
| `handler`         | `function` | Optional: Custom handler function for the route                       |
| `timeout`         | `number`   | Optional: Timeout in milliseconds for the network request             |

#### `fulfillResponse` Object

| Property  | Type                     | Description                                           |
| --------- | ------------------------ | ----------------------------------------------------- |
| `status`  | `number`                 | HTTP status code (default: 200)                       |
| `headers` | `Record<string, string>` | Response headers                                      |
| `body`    | `any`                    | Response body (will be JSON.stringified if an object) |

#### Return Value

Returns a `Promise<NetworkCallResult>` with:

| Property       | Type       | Description                             |
| -------------- | ---------- | --------------------------------------- |
| `request`      | `Request`  | The intercepted request                 |
| `response`     | `Response` | The response (null if mocked)           |
| `responseJson` | `any`      | Parsed JSON response (if available)     |
| `status`       | `number`   | HTTP status code                        |
| `requestJson`  | `any`      | Parsed JSON request body (if available) |

## URL Pattern Matching

Under the hood, this utility uses [picomatch](https://github.com/micromatch/picomatch) for powerful glob pattern matching of URLs. This makes it easy to match URLs using patterns like:

- `'/api/users'` - Exact path matching
- `'**/users/**'` - Match any URL containing 'users'
- `'/api/users/*'` - Match all endpoints under users

Glob patterns are much more concise and readable than complex regex or function predicates required by native Playwright.

## Examples

### Observing a Network Request

```typescript
// Set up the interception before triggering the request
const usersCall = interceptNetworkCall({
  page,
  method: 'GET',
  url: '/api/users'
})

// Trigger the request (for example, by navigation or user action)
await page.goto('/users-page')

// Wait for the request to complete and get the result
const result = await usersCall

// Work with the response (with type assertion for better type safety)
const {
  status,
  responseJson: { data }
} = (await usersCall) as { status: number; responseJson: { data: User[] } }

expect(status).toBe(200)
expect(data).toHaveLength(10)
```

### Mocking a Response

```typescript
const mockUserData = { id: 1, name: 'Test User', email: 'test@example.com' }

// Set up the mock before navigation
const userCall = interceptNetworkCall({
  page,
  method: 'GET',
  url: '/api/users/1',
  fulfillResponse: {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { data: mockUserData }
  }
})

// Navigate to a page that would call this API
await page.goto('/user/1')

// Optionally wait for the mock to be used
await userCall

// The page will receive the mocked data instead of making a real API call
```

### Using a Custom Handler

```typescript
// Set up a handler for dynamic request processing
const loginCall = interceptNetworkCall({
  page,
  url: '/api/login', // Note: no method specified to catch all methods
  handler: async (route, request) => {
    if (request.method() === 'POST') {
      const data = JSON.parse(request.postData() || '{}')

      if (data.username === 'testuser' && data.password === 'password') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ token: 'fake-token-123' })
        })
      } else {
        await route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Invalid credentials' })
        })
      }
    } else {
      // Allow other methods to pass through
      await route.continue()
    }
  }
})

// Perform login action
await page.fill('#username', 'testuser')
await page.fill('#password', 'password')
await page.click('#login-button')

// Wait for the login call to complete
await loginCall
```

### Using URL Patterns

The utility supports glob patterns for URL matching:

```typescript
// Match any URL containing 'users'
await interceptNetworkCall({
  page,
  url: '**/users/**',
  fulfillResponse: {
    /* ... */
  }
})

// Match exact API endpoint
await interceptNetworkCall({
  page,
  url: '/api/v1/products',
  method: 'GET',
  fulfillResponse: {
    /* ... */
  }
})
```

### Intercepting Multiple Requests

For multiple related requests, you can set up multiple interceptions:

```typescript
// Mock authentication
const loginCall = interceptNetworkCall({
  page,
  method: 'POST',
  url: '/api/login',
  fulfillResponse: {
    status: 200,
    body: { token: 'fake-token' }
  }
})

// Mock user data
const profileCall = interceptNetworkCall({
  page,
  method: 'GET',
  url: '/api/user-profile',
  fulfillResponse: {
    status: 200,
    body: { data: { id: 1, name: 'Test User' } }
  }
})

// Navigate to a page that uses both APIs
await page.goto('/dashboard')

// Wait for both API calls to complete
await loginCall
await profileCall

// Now you can make assertions about the page state
```

### Error Simulation

Simulate error responses for testing error handling:

```typescript
// Set up an error response simulation
const errorCall = interceptNetworkCall({
  page,
  method: 'GET',
  url: '/api/data',
  fulfillResponse: {
    status: 500,
    body: { error: 'Internal Server Error' }
  }
})

// Navigate to page that will trigger the API call
await page.goto('/data-page')

// Wait for the error response
await errorCall

// Verify error handling in the UI
await expect(page.locator('.error-message')).toBeVisible()
```

### Using Timeout

```typescript
// Set a timeout for waiting on a network request
const dataCall = interceptNetworkCall({
  page,
  method: 'GET',
  url: '/api/data-that-might-be-slow',
  timeout: 5000  // 5 seconds timeout
})

await page.goto('/data-page')

try {
  const { responseJson } = await dataCall
  console.log('Data loaded successfully:', responseJson)
} catch (error) {
  if (error.message.includes('timeout')) {
    console.log('Request timed out as expected')
  } else {
    throw error  // Unexpected error
  }
}
