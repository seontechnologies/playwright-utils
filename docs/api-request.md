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

| Parameter     | Type                                                      | Description                                                                          |
| ------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| request       | APIRequestContext                                         | The Playwright request context                                                       |
| method        | 'GET' \| 'POST' \| 'PUT' \| 'DELETE' \| 'PATCH' \| 'HEAD' | HTTP method to use                                                                   |
| path          | string                                                    | The URL path (e.g., '/api/users')                                                    |
| baseUrl       | string (optional)                                         | Base URL to prepend to the path                                                      |
| configBaseUrl | string (optional)                                         | Fallback base URL from Playwright config                                             |
| body          | unknown (optional)                                        | Request body for POST/PUT/PATCH (internally mapped to Playwright's 'data' parameter) |
| headers       | Record<string, string> (optional)                         | HTTP headers                                                                         |
| params        | Record<string, string \| boolean \| number> (optional)    | Query parameters                                                                     |

### Return Type

```typescript
type ApiRequestResponse<T = unknown> = {
  status: number // HTTP status code
  body: T // Response body, typed as T
}
```

## Examples

### GET Request with Authentication

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

### Using URL Resolution Strategy

> **Note**: The apiRequest utility follows a priority order for resolving URLs:
>
> 1. Explicit `baseUrl` parameter in the function call
> 2. `configBaseUrl` parameter in the function call
> 3. Playwright config's `baseURL` from your `playwright.config.ts` file
> 4. Absolute URLs in the `path` parameter are used as-is

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
  await apiRequest({})
})
```

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
import { test } from '@seon/playwright-utils/api-request/fixtures'

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
