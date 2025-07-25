# Recurse (Polling) Utility

The Recurse utility provides a powerful mechanism for polling and retrying operations using Playwright's `expect.poll`. It's perfect for testing asynchronous processes where you need to wait for a certain condition to be met.

> **Versatility Note**: While primarily designed for API testing scenarios, this utility is incredibly versatile and can be used for UI testing, complex workflows, and even performance testing. See the examples section for various applications.

## Features

- Type-safe polling with TypeScript generics
- Configurable timeout and interval settings
- Optional logging with customizable messages
- Post-polling callback support for additional processing
- **Enhanced Error Categorization**: Specific error types for timeout, command failure, and predicate errors

## Usage

The utility can be used in two ways:

### 1. As a Plain Function

```typescript
import { recurse } from '@seontechnologies/playwright-utils/recurse'

// Inside a test or another function
const result = await recurse(
  () => fetchSomeData(),
  (data) => data.status === 'ready',
  {
    timeout: 60000, // 60 seconds
    interval: 2000, // check every 2 seconds
    log: 'Waiting for data to be ready'
  }
)

// result contains the value from command when predicate returned true
```

### 2. As a Playwright Fixture

```typescript
// Import the fixture
import { test } from '@seontechnologies/playwright-utils/recurse/fixtures'

// Use the fixture in your tests
test('should wait for resource to be ready', async ({
  recurse,
  apiRequest
}) => {
  // Poll until session becomes active
  const session = await recurse(
    () => apiRequest({ method: 'GET', url: '/session' }),
    (response) => response.body.status === 'ACTIVE',
    { timeout: 60000, interval: 2000 }
  )

  // Assertions
  expect(session.body.id).toBeDefined()
})
```

## API Reference

### recurse Function

```typescript
async function recurse<T>(
  command: () => Promise<T>,
  predicate: (value: T) => boolean | void,
  options?: RecurseOptions
): Promise<T>
```

### Parameters

| Parameter | Type                            | Description                                                                                                           |
| --------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| command   | `() => Promise<T>`              | A function that returns a Promise. This is the operation you want to retry.                                           |
| predicate | `(value: T) => boolean \| void` | A function that tests the result from the command. Can either return a boolean or use assertions (expect statements). |
| options   | `RecurseOptions`                | Optional configuration for timeout, interval, and logging.                                                            |

### RecurseOptions

| Option   | Type                          | Default           | Description                                          |
| -------- | ----------------------------- | ----------------- | ---------------------------------------------------- |
| timeout  | number                        | 30000             | Maximum time to wait in milliseconds                 |
| interval | number                        | 1000              | How often to retry in milliseconds                   |
| log      | boolean \| string \| function | false             | Enables logging with default or custom messages      |
| error    | string                        | (default message) | Custom error message if timeout is reached           |
| post     | function                      | undefined         | Callback function that runs after successful polling |

### Working with Assertions

The recurse utility also supports using assertions directly in your predicate function. This makes your testing code more expressive and reduces boilerplate.

```typescript
// Using assertions in the predicate
await recurse(
  async () => {
    const event = await fetchEvent(eventId)
    return event
  },
  (event) => {
    // No need to return true/false - assertions work directly!
    expect(event).toEqual({
      id: eventId,
      status: 'completed',
      timestamp: expect.any(String)
    })
  },
  { timeout: 10000, interval: 500 }
)
```

Internally, the utility handles assertion errors gracefully:

- If the assertions pass, the predicate is considered successful
- If any assertion fails, the predicate is considered unsuccessful and will retry
- You can still return boolean values if preferred

### Return Type

The function returns a Promise that resolves to the value returned by the `command` function when the `predicate` function returns true.

## Error Handling

The recurse utility provides enhanced error categorization to help diagnose different types of failures:

### Error Types

```typescript
// Timeout errors - when polling exceeds the timeout limit
class RecurseTimeoutError extends Error {
  timeout: number // The timeout that was exceeded
  iterations: number // Number of attempts made
  lastValue?: unknown // Last value returned by command (if any)
}

// Command execution errors - when the command function throws
class RecurseCommandError extends Error {
  iteration: number // Which iteration failed
  originalError?: Error // The original error from command
}

// Predicate evaluation errors - when predicate function throws unexpectedly
class RecursePredicateError extends Error {
  iteration: number // Which iteration failed
  value?: unknown // The value that caused predicate to fail
  originalError?: Error // The original error from predicate
}
```

### Error Handling Examples

```typescript
test('handle different error types', async ({ recurse }) => {
  try {
    await recurse(
      () => unreliableCommand(),
      (value) => value.status === 'ready',
      { timeout: 5000 }
    )
  } catch (error) {
    if (error instanceof RecurseTimeoutError) {
      console.log(`Timeout after ${error.iterations} attempts`)
      console.log(`Last value was:`, error.lastValue)
    } else if (error instanceof RecurseCommandError) {
      console.log(`Command failed on iteration ${error.iteration}`)
      console.log(`Original error:`, error.originalError)
    } else if (error instanceof RecursePredicateError) {
      console.log(`Predicate failed on iteration ${error.iteration}`)
      console.log(`Value was:`, error.value)
    }
  }
})
```

## Examples

### Basic Waiting Pattern

```typescript
test('demonstrates basic polling', async ({ recurse }) => {
  // Wait for an asynchronous process to complete
  await recurse(
    () => checkProcessStatus(),
    (status) => status === 'completed',
    {
      timeout: 15000
    }
  )

  // Continue with test after condition is met
})
```

### Custom Logging

```typescript
test('demonstrates custom logging', async ({ recurse }) => {
  // Simple string logging
  await recurse(
    () => fetchData(),
    (data) => data.isReady,
    {
      log: 'Waiting for data to be ready',
      timeout: 15000
    }
  )

  // Custom function logging
  await recurse(
    () => fetchData(),
    (data) => data.isReady,
    {
      log: (value, data) => {
        console.log(
          `Attempt #${data.iteration}: Value is ${JSON.stringify(value)}`
        )
        console.log(`Elapsed: ${data.elapsed}ms of ${data.timeout}ms`)
      }
    }
  )
})
```

### Using the Post Callback

```typescript
test('demonstrates post callback', async ({ recurse }) => {
  // Track metrics or perform cleanup after successful polling
  await recurse(
    () => fetchData(),
    (data) => data.isReady,
    {
      post: (data) => {
        console.log(`Data became ready after ${data.iteration} attempts`)
        console.log(`Total time: ${data.elapsed}ms`)
        // Could also perform cleanup or logging to metrics service
      }
    }
  )
})
```

### Integration with API Request

```typescript
test('demonstrates wait for resource creation', async ({
  recurse,
  apiRequest
}) => {
  // Create a resource first
  const { body: createResponse } = await apiRequest({
    method: 'POST',
    url: '/api/resources',
    body: { name: 'Test Resource' }
  })

  const resourceId = createResponse.id

  // Wait for the resource to be fully processed (async operation)
  const { body: resource } = await recurse(
    () =>
      apiRequest({
        method: 'GET',
        url: `/api/resources/${resourceId}`
      }),
    (response) => response.body.status === 'READY',
    {
      timeout: 30000,
      interval: 2000,
      log: 'Waiting for resource to be ready'
    }
  )

  // Use the resource once it's active
  expect(resource.body.properties).toBeDefined()
})
```

### UI Testing Scenarios

```typescript
test('waits for dynamic UI changes', async ({ page, recurse }) => {
  await page.goto('https://example.com/dashboard')

  // Click a button that triggers an asynchronous data load
  await page.getByRole('button', { name: 'Load Data' }).click()

  // Wait for the UI to update with the loaded data
  // This approach is more flexible than fixed timeouts or simple waitFor methods
  const tableData = await recurse(
    async () => {
      // Get all row counts in the table
      return page.locator('table tr').count()
    },
    (rowCount) => rowCount > 1, // We expect at least one data row plus header
    {
      timeout: 10000,
      interval: 500,
      log: 'Waiting for table data to load'
    }
  )

  console.log(`Table loaded with ${tableData} rows`)

  // More complex example - waiting for specific content within the UI
  await recurse(
    async () => {
      // Extract the status text from a status indicator
      return page.locator('.status-indicator').textContent()
    },
    (status) => status === 'All Systems Operational',
    {
      log: (value, data) => {
        console.log(`Current status: ${value} (attempt #${data.iteration})`)
      }
    }
  )
})
```

### Event-Based Systems and Message Queues

The `recurse` utility is particularly valuable for event-based systems like Kafka, where you need to wait for asynchronous events to be processed. This real-world example demonstrates waiting for Kafka events in a CRUD workflow:

```typescript
test('CRUD operations with Kafka event verification', async ({
  addMovie,
  updateMovie,
  deleteMovie,
  authToken,
  recurse
}) => {
  // Create a resource with an API call
  const { body: createResponse } = await addMovie(authToken, movie)
  const movieId = createResponse.data.id

  // Wait for the creation event to appear in Kafka
  await recurse(
    async () => {
      const topic = 'movie-created'
      // Parse events from Kafka log
      return await parseKafkaEvent(movieId, topic)
    },
    // Using assertions directly in predicate function
    (event) =>
      expect(event).toEqual([
        {
          topic: 'movie-created',
          key: String(movieId),
          movie: {
            id: movieId,
            // Other expected properties
            name: movie.name,
            year: movie.year
          }
        }
      ]),
    {
      timeout: 10000,
      interval: 500,
      log: 'Waiting for movie-created event'
    }
  )

  // Later in the test lifecycle - after updating the movie
  await updateMovie(authToken, movieId, updatedMovie)

  // Wait for the update event
  await recurse(
    async () => {
      const topic = 'movie-updated'
      return await parseKafkaEvent(movieId, topic)
    },
    (event) => {
      expect(event).toEqual([
        {
          topic: 'movie-updated',
          key: String(movieId),
          movie: {
            id: movieId,
            // Updated properties
            name: updatedMovie.name
          }
        }
      ])
    },
    { timeout: 10000, interval: 500, log: 'Waiting for movie-updated event' }
  )

  // After deletion - verify the deletion event
  await deleteMovie(authToken, movieId)

  await recurse(
    async () => {
      const topic = 'movie-deleted'
      return await parseKafkaEvent(movieId, topic)
    },
    (event) => {
      expect(event).toEqual([
        {
          topic: 'movie-deleted',
          key: String(movieId),
          movie: { id: movieId }
        }
      ])
    },
    { timeout: 10000, interval: 500, log: 'Waiting for movie-deleted event' }
  )
})
```

This pattern is extremely useful for:

- Testing event-driven architectures
- Verifying event payloads match expectations
- Ensuring end-to-end data consistency
- Validating asynchronous workflows
- Testing CQRS (Command Query Responsibility Segregation) systems
