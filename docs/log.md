# Logging Utility

A powerful logging utility for Playwright tests that integrates with both console output and Playwright's test step API for improved visibility and reporting.

- [Logging Utility](#logging-utility)
	- [Features](#features)
	- [Installation](#installation)
	- [Usage](#usage)
		- [Basic Logging](#basic-logging)
		- [Controlling Console Output](#controlling-console-output)
		- [Using as a Fixture](#using-as-a-fixture)
	- [API Reference](#api-reference)
		- [Log Levels](#log-levels)
		- [Methods](#methods)
		- [Using With Playwright Test Steps](#using-with-playwright-test-steps)
	- [Test Step Decorators / Function Wrappers](#test-step-decorators--function-wrappers)
		- [Why Use Decorators / Function Wrappers?](#why-use-decorators--function-wrappers)
			- [Without Decorators (Using raw `test.step`)](#without-decorators-using-raw-teststep)
			- [With Decorators (Using our library)](#with-decorators-using-our-library)
		- [Raw test.step Usage (default Playwright API - Not Recommended)](#raw-teststep-usage-default-playwright-api---not-recommended)
		- [Available Decorators](#available-decorators)
		- [Using Method Decorators in Page Objects](#using-method-decorators-in-page-objects)
		- [Using Function Decorators for Utility Functions / Functional Helpers](#using-function-decorators-for-utility-functions--functional-helpers)

## Features

- Consistent logging format with visual indicators for different log levels
- Integrates with Playwright's test.step API for better test reports & PW UI
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

The logging utility automatically integrates with Playwright's test step API when used in a test context. This improves test reporting by creating steps in the Playwright reports & PW UI.

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

While we strongly recommend using our decorators/wrappers, there may be situations where you need to use Playwright's raw `test.step()` API directly in your test blocks. The main challenge is passing variables between multiple test steps. If you must use raw test steps, here are your options:

```typescript
import { test } from '@playwright/test'
import { log } from '@seon/playwright-utils'

test('demonstrates passing variables between test steps', async ({ page }) => {
  // Challenge: We need to create an order in one step and verify it in another

  // ⚠️ PROBLEMATIC APPROACH: Using closures to pass data
  let orderId // Variable declared in outer scope

  await test.step('Create new order', async () => {
    await page.goto('/orders/new')
    await page.fill('#product', 'Laptop')
    await page.fill('#quantity', '1')
    await page.click('#submit-order')
    // Assign to outer scope variable
    orderId = await page.textContent('.order-confirmation-id')
    console.log(`Created order: ${orderId}`) // Manual logging
  })

  await test.step('Verify order details', async () => {
    // Using the variable from outer scope
    await page.goto(`/orders/${orderId}`)

    // If this fails, the error message won't show which orderId was used
    await expect(page.locator('.status')).toHaveText('Processing')
    console.log(`Verified order: ${orderId}`) // Manual logging
  })

  // 👍 SLIGHTLY BETTER APPROACH: Return values from steps and use log helpers
  const createOrder = async () => {
    log.step('Creating new order') // Add logging
    await page.goto('/orders/new')
    await page.fill('#product', 'Headphones')
    await page.fill('#quantity', '2')
    await page.click('#submit-order')
    const newOrderId = await page.textContent('.order-confirmation-id')
    log.success(`Created order: ${newOrderId}`) // Log the result
    return newOrderId
  }

  const verifyOrder = async (id: string) => {
    log.step(`Verifying order: ${id}`) // Add logging with context
    await page.goto(`/orders/${id}`)
    await expect(page.locator('.status')).toHaveText('Processing')
    log.info(`Order ${id} verified successfully`) // Log the success
  }

  // Use test.step with functions that return values
  const newOrderId = await test.step('Create order', createOrder)
  await test.step('Verify order', () => verifyOrder(newOrderId))
})
```

> **Note:** Using raw `test.step()` with outer scope variables (closures) leads to:
>
> - Hard-to-trace data flows between steps
> - Poor error messages that don't include variable values
> - Manual logging requirements
> - Potential race conditions with parallel tests
>
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
