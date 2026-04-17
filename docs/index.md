---
layout: home

hero:
  name: Playwright Utils
  text: Powerful utilities for Playwright testing from SEON
  tagline: A collection of production-ready utilities from SEON Technologies, designed to make Playwright testing more efficient and maintainable.
  image:
    src: /logo.svg
    alt: Playwright Utils
  actions:
    - theme: brand
      text: Get Started
      link: /installation
    - theme: alt
      text: View on GitHub
      link: https://github.com/seontechnologies/playwright-utils

features:
  - icon: 🔌
    title: API Request
    details: A typed, flexible HTTP client with schema validation support (JSON Schema, Zod, OpenAPI).
    link: /api-request
  - icon: 🔐
    title: Auth Session
    details: Persistent authentication management with token caching and multi-user support.
    link: /auth-session
  - icon: 🔄
    title: Recurse (Polling)
    details: Cypress-style polling utility for waiting on asynchronous conditions.
    link: /recurse
  - icon: 📝
    title: Logging
    details: Structured logging that integrates seamlessly with Playwright reports.
    link: /log
  - icon: 🪝
    title: Webhook Testing
    details: Provider-agnostic webhook polling, matching, and cleanup for reliable end-to-end assertions.
    link: /webhook
  - icon: 🌐
    title: Network Interception
    details: Powerful utilities for intercepting, observing, and mocking network requests.
    link: /intercept-network-call
  - icon: 📼
    title: Network Recorder
    details: HAR-based recording/playback with intelligent CRUD detection for offline testing.
    link: /network-recorder
  - icon: 🚨
    title: Network Error Monitor
    details: Automatically detect HTTP 4xx/5xx errors during test execution.
    link: /network-error-monitor
  - icon: 📁
    title: File Utilities
    details: Read and validate CSV, XLSX, PDF, and ZIP files in your tests.
    link: /file-utils
  - icon: 🔥
    title: Burn-in Testing
    details: Smart test burn-in with intelligent filtering based on file changes.
    link: /burn-in
---

## One Pattern, Two Ways to Use

Every utility follows the same design: **functional core, fixture shell**.

```typescript
// Direct function - explicit dependencies
import { apiRequest } from '@seontechnologies/playwright-utils/api-request'
const result = await apiRequest({ request, method: 'GET', path: '/api/users' })

// Playwright fixture - injected, ready to use
test('example', async ({ apiRequest }) => {
  const result = await apiRequest({ method: 'GET', path: '/api/users' })
})
```

Use functions for scripts and simple cases. Use fixtures for test suites.

::: tip Playwright 1.59 Debugging Flow

- `npm run test:pw:debug` opens the Playwright Inspector for step-through debugging
- `npm run test:pw-ui` uses Playwright UI Mode for interactive runs and filtering
- `npm run show:trace -- test-results/<run>/trace.zip` opens the trace viewer for a captured run

:::

```typescript
// Recent Playwright page diagnostics fit nicely alongside playwright-utils helpers
const consoleMessages = await page.consoleMessages({
  filter: 'since-navigation'
})
const pageErrors = await page.pageErrors({
  filter: 'since-navigation'
})
const requests = await page.requests()
```

## Quick Example

```typescript
import { test } from '@seontechnologies/playwright-utils/fixtures'

test('API request with schema validation', async ({ apiRequest }) => {
  const { status, body } = await apiRequest({
    method: 'GET',
    path: '/api/users/123'
  }).validateSchema(userSchema)

  expect(status).toBe(200)
})
```

```typescript
import { test } from '@seontechnologies/playwright-utils/network-recorder/fixtures'

test('offline CRUD testing', async ({ page, context, networkRecorder }) => {
  await networkRecorder.setup(context)

  // First run: records network traffic
  // Subsequent runs: plays back from HAR (no backend needed!)
  await page.goto('/')
  await page.fill('#name', 'Test User')
  await page.click('#submit')
})
```

::: info Fixture Import Options
You can import fixtures in multiple ways:

- **Combined**: `import { test } from '@seontechnologies/playwright-utils/fixtures'` - includes all fixtures
- **Individual**: `import { test } from '@seontechnologies/playwright-utils/network-recorder/fixtures'` - specific utility only
- **Merged**: Use `mergeTests()` to combine fixtures from multiple sources (see [Installation](/installation#merging-fixtures))
  :::
