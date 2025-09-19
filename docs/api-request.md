# API Request Utility with Schema Validation

The API Request utility provides a clean, typed interface for making HTTP requests in Playwright tests with **built-in schema validation capabilities**. It handles URL construction, header management, response parsing, and **single-line response validation** with proper TypeScript support.

- [API Request Utility with Schema Validation](#api-request-utility-with-schema-validation)
  - [Features](#features)
  - [Usage](#usage)
    - [1. As a Plain Function](#1-as-a-plain-function)
    - [2. As a Playwright Fixture](#2-as-a-playwright-fixture)
  - [API Reference](#api-reference)
    - [apiRequest Function](#apirequest-function)
    - [Parameters](#parameters)
    - [Return Type](#return-type)
  - [Retry Logic (Cypress-Style)](#retry-logic-cypress-style)
    - [Default Behavior](#default-behavior)
    - [Retry Configuration](#retry-configuration)
    - [Retry Examples](#retry-examples)
      - [Default Retry Behavior](#default-retry-behavior)
      - [Disable Retry for Error Testing](#disable-retry-for-error-testing)
      - [Custom Retry Configuration](#custom-retry-configuration)
    - [Why Only 5xx Errors?](#why-only-5xx-errors)
  - [Examples](#examples)
    - [GET Request with Authentication](#get-request-with-authentication)
      - [POST Request with Body](#post-request-with-body)
    - [Handling Query Parameters](#handling-query-parameters)
    - [Handling Different Response Types](#handling-different-response-types)
    - [Using in Non-Test Contexts (Global Setup, Helpers)](#using-in-non-test-contexts-global-setup-helpers)
  - [🆕 Schema Validation](#-schema-validation)
    - [Quick Start - Schema Validation](#quick-start---schema-validation)
    - [Multi-Format Schema Support](#multi-format-schema-support)
      - [JSON Schema](#json-schema)
      - [Zod Schema Integration](#zod-schema-integration)
    - [URL Resolution Strategy](#url-resolution-strategy)
  - [UI Mode for API E2E Testing](#ui-mode-for-api-e2e-testing)
    - [Features](#features-1)
    - [Enabling UI Mode](#enabling-ui-mode)
      - [Method 1: Per-Request Basis](#method-1-per-request-basis)
      - [Method 2: Environment Variable (Recommended for API E2E)](#method-2-environment-variable-recommended-for-api-e2e)
      - [Method 3: In Test Hooks](#method-3-in-test-hooks)
    - [UI Mode Examples](#ui-mode-examples)
      - [Basic Usage with Environment Variable](#basic-usage-with-environment-variable)
      - [Per-Request UI Mode](#per-request-ui-mode)
      - [Combining with Other Utilities](#combining-with-other-utilities)
    - [Best Practices](#best-practices)
    - [What You'll See](#what-youll-see)
  - [Real-World Examples](#real-world-examples)
    - [CRUD Operations with Typed Fixtures](#crud-operations-with-typed-fixtures)
    - [Usage in Tests](#usage-in-tests)
    - [Benefits of this Pattern](#benefits-of-this-pattern)
    - [Integration with Auth Session](#integration-with-auth-session)
    - [Working with Async Operations and Polling](#working-with-async-operations-and-polling)

## Features

- **Automatic Retry Logic**: Cypress-style retry for server errors (5xx) enabled by default with exponential backoff
- Strong TypeScript typing for request parameters and responses
- Three-tier URL resolution strategy (explicit baseUrl, config baseURL, or direct path)
- Proper handling of URL path normalization and slashes
- Content-type based response parsing
- Support for all common HTTP methods
- **Enhanced UI Mode**: Visual display with schema validation results
- **🆕 Schema Validation**: Single-line response validation with multiple format support
- **🆕 Multi-Format Schemas**: JSON Schema, YAML files, OpenAPI specifications, Zod schemas

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

## 🆕 Schema Validation

### Peer Dependencies

Schema validation requires additional dependencies based on your validation needs:

```bash
# For JSON Schema validation (using AJV)
npm install ajv

# For Zod schema validation
npm install zod

# Install both if you need both validation types
npm install ajv zod
```

**Why peer dependencies?** These validation libraries are marked as optional peer dependencies to:

- Give you control over which validation libraries to include in your bundle
- Allow you to choose specific versions that work with your project
- Avoid unnecessary bundle size if you only need one type of validation

**Error handling:** If you attempt to use schema validation without the required dependency installed, you'll get a clear error message indicating which package to install.

### Quick Start - Schema Validation

Reduce 5-10 lines of manual validation to a single line with built-in schema validation:

```typescript
import { test, expect } from '@seontechnologies/playwright-utils/fixtures'
import { CreateMovieResponseSchema } from '../../../sample-app/shared/types/schema'

test('schema validation basics', async ({ apiRequest, authToken }) => {
  const movieData = {
    name: 'Test Movie',
    year: 2024,
    rating: 8.5,
    director: 'Test Director'
  }

  // Traditional approach: Multiple manual assertions
  const response = await apiRequest({
    method: 'POST',
    path: '/movies',
    body: movieData,
    headers: { Cookie: `seon-jwt=${authToken}` }
  })
  expect(response.status).toBe(200)
  expect(response.body.data.name).toBe('Test Movie')
  expect(response.body.data.id).toBeDefined()
  // ... more assertions

  // NEW: Single-line schema validation with Zod
  const validatedResponse = await apiRequest({
    method: 'POST',
    path: '/movies',
    body: movieData,
    headers: { Cookie: `seon-jwt=${authToken}` }
  }).validateSchema(CreateMovieResponseSchema, {
    shape: { status: 200, data: { name: 'Test Movie' } }
  })

  // Type assertion needed for accessing response data
  const responseBody = validatedResponse.body as {
    status: number
    data: { id: string; name: string }
  }

  // Response is guaranteed valid with proper typing
  expect(responseBody.data.id).toBeDefined()
  expect(responseBody.data.name).toBe('Test Movie')
})
```

### Multi-Format Schema Support

#### JSON Schema

```typescript
test('JSON Schema validation basics', async ({ apiRequest, authToken }) => {
  const movieData = {
    name: 'Test Movie',
    year: 2024,
    rating: 8.5,
    director: 'Test Director'
  }

  // Define JSON schema directly
  const jsonSchema = {
    type: 'object',
    properties: {
      status: { type: 'number' },
      data: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          year: { type: 'number' },
          rating: { type: 'number' },
          director: { type: 'string' }
        },
        required: ['id', 'name', 'year', 'rating', 'director']
      }
    },
    required: ['status', 'data']
  }

  const response = await apiRequest({
    method: 'POST',
    path: '/movies',
    body: movieData,
    headers: { Cookie: `seon-jwt=${authToken}` }
  }).validateSchema(jsonSchema, {
    shape: {
      status: 200,
      data: {
        name: movieData.name,
        year: movieData.year,
        rating: movieData.rating,
        director: movieData.director
      }
    }
  })

  // Type assertion for accessing response data
  const responseBody = response.body as {
    status: number
    data: { id: string; name: string }
  }

  // Response is guaranteed valid and type-safe
  expect(responseBody.data.id).toBeDefined()
  expect(responseBody.data.name).toBe(movieData.name)
})
```

#### Zod Schema Integration

```typescript
import { CreateMovieResponseSchema } from '../../../sample-app/shared/types/schema'

test('Zod schema validation with TypeScript inference', async ({
  apiRequest,
  authToken
}) => {
  const movieData = {
    name: 'Test Movie',
    year: 2024,
    rating: 8.5,
    director: 'Test Director'
  }

  const response = await apiRequest({
    method: 'POST',
    path: '/movies',
    body: movieData,
    headers: { Cookie: `seon-jwt=${authToken}` }
  }).validateSchema(CreateMovieResponseSchema)

  // Type assertion needed for accessing response data
  const responseBody = response.body as {
    status: number
    data: { id: string; name: string }
  }

  expect(responseBody.data.id).toBeDefined()
  expect(responseBody.data.name).toBe(movieData.name)
  expect(responseBody.status).toBe(200)
})
```

#### OpenAPI Specification Support

```typescript
import openApiJson from '../../../sample-app/backend/src/api-docs/openapi.json'

test('OpenAPI JSON specification validation', async ({
  apiRequest,
  authToken
}) => {
  const response = await apiRequest({
    method: 'POST',
    path: '/movies',
    body: movieData,
    headers: { Cookie: `seon-jwt=${authToken}` }
  }).validateSchema(openApiJson, {
    endpoint: '/movies',
    method: 'POST',
    status: 200,
    shape: {
      status: 200,
      data: {
        name: movieData.name,
        year: movieData.year
      }
    }
  })

  // Type assertion for accessing response data
  const responseBody = response.body as {
    status: number
    data: { id: string; name: string }
  }

  expect(responseBody.data.id).toBeDefined()
  expect(responseBody.data.name).toBe(movieData.name)
})

test('OpenAPI YAML file validation', async ({ apiRequest, authToken }) => {
  const response = await apiRequest({
    method: 'POST',
    path: '/movies',
    body: movieData,
    headers: { Cookie: `seon-jwt=${authToken}` }
  }).validateSchema('./api-docs/openapi.yml', {
    path: '/movies', // 'path' and 'endpoint' are interchangeable
    method: 'POST',
    status: 200
  })

  const responseBody = response.body as {
    status: number
    data: { id: string }
  }

  expect(responseBody.data.id).toBeDefined()
})
```

#### Schema-Only Validation (No Shape Assertions)

```typescript
import { GetMovieResponseUnionSchema } from '../../../sample-app/shared/types/schema'

test('schema validation without shape assertions', async ({
  apiRequest,
  authToken
}) => {
  // Schema-only validation - options parameter is optional
  const response = await apiRequest({
    method: 'GET',
    path: `/movies/123`,
    headers: { Cookie: `seon-jwt=${authToken}` }
  }).validateSchema(GetMovieResponseUnionSchema)

  // Type assertion for accessing response data
  const responseBody = response.body as {
    status: number
    data: unknown
  }

  // Only schema compliance is validated, no additional shape assertions
  expect(responseBody.status).toBe(200)
  expect(responseBody.data).toBeDefined()
})
```

#### Return Mode (Non-Throwing Validation)

```typescript
import { z } from 'zod'

test('return mode validation - does not throw on failure', async ({
  apiRequest,
  authToken
}) => {
  const response = await apiRequest({
    method: 'POST',
    path: '/movies',
    body: movieData,
    headers: { Cookie: `seon-jwt=${authToken}` }
  }).validateSchema(
    z.object({
      status: z.literal(999), // This will fail - API returns 200
      data: z.any()
    }),
    {
      mode: 'return' // Don't throw on failure
    }
  )

  // Response indicates validation failure but doesn't throw
  expect(response.validationResult.success).toBe(false)
  expect(response.validationResult.errors).toBeDefined()
  expect(response.validationResult.errors.length).toBeGreaterThan(0)

  // Original response data is still accessible
  const responseBody = response.body as {
    status: number
    data: unknown
  }
  expect(responseBody.status).toBe(200)
  expect(responseBody.data).toBeDefined()
})
```

#### Advanced Shape Validation with Functions

```typescript
import { CreateMovieResponseSchema } from '../../../sample-app/shared/types/schema'

test('combined schema + shape validation with functions', async ({
  apiRequest,
  authToken
}) => {
  const response = await apiRequest({
    method: 'POST',
    path: '/movies',
    body: movieData,
    headers: { Cookie: `seon-jwt=${authToken}` }
  }).validateSchema(CreateMovieResponseSchema, {
    shape: {
      status: 200,
      data: {
        name: (name: string) => name.length > 0,
        year: (year: number) =>
          year >= 1900 && year <= new Date().getFullYear(),
        rating: (rating: number) => rating >= 0 && rating <= 10,
        id: (id: string) => typeof id === 'number'
      }
    }
  })

  // Type assertion for accessing response data
  const responseBody = response.body as {
    status: number
    data: { name: string; year: number }
  }

  // Both schema compliance AND shape assertions pass
  expect(responseBody.data.name).toBe(movieData.name)
  expect(responseBody.data.year).toBe(movieData.year)
})
```

### URL Resolution Strategy

> **Note**: The apiRequest utility follows a priority order for resolving URLs:
>
> 1. Explicit `baseUrl` parameter in the function call
> 2. `configBaseUrl` parameter in the function call
> 3. Playwright config's `baseURL` from your `playwright.config.ts` file
> 4. Absolute URLs in the `path` parameter are used as-is

## UI Mode for API E2E Testing

Enables rich visual feedback for API requests in Playwright UI with formatted request/response details, duration tracking, and status color coding.

### Enable UI Mode

**Environment Variable (Recommended):**

```typescript
// In config or at top of test file
process.env.API_E2E_UI_MODE = 'true'
```

**Per-Request:**

```typescript
const response = await apiRequest({
  method: 'GET',
  path: '/api/movies',
  uiMode: true
})
```

### Example

```typescript
process.env.API_E2E_UI_MODE = 'true'

test('API test with UI display', async ({ apiRequest }) => {
  const { status, body } = await apiRequest({
    method: 'POST',
    path: '/api/movies',
    body: { name: 'Test Movie', year: 2023 }
  })

  expect(status).toBe(201)
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

### Usage in Tests - Traditional vs Schema Validation

Real examples showing both approaches from the CRUD tests:

```typescript
// From playwright/tests/sample-app/backend/crud-movie-event.spec.ts
test('should perform CRUD operations with schema validation', async ({
  addMovie,
  getAllMovies,
  getMovieById,
  updateMovie,
  deleteMovie,
  authToken
}) => {
  const movie = generateMovieWithoutId()
  const updatedMovie = generateMovieWithoutId()

  // Create movie with BOTH schema validation AND traditional assertions
  const { body: createResponse, status: createStatus } = await addMovie(
    authToken,
    movie
  ).validateSchema(CreateMovieResponseSchema, {
    shape: {
      status: 200,
      data: { ...movieProps, id: expect.any(String) }
    }
  })

  // Traditional assertions kept for comparison - with validateSchema we get BOTH:
  // 1. Schema validation (above) + 2. Traditional assertions (below) if desired
  expect(createStatus).toBe(200)
  expect(createResponse).toMatchObject({
    status: 200,
    data: { ...movieProps, id: movieId }
  })

  const movieId = createResponse.data.id

  // Get all movies with schema validation
  const { body: getAllResponse, status: getAllStatus } = await getAllMovies(
    authToken
  ).validateSchema(GetMovieResponseUnionSchema, {
    shape: {
      status: 200,
      data: expect.arrayContaining([
        expect.objectContaining({ id: movieId, name: movie.name })
      ])
    }
  })
  // classic assertions: we can do either the above or the below
  expect(getAllResponse).toMatchObject({
    status: 200,
    data: expect.arrayContaining([
      expect.objectContaining({ id: movieId, name: movie.name })
    ])
  })
  expect(getAllStatus).toBe(200)

  // Get movie by ID with schema-only validation (no shape assertions)
  const { body: getByIdResponse, status: getByIdStatus } = await getMovieById(
    authToken,
    movieId
  ).validateSchema(GetMovieResponseUnionSchema)

  // Traditional assertions can coexist with schema validation
  expect(getByIdStatus).toBe(200)
  expect(getByIdResponse).toMatchObject({
    status: 200,
    data: { ...movieProps, id: movieId }
  })

  // Update movie with schema validation
  const { body: updateResponse, status: updateStatus } = await updateMovie(
    authToken,
    movieId,
    updatedMovie
  ).validateSchema(UpdateMovieResponseSchema, {
    shape: {
      status: 200,
      data: {
        id: movieId,
        name: updatedMovie.name,
        year: updatedMovie.year,
        rating: updatedMovie.rating,
        director: updatedMovie.director
      }
    }
  })
  // classic assertions: we can do either the above or the below
  expect(updateStatus).toBe(200)

  // Delete with schema validation
  const { status: deleteStatus, body: deleteResponseBody } = await deleteMovie(
    authToken,
    movieId
  ).validateSchema(DeleteMovieResponseSchema, {
    shape: {
      message: `Movie ${movieId} has been deleted`
    }
  })
  expect(deleteStatus).toBe(200)
  expect(deleteResponseBody.message).toBe(`Movie ${movieId} has been deleted`)

  // Verify movie no longer exists with schema validation
  await getAllMovies(authToken).validateSchema(GetMovieResponseUnionSchema, {
    shape: {
      status: 200,
      data: expect.not.arrayContaining([
        expect.objectContaining({ id: movieId })
      ])
    }
  })
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
