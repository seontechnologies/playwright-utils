# Playwright Logging Utility

A functional logging utility for Playwright tests with enhanced features for test automation.

- [Playwright Logging Utility](#playwright-logging-utility)
  - [Core Features](#core-features)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
    - [Basic Usage](#basic-usage)
    - [Object Logging](#object-logging)
    - [Logging out to text file(s)](#logging-out-to-text-files)
  - [Configuration](#configuration)
    - [Default Settings](#default-settings)
    - [Logging to text file(s)](#logging-to-text-files)
      - [`log.configure`](#logconfigure)
      - [`captureTestContext`](#capturetestcontext)
  - [API Reference](#api-reference)
    - [Log Levels](#log-levels)
    - [Configuration Options](#configuration-options)
    - [Logging examples](#logging-examples)
  - [Worker ID Logging](#worker-id-logging)
    - [Sample Output](#sample-output)
    - [Per-Message Worker ID Options](#per-message-worker-id-options)
  - [Test Step Decorators / Function Wrappers](#test-step-decorators--function-wrappers)
    - [Test Step Decorators: Benefits and Usage](#test-step-decorators-benefits-and-usage)
      - [Example Comparison](#example-comparison)
        - [With raw test.step (verbose and error-prone)](#with-raw-teststep-verbose-and-error-prone)
        - [With our decorators (clean and maintainable)](#with-our-decorators-clean-and-maintainable)
    - [Available Decorators](#available-decorators)
    - [Using Method Decorators in Page Objects](#using-method-decorators-in-page-objects)
    - [Using Function Decorators for Utility Functions / Functional Helpers](#using-function-decorators-for-utility-functions--functional-helpers)
    - [Source Tracking Configuration for Decorators](#source-tracking-configuration-for-decorators)
      - [How Decorator Source Tracking Works](#how-decorator-source-tracking-works)
      - [Benefits of Decorator Source Tracking](#benefits-of-decorator-source-tracking)
      - [Custom Exclusions](#custom-exclusions)
  - [Design Decisions](#design-decisions)

## Core Features

- **Unified Options Interface**: Consistent API with configurable defaults
- **Console Formatting**: Clear visual indicators for different log levels
- **Playwright Integration**: Automatic test step reporting
- **Page Object method decorators/ functional helper wrappers**: for collapsible test steps in PW UI

## Installation

```bash
npm install @seon/playwright-utils
```

## Quick Start

### Basic Usage

```typescript
// todo-with-logs.spec.ts
import type { Page } from '@playwright/test'
import { test, expect } from '../support/fixtures'
import { log, methodTestStep, functionTestStep } from '@seon/playwright-utils'

// Simple logging with different levels in a test
test('should allow me to add todo items', async ({ page }) => {
  await log.info('Starting todo creation test')
  await log.step('Adding new todo items')

  // Test code...

  await log.success('Successfully added all todo items')
  await log.warning('Some items might be duplicates')

  // Object logging capability
  await log.info({
    todoItems: ['buy milk', 'clean house'],
    completed: 1,
    total: 2
  })

  // Log with object as the first argument and config as the second
  await log.debug(
    { userId: 123, action: 'login' },
    { console: { enabled: true } }
  )
})
```

### Object Logging

The logging system supports direct object logging. Each log function accepts either a string message or an object as the first parameter, and an optional configuration object as the second parameter.

```typescript
// Log an object directly
await log.info({ userId: 123, status: 'active' })

// Log a string message with a configuration object
await log.success('Operation completed', {
  console: { enabled: true, colorize: true }
})

// Log a string message with an object (useful for debugging)
await log.debug('User data:', {
  user: { id: 123, name: 'John Doe', role: 'admin' }
})

// Log an object with a configuration object
await log.warning(
  { warning: 'API rate limit exceeded', code: 'WARN001' },
  { fileLogging: { enabled: true } }
)
```

Objects are automatically formatted with 2-space indentation for readability. The structure is preserved, making it easy to inspect complex objects in your logs.

### Logging out to text file(s)

By default we async-log to console and to PW-UI test steps. Additionally we can log to a single text file, or a text file per PW test.

```typescript
// *.config.ts

// ....
import { log } from '@seon/playwright-utils'

// IMPORTANT: the setup for logging to files needs to be uniform between test files
// best place to put it is in a config file

// ORGANIZED LOGS
log.configure({
  fileLogging: {
    enabled: true,
    defaultTestFolder: 'organized-by-test', // Set explicitly different from 'consolidated-logs'
    forceConsolidated: false, // Explicitly disable consolidation
    outputDir: 'playwright-logs/organized-logs'
  }
})

export default defineConfig(
  ....
)

//////////////// at the main fixture file

//  support/fixtures.ts

import { test as base } from '@playwright/test'
import { captureTestContext } from '@seon/playwright-utils'

// a hook that will run before each test in the suite
// this is like having the below code in each test file
// test.beforeEach(async ({}, testInfo) => {
//   captureTestContext(testInfo)
// })
base.beforeEach(async ({}, testInfo) => {
  captureTestContext(testInfo)
})

export const test = base
export const expect = base.expect
```

## Configuration

### Default Settings

The logging system comes with sensible defaults and uses a unified configuration approach:

```typescript
// These are the internal defaults - you don't need to set these explicitly
const defaults = {
  // Console output is enabled
  console: true,
  // File logging is enabled and writes to playwright-logs directory
  fileLogging: false,
  // Format settings for prefixes (ℹ, ✓, ⚠), timestamps, and colors
  format: {
    /* ... */
  }
}
```

We use a single `log.configure()` function for all configuration needs with a clear priority order of **base config < fixture files < test files**. Each level inherits from the previous while allowing specific overrides.

### Logging to text file(s)

Logging to text files is turned off by default because of the I/O cost.

It will be turned on when `log.configure` and `captureTestContext` are utilized.

#### `log.configure`

```typescript
// -- RECOMMENDED APPROACHES: Choose ONE location for logging configuration --

// OPTION 1: Configure only in base.config.ts
// -------------------------------------------------------
// In your playwright/config/base.config.ts

// ...
import { log } from '@seon/playwright-utils'

// Configure all logging in base config
log.configure({
  // console: { enabled: true, colorize: true }, // default settings
  fileLogging: {
    enabled: true,
    outputDir: 'playwright-logs'
  }
})

export const baseConfig = defineConfig({
  //
})

// In your playwright/config/dev.config.ts - NO logging configuration here
export default defineConfig()
// ...

// OPTION 2: Configure only in environment configs (ACTUAL IMPLEMENTATION in this repo)
// -------------------------------------------------------
// dev.config.ts
// ...
import { log } from '@seon/playwright-utils'

// ALL logging configuration in environment config

// Use either or:

// SINGLE LOG FILE
// log.configure({
//   fileLogging: {
//     enabled: true,
//     // Force all tests to use this specific folder regardless of test context
//     defaultTestFolder: 'all-tests-in-one',
//     forceConsolidated: true,
//     outputDir: 'playwright-logs/'
//   }
// })

// ORGANIZED LOGS
log.configure({
  fileLogging: {
    enabled: true,
    defaultTestFolder: 'before-hooks', // all hooks go to the default folder
    forceConsolidated: false, // Explicitly disable consolidation
    outputDir: 'playwright-logs/'
  }
})

export default defineConfig()
// ....

//////////////////////////////// NOTE /////////////////////////
//
// ❌ INCORRECT: Configuration split between base and environment is NOT OK
// This makes configuration harder to track and reason about
```

#### `captureTestContext`

There are two recommended approaches:

```typescript
// OPTION 1: Create a shared fixture with beforeEach hook (RECOMMENDED)
// In playwright/support/fixtures.ts or where your main fixture is
import { test as base } from '@playwright/test'
import { captureTestContext } from '@seon/playwright-utils'

// Capture test context in a beforeEach hook
base.beforeEach(async ({}, testInfo) => {
  captureTestContext(testInfo)
})

// Export test and expect for your test files to use
export const test = base
export const expect = base.expect

// Then in your test files, simply import from this fixture:
import { test, expect } from '../support/fixtures'

test('example test', async () => {
  await log.info('This log will be organized by test file and name')
})

////////////////////////////

// OPTION 2: Add the hook in each test file individually
import { test } from '@playwright/test'
import { log, captureTestContext } from '@seon/playwright-utils'

// Add the context capture in each test file's beforeEach hook
test.beforeEach(async ({}, testInfo) => {
  captureTestContext(testInfo)
})

test('example test', async () => {
  await log.info('This log will be organized by test file and name')
})
```

> **Priority Mechanism**: Settings are merged intelligently - local overrides don't completely replace global settings, they only override the specific properties that are defined.

## API Reference

### Log Levels

| Level     | Description         | Console Method | Visual Indicator |
| --------- | ------------------- | -------------- | ---------------- |
| `info`    | General information | console.info   | ℹ               |
| `step`    | Test step delimiter | console.log    | (newline)        |
| `success` | Success messages    | console.log    | ✓                |
| `warning` | Warning messages    | console.warn   | ⚠               |
| `error`   | Error messages      | console.error  | ✖               |
| `debug`   | Debug information   | console.debug  | 🔍               |

### Configuration Options

The logger can be configured globally using `log.configure()`. Here are the key configuration options with examples:

```typescript
// Basic configuration with defaults
log.configure({
  // Console output is enabled by default with colors
  console: true,

  // File logging is disabled by default
  fileLogging: false,

  // Worker ID is shown by default
  workerID: true
})

// Advanced configuration with detailed options
log.configure({
  // Console output configuration
  console: {
    enabled: true, // Enable console output
    colorize: true, // Use ANSI colors in console (default)
    timestamps: true // Show timestamps in console
  },

  // File logging configuration
  fileLogging: {
    enabled: false, // Enable file logging
    outputDir: 'playwright-logs/', // Directory for log files
    defaultTestFolder: 'all-tests-in-one', // Folder when no test context
    forceConsolidated: true, // Force all logs to one folder
    stripAnsiCodes: true, // Remove color codes in files
    timestamp: true, // Include timestamps
    prependTestFile: true // Include test file name in entries
  },

  // Worker ID configuration
  workerID: {
    enabled: true, // Enable worker ID prefix
    format: '[W{workerIndex}]' // Format string (default)
  }
})
```

### Logging examples

```typescript
// Basic string logging
await log.info('Processing started')
await log.step('Validating user input')
await log.success('User created successfully')
await log.warning('Failed to send confirmation email')
await log.error('Database connection failed')
await log.debug('Connection details', { host: 'localhost', port: 3306 })

// Object logging
await log.info({ userId: 123, action: 'login', timestamp: new Date() })

// Object with configuration
await log.warning(
  { warning: 'Rate limit exceeded', count: 100, limit: 50 },
  { console: { enabled: true, colorize: true } }
)

// Object logging examples
await log.info({
  key: 'value',
  data: [1, 2, 3],
  nested: { foo: 'bar' }
})

await log.warning(
  {
    warning: 'Rate limit exceeded',
    count: 100,
    limit: 50
  },
  {
    console: { enabled: true, colorize: true }
  }
)
```

All logging methods follow the same signature pattern:

```typescript
async function logXXX(message: string, options?: LoggingConfig): Promise<void>
```

```typescript
// Basic usage
await log.info('User logged in')

// With options
await log.warning('Unexpected response', {
  format: { prefix: '[API]' }
})

// Debug with console output disabled
await log.debug('Sensitive data', { console: false })

// Enable worker ID just for this log message
await log.info('Starting test in worker', {
  workerID: true
})

// Customize worker ID format for this log only
await log.info('Processing in worker', {
  workerID: { format: '[Worker #{workerIndex}]' }
})

// Using simple boolean values
await log.info('Simple configuration', {
  console: true, // Enable console output with default settings
  fileLogging: false // Disable file logging for this message
})

// Using detailed configuration objects
await log.info('Detailed configuration', {
  console: {
    enabled: true,
    colorize: false, // Disable colors
    timestamps: false // Disable timestamps
  },
  fileLogging: {
    enabled: true,
    outputDir: 'custom-logs' // Use custom output directory
  }
})

// Mixing styles
await log.debug('Mixed configuration styles', {
  console: true, // Simple boolean
  fileLogging: {
    // Detailed object
    enabled: true,
    forceConsolidated: true
  },
  format: {
    prefix: '[DEBUG] ' // Add a prefix
  }
})
await log.step('Major test section', {
  format: { addNewLine: true }
})

// context: Include structured data for machine parsing
await log.info('API response received', {
  context: {
    statusCode: 200,
    responseTime: 345,
    endpoint: '/api/users'
  }
})

// testFile and testName: Override context for specific logs (rarely needed)
await log.error('Test initialization failed', {
  testFile: 'custom-file.spec.ts', // Usually set automatically
  testName: 'Initial setup' // Usually set automatically
})

// Combining multiple options
await log.warning('Connection unstable', {
  console: true,
  fileLogging: true,
  format: {
    prefix: '[NETWORK]',
    addNewLine: true
  },
  context: { retryCount: 3 }
})
```

## Worker ID Logging

Parallel tests may need worker IDs for debugging multi-worker runs. Worker ID logging is **enabled by default** for convenience, but can be customized as needed:

```typescript
// playwright/config/base.config.ts
import { defineConfig } from '@playwright/test'
import { log } from '@seon/playwright-utils'

// Default configuration (worker IDs enabled automatically)
// log.configure({
//   console: {
//     enabled: true,
//     colorize: true
//   }
// workerID: { enabled: true } <- This is on by default, no need to specify
// })

// If you need to customize the worker ID format:
log.configure({
  workerID: {
    // enabled: false,           // Uncomment to disable worker IDs
    format: '[Worker-{workerIndex}]' // Change the format from default '[W{workerIndex}]'
  }
})

export const baseConfig = defineConfig({
  // ... your configuration
})
```

### Sample Output

```bash
[10:45:32] [W0] ℹ Starting test
[10:45:33] [W0] Starting a new step
[10:45:34] [W1] ℹ Different worker running another test
```

### Per-Message Worker ID Options

While the global worker ID format is set in your configuration, you can override it for individual log messages:

```typescript
import { test } from '@playwright/test'
import { log } from '@seon/playwright-utils'

test('example with custom worker ID', async () => {
  // Use the default worker ID format
  await log.info('Starting test')
  // Output: [10:45:32] [W0] ℹ Starting test

  // Disable worker ID for just one log message
  await log.info('Special message', { workerID: false })
  // Output: [10:45:32] ℹ Special message

  // Custom format for just one log message
  await log.info('Custom format message', {
    workerID: {
      format: '[Worker-{workerIndex}]'
    }
  })
  // Output: [10:45:32] [Worker-0] ℹ Custom format message
})
```

> **Note:** While it's technically possible to set a custom worker ID format for an entire test file using `log.configure()` in a `beforeAll` hook, we recommend using the global configuration for consistency and only overriding per-message when needed.

## Test Step Decorators / Function Wrappers

The library provides powerful decorators for organizing tests into logical steps with integrated logging. These decorators enhance both your code organization and test reporting by automatically wrapping methods and functions in Playwright's `test.step()` with proper logging and visibility in reports.

### Test Step Decorators: Benefits and Usage

Playwright has a built-in `test.step()` API, but our decorators provide several critical advantages:

| Feature          | Raw `test.step()`        | Our Decorators             |
| ---------------- | ------------------------ | -------------------------- |
| Boilerplate code | Requires manual wrapping | Eliminated                 |
| Error handling   | Manual in each method    | Automatic                  |
| Logging          | Must add manually        | Built-in with rich details |
| Code readability | Nested callbacks         | Clean, flat structure      |
| Step naming      | Manual string literals   | Auto-derived from methods  |

#### Example Comparison

##### With raw test.step (verbose and error-prone)

```typescript
class LoginPage {
  async login(username, password) {
    return await test.step('Login', async () => {
      try {
        console.log(`Logging in as ${username}`)
        await this.page.fill('#username', username)
        await this.page.fill('#password', password)
        await this.page.click('button[type="submit"]')
        console.log('Login successful')
      } catch (error) {
        console.error(`Login failed: ${error}`)
        throw error
      }
    })
  }
}
```

##### With our decorators (clean and maintainable)

```typescript
class LoginPage {
  @methodTestStep('Perform login')
  async login(username, password) {
    // Clean implementation with automatic logging and error handling
    await this.page.fill('#username', username)
    await this.page.fill('#password', password)
    await this.page.click('button[type="submit"]')
  }
}
```

### Available Decorators

> **Note on TypeScript Decorators:** These use TypeScript's experimental decorator feature. Ensure you have `"experimentalDecorators": true` in your `tsconfig.json`.

| Decorator          | Purpose                    | Usage                                            |
| ------------------ | -------------------------- | ------------------------------------------------ |
| `methodTestStep`   | Decorates class methods    | Use with `@` syntax on class methods             |
| `functionTestStep` | Wraps standalone functions | Use as a function wrapper for functional helpers |

### Using Method Decorators in Page Objects

The `methodTestStep` decorator is perfect for Page Object Model classes, automatically logging method execution and showing class context.

```typescript
import { methodTestStep } from '@seon/playwright-utils'

class LoginPage {
  constructor(private page) {}

  // Uses method name as step name
  @methodTestStep()
  async navigateTo() {
    await this.page.goto('/login')
  }

  // Custom step name
  @methodTestStep('Perform login')
  async login(username: string, password: string) {
    await this.page.fill('#username', username)
    await this.page.fill('#password', password)
    await this.page.click('button[type="submit"]')
  }
}

// Usage in tests
test('user can login', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.navigateTo()
  await loginPage.login('testuser', 'password')
  // Steps will show as "navigateTo (LoginPage)" and "Perform login (LoginPage)" in reports & PW UI
})
```

### Using Function Decorators for Utility Functions / Functional Helpers

The `functionTestStep` decorator is ideal for standalone utility functions / functional helpers that aren't part of a class.

```typescript
import { functionTestStep } from '@seon/playwright-utils'

// Create a decorated utility function
const checkElementCount = functionTestStep(
  'Check element count', // Required step name
  async (page, selector: string, expectedCount: number) => {
    // the inner function
    const elements = await page.$$(selector)
    if (elements.length !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} elements, found ${elements.length}`
      )
    }
    return elements
  }
)

// Usage in tests
test('page has correct number of items', async ({ page }) => {
  await page.goto('/products')
  const productCards = await checkElementCount(page, '.product-card', 10)
  // Step will show as "Check element count" in reports & PW UI
})
```

### Source Tracking Configuration for Decorators

Source file tracking is enabled by default for decorators but the file paths are not shown in logs to reduce noise. You can control this behavior using global configuration:

```typescript
// Global configuration - in your playwright config
import { log } from '@seon/playwright-utils'

log.configure({
  sourceFileTracking: {
    enabled: true, // Whether to track source file paths (default: true)
    showInLogs: false // Whether to display path in log messages (default: false)
  }
})
```

To temporarily show source files in logs for debugging decorated methods:

```typescript
// Enable source file display for a specific test
test.beforeEach(() => {
  log.configure({
    sourceFileTracking: { showInLogs: true }
  })
})

// Output format with source file showing:
// [10:45:32] [W0] ℹ LoginPage.login [src/pages/login-page.ts]
```

#### How Decorator Source Tracking Works

Decorator source tracking automatically analyzes the stack trace to extract the file path of the original method or function. This helps you identify which class or utility file contains the functionality, even when using abstraction layers.

```typescript
// This happens automatically when using these decorators:

// In a Page Object class
class LoginPage {
  @methodTestStep
  async login(username: string, password: string) {
    // Source file tracking automatically captures 'login-page.ts'
  }
}

// Or with function wrappers
const checkElementCount = functionTestStep(
  'Check element count',
  async (page, selector, count) => {
    // Source file tracking automatically captures the file this function is in
  }
)
```

#### Benefits of Decorator Source Tracking

- **Easier Debugging**: Quickly identify which file originated a log message or test failure
- **Better Traceability**: Follow the execution path through multiple files and components
- **Automatic with Decorators**: When using the `@methodTestStep()` decorator, source file information is automatically captured

#### Custom Exclusions

You can customize which files are excluded from the source path extraction:

```typescript
// Exclude specific files from being identified as the source
const sourcePath = extractSourceFilePath(['test-step.ts', 'my-utility.ts'])
```

## Design Decisions

**Why is Winston not used?**

Our custom logging implementation was chosen over Winston for several key reasons:

- **Zero Dependencies**: No additional packages to maintain or deploy

  - Avoids Winston's ~15 dependencies and ~1.5MB node_modules footprint

- **Performance**: Minimal overhead in CI environments

  - Eliminates Winston's ~50-100ms initialization time
  - Avoids ~3-5MB additional memory usage
  - No per-log transport and format processing overhead

- **Playwright-Optimized Design**: Purpose-built for test automation with:
  - Seamless integration with Playwright fixtures and contexts
  - Test name inference and consolidated reporting
  - Context-aware test lifecycle management
