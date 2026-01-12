---
layout: home

hero:
  name: Playwright Utils
  text: Powerful utilities for Playwright testing
  tagline: A collection of production-ready utilities designed to make Playwright testing more efficient and maintainable.
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

## Design Principles

This library follows these core design patterns:

- **Fixture Pattern** - All utilities can be consumed as Playwright fixtures
- **Functional Core, Fixture Shell** - Use utilities directly or as fixtures
- **Decoupled Logging** - Logging integrates cleanly into Playwright reports
- **Composable Auth Sessions** - Handle complex multi-user auth scenarios
- **Test-Focused Network Interception** - Real-world test needs, not simple mocking

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
