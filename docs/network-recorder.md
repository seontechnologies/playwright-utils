---
title: Network Recorder
description: HAR-based network traffic recording and playback for offline testing
---

# Network Traffic Recording & Replay Utility

The Network Traffic Recording & Replay utility provides HAR-based network traffic recording and playback capabilities that allow frontend tests to run in complete isolation from backend services. This utility captures HTTP requests/responses during "record" mode and replays them from disk during "playback" mode.

## Quick Start

### 1. Record Network Traffic

Set the environment variable in your test file and run your test:

```typescript
// Set mode to 'record' to capture network traffic
process.env.PW_NET_MODE = 'record'

test('should add, edit and delete a movie', async ({
  page,
  context,
  networkRecorder
}) => {
  // Setup network recorder - it will record all network traffic
  await networkRecorder.setup(context)

  // Your normal test code
  await page.goto('/')
  await page.fill('#movie-name', 'Inception')
  await page.click('#add-movie')

  // Network traffic is automatically saved to HAR file
})
```

### 2. Playback Network Traffic

Change the mode to 'playback' and run the same test offline:

```typescript
// Set mode to 'playback' to use recorded traffic
process.env.PW_NET_MODE = 'playback'

test('should add, edit and delete a movie', async ({
  page,
  context,
  networkRecorder
}) => {
  // Setup network recorder - it will replay from HAR file
  await networkRecorder.setup(context)

  // Same test code runs without hitting real backend!
  await page.goto('/')
  await page.fill('#movie-name', 'Inception')
  await page.click('#add-movie')
})
```

That's it! Your tests now run completely offline using recorded network traffic.

## Real-World Example

Here's a complete example from our test suite that demonstrates CRUD operations:

```typescript
import { expect, test } from '@playwright/support/merged-fixtures'
import { addMovie } from '@playwright/support/ui-helpers/add-movie'
import { editMovie } from '@playwright/support/ui-helpers/edit-movie'
import { log } from 'src/log'

// Control mode via environment variable in the test file
process.env.PW_NET_MODE = 'playback' // or 'record' when capturing

test.describe('movie crud e2e - browser only (network recorder)', () => {
  test.beforeEach(async ({ page, networkRecorder, context }) => {
    // Setup network recorder based on PW_NET_MODE
    await networkRecorder.setup(context)
    await page.goto('/')
  })

  test('should add, edit and delete a movie using only browser interactions', async ({
    page,
    interceptNetworkCall
  }) => {
    const { name, year, rating, director } = {
      name: 'Inception',
      year: 2010,
      rating: 8.8,
      director: 'Christopher Nolan'
    }

    await log.step('add a movie using the UI')
    await addMovie(page, name, year, rating, director)
    await page.getByTestId('add-movie-button').click()

    await log.step('click on movie to edit')
    await page.getByText(name).click()

    await log.step('Edit the movie')
    const { editedName, editedYear, editedRating, editedDirector } = {
      editedName: "Inception (Director's Cut)",
      editedYear: 2011,
      editedRating: 9.0,
      editedDirector: 'Christopher Nolan'
    }

    const loadUpdateMovie = interceptNetworkCall({
      method: 'PUT',
      url: '/movies/*'
    })
    await log.step('edit movie using the UI')
    await editMovie(page, editedName, editedYear, editedRating, editedDirector)
    await loadUpdateMovie

    // Go back and verify edit
    await page.getByTestId('back').click()
    await expect(page).toHaveURL('/movies')
    await page.getByText(editedName).waitFor()

    await log.step('delete movie from list')
    await page.getByTestId(`delete-movie-${editedName}`).click()
    await expect(
      page.getByTestId(`delete-movie-${editedName}`)
    ).not.toBeVisible()
  })
})
```

## Why Use This Instead of Native Playwright?

While Playwright offers built-in HAR recording via `context.routeFromHAR()`, our utility provides several key advantages:

| Native Playwright                          | Our Network Recorder Utility                 |
| ------------------------------------------ | -------------------------------------------- |
| ~80 lines of boilerplate setup             | ~5 lines total setup                         |
| Manual HAR file management                 | Automatic file organization                  |
| Complex setup/teardown                     | Automatic cleanup via fixtures               |
| **Read-only tests only**                   | **Full CRUD operations supported**           |
| **Stateless - breaks realistic scenarios** | **Stateful mocking - works naturally**       |
| **No cross-environment support**           | **Flexible URL mapping for any environment** |

For a complete code comparison showing these differences in action, see [Comparison with Native Playwright](#comparison-with-native-playwright-detailed).

## Basic Usage

### As a Fixture (Recommended)

```typescript
test('Fixture usage example', async ({ page, context, networkRecorder }) => {
  // Setup network recorder
  await networkRecorder.setup(context)

  // Your test code - network traffic is recorded/played back automatically
  await page.goto('/')
  await page.click('button')

  // Cleanup happens automatically
})
```

### Direct Import

```typescript
import { createNetworkRecorder } from '@seontechnologies/playwright-utils/network-recorder'
import { test } from '@playwright/test'

test('Direct usage example', async ({ page, context }, testInfo) => {
  const recorder = createNetworkRecorder(testInfo)
  await recorder.setup(context)

  // Your test code
  await page.goto('/')

  await recorder.cleanup()
})
```

## Environment Configuration

Control the recording mode using the `PW_NET_MODE` environment variable:

```bash
# Record mode - captures network traffic to HAR files
PW_NET_MODE=record npm run test:pw

# Playback mode - replays network traffic from HAR files
PW_NET_MODE=playback npm run test:pw

# Disabled mode - no network recording/playback
PW_NET_MODE=disabled npm run test:pw

# Default behavior (when PW_NET_MODE is empty/unset) - same as disabled
npm run test:pw
```

**Tip**: We recommend setting `process.env.PW_NET_MODE` directly in your test file (as shown in examples above) for better control and clarity.

## Common Patterns

### Recording Only API Calls

```typescript
await networkRecorder.setup(context, {
  recording: {
    urlFilter: /\/api\// // Only record API calls, ignore static assets
  }
})
```

### Playback with Fallback

```typescript
await networkRecorder.setup(context, {
  playback: {
    fallback: true // Fall back to live requests if HAR entry missing
  }
})
```

### Custom HAR File Location

```typescript
await networkRecorder.setup(context, {
  harFile: {
    harDir: 'recordings/api-calls',
    baseName: 'user-journey',
    organizeByTestFile: false // Optional: flatten directory structure
  }
})
```

**Directory Organization:**

- `organizeByTestFile: true` (default): `har-files/test-file-name/baseName-test-title.har`
- `organizeByTestFile: false`: `har-files/baseName-test-title.har`

Use `false` for simpler structure or when you have few tests. Use `true` (default) for better organization and to prevent filename conflicts in larger test suites.

### Response Content Storage: Embed vs Attach

The `content` option controls how response content (HTML, JSON, images, etc.) is stored in HAR files. Understanding this choice helps you optimize for file size, sharing, and performance.

#### `embed` (Default - Recommended)

Stores response content directly inside the HAR file as base64-encoded text:

```typescript
await networkRecorder.setup(context, {
  recording: {
    content: 'embed' // Store content inline (default)
  }
})
```

**Pros:**

- **Single self-contained file** - Easy to share, version control, and move around
- **Better for small-medium responses** - API JSON responses, HTML pages
- **HAR specification compliant** - Standard way per HAR specification
- **Simpler for our stateful mock** - Content parsing works seamlessly

**Cons:**

- **Larger HAR files** - File size grows with response content
- **Not ideal for large binary content** - Images, videos become bloated

**HAR structure example:**

```json
{
  "response": {
    "content": {
      "text": "eyJzdGF0dXMiOjIwMCwiZGF0YSI6W119", // base64 JSON response
      "encoding": "base64",
      "mimeType": "application/json"
    }
  }
}
```

#### `attach` (Alternative)

Stores response content as separate files or entries:

```typescript
await networkRecorder.setup(context, {
  recording: {
    content: 'attach' // Store content separately
  }
})
```

**Pros:**

- **Smaller HAR files** - Only references to content, not content itself
- **Better for large responses** - Images, videos, large documents
- **More efficient disk usage** - Content can be compressed separately

**Cons:**

- **Multiple files to manage** - HAR file + separate content files
- **Harder to share** - Need to bundle everything together
- **More complex** - Requires additional file management

**HAR structure example:**

```json
{
  "response": {
    "content": {
      "text": "", // Empty - content stored separately
      "encoding": "",
      "mimeType": "application/json"
    }
  }
}
```

#### When to Use Each

**Use `embed` (default) when:**

- Recording API responses (JSON, XML)
- Small to medium HTML pages
- You want a single, portable file
- File size under ~10MB is acceptable
- Sharing HAR files with team members

**Use `attach` when:**

- Recording large images, videos, or documents
- HAR file size becomes unwieldy (>50MB)
- You need maximum disk efficiency
- Working with ZIP archive output

**Example for large content:**

```typescript
// Recording a media-heavy application
await networkRecorder.setup(context, {
  harFile: {
    harDir: 'recordings/media-app'
  },
  recording: {
    content: 'attach', // Prevent bloated HAR files
    urlFilter: /\.(jpg|png|mp4|pdf)$/i // Only for large files
  }
})
```

## Advanced Features

### Intelligent Stateful CRUD Handling

One of the most powerful features is automatic detection and handling of stateful CRUD operations. Unlike traditional HAR playback (which is stateless), our utility maintains in-memory state during playback for realistic API behavior.

When the recorder detects CRUD patterns in your HAR file (multiple GETs with mutations like POST/PUT/DELETE), it automatically switches to an intelligent stateful mock that:

- Maintains state across requests
- Auto-generates IDs for new resources
- Returns proper 404s for deleted resources
- Supports polling scenarios where state changes over time

This happens automatically - no configuration needed!

### Cross-Environment Compatibility

**The Problem**: When you record network traffic on one environment (e.g., `dev.example.com`) and try to play it back on another environment (e.g., `staging.example.com`), the test fails because:

- The HAR file contains URLs for `dev.example.com`
- Your test is running on `staging.example.com`
- The recorder can't find matching entries and returns `net::ERR_FAILED`

**The Solution**: URL mapping allows the same HAR file to work across all environments by translating URLs during playback.

The recorder provides flexible URL mapping options to make your tests fully portable across environments:

#### Configuration Options

**1. Simple Hostname Mapping**

```typescript
await networkRecorder.setup(context, {
  playback: {
    urlMapping: {
      hostMapping: {
        'preview.example.com': 'dev.example.com',
        'staging.example.com': 'dev.example.com',
        'localhost:3000': 'dev.example.com'
      }
    }
  }
})
```

**2. Pattern-Based Mapping (Recommended)**

```typescript
await networkRecorder.setup(context, {
  playback: {
    urlMapping: {
      patterns: [
        // Map any preview-XXXX subdomain to dev
        { match: /preview-\d+\.example\.com/, replace: 'dev.example.com' }
      ]
    }
  }
})
```

**3. Custom Function**

```typescript
await networkRecorder.setup(context, {
  playback: {
    urlMapping: {
      mapUrl: (url) => {
        // Your custom logic here
        return url.replace('staging.example.com', 'dev.example.com')
      }
    }
  }
})
```

**4. Complex Multi-Environment Example**

For enterprise applications with many environments, you can combine all approaches:

```typescript
// Real-world configuration for multiple environments
await networkRecorder.setup(context, {
  playback: {
    urlMapping: {
      // Static mapping for known environments
      hostMapping: {
        // Local development
        'localhost:3000': 'admin.seondev.space',

        // Staging environments
        'admin-staging.seon.io': 'admin.seondev.space',
        'admin-staging.us-east-1-main.seon.io': 'admin.seondev.space',

        // Production environments
        'admin.seon.io': 'admin.seondev.space',
        'admin.us-east-1-main.seon.io': 'admin.seondev.space',
        'admin.ap-southeast-1-main.seon.io': 'admin.seondev.space'
      },

      // Pattern matching for dynamic environments
      patterns: [
        // PR preview environments (admin-1234.seondev.space)
        { match: /admin-\d+\.seondev\.space/, replace: 'admin.seondev.space' },

        // Staging PR previews
        {
          match: /admin-staging-pr-\w+-\d\.seon\.io/,
          replace: 'admin.seondev.space'
        }
      ]
    }
  }
})
```

**How it works:**

- URLs are mapped during HAR lookup to find matching recorded entries
- CORS headers are automatically updated based on the request origin
- All network traffic "just works" regardless of which environment you recorded on

**Benefits of this approach:**

- **Record once on dev**: All environments map back to your dev recordings
- **Environment isolation**: Each environment gets its own test runs

**Debug URL mapping:**

```bash
LOG_LEVEL=debug npm run test
# Shows: 🔄 Mapped for HAR lookup: https://dev.example.com/api/v2/endpoint
```

## API Reference

### NetworkRecorder Methods

| Method               | Return Type              | Description                                           |
| -------------------- | ------------------------ | ----------------------------------------------------- |
| `setup(context)`     | `Promise<void>`          | Sets up recording/playback on browser context         |
| `cleanup()`          | `Promise<void>`          | Flushes data to disk and cleans up memory (see below) |
| `getContext()`       | `NetworkRecorderContext` | Gets current recorder context information             |
| `getStatusMessage()` | `string`                 | Gets human-readable status message                    |
| `getHarStats()`      | `Promise<HarFileStats>`  | Gets HAR file statistics and metadata                 |

#### Understanding `cleanup()`

The `cleanup()` method performs memory and resource cleanup - **it does NOT delete HAR files**:

**What it does:**

- **Flushes recorded data to disk** - Writes the HAR file (if in recording mode)
- **Releases file locks** - Allows other tests to access the same HAR file path
- **Clears in-memory data** - Frees up HAR data and request tracking from memory
- **Resets internal state** - Marks the recorder as no longer active

**What it does NOT do:**

- Delete HAR files from disk
- Remove recorded network traffic
- Clear browser context or cookies

This design ensures that:

- HAR files persist for inspection and reuse
- Memory usage stays low across multiple tests
- File locks don't block parallel test execution
- Each test gets a clean recorder state

### Configuration Options

```typescript
type NetworkRecorderConfig = {
  // HAR file configuration
  harFile?: {
    harDir?: string // Directory for HAR files (default: 'har-files')
    baseName?: string // Base name for HAR files (default: 'network-traffic')
    organizeByTestFile?: boolean // Organize by test file (default: true)
  }

  // Recording options (used in record mode)
  recording?: {
    content?: 'embed' | 'attach' // Response content handling (default: 'embed')
    urlFilter?: string | RegExp // URL filter for recording
    update?: boolean // Update existing HAR files (default: false)
  }

  // Playback options (used in playback mode)
  playback?: {
    fallback?: boolean // Fall back to live requests (default: false)
    urlFilter?: string | RegExp // URL filter for playback
    updateMode?: boolean // Update mode during playback (default: false)
  }

  // Force specific mode regardless of environment
  forceMode?: 'record' | 'playback' | 'disabled'
}
```

## Troubleshooting

### HAR File Not Found

If you see "HAR file not found" errors during playback:

1. Ensure you've recorded the test first with `PW_NET_MODE=record`
2. Check the HAR file exists in the expected location (usually `har-files/`)
3. Enable fallback mode: `playback: { fallback: true }`

### Authentication and Network Recording

The network recorder is designed to work seamlessly with authentication - it doesn't interfere with auth flows because:

1. **It operates on an already-authenticated context** - Auth happens first, then recording starts
2. **It ignores auth endpoints by default** - The recorder doesn't try to replay auth requests
3. **It preserves cookies and headers** - Your auth tokens flow through normally

This means you can use it with any auth method:

```typescript
test('Authenticated recording', async ({
  page,
  context,
  authSession,
  networkRecorder
}) => {
  // First authenticate
  await authSession.login('testuser', 'password')

  // Then setup network recording with authenticated context
  await networkRecorder.setup(context)

  // Test authenticated flows
  await page.goto('/dashboard')
})
```

### Concurrent Test Issues

The recorder includes built-in file locking for safe parallel execution. Each test gets its own HAR file based on the test name, preventing conflicts.

## Learn More

- [Comparison with Native Playwright](#comparison-with-native-playwright-detailed)
- [How Stateful CRUD Detection Works](#how-stateful-crud-detection-works)

---

## Comparison with Native Playwright (Detailed)

### The Complete Picture: Real Code Comparison

Here's how the same simple test (just loading a page and checking movies) looks with both approaches:

**❌ With Native Playwright** (from our `movie-crud-e2e-network-record-playback-vanilla.spec.ts`):

```typescript
import { test, expect } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * ⚠️ MAJOR LIMITATION: This demo only loads a page - NO CRUD operations!
 * Vanilla Playwright HAR playback is STATELESS, making it unsuitable for:
 * - Create/Update/Delete operations
 * - Any test that modifies data during execution
 * - Polling scenarios where state changes over time
 */

const mode: 'record' | 'playback' = 'playback'
const harDir = 'har-files/vanilla-demo'
const harFilePath = path.join(harDir, 'movies-page.har')

test.describe('movie page - vanilla playwright HAR demo', () => {
  test.beforeAll(async () => {
    await fs.mkdir(harDir, { recursive: true })

    if (mode === 'record') {
      // ❌ PROBLEM: Vanilla Playwright requires empty HAR file to exist before recording
      const emptyHar = {
        log: {
          version: '1.2',
          creator: { name: 'playwright', version: '1.0' },
          pages: [],
          entries: []
        }
      }
      await fs.writeFile(harFilePath, JSON.stringify(emptyHar, null, 2))
    }
  })

  test('should load movies page and display seeded movies', async ({
    browser
  }) => {
    let context

    // ❌ PROBLEM: Must manually load and manage auth state
    const authStoragePath = '.auth/local/admin/storage-state.json'
    let storageState
    try {
      storageState = JSON.parse(await fs.readFile(authStoragePath, 'utf-8'))
    } catch {
      console.log(
        '⚠️  No auth storage state found - test may redirect to login'
      )
    }

    if (mode === 'record') {
      context = await browser.newContext({
        storageState: storageState || undefined
      })
      // ❌ PROBLEM: Complex HAR configuration required
      await context.routeFromHAR(harFilePath, {
        update: true,
        updateContent: 'embed'
      })
    } else {
      // ❌ PROBLEM: Manual file existence checks required
      try {
        await fs.access(harFilePath)
      } catch {
        throw new Error(
          `HAR file not found at ${harFilePath}. Please run in record mode first.`
        )
      }

      context = await browser.newContext({
        storageState: storageState || undefined
      })
      // ❌ PROBLEM: Different configuration for playback mode
      await context.routeFromHAR(harFilePath, {
        update: false,
        notFound: 'fallback'
      })
    }

    const page = await context.newPage()

    // ❌ PROBLEM: Must wrap test in try/catch/finally for cleanup
    try {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL('/movies')

      const movieElements = page.locator('[data-testid*="movie-"]')
      await movieElements.first().waitFor({ timeout: 10000 })

      const movieCount = await movieElements.count()
      expect(movieCount).toBeGreaterThanOrEqual(1)
    } catch (error) {
      console.error('❌ Test failed:', error)
      throw error
    } finally {
      // ❌ PROBLEM: Manual cleanup required or HAR data may be lost
      await context.close()
    }
  })
})
```

**✅ With Our Network Recorder Utility - Stateful CRUD Operations Supported** (from our `movie-crud-e2e-network-record-playback.spec.ts`):

```typescript
import { expect, test } from '@playwright/support/merged-fixtures'
import { addMovie } from '@playwright/support/ui-helpers/add-movie'
import { editMovie } from '@playwright/support/ui-helpers/edit-movie'
import { log } from 'src/log'

process.env.PW_NET_MODE = 'playback' // or 'record' when capturing

test.describe('movie crud e2e - browser only (network recorder)', () => {
  test.beforeEach(async ({ page, networkRecorder, context }) => {
    // ✅ Automatic mode detection, auth handling, file management
    await networkRecorder.setup(context)
    await page.goto('/')
  })

  test('should add, edit and delete a movie using only browser interactions', async ({
    page,
    interceptNetworkCall
  }) => {
    const { name, year, rating, director } = {
      name: 'centum solutio suscipit',
      year: 2009,
      rating: 6.3,
      director: 'ancilla crebro crux'
    }

    await log.step('add a movie using the UI')
    await addMovie(page, name, year, rating, director)
    await page.getByTestId('add-movie-button').click()

    await log.step('click on movie to edit')
    await page.getByText(name).click()

    await log.step('Edit the movie')
    const { editedName, editedYear, editedRating, editedDirector } = {
      editedName: 'angustus antepono crapula',
      editedYear: 2002,
      editedRating: 3.4,
      editedDirector: 'cognatus avarus aeger'
    }

    const loadUpdateMovie = interceptNetworkCall({
      method: 'PUT',
      url: '/movies/*'
    })
    await editMovie(page, editedName, editedYear, editedRating, editedDirector)
    await loadUpdateMovie

    // Go back and verify edit
    await page.getByTestId('back').click()
    await expect(page).toHaveURL('/movies')
    await page.getByText(editedName).waitFor()

    await log.step('delete movie from list')
    await page.getByTestId(`delete-movie-${editedName}`).click()
    await expect(
      page.getByTestId(`delete-movie-${editedName}`)
    ).not.toBeVisible()

    // ✅ Automatic cleanup, no try/catch needed
    // ✅ Note: This CRUD test works because our utility creates STATEFUL recordings
    // ✅ The CREATE, EDIT, and DELETE operations modify in-memory state during playback
    // ✅ making the test behave realistically even when offline
  })
})
```

### Key Differences Summary

| **Native Playwright**                         | **Our Network Recorder**                  |
| --------------------------------------------- | ----------------------------------------- |
| **~80 lines** of setup boilerplate            | **~5 lines** total setup                  |
| ❌ Manual HAR file management                 | ✅ Automatic file organization            |
| ❌ Manual auth state loading                  | ✅ Automatic auth integration             |
| ❌ Required try/catch/finally blocks          | ✅ Automatic cleanup via fixtures         |
| ❌ Manual mode switching logic                | ✅ Environment variable control           |
| ❌ **FATAL: Read-only tests only**            | ✅ **Full CRUD operations supported**     |
| ❌ **Stateless - breaks realistic scenarios** | ✅ **Stateful mocking - works naturally** |

## How Stateful CRUD Detection Works

When in playback mode, the Network Recorder automatically analyzes your HAR file to detect CRUD patterns. If it finds:

- Multiple GET requests to the same resource endpoint (e.g., `/movies`)
- Mutation operations (POST, PUT, DELETE) to those resources
- Evidence of state changes between identical requests

It automatically switches from static HAR playback to an intelligent stateful mock that maintains in-memory state throughout your test.

### Benefits Over Traditional Mocking Tools

Unlike tools like Mockoon or WireMock that require complex rule configuration:

- **No manual state machine setup** - State management is automatic
- **No scenario configuration** - CRUD patterns are auto-detected
- **No rule ordering issues** - Operations are handled semantically
- **Real ID generation** - Auto-incrementing IDs for new resources
- **Proper error handling** - 404s for non-existent resources

This makes your tests more maintainable and your HAR files truly reusable across different test scenarios.
