# API Request Utility

The API Request utility provides a clean, typed interface for making HTTP requests in Playwright tests. It handles URL construction, header management, and response parsing with proper TypeScript support.

## Features

- **Automatic Retry Logic**: Cypress-style retry for server errors (5xx) enabled by default with exponential backoff
- Strong TypeScript typing for request parameters and responses
- Three-tier URL resolution strategy (explicit baseUrl, config baseURL, or direct path)
- Proper handling of URL path normalization and slashes
- Content-type based response parsing
- Support for all common HTTP methods
- **Rich UI Mode**: Visual display of API requests/responses in Playwright UI (perfect for API E2E testing)

## Usage

The utility can be used in two ways:

### 1. As a Plain Function

```typescript
import { apiRequest } from '@seontechnologies/playwright-utils'

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
import { test } from '@seontechnologies/playwright-utils/fixtures'

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

| Parameter     | Type                                                      | Description                                                                            |
| ------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| request       | APIRequestContext                                         | The Playwright request context                                                         |
| method        | 'GET' \| 'POST' \| 'PUT' \| 'DELETE' \| 'PATCH' \| 'HEAD' | HTTP method to use                                                                     |
| path          | string                                                    | The URL path (e.g., '/api/users')                                                      |
| baseUrl       | string (optional)                                         | Base URL to prepend to the path                                                        |
| configBaseUrl | string (optional)                                         | Fallback base URL from Playwright config                                               |
| body          | unknown (optional)                                        | Request body for POST/PUT/PATCH (internally mapped to Playwright's 'data' parameter)   |
| headers       | Record<string, string> (optional)                         | HTTP headers                                                                           |
| params        | Record<string, string \| boolean \| number> (optional)    | Query parameters                                                                       |
| testStep      | boolean (optional)                                        | Whether to wrap the call in test.step() (defaults to true)                             |
| uiMode        | boolean (optional)                                        | Enable rich UI display in Playwright UI (defaults to false)                            |
| retryConfig   | ApiRetryConfig (optional)                                 | Retry configuration for server errors (defaults enabled, set maxRetries: 0 to disable) |

### Return Type

```typescript
type ApiRequestResponse<T = unknown> = {
  status: number // HTTP status code
  body: T // Response body, typed as T
}
```

## Retry Logic (Cypress-Style)

The API Request utility includes automatic retry logic that follows Cypress patterns, retrying only server errors (5xx status codes) by default. This helps with transient network issues and temporary server problems while respecting idempotency for client errors.

### Default Behavior

- **Enabled by Default**: Like Cypress, retry is automatically enabled for all requests
- **Only 5xx Errors**: Only retries server errors (500, 502, 503, 504) - never client errors (4xx)
- **Exponential Backoff**: Uses exponential backoff with jitter to prevent thundering herd
- **3 Attempts**: Default maximum of 3 retry attempts (total 4 requests)

### Retry Configuration

```typescript
type ApiRetryConfig = {
  maxRetries?: number // Maximum retry attempts (default: 3)
  initialDelayMs?: number // Initial delay in ms (default: 100)
  backoffMultiplier?: number // Exponential multiplier (default: 2)
  maxDelayMs?: number // Maximum delay cap (default: 5000)
  enableJitter?: boolean // Add random jitter (default: true)
  retryStatusCodes?: number[] // Which codes to retry (default: [500, 502, 503, 504])
}
```

### Retry Examples

#### Default Retry Behavior

```typescript
test('automatic retry for server errors', async ({ apiRequest }) => {
  // Automatically retries 500, 502, 503, 504 errors
  // Never retries 4xx client errors (good for idempotency)
  const { status, body } = await apiRequest({
    method: 'GET',
    path: '/api/users'
    // Retry is enabled by default - no config needed
  })

  expect(status).toBe(200)
})
```

#### Disable Retry for Error Testing

```typescript
test('test error handling without retry', async ({ apiRequest }) => {
  // Disable retry when you want to test error scenarios
  const { status } = await apiRequest({
    method: 'GET',
    path: '/api/failing-endpoint',
    retryConfig: { maxRetries: 0 } // Explicitly disable retry
  })

  expect(status).toBe(500) // Will fail immediately without retry
})
```

#### Custom Retry Configuration

```typescript
test('custom retry settings', async ({ apiRequest }) => {
  const { status } = await apiRequest({
    method: 'POST',
    path: '/api/heavy-operation',
    body: { data: 'important' },
    retryConfig: {
      maxRetries: 5, // More attempts for critical operations
      initialDelayMs: 500, // Longer initial delay
      maxDelayMs: 10000, // Higher delay cap
      enableJitter: false // Disable jitter for predictable timing
    }
  })

  expect(status).toBe(201)
})
```

### Why Only 5xx Errors?

Following Cypress and HTTP best practices:

- **4xx Client Errors** (400, 401, 403, 404, etc.): These indicate client-side issues (bad request, unauthorized, not found) that won't be resolved by retrying
- **5xx Server Errors** (500, 502, 503, 504): These indicate temporary server issues that may resolve on retry

```typescript
test('demonstrates retry behavior', async ({ apiRequest }) => {
  // These will NOT be retried (fail fast for client errors)
  try {
    await apiRequest({
      method: 'POST',
      path: '/api/users',
      body: { email: 'invalid-email' } // 400 Bad Request - no retry
    })
  } catch (error) {
    // Fails immediately without retry attempts
  }

  // These WILL be retried automatically (server errors)
  const response = await apiRequest({
    method: 'GET',
    path: '/api/sometimes-fails' // May return 503 - will retry with backoff
  })
})
```

## Examples

### GET Request with Authentication

```typescript
import { test } from '@seontechnologies/playwright-utils/api-request/fixtures'

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
import { test } from '@seontechnologies/playwright-utils/api-request/fixtures'

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

### Using in Non-Test Contexts (Global Setup, Helpers)

```typescript
import { apiRequest } from '@seontechnologies/playwright-utils'
import { request } from '@playwright/test'

// For use in global setup or outside of test.step() contexts
async function fetchToken() {
  const requestContext = await request.newContext()

  const { body } = await apiRequest({
    request: requestContext,
    method: 'GET',
    path: '/auth/token',
    baseUrl: 'https://api.example.com',
    testStep: false // Disable test.step wrapping for non-test contexts
  })

  await requestContext.dispose()
  return body.token
}
```

### Using URL Resolution Strategy

> **Note**: The apiRequest utility follows a priority order for resolving URLs:
>
> 1. Explicit `baseUrl` parameter in the function call
> 2. `configBaseUrl` parameter in the function call
> 3. Playwright config's `baseURL` from your `playwright.config.ts` file
> 4. Absolute URLs in the `path` parameter are used as-is

```typescript
import { test } from '@seontechnologies/playwright-utils/api-request/fixtures'

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
  await apiRequest({})
})
```

## UI Mode for API E2E Testing

The API Request utility includes a powerful UI Mode feature that provides rich visual feedback for API requests and responses. This is especially useful for API E2E testing where you want to see detailed request/response information in the Playwright UI.

### Features

- **Rich Visual Display**: Shows formatted request and response details with syntax highlighting
- **Tabbed Interface**: Organizes information into tabs (Body, Headers, Params, etc.)
- **Duration Tracking**: Shows how long each request took
- **Status Color Coding**: Visual indicators for different HTTP status codes (2xx = green, 4xx = red, etc.)
- **HTML Report Attachments**: Automatically includes API details in test reports
- **Safe for UI Tests**: Defaults to `false` so it won't interfere with existing UI tests

### Enabling UI Mode

There are three ways to enable UI Mode:

#### Method 1: Per-Request Basis

```typescript
const { status, body } = await apiRequest({
  request,
  method: 'GET',
  path: '/api/movies',
  uiMode: true // Enable UI display for this specific request
})
```

#### Method 2: Environment Variable (Recommended for API E2E)

Set the environment variable globally in your config file:

```typescript
// playwright/config/base.config.ts
process.env.API_E2E_UI_MODE = 'true'

// ... rest of your config
```

Or at the top of your test file:

```typescript
// At the top of your test file
process.env.API_E2E_UI_MODE = 'true'

import { test, expect } from '@playwright/test'
// ... rest of your imports and tests
```

#### Method 3: In Test Hooks

```typescript
test.describe('My API tests', () => {
  test.beforeAll(() => {
    process.env.API_E2E_UI_MODE = 'true'
  })

  test.afterAll(() => {
    delete process.env.API_E2E_UI_MODE // Clean up
  })

  // ... your tests
})
```

### UI Mode Examples

#### Basic Usage with Environment Variable

```typescript
// Set at top of file or in config
process.env.API_E2E_UI_MODE = 'true'

test('API test with UI display', async ({ apiRequest }) => {
  // This will show rich UI display automatically
  const { status, body } = await apiRequest({
    method: 'POST',
    path: '/api/movies',
    body: {
      name: 'Test Movie',
      year: 2023,
      rating: 8.5
    },
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token123'
    }
  })

  expect(status).toBe(201)
  expect(body.id).toBeDefined()
})
```

#### Per-Request UI Mode

```typescript
test('API test with selective UI display', async ({ apiRequest }) => {
  // This request will show UI display
  const createResponse = await apiRequest({
    method: 'POST',
    path: '/api/movies',
    body: { name: 'Test Movie' },
    uiMode: true // Enable UI for this specific call
  })

  // This request will not show UI display (default behavior)
  const getResponse = await apiRequest({
    method: 'GET',
    path: `/api/movies/${createResponse.body.id}`
    // uiMode defaults to false
  })
})
```

#### Combining with Other Utilities

```typescript
process.env.API_E2E_UI_MODE = 'true'

test('API polling with UI display', async ({ apiRequest, recurse }) => {
  // Create resource - shows in UI
  const createResponse = await apiRequest({
    method: 'POST',
    path: '/api/async-resource',
    body: { name: 'Test Resource' }
  })

  const resourceId = createResponse.body.id

  // Poll for completion - all requests show in UI
  await recurse(
    async () => {
      const statusResponse = await apiRequest({
        method: 'GET',
        path: `/api/async-resource/${resourceId}/status`
      })
      return statusResponse.body
    },
    (status) => status.completed === true,
    {
      timeout: 30000,
      interval: 1000,
      log: 'Waiting for resource to complete'
    }
  )
})
```

### Best Practices

1. **Use Environment Variable for API E2E Tests**: Set `API_E2E_UI_MODE='true'` in your config file for backend API test suites
2. **Keep Disabled for UI Tests**: The default `false` value ensures UI tests aren't affected
3. **Use in Development**: Great for debugging and understanding API flows during development
4. **CI/CD Considerations**: You may want to disable in CI for performance, or enable for debugging failing tests

### What You'll See

When UI Mode is enabled, each API request will display:

- **Request Section**:
  - HTTP method and URL
  - Request headers (formatted JSON)
  - Request body (formatted JSON)
  - Query parameters (formatted JSON)

- **Response Section**:
  - HTTP status code with color coding
  - Response duration
  - Response headers (formatted JSON)
  - Response body (formatted JSON)

- **HTML Report**: All API call details are also automatically attached to the HTML report for offline viewing

## Real-World Examples

### CRUD Operations with Typed Fixtures

The API request utility shines when used with fixtures for CRUD operations. This example shows a real implementation using proper typing and SEON's functional approach:

```typescript
// From playwright/support/fixtures/crud-helper-fixture.ts
export const test = baseApiRequestFixture.extend<CrudParams>({
  // Create movie API fixture with proper typing
  addMovie: async ({ apiRequest }, use) => {
    const addMovieBase = async (
      token: string,
      body: Omit<Movie, 'id'>,
      baseUrl?: string
    ) =>
      apiRequest<CreateMovieResponse>({
        method: 'POST',
        path: '/movies',
        baseUrl,
        body,
        headers: { Authorization: token }
      })

    // Enhanced with test step for better reporting
    const addMovie = functionTestStep('Add Movie', addMovieBase)
    await use(addMovie)
  },

  // Get movie by ID with proper typing
  getMovieById: async ({ apiRequest }, use) => {
    const getMovieByIdBase = async (
      token: string,
      id: string,
      baseUrl?: string
    ) =>
      apiRequest<GetMovieResponse>({
        method: 'GET',
        path: `/movies/${id}`,
        baseUrl,
        headers: { Authorization: token }
      })

    const getMovieById = functionTestStep('Get Movie By ID', getMovieByIdBase)
    await use(getMovieById)
  },

  // Additional operations follow the same pattern
  updateMovie: async ({ apiRequest }, use) => {
    // Implementation with proper typing and test step decoration
    await use(functionTestStep('Update Movie', updateMovieBase))
  },

  deleteMovie: async ({ apiRequest }, use) => {
    // Implementation with proper typing and test step decoration
    await use(functionTestStep('Delete Movie', deleteMovieBase))
  }
})
```

### Usage in Tests

Usage in tests is clean, type-safe, and follows functional programming principles:

```typescript
// From playwright/tests/sample-app/sample-app/crud-movie-event.spec.ts
test('should perform CRUD operations', async ({
  addMovie,
  getMovieById,
  updateMovie,
  deleteMovie,
  authToken
}) => {
  // Create a movie
  const { body: createResponse, status } = await addMovie(authToken, {
    name: 'Test Movie',
    genre: 'Action',
    year: 2023
  })
  const movieId = createResponse.data.id
  expect(status).toBe(200)

  // Get the movie by ID and verify
  const { body: getResponse } = await getMovieById(authToken, movieId)
  expect(getResponse.data.name).toBe('Test Movie')

  // Update the movie
  const { status: updateStatus } = await updateMovie(authToken, movieId, {
    name: 'Updated Movie',
    genre: 'Comedy',
    year: 2023
  })
  expect(updateStatus).toBe(200)

  // Delete the movie
  const { status: deleteStatus } = await deleteMovie(authToken, movieId)
  expect(deleteStatus).toBe(200)
})
```

### Benefits of this Pattern

This approach offers several advantages aligned with SEON's development principles:

- **Type Safety**: Full TypeScript support through generics
- **Reusability**: Fixtures are reusable across all test files
- **Function Composition**: Enhanced with logging via `functionTestStep`
- **Clean Separation**: API client logic is separate from test logic
- **Maintainability**: Changes to endpoints only need to be updated in one place
- **Readability**: Tests clearly express intent without implementation details

### Integration with Auth Session

The API request utility works seamlessly with the Auth Session manager:

```typescript
test('should use cached auth token', async ({
  apiRequest,
  authToken // From auth session fixture
}) => {
  // The authToken is retrieved from cache if available
  // Only fetched from API if needed/invalid
  const { status, body } = await apiRequest({
    method: 'GET',
    path: '/api/protected-resource',
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  })

  expect(status).toBe(200)
})
```

### Working with Async Operations and Polling

Combining with the `recurse` utility for polling async operations:

```typescript
test('should wait for resource creation', async ({
  apiRequest,
  authToken,
  recurse
}) => {
  // Create a resource that triggers an async process
  const { body: createResponse } = await apiRequest({
    method: 'POST',
    path: '/api/resources',
    body: { name: 'Async Resource' },
    headers: { Authorization: `Bearer ${authToken}` }
  })

  const resourceId = createResponse.id

  // Poll until the resource is in the desired state
  await recurse(
    async () => {
      const { body } = await apiRequest({
        method: 'GET',
        path: `/api/resources/${resourceId}`,
        headers: { Authorization: `Bearer ${authToken}` }
      })

      // Can use assertions directly in the predicate
      expect(body.status).toBe('COMPLETED')
    },
    {
      interval: 1000,
      timeout: 30000,
      timeoutMessage: `Resource ${resourceId} did not complete in time`
    }
  )
})
```

## URL Resolution Strategy Examples

```typescript
import { test } from '@seontechnologies/playwright-utils/api-request/fixtures'

test('demonstrates URL resolution', async ({ apiRequest }) => {
  // 1. Explicit baseUrl takes precedence
  await apiRequest({
    method: 'GET',
    path: '/users',
    baseUrl: 'https://api.explicit.com', // This will be used
    configBaseUrl: 'https://api.config.com'
  })
  // Results in: <https://api.explicit.com/users>

  // 2. Falls back to configBaseUrl if no explicit baseUrl
  await apiRequest({
    method: 'GET',
    path: '/users',
    configBaseUrl: 'https://api.config.com'
  })
  // Results in: <https://api.config.com/users>
})

  // 3. Uses Playwright config's baseURL if available
  await apiRequest({
    method: 'GET',
    path: '/users'
  })
  // Results in: <https://your-playwright-config-baseurl.com/users> (from playwright.config.ts)

  // 4. Works with absolute URLs in path
  await apiRequest({
    method: 'GET',
    path: 'https://api.absolute.com/users'
  })
  // Results in: <https://api.absolute.com/users>
})
```
