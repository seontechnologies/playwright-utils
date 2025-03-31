# Recurse (Polling) Utility

The Recurse utility provides a powerful mechanism for polling and retrying operations using Playwright's `expect.poll`. It's perfect for testing asynchronous processes where you need to wait for a certain condition to be met.

> **Versatility Note**: While primarily designed for API testing scenarios, this utility is incredibly versatile and can be used for UI testing, complex workflows, and even performance testing. See the examples section for various applications.

## Features

- Type-safe polling with TypeScript generics
- Configurable timeout and interval settings
- Optional logging with customizable messages
- Post-polling callback support for additional processing
- Proper error handling with customizable messages

## Usage

The utility can be used in two ways:

### 1. As a Plain Function

```typescript
import { recurse } from '@seon/playwright-utils'

// Inside a test or another function
const result = await recurse({
  command: () => fetchSomeData(),
  predicate: (data) => data.status === 'ready',
  options: {
    timeout: 60000, // 60 seconds
    interval: 2000, // check every 2 seconds
    log: 'Waiting for data to be ready'
  }
})

// result contains the value from command when predicate returned true
```

### 2. As a Playwright Fixture

```typescript
// Import the fixture
import { test } from '@seon/playwright-utils/fixtures'

// Use the fixture in your tests
test('should wait for resource to be ready', async ({
  recurse,
  apiRequest
}) => {
  // Poll until session becomes active
  const session = await recurse({
    command: () => apiRequest({ method: 'GET', url: '/session' }),
    predicate: (response) => response.body.status === 'ACTIVE',
    options: { timeout: 60000, interval: 2000 }
  })

  // Assertions
  expect(session.body.id).toBeDefined()
})
```

## API Reference

### recurse Function

```typescript
async function recurse<T>({
  command,
  predicate,
  options
}: RecurseParams<T>): Promise<T>
```

### Parameters

| Parameter | Type                      | Description                                                              |
| --------- | ------------------------- | ------------------------------------------------------------------------ |
| command   | () => Promise\<T\>        | Function that returns a value to test                                    |
| predicate | (value: T) => boolean     | Function that tests the value and returns true when the condition is met |
| options   | RecurseOptions (optional) | Configuration options                                                    |

### RecurseOptions

| Option   | Type                          | Default           | Description                                          |
| -------- | ----------------------------- | ----------------- | ---------------------------------------------------- |
| timeout  | number                        | 30000             | Maximum time to wait in milliseconds                 |
| interval | number                        | 1000              | How often to retry in milliseconds                   |
| log      | boolean \| string \| function | false             | Enables logging with default or custom messages      |
| error    | string                        | (default message) | Custom error message if timeout is reached           |
| post     | function                      | undefined         | Callback function that runs after successful polling |

### Return Type

The function returns a Promise that resolves to the value returned by the `command` function when the `predicate` function returns true.

## Examples

### Basic Waiting Pattern

```typescript
test('demonstrates basic polling', async ({ recurse }) => {
  // Wait for an asynchronous process to complete
  await recurse({
    command: () => checkProcessStatus(),
    predicate: (status) => status === 'completed',
    options: { timeout: 15000 }
  })

  // Continue with test after condition is met
})
```

### Custom Logging

```typescript
test('demonstrates custom logging', async ({ recurse }) => {
  // Simple string logging
  await recurse({
    command: () => fetchData(),
    predicate: (data) => data.isReady,
    options: {
      log: 'Waiting for data to be ready',
      timeout: 15000
    }
  })

  // Custom function logging
  await recurse({
    command: () => fetchData(),
    predicate: (data) => data.isReady,
    options: {
      log: (value, data) => {
        console.log(
          `Attempt #${data.iteration}: Value is ${JSON.stringify(value)}`
        )
        console.log(`Elapsed: ${data.elapsed}ms of ${data.timeout}ms`)
      }
    }
  })
})
```

### Using the Post Callback

```typescript
test('demonstrates post callback', async ({ recurse }) => {
  // Track metrics or perform cleanup after successful polling
  await recurse({
    command: () => fetchData(),
    predicate: (data) => data.isReady,
    options: {
      post: (data) => {
        console.log(`Data became ready after ${data.iteration} attempts`)
        console.log(`Total time: ${data.elapsed}ms`)
        // Could also perform cleanup or logging to metrics service
      }
    }
  })
})
```

### Integration with API Request

```typescript
test('demonstrates integration with apiRequest', async ({
  recurse,
  apiRequest
}) => {
  // Wait for a resource to be created and reach a specific state
  const resource = await recurse({
    command: async () => {
      // Get the latest status
      return apiRequest({
        method: 'GET',
        path: `/api/resources/${resourceId}`
      })
    },
    predicate: (response) => {
      // Check if the resource is in the desired state
      return response.status === 200 && response.body.state === 'ACTIVE'
    },
    options: {
      timeout: 60000,
      interval: 5000,
      log: 'Waiting for resource to become active'
    }
  })

  // Use the resource once it's active
  expect(resource.body.properties).toBeDefined()
})
```

### UI Testing Scenarios

```typescript
test('waits for dynamic UI changes', async ({ page, recurse }) => {
  await page.goto('https://example.com/dashboard');
  
  // Click a button that triggers an asynchronous data load
  await page.getByRole('button', { name: 'Load Data' }).click();
  
  // Wait for the UI to update with the loaded data
  // This approach is more flexible than fixed timeouts or simple waitFor methods
  const tableData = await recurse({
    command: async () => {
      // Get all row counts in the table
      return page.locator('table tr').count()
    },
    predicate: (rowCount) => rowCount > 1, // We expect at least one data row plus header
    options: {
      timeout: 10000,
      interval: 500,
      log: 'Waiting for table data to load'
    }
  });
  
  console.log(`Table loaded with ${tableData} rows`);
  
  // More complex example - waiting for specific content within the UI
  await recurse({
    command: async () => {
      // Extract the status text from a status indicator
      return page.locator('.status-indicator').textContent()
    },
    predicate: (status) => status === 'All Systems Operational',
    options: {
      log: (value, data) => {
        console.log(`Current status: ${value} (attempt #${data.iteration})`)
      }
    }
  });
});
```
