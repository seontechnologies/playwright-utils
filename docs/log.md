# Playwright Logging Utility

A functional logging utility for Playwright tests with enhanced features for test automation.

- [Playwright Logging Utility](#playwright-logging-utility)
  - [Core Features](#core-features)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
  - [Basic Usage](#basic-usage)
  - [Configuration](#configuration)
    - [Default Settings \& Configuration API](#default-settings--configuration-api)
  - [API Reference](#api-reference)
    - [Log Levels](#log-levels)
    - [Global Configuration Interface](#global-configuration-interface)
    - [Logging Methods](#logging-methods)
    - [LogOptions Interface](#logoptions-interface)
    - [Using With Playwright Test Steps](#using-with-playwright-test-steps)
  - [Log Organization and Test Context](#log-organization-and-test-context)
    - [Test Context Capture](#test-context-capture)
      - [Option 1: Shared Test Fixture (Recommended)](#option-1-shared-test-fixture-recommended)
      - [Option 2: Per-Test-File Setup](#option-2-per-test-file-setup)
    - [Log File Structure](#log-file-structure)
  - [Worker ID Logging](#worker-id-logging)
    - [Sample Output](#sample-output)
    - [Per-Message Worker ID Options](#per-message-worker-id-options)
  - [Source File Tracking for Decorators](#source-file-tracking-for-decorators)
    - [Source Tracking Configuration for Decorators](#source-tracking-configuration-for-decorators)
    - [How Decorator Source Tracking Works](#how-decorator-source-tracking-works)
    - [Benefits of Decorator Source Tracking](#benefits-of-decorator-source-tracking)
    - [Custom Exclusions](#custom-exclusions)
  - [Test Step Decorators / Function Wrappers](#test-step-decorators--function-wrappers)
    - [Test Step Decorators: Benefits and Usage](#test-step-decorators-benefits-and-usage)
      - [Example Comparison](#example-comparison)
        - [With raw test.step (verbose and error-prone)](#with-raw-teststep-verbose-and-error-prone)
        - [With our decorators (clean and maintainable)](#with-our-decorators-clean-and-maintainable)
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
// From actual dev.config.ts
import merge from 'lodash/merge'
import { defineConfig } from '@playwright/test'
import { baseConfig } from './base.config'
import { log } from '@seon/playwright-utils'

// IMPORTANT: the setup for logging to files needs to be uniform between test files
// best place to put it is in a config file

// ORGANIZED LOGS
log.configure({
  fileLogging: {
    enabled: true,
    testFolder: 'organized-by-test', // Set explicitly different from 'consolidated-logs'
    forceConsolidated: false, // Explicitly disable consolidation
    outputDir: 'playwright-logs/organized-logs'
  }
})

export default defineConfig(
  merge({}, baseConfig, {
    use: { baseUrl: 'https://test-api.k6.io' },
    projects: [...(baseConfig.projects || [])]
  })
)

// From actual support/fixtures.ts
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

## Basic Usage

```typescript
// From actual todo-with-logs.spec.ts
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

  // You can also log objects
  await log.debug('Current todo items:', { items: ['item1', 'item2'] })
})
```

## Configuration

### Default Settings & Configuration API

The logging system comes with sensible defaults and uses a unified configuration approach:

```typescript
// These are the internal defaults - you don't need to set these explicitly
const defaults = {
  // Console output is enabled
  console: true,
  // File logging is enabled and writes to playwright-logs directory
  fileLogging: true,
  // Files are grouped by test run for better organization
  // Format settings for prefixes (ℹ, ✓, ⚠), timestamps, and colors
  format: {
    /* ... */
  }
}
```

We use a single `log.configure()` function for all configuration needs with a clear priority order of **base config < fixture files < test files**. Each level inherits from the previous while allowing specific overrides.

> **Note**: `log.configure()` always applies settings globally by default. This ensures consistent behavior regardless of where you call it.

```typescript
// -- RECOMMENDED APPROACHES: Choose ONE location for logging configuration --

// OPTION 1: Configure only in base.config.ts (OK)
// -------------------------------------------------------
// In your playwright/config/base.config.ts
// Actual code from base.config.ts
import { defineConfig, devices } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
import path from 'path'
import { log } from '@seon/playwright-utils'

// the default settings turn on console logging
// Configure all logging in base config
log.configure({
  console: { enabled: true, colorize: true },
  fileLogging: {
    enabled: true,
    outputDir: 'playwright-logs'
  }
})

export const baseConfig = defineConfig({
  testDir: './playwright/tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true
  // Other configuration options
})

// In your playwright/config/dev.config.ts - NO logging configuration here
import merge from 'lodash/merge'
import { defineConfig } from '@playwright/test'
import { baseConfig } from './base.config'

export default defineConfig(
  merge({}, baseConfig, {
    use: { baseUrl: 'https://test-api.k6.io' }
  })
)

// OPTION 2: Configure only in environment configs (ACTUAL IMPLEMENTATION)
// -------------------------------------------------------
// From actual dev.config.ts
import merge from 'lodash/merge'
import { defineConfig } from '@playwright/test'
import { baseConfig } from './base.config'
import { log } from '@seon/playwright-utils'

// ALL logging configuration in environment config
log.configure({
  fileLogging: {
    enabled: true,
    testFolder: 'organized-by-test', // Set explicitly different from 'consolidated-logs'
    forceConsolidated: false, // Explicitly disable consolidation
    outputDir: 'playwright-logs/organized-logs'
  }
})

export default defineConfig(
  merge({}, baseConfig, {
    use: { baseUrl: 'https://test-api.k6.io' },
    projects: [...(baseConfig.projects || [])]
  })
)

// ❌ INCORRECT: Configuration split between base and environment (NOT OK)
// This makes configuration harder to track and reason about

// CAPTURING TEST CONTEXT FOR FILE ORGANIZATION
// There are two recommended approaches:

// OPTION 1: Create a shared fixture with beforeEach hook (RECOMMENDED)
// In playwright/support/fixtures.ts
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

By default, when file logging is enabled, all logs go to a single file. However, when test context is captured, logs are automatically organized by test file and test name, providing a clean separation of logs for each test run.

### Test Context Capture

For structured log files, you need to capture test context. There are two ways to do this:

#### Option 1: Shared Test Fixture (Recommended)

Create a shared fixture that captures context for all tests in one place:

```typescript
// 1. Create fixtures.ts file
import { test as base } from '@playwright/test'
import { captureTestContext } from '@seon/playwright-utils'

base.beforeEach(async ({}, testInfo) => {
  captureTestContext(testInfo)
})

export const test = base
export const expect = base.expect
```

Then import this fixture in your tests:

```typescript
// 2. Use fixture in test files
import { test, expect } from '../support/fixtures'
import { log } from '@seon/playwright-utils'

// No need to capture context - it's handled by the fixture!

test('my test', async ({ page }) => {
  await log.info('Log is automatically organized by test!')
})
```

#### Option 2: Per-Test-File Setup

Alternatively, you can add context capture to each test file individually:

```typescript
import { test, expect } from '@playwright/test'
import { log, captureTestContext } from '@seon/playwright-utils'

// Add this to each test file
test.beforeEach(async ({}, testInfo) => {
  captureTestContext(testInfo)
})

test('my test', async ({ page }) => {
  await log.info('Log is organized by test context!')
})
```

</details>

> **Recommendation**: Use Option 1 (shared fixture) to follow DRY principles and ensure consistent setup across all tests.

### Log File Structure

When test context is captured, logs are organized into directories like this:

```text
# With test context captured (organized by test)
playwright-logs/
  2025-04-03/
    login-tests.spec/
      should-login-with-valid-credentials-worker-0.log
      should-fail-with-invalid-password-worker-1.log
    checkout-tests.spec/
      should-complete-purchase-worker-0.log

# Without test context (default behavior)
playwright-logs/
  2025-04-03/
    default-test-folder/
      playwright-combined-logs.log  # Single file for all logs
```

Without test context, all logs go to a single file in a default folder specified by the `testFolder` option.

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

## Source File Tracking for Decorators

When using the `methodTestStep` decorator or `functionTestStep` wrapper, the logging utility automatically tracks the source file location of the decorated method or function. This is particularly useful when debugging complex test scenarios that use the Page Object Model pattern or other abstraction layers.

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

### How Decorator Source Tracking Works

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

### Benefits of Decorator Source Tracking

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

> **Key benefit**: Our decorators follow functional programming principles by keeping your test code focused on what it does, not how it's logged or reported.

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
