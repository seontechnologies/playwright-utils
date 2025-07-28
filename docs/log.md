# Logging Utility

A logging utility for Playwright tests that integrates with test reports, supports object logging, and provides step decorators.

## Quick Start

```typescript
import { log } from '@seontechnologies/playwright-utils'

// Basic logging
await log.info('Starting test')
await log.step('Test step shown in Playwright UI')
await log.success('Operation completed')
await log.warning('Something to note')
await log.error('Something went wrong')
await log.debug('Debug information')
```

## Real Examples

From actual test files in this repository:

### Basic Usage in Tests

```typescript
// From playwright/tests/external/todo-with-logs.spec.ts
test.beforeEach(async ({ page }) => {
  await log.step('Navigate to TodoMVC app')
  await page.goto('https://demo.playwright.dev/todomvc')
})

test('Log demo', async () => {
  await log.info('Starting TodoMVC test suite with enhanced logging')

  // Object logging with debug level
  await log.debug({ timestamp: new Date(), recordCount: 42 })

  // Success logging
  await log.success('success!')

  // Step logging (shows in Playwright UI)
  await log.step(
    'You should not log an object here, steps only display strings'
  )

  // Objects work but show empty in test steps
  await log.info({ someText: 'objects will show empty in test steps' })
})
```

### CRUD Operations with Auth Token

```typescript
// From playwright/tests/sample-app/backend/crud-movie-event.spec.ts
test('should crud', async ({ authToken, addMovie, getAllMovies }) => {
  await log.info(authToken) // Log the auth token

  // Add movie with logging
  const { body: createResponse } = await addMovie(authToken, movie)
  const movieId = createResponse.data.id

  await log.step('isKafkaWorking: ' + isKafkaWorking)

  // Conditional logging based on environment
  if (isKafkaWorking) {
    await log.warning('Kafka is not working, skipping Kafka event checks')
  }
})
```

### Auth Session Testing

```typescript
// From playwright/tests/auth-session/auth-session-sanity.spec.ts
test('should have auth token available', async ({ authToken }) => {
  // Create safe token preview for logging
  const tokenPreview = createTokenPreview(authToken)
  await log.info(`Token available without explicit fetching: ${tokenPreview}`)
})

test('should reuse the same auth token', async ({ authToken }) => {
  const tokenPreview = createTokenPreview(authToken)
  await log.step(
    `Second test reuses the token without fetching again: ${tokenPreview}`
  )
})
```

## Object Logging

Log objects directly for debugging:

```typescript
// From real test examples
await log.debug({ timestamp: new Date(), recordCount: 42 })

// Object with success status
await log.success({
  todoItem: 'buy some cheese',
  count: 1
})

// Objects with custom options
await log.warning(
  { warning: 'API rate limit exceeded', code: 'WARN001' },
  { console: { enabled: true, colorize: true } }
)
```

## File Logging

Enable file logging in your config:

```typescript
// playwright/config/dev.config.ts
import { log, captureTestContext } from '@seontechnologies/playwright-utils'

// Configure file logging globally
log.configure({
  fileLogging: {
    enabled: true,
    outputDir: 'playwright-logs/organized-logs',
    forceConsolidated: false // One file per test
  }
})

// In your fixtures
base.beforeEach(async ({}, testInfo) => {
  captureTestContext(testInfo) // Required for file logging
})
```

## Test Step Decorators

Create collapsible test steps in Playwright UI:

### Page Object Methods

```typescript
// From playwright/tests/external/todo-with-logs.spec.ts
class TodoPage {
  constructor(private page: Page) {
    this.name = 'TodoPage'
  }

  readonly name: string

  @methodTestStep('Add todo item')
  async addTodo(text: string) {
    await log.info(`Adding todo: ${text}`)
    const newTodo = this.page.getByPlaceholder('What needs to be done?')
    await newTodo.fill(text)
    await newTodo.press('Enter')
    await log.step('step within a decorator')
    await log.success(`Added todo: ${text}`)
  }

  @methodTestStep('Get all todos')
  async getTodos() {
    await log.info('Getting all todos')
    return this.page.getByTestId('todo-title')
  }
}
```

### Function Helpers

```typescript
// From real test files
const createDefaultTodos = functionTestStep(
  'Create default todos',
  async (page: Page) => {
    await log.info('Creating default todos')
    await log.step('step within a functionWrapper')
    const todoPage = new TodoPage(page)

    for (const item of TODO_ITEMS) {
      await todoPage.addTodo(item)
    }

    await log.success('Created all default todos')
  }
)

const checkNumberOfTodosInLocalStorage = functionTestStep(
  'Check total todos count fn-step',
  async (page: Page, expected: number) => {
    await log.info(`Verifying todo count: ${expected}`)
    const result = await page.waitForFunction(
      (e) => JSON.parse(localStorage['react-todos']).length === e,
      expected
    )
    await log.success(`Verified todo count: ${expected}`)
    return result
  }
)
```

## Configuration

Defaults: console logging enabled, file logging disabled.

```typescript
// Enable file logging in config
log.configure({
  console: true, // default
  fileLogging: {
    enabled: true,
    outputDir: 'playwright-logs',
    forceConsolidated: false // One file per test
  }
})

// Per-test override
await log.info('Message', {
  console: { enabled: false },
  fileLogging: { enabled: true }
})
```

### Environment Variables

```bash
# Disable all logging
SILENT=true

# Disable only file logging
DISABLE_FILE_LOGS=true

# Disable only console logging
DISABLE_CONSOLE_LOGS=true
```

### Level Filtering

```typescript
log.configure({
  level: 'warning' // Only warning, error levels will show
})

// Available levels (in priority order):
// debug < info < step < success < warning < error
```

### Sync Methods

For non-test contexts (global setup, utility functions):

```typescript
// Use sync methods when async/await isn't available
log.infoSync('Initializing configuration')
log.successSync('Environment configured')
log.errorSync('Setup failed')
```
