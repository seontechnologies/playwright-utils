# Logging Utility

A powerful logging utility for Playwright tests that integrates with both console output and Playwright's test step API for improved visibility and reporting.

## Features

- Consistent logging format with visual indicators for different log levels
- Integrates with Playwright's test.step API for better test reports
- Colorized terminal output for improved readability
- Asynchronous logging that properly handles I/O operations
- Graceful fallback in non-test contexts

## Installation

The logging utility is automatically available when you install the package:

```bash
npm install @seon/playwright-utils
```

## Usage

### Basic Logging

```typescript
import { log } from '@seon/playwright-utils'

// Different log levels with appropriate formatting
await log.info('Information message')
await log.step('Starting a new test step')
await log.success('Operation completed successfully')
await log.warning('Something might be wrong')
await log.error('An error occurred')
await log.debug('Debugging information')
```

### Controlling Console Output

By default, all log messages are output to the console. You can disable console output if needed:

```typescript
// Disable console output for this message
await log.info('Silent info message', false)

// Enable console output (default behavior)
await log.info('Standard info message', true)
```

### Using as a Fixture

> **Note:** When using the log fixture, you must use the object parameter pattern shown above. The fixture does not support the method-based syntax (e.g., `log.step('message')`) that's available when using the direct import. This is by design to provide a consistent interface through the fixture.

```typescript
import { test } from '@seon/playwright-utils/log/fixtures'

test('demonstrates logging with fixtures', async ({ log }) => {
  // Basic usage
  await log({ message: 'Information message' })

  // Specifying log level
  await log({
    message: 'Starting test',
    level: 'step'
  })

  // Disabling console output
  await log({
    message: 'Silent success',
    level: 'success',
    console: false
  })
})
```

## API Reference

### Log Levels

| Level     | Description         | Console Method | Visual Indicator |
| --------- | ------------------- | -------------- | ---------------- |
| `info`    | General information | console.info   | ℹ               |
| `step`    | Test step delimiter | console.log    | ====             |
| `success` | Success messages    | console.log    | ✓                |
| `warning` | Warning messages    | console.warn   | ⚠               |
| `error`   | Error messages      | console.error  | ✖               |
| `debug`   | Debug information   | console.debug  | 🔍               |

### Methods

Each logging method has the following signature:

```typescript
async function logXXX(message: string, console: boolean = true): Promise<void>
```

### Using With Playwright Test Steps

The logging utility automatically integrates with Playwright's test step API when used in a test context. This improves test reporting by creating steps in the Playwright report.

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
