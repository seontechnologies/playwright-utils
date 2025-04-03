# Playwright Logging Utility

A functional logging utility for Playwright tests with enhanced features for test automation.

- [Playwright Logging Utility](#playwright-logging-utility)
  - [Core Features](#core-features)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
  - [Basic Usage](#basic-usage)
  - [Configuration](#configuration)
    - [Default Settings](#default-settings)
    - [Unified Configuration API](#unified-configuration-api)
  - [API Reference](#api-reference)
    - [Log Levels](#log-levels)
    - [Global Configuration Interface](#global-configuration-interface)
    - [Logging Methods](#logging-methods)
    - [LogOptions Interface](#logoptions-interface)
    - [Using With Playwright Test Steps](#using-with-playwright-test-steps)
  - [Log Organization and Test Context](#log-organization-and-test-context)
    - [How Test Context Capture Works](#how-test-context-capture-works)
    - [Log File Structure](#log-file-structure)
  - [Worker ID Logging](#worker-id-logging)
    - [Sample Output](#sample-output)
    - [Per-Test Worker ID Override](#per-test-worker-id-override)
  - [Source File Tracking](#source-file-tracking)
    - [Source Tracking Configuration](#source-tracking-configuration)
    - [How It Works](#how-it-works)
    - [Benefits](#benefits)
    - [Custom Exclusions](#custom-exclusions)
  - [Test Step Decorators / Function Wrappers](#test-step-decorators--function-wrappers)
    - [Why Use Decorators / Function Wrappers?](#why-use-decorators--function-wrappers)
      - [Without Decorators (Using raw `test.step`)](#without-decorators-using-raw-teststep)
      - [With Decorators (Using our library)](#with-decorators-using-our-library)
    - [Raw test.step Usage (default Playwright API - Not Recommended)](#raw-teststep-usage-default-playwright-api---not-recommended)
      - [Working with raw test.step (click to expand)](#working-with-raw-teststep-click-to-expand)
    - [Available Decorators](#available-decorators)
    - [Using Method Decorators in Page Objects](#using-method-decorators-in-page-objects)
    - [Using Function Decorators for Utility Functions / Functional Helpers](#using-function-decorators-for-utility-functions--functional-helpers)

## Core Features

- **Functional Programming Approach**: Pure functions and immutable data flows
- **Unified Options Interface**: Consistent API with configurable defaults
- **Console Formatting**: Clear visual indicators for different log levels
- **Playwright Integration**: Automatic test step reporting

## Installation

```bash
npm install @seon/playwright-utils
```

## Quick Start

```typescript
// From base.config.ts
import { defineConfig } from '@playwright/test'
import { log, setupTestContextCapture } from '@seon/playwright-utils'

// Configure logging
log.configure({
  console: { enabled: true, colorize: true },
  workerID: { enabled: true }, // Auto-prefix logs with worker ID
  fileLogging: {
    enabled: true // Logs will be grouped by test run in playwright-logs
  }
})

// Enable automatic test context capture for organized logs
const testContextProject = setupTestContextCapture()

export default defineConfig({
  // Your other config settings...
  projects: [
    // Your existing projects...
    testContextProject
  ]
})
```

## Basic Usage

```typescript
// From todo-app-organized-log.spec.ts
import { log } from '@seon/playwright-utils'

// Simple logging with different levels in a test
test('should allow me to add todo items', async ({ page }) => {
  await log.info('Starting todo creation test')
  await log.step('Adding new todo items')
  
  // Test code...
  
  await log.success('Successfully added all todo items')
  await log.warning('Some items might be duplicates')
  
  // You can also log objects
  await log.debug('Current todo items:', { items: ['item1', 'item2'] })
})
```

## Configuration

### Default Settings

The logging system comes with these default settings:

```typescript
// These are the internal defaults - you don't need to set these
const defaults = {
  // Console output is enabled
  console: true,
  // File logging is enabled and writes to playwright-logs directory
  fileLogging: true,
  // Files are grouped by test run for better organization
  // Format settings
  format: {
    // Each log level has its own prefix (ℹ, ✓, ⚠, etc.)
    // Log timestamps are enabled
    // Output is colorized
  }
}
```

### Unified Configuration API

We use a single `log.configure()` function for all configuration needs with a clear priority order of **base config < fixture files < test files**. Each level inherits from the previous while allowing specific overrides.

```typescript
// -- Real configuration examples --

// 1. GLOBAL: In your playwright/config/base.config.ts
import { defineConfig } from '@playwright/test'
import { log } from '@seon/playwright-utils'

log.configure({
  console: false,
  fileLogging: true
})

export const baseConfig = defineConfig({
  testDir: './playwright/tests',
  // ... other configuration
})

// 2. PROJECT: In your playwright/config/dev.config.ts
import merge from 'lodash/merge'
import { defineConfig } from '@playwright/test'
import { baseConfig } from './base.config'
import { log, setupTestContextCapture } from '@seon/playwright-utils'

// Configure additional logging options
log.configure({
  fileLogging: {
    enabled: true
  }
})

// Enable automatic test context capture for organized logs
const testContextProject = setupTestContextCapture()

export default defineConfig(
  merge({}, baseConfig, { 
    // Add the test context project to enable organization
    projects: [...(baseConfig.projects || []), testContextProject]
  })
)

// 3. LOCAL: In your test files (if needed)
import { test } from '@playwright/test'
import { log, captureTestContext } from '@seon/playwright-utils'

// Only needed if not using setupTestContextCapture() in config
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

### Global Configuration Interface

Used with `log.configure()` for system-wide settings:

```typescript
interface LoggingConfig {
  // Console output configuration
  console?: {
    enabled: boolean // Enable/disable console output
    colorize?: boolean // Enable/disable ANSI colors
    timestamps?: boolean // Show timestamps in console
  }

  // File logging configuration
  fileLogging?: {
    enabled: boolean // Enable/disable file logging
    outputDir?: string // Directory for log files
    testFolder?: string // Default folder name for logs when no test context is available
  }

  // Worker ID configuration
  workerID?: {
    enabled: boolean // Enable/disable worker ID prefix (default: false)
    format?: string // Format string (default: '[W{workerIndex}]')
  }
}
```

### Logging Methods

All logging methods follow the same signature pattern:

```typescript
async function logXXX(message: string, options?: LogOptions): Promise<void>
```

Example usage:

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
```

### LogOptions Interface

The logging options that can be passed per individual log call:

```typescript
interface LogOptions {
  /** Enable/disable console output for this log (default: true) */
  console?: boolean

  /** Enable/disable worker ID for this log (overrides global setting) */
  workerID?:
    | boolean
    | {
        enabled?: boolean
        format?: string
      }

  /** Enable/disable file logging for this log (default: based on global config) */
  fileLogging?: boolean

  /** Formatting options */
  format?: {
    /** Add a prefix to the message (perfect for worker IDs) */
    prefix?: string
    /** Add a new line after the message */
    addNewLine?: boolean
  }

  /** Additional metadata for structured logging */
  context?: Record<string, unknown>

  /** Test file path (usually set automatically) */
  testFile?: string

  /** Test name (usually set automatically) */
  testName?: string
}
```

Examples for each property:

```typescript
// Basic usage - just logs the message
await log.info('User logged in')

// console: Enable/disable console output for this specific log
await log.debug('Sensitive data', {
  console: false // Only log to file, not to console
})

// fileLogging: Enable/disable file logging for this specific log
await log.info('Temporary debug info', {
  fileLogging: false // Only log to console, don't persist to file
})

// format.prefix: Add custom prefix to this log message (e.g., worker ID)
await log.info('Starting test', {
  format: { prefix: `[W${test.info().workerIndex}]` }
})

// format.addNewLine: Add a blank line after this message for better readability
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

**Note:** The timestamps and colorization are controlled via the global configuration, not per-call options.

### Using With Playwright Test Steps

The logging utility automatically integrates with Playwright's test step API when used in a test context, creating steps in Playwright reports and UI:

```typescript
import { test } from '@playwright/test'
import { log } from '@seon/playwright-utils'

test('demonstrates test step integration', async ({ page }) => {
  await log.step('Navigating to page')
  await page.goto('https://example.com')

  await log.step('Clicking button')
  await page.click('button')

  await log.success('Test completed')
})
```

## Log Organization and Test Context

Logs are automatically organized by test file and test name when test context is captured. This provides a clean separation of logs for each test run.

### How Test Context Capture Works

#### Option 1: Global Configuration (Recommended)

The simplest way to enable log organization is at the project configuration level. This requires zero changes to your test files:

```typescript
// From playwright/config/dev.config.ts
import merge from 'lodash/merge'
import { defineConfig } from '@playwright/test'
import { baseConfig } from './base.config'
import { log, setupTestContextCapture } from '@seon/playwright-utils'

// 1. Configure logging
log.configure({
  fileLogging: {
    enabled: true
  }
})

// 2. Enable automatic test context capture for organized logs
// This is all you need to add to get logs organized by test file and name
const testContextProject = setupTestContextCapture()

export default defineConfig(
  merge({}, baseConfig, { 
    // Your other config options here
    use: { baseURL: 'https://test-api.k6.io' },
    
    // 3. Add the special project to your config
    projects: [...(baseConfig.projects || []), testContextProject]
  })
)
```

#### Option 2: Per-Test-File Setup

If you can't modify your global configuration, you can still enable log organization in individual test files:

```typescript
// From todo-app-organized-log.spec.ts - Using captureTestContext
import { test, expect } from '@playwright/test'
import { log, captureTestContext } from '@seon/playwright-utils'

// Add a hook to capture test context when using the standard test object
// This enables proper log organization without requiring a special test import
test.beforeEach(async ({}, testInfo) => {
  captureTestContext(testInfo)
})

// Example fixture file approach (would go in a separate fixtures.ts file)
// import { test as baseTest, expect } from '@playwright/test'
// import { captureTestContext } from '@seon/playwright-utils'
//
// export const test = baseTest.extend({
//   // Auto-capture test context for all tests using this fixture
//   _captureContext: [
//     async ({}, use, testInfo) => {
//       captureTestContext(testInfo)
//       await use()
//     },
//     { auto: true }
//   ]
// })
// 
// export { expect }
```

### Log File Structure

When test context is captured, logs are organized into directories like this:

```text
playwright-logs/
  2025-04-03/
    login-tests.spec/
      should-login-with-valid-credentials-worker-0.log
      should-fail-with-invalid-password-worker-1.log
    checkout-tests.spec/
      should-complete-purchase-worker-0.log
```

Without test context, logs go to a default folder specified by the `testFolder` option.

## Worker ID Logging

Parallel tests need worker IDs for debugging multi-worker runs. Worker ID logging is **enabled by default** for convenience, but can be customized as needed:

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

### Per-Test Worker ID Override

For specific test files, you can override the worker ID format if needed. When called inside a test context, local scope is automatically detected - no need to specify 'local':

```typescript
import { test } from '@playwright/test'
import { log } from '@seon/playwright-utils'

test.beforeAll(() => {
  // Override worker ID format just for this test file
  log.configure({
    workerID: {
      format: '[Worker-{workerIndex}]'
    }
  })
})

test('example with custom worker ID', async () => {
  await log.info('Starting test')
  // Output: [10:45:32] [Worker-1] ℹ Starting test

  // Or disable worker ID for just one log message
  await log.info('Special message', { workerID: false })
  // Output: [10:45:32] ℹ Special message
})
```

## Source File Tracking

The logging utility can automatically track the source file location of log calls, which is particularly useful when debugging complex test scenarios or when using decorators and function wrappers.

### Source Tracking Configuration

Source file tracking is enabled by default but not shown in logs to reduce noise. You can control this behavior using global configuration:

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

To temporarily show source files in logs for debugging:

```typescript
// Enable source file display for a specific test
test.beforeEach(() => {
  log.configure({
    sourceFileTracking: { showInLogs: true }
  })
})

// Output format with source file showing:
// [10:45:32] [W0] ℹ Starting test [src/tests/login.spec.ts]
```

### How It Works

Source file tracking works by analyzing the stack trace to extract the file path of the original call site. This information is stored in the test context and can be used for enhanced logging and debugging.

```typescript
// This happens automatically with decorators and function wrappers
// but can also be used directly if needed
const sourceFilePath = extractSourceFilePath()
log.setTestContext({ sourceFilePath })
```

### Benefits

- **Easier Debugging**: Quickly identify which file originated a log message or test failure
- **Better Traceability**: Follow the execution path through multiple files and components
- **Automatic with Decorators**: When using the `@methodTestStep()` decorator, source file information is automatically captured

### Custom Exclusions

You can customize which files are excluded from the source path extraction:

```typescript
// Exclude specific files from being identified as the source
const sourcePath = extractSourceFilePath(['test-step.ts', 'my-utility.ts'])
```

## Test Step Decorators / Function Wrappers

The library provides powerful decorators for organizing tests into logical steps with integrated logging. These decorators enhance both your code organization and test reporting by automatically wrapping methods and functions in Playwright's `test.step()` with proper logging and visibility in both reports & PW UI.

### Why Use Decorators / Function Wrappers?

Playwright's built-in `test.step()` function is useful but can make your code verbose and harder to maintain. Consider these examples:

#### Without Decorators (Using raw `test.step`)

```typescript
// Page Object implementation without decorators
class LoginPage {
  constructor(private page) {}

  async navigateTo() {
    // Need to manually wrap in test.step
    return test.step('Navigate to login page', async () => {
      await this.page.goto('/login')
      // No automatic error handling
    })
  }

  async login(username: string, password: string) {
    return test.step('Perform login', async () => {
      try {
        // Need to manually add logging
        console.log(`Logging in as ${username}`)

        await this.page.fill('#username', username)
        await this.page.fill('#password', password)
        await this.page.click('button[type="submit"]')

        // Need to manually log success
        console.log('Login successful')
      } catch (error) {
        // Need to manually log errors
        console.error(`Login failed: ${error}`)
        throw error
      }
    })
  }
}

// Utility function without decorators
async function checkElementCount(page, selector, expectedCount) {
  return test.step('Check element count', async () => {
    try {
      console.log(`Checking count of ${selector} elements`)
      const elements = await page.$$(selector)

      if (elements.length !== expectedCount) {
        throw new Error(
          `Expected ${expectedCount} elements, found ${elements.length}`
        )
      }

      console.log(`Found expected count: ${elements.length}`)
      return elements
    } catch (error) {
      console.error(`Check failed: ${error}`)
      throw error
    }
  })
}
```

The above approach:

- Requires manual wrapping in `test.step()`
- Needs explicit error handling in each method
- Requires manual logging at the start and end of each step
- Results in deeply nested code that's harder to read
- Produces duplicated boilerplate across similar methods

#### With Decorators (Using our library)

```typescript
import { methodTestStep, functionTestStep } from '@seon/playwright-utils'

// Page Object with decorators
class LoginPage {
  constructor(private page) {}

  @methodTestStep()
  async navigateTo() {
    // Clean, focused implementation
    await this.page.goto('/login')
  }

  @methodTestStep('Perform login')
  async login(username: string, password: string) {
    // Automatic logging and error handling
    await this.page.fill('#username', username)
    await this.page.fill('#password', password)
    await this.page.click('button[type="submit"]')
  }
}

// Utility function with function wrapper
const checkElementCount = functionTestStep(
  'Check element count',
  async (page, selector: string, expectedCount: number) => {
    // Clean, focused implementation
    const elements = await page.$$(selector)
    if (elements.length !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} elements, found ${elements.length}`
      )
    }
    return elements
  }
)
```

The decorated / function wrapped approach:

- Eliminates boilerplate code
- Provides automatic logging and error handling
- Keeps method implementations clean and focused on business logic
- Makes code more maintainable and readable
- Consistently formats step names in test reports & PW UI

### Raw test.step Usage (default Playwright API - Not Recommended)

#### Working with raw test.step (click to expand)

> 📌 **Note:** This section covers advanced scenarios only. We strongly recommend using our decorators instead of raw `test.step()` API.

The main challenge with raw `test.step()` is passing variables between steps.

```typescript
import { test } from '@playwright/test'
import { log } from '@seon/playwright-utils'

test('demonstrates passing variables between test steps', async ({ page }) => {
  // ⚠️ PROBLEMATIC: Using closures to pass data
  let orderId // Variable declared in outer scope
  await test.step('Create new order', async () => {
    // Implementation...
    orderId = await page.textContent('.order-id')
    console.log(`Created order: ${orderId}`) // Manual logging needed
  })

  // 👍 BETTER: Return values from steps and use log helpers
  const createOrder = async () => {
    log.step('Creating new order')
    // Implementation...
    const newOrderId = await page.textContent('.order-id')
    log.success(`Created order: ${newOrderId}`)
    return newOrderId
  }

  // Use test.step with functions that return values
  const newOrderId = await test.step('Create order', createOrder)
  await test.step('Verify order', () => verifyOrder(newOrderId))
})
```

> **Note:** Using raw `test.step()` with closures leads to hard-to-trace data flows, poor error messages, and manual logging requirements.
> While you can use our log helpers with either approach (e.g., `log.step()`, `log.info()`, etc.), the decorators solve all these issues more elegantly by providing a structured approach with proper logging and error handling built-in.
>
> ```typescript
> // You can add log helpers to either approach
> const createOrder = async () => {
>   log.step('Creating a new order') // Add logging
>   await page.goto('/orders/new')
>   //...
>   log.success(`Created order: ${newOrderId}`) // Add result logging
>   return newOrderId
> }
> ```

### Available Decorators

> **Note on TypeScript Decorators:** These use TypeScript's experimental decorator feature. Ensure you have `"experimentalDecorators": true` in your `tsconfig.json`.

| Decorator          | Purpose                    | Usage                                |
| ------------------ | -------------------------- | ------------------------------------ |
| `methodTestStep`   | Decorates class methods    | Use with `@` syntax on class methods |
| `functionTestStep` | Wraps standalone functions | Use as a function wrapper            |

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
