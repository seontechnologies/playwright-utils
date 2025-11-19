# Network Error Monitor

- [Network Error Monitor](#network-error-monitor)
  - [Why Use This?](#why-use-this)
  - [Quick Start](#quick-start)
  - [Real-World Example](#real-world-example)
  - [Usage](#usage)
    - [As a Fixture](#as-a-fixture)
    - [Integration with Merged Fixtures (Recommended)](#integration-with-merged-fixtures-recommended)
  - [Opt-Out for Validation Tests](#opt-out-for-validation-tests)
  - [Features](#features)
    - [1. Automatic Activation](#1-automatic-activation)
    - [2. Deduplication](#2-deduplication)
    - [3. Structured Artifacts](#3-structured-artifacts)
    - [4. Respects Test Status](#4-respects-test-status)
  - [Excluding Legitimate Errors](#excluding-legitimate-errors)
  - [Preventing Domino Effect](#preventing-domino-effect)
  - [Troubleshooting](#troubleshooting)
    - [Test fails with network errors but I don't see them in my app](#test-fails-with-network-errors-but-i-dont-see-them-in-my-app)
    - [False positives from external services](#false-positives-from-external-services)
    - [Network errors not being caught](#network-errors-not-being-caught)
  - [Implementation Details](#implementation-details)
    - [How It Works](#how-it-works)
    - [Performance](#performance)
  - [Comparison to Alternatives](#comparison-to-alternatives)
  - [Credit](#credit)
  - [Potential Future Enhancements](#potential-future-enhancements)

**Built-in Sentry for Playwright Tests**

Automatically detects and reports HTTP 4xx/5xx errors during test execution, ensuring no silent failures slip through your test suite.

> Inspired by [Checkly's network monitoring pattern](https://www.youtube.com/watch?v=sKpwE84K9fU).

## Why Use This?

Traditional Playwright tests focus on UI assertions and user interactions. But what about API errors happening in the background? A test might pass visually while critical backend services are returning 500 errors.

**Network Error Monitor** acts like Sentry for your tests:

- Catches HTTP 4xx/5xx responses automatically
- Fails tests that pass UI checks but have backend errors
- Provides structured JSON artifacts for debugging
- Zero boilerplate - automatically enabled for all tests
- Smart opt-out for tests expecting errors (validation testing)
- Respects test status (won't suppress actual test failures)

## Quick Start

```typescript
import { test } from '@seontechnologies/playwright-utils/network-error-monitor/fixtures'

// That's it! Network monitoring is automatically enabled
test('my test', async ({ page }) => {
  await page.goto('/dashboard')
  // If any HTTP 4xx/5xx errors occur, the test will fail
})
```

## Real-World Example

Before network error monitoring:

```typescript
test('load dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.locator('h1')).toContainText('Dashboard')
  // ✅ Test passes - but background API calls are returning 500 errors!
})
```

After network error monitoring:

```typescript
import { test } from '@seontechnologies/playwright-utils/network-error-monitor/fixtures'

test('load dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.locator('h1')).toContainText('Dashboard')
  // ❌ Test fails with clear error:
  // Network errors detected: 2 request(s) failed.
  // Failed requests:
  //   GET 500 https://api.example.com/users
  //   POST 503 https://api.example.com/metrics
})
```

## Usage

### As a Fixture

The simplest way to use network error monitoring is via the fixture:

```typescript
import { test } from '@seontechnologies/playwright-utils/network-error-monitor/fixtures'

test('my test', async ({ page }) => {
  await page.goto('/dashboard')
  // Network monitoring is automatically enabled
})
```

### Integration with Merged Fixtures (Recommended)

The recommended pattern is to merge the network error monitor into your project's main fixture:

```typescript
// support/fixtures/merged-fixtures.ts
import { mergeTests } from '@playwright/test'
import { test as networkErrorMonitorFixture } from '@seontechnologies/playwright-utils/network-error-monitor/fixtures'
import { test as authFixture } from './auth-fixture'
// ... other fixtures

export const test = mergeTests(
  authFixture,
  apiRequestFixture,
  networkErrorMonitorFixture // Add here
  // ... other fixtures
)

export { expect } from '@playwright/test'
```

Now all tests automatically get network monitoring:

```typescript
import { test } from 'support/fixtures/merged-fixtures'

test('my test', async ({ page, authUser, apiRequest }) => {
  // All fixtures work together
  // Network monitoring happens automatically
  await page.goto('/protected-page')
})
```

## Opt-Out for Validation Tests

Some tests intentionally trigger 4xx/5xx errors (e.g., validation testing). Use the `skipNetworkMonitoring` annotation:

```typescript
test(
  'validation returns 400',
  { annotation: [{ type: 'skipNetworkMonitoring' }] },
  async ({ page }) => {
    await page.goto('/api/invalid-request')
    // Test expects 400 errors - network monitor is disabled
    await expect(page.locator('.error')).toContainText('Bad Request')
  }
)
```

## Features

### 1. Automatic Activation

No need to set up listeners or afterEach hooks. The fixture uses Playwright's `auto: true` pattern to run automatically for every test.

### 2. Deduplication

Errors are deduplicated by status code + URL combination. If the same endpoint returns 404 multiple times, it's only reported once:

```typescript
// Only 1 error reported, not 3
await page.goto('/dashboard') // triggers 3x GET 404 /api/missing
```

### 3. Structured Artifacts

When errors are detected, a `network-errors.json` artifact is attached to the test report:

```json
[
  {
    "url": "https://api.example.com/users",
    "status": 500,
    "method": "GET",
    "timestamp": "2025-11-10T12:34:56.789Z"
  },
  {
    "url": "https://api.example.com/metrics",
    "status": 503,
    "method": "POST",
    "timestamp": "2025-11-10T12:34:57.123Z"
  }
]
```

Output:

```bash
❌ Test failed: Error: Test failed for other reasons
⚠️  Network errors also detected (1 request(s)):
  GET 404 https://api.example.com/missing
```

### 4. Respects Test Status

The monitor respects final test statuses to avoid suppressing important test outcomes:

- **`failed`**: Network errors logged as additional context, not thrown
- **`timedOut`**: Network errors logged as additional context
- **`skipped`**: Network errors logged, skip status preserved
- **`interrupted`**: Network errors logged, interrupted status preserved
- **`passed`**: Network errors throw and fail the test

This ensures tests that use `test.skip()` (e.g., feature flag checks) maintain their skip status:

```typescript
test('feature gated test', async ({ page }) => {
  const featureEnabled = await checkFeatureFlag()
  test.skip(!featureEnabled, 'Feature not enabled')
  // If skipped, network errors won't turn this into a failure
  await page.goto('/new-feature')
})
```

## Excluding Legitimate Errors

Some endpoints legitimately return 4xx/5xx responses. Configure exclusions using the factory function:

```typescript
import { test as base } from '@playwright/test'
import { createNetworkErrorMonitorFixture } from '@seontechnologies/playwright-utils/network-error-monitor/fixtures'

export const test = base.extend(
  createNetworkErrorMonitorFixture({
    excludePatterns: [
      /email-cluster\/ml-app\/has-active-run/, // ML service returns 404 when no active run
      /idv\/session-templates\/list/, // IDV service returns 404 when not configured
      /sentry\.io\/api/ // External Sentry errors should not fail tests
    ]
  })
)
```

For merged fixtures:

```typescript
import { mergeTests } from '@playwright/test'
import { createNetworkErrorMonitorFixture } from '@seontechnologies/playwright-utils/network-error-monitor/fixtures'

const networkErrorMonitor = base.extend(
  createNetworkErrorMonitorFixture({
    excludePatterns: [/analytics\.google\.com/, /cdn\.example\.com/]
  })
)

export const test = mergeTests(authFixture, networkErrorMonitor)
```

## Preventing Domino Effect

When a backend service fails, it can cause dozens of tests to fail with the same error. Use `maxTestsPerError` to prevent this:

```typescript
import { createNetworkErrorMonitorFixture } from '@seontechnologies/playwright-utils/network-error-monitor/fixtures'

const networkErrorMonitor = base.extend(
  createNetworkErrorMonitorFixture({
    maxTestsPerError: 1 // Only first test fails per error pattern, rest just log
  })
)
```

**How it works:**

When `/api/v2/case-management/cases` returns 500:

- **First test** encountering this error: ❌ FAILS with clear error message
- **Subsequent tests** encountering same error: ✅ PASS but log warning

Error patterns are grouped by `status + base path`:

- `/api/v2/case-management/cases/123` → Pattern: `500:/api/v2/case-management`
- `/api/v2/case-management/quota` → Pattern: `500:/api/v2/case-management` (same group!)

This prevents 17 tests failing when case management backend is down - only first test fails.

**Example output for subsequent tests:**

```
⚠️  Network errors detected but not failing test (maxTestsPerError limit reached):
  GET 500 https://api.example.com/api/v2/case-management/cases
```

**Recommended configuration:**

```typescript
createNetworkErrorMonitorFixture({
  excludePatterns: [...],  // Known broken endpoints
  maxTestsPerError: 1      // Stop domino effect
})
```

**Understanding worker-level state:**

Error pattern counts are stored in worker-level global state that persists for all test files run by that worker. This is intentional behavior for domino effect prevention:

```typescript
// test-file-1.spec.ts (runs first in Worker 1)
test('test A', () => {
  /* triggers 500:/api/v2/cases */
}) // ❌ Fails

// test-file-2.spec.ts (runs later in Worker 1)
test('test B', () => {
  /* triggers 500:/api/v2/cases */
}) // ✅ Passes (limit reached)

// test-file-3.spec.ts (runs in Worker 2 - different worker)
test('test C', () => {
  /* triggers 500:/api/v2/cases */
}) // ❌ Fails (fresh worker)
```

**Key points:**

- Each Playwright worker has its own error pattern count state
- State persists across all test files in the worker's lifetime
- Parallel workers have independent state (no cross-contamination)
- This prevents 17 tests in same worker from all failing when backend is down

## Troubleshooting

### Test fails with network errors but I don't see them in my app

The errors might be happening during page load or in background polling. Check the `network-errors.json` artifact in your test report for full details including timestamps.

### False positives from external services

Configure exclusion patterns as shown in the "Excluding Legitimate Errors" section above.

### Network errors not being caught

Ensure you're importing the test from the correct fixture:

```typescript
// ✅ Correct
import { test } from '@seontechnologies/playwright-utils/network-error-monitor/fixtures'

// ❌ Wrong - this won't have network monitoring
import { test } from '@playwright/test'
```

## Implementation Details

### How It Works

1. **Fixture Extension**: Uses Playwright's `base.extend()` with `auto: true`
2. **Response Listener**: Attaches `page.on('response')` listener at test start
3. **Multi-Page Monitoring**: Automatically monitors popups and new tabs via `context.on('page')`
4. **Error Collection**: Captures 4xx/5xx responses, checking exclusion patterns
5. **Try/Finally**: Ensures error processing runs even if test fails early
6. **Status Check**: Only throws errors if test hasn't already reached final status
7. **Artifact**: Attaches JSON file to test report for debugging

### Performance

The monitor has minimal performance impact:

- Event listener overhead: ~0.1ms per response
- Memory: ~200 bytes per unique error
- No network delay (observes responses, doesn't intercept them)

## Comparison to Alternatives

| Approach                    | Network Error Monitor   | Manual afterEach         |
| --------------------------- | ----------------------- | ------------------------ |
| **Setup Required**          | Zero (auto-enabled)     | Every test file          |
| **Catches Silent Failures** | ✅ Yes                  | ✅ Yes (if configured)   |
| **Structured Artifacts**    | ✅ JSON attached        | ⚠️ Custom impl           |
| **Test Failure Safety**     | ✅ Try/finally          | ⚠️ afterEach may not run |
| **Opt-Out Mechanism**       | ✅ Annotation           | ⚠️ Custom logic          |
| **Status Aware**            | ✅ Respects skip/failed | ❌ No                    |

## Credit

This implementation is inspired by [Stefan Judis/Checkly's network monitoring example](https://www.youtube.com/watch?v=sKpwE84K9fU), with enhancements including:

## Potential Future Enhancements

- Custom error handlers (e.g., send to Sentry)
- Warn-only mode (log errors without failing tests)
- Pattern-based error expectations (expect 404 for specific URLs)
- Integration with test retries (track errors across attempts)
