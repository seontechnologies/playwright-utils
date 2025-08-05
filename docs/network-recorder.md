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

| Native Playwright                            | Our Network Recorder Utility                                              |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| Manual HAR file path management              | Automatic HAR file organization by test file and test name                |
| No environment-based mode switching          | Environment variable control (`PW_NET_MODE=record/playback/disabled`)     |
| Manual concurrent test safety                | Built-in file locking for safe parallel test execution                    |
| Complex setup and teardown                   | Automatic setup/cleanup via fixtures or explicit lifecycle methods        |
| No authentication integration                | Authentication-agnostic design that works with pre-authenticated contexts |
| Limited error handling for missing HAR files | Configurable fallback modes and comprehensive error handling              |
| Stateless HAR playback only                  | Intelligent stateful mock for CRUD operations (auto-detected)             |
| No support for polling/recursion scenarios   | Full support for dynamic state changes during test execution              |

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

# Disabled mode - no network recording/playback (default)
PW_NET_MODE=disabled npm run test:pw
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
    baseName: 'user-journey'
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

The recorder automatically handles CORS headers based on the request origin, making your tests portable:

- Record on `https://dev.example.com`
- Playback on `https://stage.example.com`
- Playback on `http://localhost:3000`

## API Reference

### NetworkRecorder Methods

| Method               | Return Type              | Description                                   |
| -------------------- | ------------------------ | --------------------------------------------- |
| `setup(context)`     | `Promise<void>`          | Sets up recording/playback on browser context |
| `cleanup()`          | `Promise<void>`          | Cleans up resources and file locks            |
| `getContext()`       | `NetworkRecorderContext` | Gets current recorder context information     |
| `getStatusMessage()` | `string`                 | Gets human-readable status message            |
| `getHarStats()`      | `Promise<HarFileStats>`  | Gets HAR file statistics and metadata         |

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
- [Integration Examples](./examples/network-recorder-examples.md)

---

## Comparison with Native Playwright (Detailed)

### Recording Network Traffic

**With Native Playwright:**

```typescript
test('Record network traffic', async ({ context, page }) => {
  // Manual HAR file path management
  const harPath = path.join('har-files', 'my-test.har')

  // Ensure directory exists
  await fs.mkdir(path.dirname(harPath), { recursive: true })

  // Start recording
  await context.routeFromHAR(harPath, { mode: 'record' })

  // Perform test actions
  await page.goto('/')
  await page.click('button')

  // Manual cleanup if needed
})
```

**With Our Utility:**

```typescript
test('Record network traffic', async ({ page, context, networkRecorder }) => {
  // Automatic HAR file path generation and directory creation
  await networkRecorder.setup(context)

  // Perform test actions - recording happens automatically
  await page.goto('/')
  await page.click('button')

  // Automatic cleanup
})
```

### Environment-Based Mode Switching

**With Native Playwright:**

```typescript
// Need to manually implement mode switching logic
test('Environment-based recording', async ({ context, page }) => {
  const mode = process.env.NETWORK_MODE || 'disabled'
  const harPath = path.join('har-files', 'my-test.har')

  if (mode === 'record') {
    await context.routeFromHAR(harPath, { mode: 'record' })
  } else if (mode === 'playback') {
    if (existsSync(harPath)) {
      await context.routeFromHAR(harPath, { mode: 'replay' })
    }
  }
  // 'disabled' mode - no network recording/playback

  await page.goto('/')
})
```

**With Our Utility:**

```typescript
// Set in test file
process.env.PW_NET_MODE = 'record' // or 'playback'

test('Environment-based recording', async ({
  page,
  context,
  networkRecorder
}) => {
  // Automatic mode detection
  await networkRecorder.setup(context)

  // Works in any mode: record, playback, or disabled
  await page.goto('/')
})
```

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
