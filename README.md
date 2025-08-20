# Playwright Utils

A collection of utilities for Playwright tests at SEON Technologies, designed to make testing more efficient and maintainable.

All utilities can be used as Playwright fixtures by importing the test object.

## Design Principles

Why this library was created:

- To bring consistent reusable Playwright utilities to projects at SEON.
- To implement common testing patterns as **standardized fixtures**, to avoid duplication and boilerplate.
- To follow a **functional-first** design: the core logic is always a standalone function that can be used directly, while fixtures provide convenience.
- To support **typed API requests**, **polling patterns**, **auth session management**, **logging**, and **network interception** with clear APIs.
- To make it easy to adopt and extend the utilities in other projects, without coupling tightly to any single app.

Design patterns used:

- **Fixture pattern**: all utilities can be consumed as fixtures to provide maximum flexibility.
- **Functional core, fixture shell**: utilities can be used both directly and as fixtures.
- **Decoupled logging and reporting**: logging is built to integrate cleanly into Playwright reports.
- **Composable auth sessions**: auth session utilities can handle complex multi-user auth in a reusable way.
- **Test-focused network interception**: network interception is designed for real-world test needs, not just simple mocking.
- **Typed API request utility**: apiRequest provides a reusable, typed client for API tests and Playwright request fixture usage.

This library is not a general-purpose Playwright wrapper. It is designed to cover the most common test automation needs at SEON and to serve as a foundation for further project-specific extensions.

- [Playwright Utils](#playwright-utils)
  - [Design Principles](#design-principles)
  - [Installation](#installation)
  - [Module Format Support](#module-format-support)
  - [Development](#development)
    - [Testing Strategy](#testing-strategy)
  - [Available Utilities](#available-utilities)
    - [API Request](#api-request)
    - [Recurse (Polling)](#recurse-polling)
    - [Logging](#logging)
    - [Network Interception](#network-interception)
    - [Auth Session](#auth-session)
      - [Implementation Steps](#implementation-steps)
    - [File Utilities](#file-utilities)
    - [Network Recorder](#network-recorder)
    - [Burn-in](#burn-in)
  - [Testing the Package Locally](#testing-the-package-locally)
  - [Release and Publishing](#release-and-publishing)
    - [Publishing via GitHub UI (Recommended)](#publishing-via-github-ui-recommended)
    - [Publishing Locally](#publishing-locally)

## Installation

```bash
npm i -D @seontechnologies/playwright-utils
pnpm i -D @seontechnologies/playwright-utils
```

> **Note:** This package requires `@playwright/test` as a peer dependency. It should already be installed in your repository.

## Module Format Support

This package supports both CommonJS and ES Modules formats:

- **CommonJS**: For projects using `require()` syntax or CommonJS module resolution
- **ES Modules**: For projects using `import` syntax with ES modules

The package automatically detects which format to use based on your project's configuration. This means:

- You can use this package in both legacy CommonJS projects and modern ESM projects
- No need to change import paths or add file extensions
- TypeScript type definitions work for both formats

Example usage:

```typescript
// Works in both CommonJS and ESM environments
import { log } from '@seontechnologies/playwright-utils'

// Subpath imports also work in both formats
import { recurse } from '@seontechnologies/playwright-utils/recurse'
```

## Development

Quick start (this repo):

```bash
git clone https://github.com/seontechnologies/playwright-utils.git

cd playwright-utils

nvm use

npm install

# start docker
# running the app initially may require docker to download things for a few minutes
npm run start:sample-app

# open a new tab, and run a test
# run with UI, with headless, and if you want also the IDE
npm run test:pw-ui
npm run test:pw
```

```bash
# Install dependencies
npm i

# Development commands
npm run lint          # Run ESLint
npm run typecheck     # Run TypeScript checks
npm run fix:format    # Fix code formatting with Prettier
npm run test          # Run unit tests
npm run validate      # Run all the above in parallel

# Start the sample app (for testing apiRequest, recurse, auth-session)
npm run start:sample-app

# Playwright tests
npm run test:pw       # Run Playwright tests
npm run test:pw-ui    # Run Playwright tests with UI
```

### Testing Strategy

The overall testing approach:

1. **Deployed Apps Tests** - Some tests use Playwright's deployed apps to keep things familiar (`log`, `interceptNetworkCall`):
   - `playwright/tests/network-mock-original.spec.ts`
   - `playwright/tests/todo-with-logs.spec.ts`
   - `playwright/tests/network-mock-intercept-network-call.spec.ts`

1. **Sample App Tests** - The `./sample-app` provides a more complex environment to test:
   - API request automation
   - Recursion and retry patterns
   - Authentication flows
   - Future: feature flag testing, email testing, etc.

To start the sample app backend and frontend; `npm run start:sample-app`.

The sample app uses `"@seontechnologies/playwright-utils": "*"` in its package.json so that changes to the library are immediately available for testing without requiring republishing or package updates.

## Available Utilities

The library provides the following utilities, each with both direct function imports and Playwright fixtures:

### [API Request](./docs/api-request.md)

A typed, flexible HTTP client for making API requests in tests.

```typescript
// Direct import
import { apiRequest } from '@seontechnologies/playwright-utils'

test('example', async ({ request }) => {
  const { status, body } = await apiRequest({
    request, // need to pass in request context when using this way
    method: 'GET',
    path: '/api/users/123'
  })
})

// As a fixture
import { test } from '@seontechnologies/playwright-utils/fixtures'
// or use your own main fixture (with mergeTests) and import from there

test('example', async ({ apiRequest }) => {
  const { status, body } = await apiRequest({
    method: 'GET',
    path: '/api/users/123'
  })
})
```

[→ API Request Documentation](./docs/api-request.md)

### [Recurse (Polling)](./docs/recurse.md)

A powerful polling utility for waiting on asynchronous conditions.

```typescript
// note that there is no need to pass in request or page context from Playwright

// Direct import
import { recurse } from '@seontechnologies/playwright-utils/recurse'

test('example', async ({}) => {
  const result = await recurse(
    () => fetchData(),
    (data) => data.status === 'ready',
    { timeout: 30000 }
  )
})

// As a fixture
import { test } from '@seontechnologies/playwright-utils/fixtures'
// or use your own main fixture (with mergeTests) and import from there

test('example', async ({ recurse }) => {
  const result = await recurse({
    command: () => fetchData(),
    predicate: (data) => data.status === 'ready',
    options: { timeout: 30000 }
  })
})
```

[→ Recurse Documentation](./docs/recurse.md)

### [Logging](./docs/log.md)

A specialized logging utility that integrates with Playwright's test reports.

```typescript
// Direct import
import { log } from '@seontechnologies/playwright-utils'

await log.info('Information message')
await log.step('Starting a new test step')
await log.error('Something went wrong', false) // Disable console output
```

```typescript
// As a fixture
import { test } from '@seontechnologies/playwright-utils/log/fixtures'

test('example', async ({ log }) => {
  await log({
    message: 'Starting test',
    level: 'step'
  })
})
```

[→ Logging Documentation](./docs/log.md)

### [Network Interception](./docs/intercept-network-call.md)

A powerful utility for intercepting, observing, and mocking network requests in Playwright tests.

```typescript
// Direct import
import { interceptNetworkCall } from '@seontechnologies/playwright-utils'

test('Spy on the network', async ({ page }) => {
  // Set up the interception before navigating
  const networkCall = interceptNetworkCall({
    page,
    method: 'GET', // GET is optional
    url: '**/api/users'
  })

  await page.goto('/users-page')

  // Wait for the intercepted response and access the result
  const { responseJson, status } = await networkCall

  expect(responseJson.length).toBeGreaterThan(0)
  expect(status).toBe(200)
})
```

```typescript
// As a fixture
import { test } from '@seontechnologies/playwright-utils/fixtures'

test('Stub the network', async ({ page, interceptNetworkCall }) => {
  // With fixture, you don't need to pass the page object
  const mockResponse = interceptNetworkCall({
    method: 'GET',
    url: '**/api/users',
    fulfillResponse: {
      status: 200,
      body: { data: [{ id: 1, name: 'Test User' }] }
    }
  })

  await page.goto('/users-page')

  // Wait for the intercepted response
  await mockResponse

  expect(responseJson.data[0].name).toBe('Test User')
})
```

```typescript
// Conditional request handling
test('Modify responses', async ({ page, interceptNetworkCall }) => {
  await interceptNetworkCall({
    url: '/api/data',
    handler: async (route, request) => {
      if (request.method() === 'POST') {
        // Handle POST requests
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true })
        })
      } else {
        // Continue with other requests
        await route.continue()
      }
    }
  })
})
```

[→ Network Interception Documentation](./docs/intercept-network-call.md)

### [Auth Session](./docs/auth-session.md)

An authentication session management system for Playwright tests that persists tokens between test runs:

- Faster tests with persistent token storage
- User-based, on the fly authentication support
- Support for both UI and API testing

#### Implementation Steps

1. **Configure Global Setup** - Create `playwright/support/global-setup.ts` and add it to your Playwright config
   - Sets up authentication storage and initializes the auth provider
   - Nearly identical across all applications

```typescript
// 1. Configure Global Setup (playwright/support/global-setup.ts)
import {
  authStorageInit,
  setAuthProvider,
  configureAuthSession,
  authGlobalInit
} from '@seontechnologies/playwright-utils/auth-session'
import myCustomProvider from './auth/custom-auth-provider'

async function globalSetup() {
  // Ensure storage directories exist
  authStorageInit()

  // STEP 1: Configure auth storage settings
  configureAuthSession({
    // store auth tokens anywhere you want, and remember to gitignore the directory
    authStoragePath: process.cwd() + '/playwright/auth-sessions',
    debug: true
  })

  // STEP 2: Set up custom auth provider
  // This defines HOW authentication tokens are acquired and used
  setAuthProvider(myCustomProvider)

  // Optional: pre-fetch all tokens in the beginning
  await authGlobalInit()
}

export default globalSetup
```

> **⚠️ IMPORTANT:** The order of function calls in your global setup is critical. Always register your auth provider with `setAuthProvider()` after configuring the session. This ensures the auth provider is properly initialized.

1. **Create Auth Fixture** - Add `playwright/support/auth/auth-fixture.ts` to your merged fixtures
   - Provides standardized Playwright test fixtures for authentication
   - Generally reusable across applications without modification
   - **CRITICAL: Register auth provider early to ensure it's always available**

Add `playwright/support/auth/auth-fixture.ts` to your merged fixtures

```typescript
// 1. Create Auth Fixture (playwright/support/auth/auth-fixture.ts)
import { test as base } from '@playwright/test'
import {
  createAuthFixtures,
  type AuthOptions,
  type AuthFixtures,
  setAuthProvider // Import the setAuthProvider function
} from '@seontechnologies/playwright-utils/auth-session'

// Import your custom auth provider
import myCustomProvider from './custom-auth-provider'

// Register the auth provider early
setAuthProvider(myCustomProvider)

export const test = base.extend<AuthFixtures>({
  // For authOptions, we need to define it directly using the Playwright array format
  authOptions: [defaultAuthOptions, { option: true }],

  // Use the other fixtures directly
  ...createAuthFixtures()

// In your tests, use the auth token
test('authenticated API request', async ({ authToken, request }) => {
  const response = await request.get('https://api.example.com/protected', {
    headers: { Authorization: `Bearer ${authToken}` }
  })

  expect(response.ok()).toBeTruthy()
})
```

1. Create Custom Auth Provider - Implement token management with modular utilities:

```typescript
// playwright/support/auth/custom-auth-provider.ts
import {
  type AuthProvider,
  authStorageInit,
  getTokenFilePath,
  saveStorageState
} from '@seontechnologies/playwright-utils/auth-session'
import { log } from '@seontechnologies/playwright-utils/log'
import { acquireToken } from './token/acquire'
import { checkTokenValidity } from './token/check-validity'
import { isTokenExpired } from './token/is-expired'
import { extractToken, extractCookies } from './token/extract'
import { getEnvironment } from './get-environment'
import { getUserIdentifier } from './get-user-identifier'

const myCustomProvider: AuthProvider = {
  // Get the current environment to use
  getEnvironment,

  // Get the current user identifier to use
  getUserIdentifier,

  // Extract token from storage state
  extractToken,

  // Extract cookies from token data for browser context
  extractCookies,

  // Check if token is expired
  isTokenExpired,

  // Main token management method
  async manageAuthToken(request, options = {}) {
    const environment = this.getEnvironment(options)
    const userIdentifier = this.getUserIdentifier(options)
    const tokenPath = getTokenFilePath({
      environment,
      userIdentifier,
      tokenFileName: 'storage-state.json'
    })

    // Check for existing valid token
    const validToken = await checkTokenValidity(tokenPath)
    if (validToken) return validToken

    // Initialize storage and acquire new token if needed
    authStorageInit({ environment, userIdentifier })
    const storageState = await acquireToken(
      request,
      environment,
      userIdentifier,
      options
    )

    // Save and return the new token
    saveStorageState(tokenPath, storageState)
    return storageState
  },

  // Clear token when needed
  clearToken(options = {}) {
    const environment = this.getEnvironment(options)
    const userIdentifier = this.getUserIdentifier(options)
    const storageDir = getStorageDir({ environment, userIdentifier })
    const authManager = AuthSessionManager.getInstance({ storageDir })
    authManager.clearToken()
    return true
  }
}

export default myCustomProvider
```

1. Use the Auth Session in Your Tests

```typescript
import { test } from '../support/auth/auth-fixture'

test('access protected resources', async ({ page, authToken }) => {
  // API calls with token
  const response = await request.get('/api/protected', {
    headers: { Authorization: `Bearer ${authToken}` }
  })

  // Or use the pre-authenticated page
  await page.goto('/protected-area')
})

// Ephemeral user authentication
import { applyUserCookiesToBrowserContext } from '@seontechnologies/playwright-utils/auth-session'

test('ephemeral user auth', async ({ context, page }) => {
  // Apply user auth directly to browser context (no disk persistence)
  const user = await createTestUser({ userIdentifier: 'admin' })
  await applyUserCookiesToBrowserContext(context, user)

  // Page is now authenticated with the user's token
  await page.goto('/protected-page')
})
```

[→ Auth Session Documentation](./docs/auth-session.md)

### [File Utilities](./docs/file-utils.md)

A comprehensive set of utilities for reading, validating, and waiting for files (CSV, XLSX, PDF, ZIP).

```typescript
// Direct import
import { readCSV } from '@seontechnologies/playwright-utils/file-utils'

test('example', async () => {
  const result = await readCSV({ filePath: '/path/to/data.csv' })
})

// As a fixture
import { test } from '@seontechnologies/playwright-utils/file-utils/fixtures'

test('example', async ({ fileUtils }) => {
  const isValid = await fileUtils.validateCSV({
    filePath: '/path/to/data.csv',
    expectedRowCount: 10
  })
})
```

[→ File Utilities Documentation](./docs/file-utils.md)

### [Network Recorder](./docs/network-recorder.md)

A HAR-based network traffic recording and playback utility that enables frontend tests to run in complete isolation from backend services. Features intelligent stateful CRUD detection for realistic API behavior.

```typescript
// Control mode in your test file (recommended)
process.env.PW_NET_MODE = 'record' // or 'playback'

// As a fixture (recommended)
import { test } from '@seontechnologies/playwright-utils/network-recorder/fixtures'

test('CRUD operations work offline', async ({
  page,
  context,
  networkRecorder
}) => {
  // Setup - automatically records or plays back based on PW_NET_MODE
  await networkRecorder.setup(context)

  await page.goto('/')

  // First time: records all network traffic to HAR file
  // Subsequent runs: plays back from HAR file (no backend needed!)
  await page.fill('#movie-name', 'Inception')
  await page.click('#add-movie')

  // Intelligent CRUD detection ensures the movie appears in the list
  // even though we're running offline!
  await expect(page.getByText('Inception')).toBeVisible()
})
```

```bash
# Alternative: Environment-based mode switching
PW_NET_MODE=record npm run test:pw   # Record network traffic to HAR files
PW_NET_MODE=playback npm run test:pw # Playback from existing HAR files
```

[→ Network Recorder Documentation](./docs/network-recorder.md)

### [Burn-in](./docs/burn-in.md)

A **smart test burn-in utility** that intelligently filters which tests to run based on file changes, replacing Playwright's basic `--only-changed` with sophisticated analysis and decision-making.

**Key Benefits**:

- 🧠 **Intelligent categorization**: Differentiates test files, config files, common utilities, and source code
- ⚡ **Efficient execution**: Skip tests when only config changes, run @smoke tests for common file changes
- 🎯 **Targeted testing**: Run specific changed tests or strategic subsets
- 🛡️ **Secure**: Built with shell injection protection and proper input validation

**Quick Setup**:

1. Create a burn-in script:

```typescript
// scripts/burn-in-changed.ts
import { runBurnIn } from '@seontechnologies/playwright-utils/burn-in'

async function main() {
  await runBurnIn()
}

main().catch(console.error)
```

2. Add package.json script:

```json
{
  "scripts": {
    "test:pw:burn-in-changed": "tsx scripts/burn-in-changed.ts"
  }
}
```

3. Create configuration (auto-discovered):

```typescript
// config/.burn-in.config.ts (recommended location)
import type { BurnInConfig } from '@seontechnologies/playwright-utils/burn-in'

const config: BurnInConfig = {
  commonBurnInPatterns: ['**/support/**'], // → Run @smoke tests
  skipBurnInPatterns: ['**/config/**'], // → Skip entirely
  commonBurnInTestTag: '@smoke', // Tests to run for common changes
  burnIn: {
    repeatEach: process.env.CI ? 2 : 3,
    retries: process.env.CI ? 0 : 1
  }
}
export default config
```

**Advanced Usage**:

```typescript
// Command line arguments supported
await runBurnIn({
  baseBranch: 'develop',
  configPath: './custom-config/.burn-in.config.ts'
})
```

**Smart Execution Modes**:

- **Skip Mode**: Config/constant file changes → No tests run
- **Smoke Mode**: Common utility changes → Run tests tagged with `@smoke`
- **Targeted Mode**: Test file changes → Run only those specific tests
- **Run-all Mode**: Source code changes → Use `--only-changed` for full coverage

[→ Burn-in Documentation](./docs/burn-in.md)

## Testing the Package Locally

```bash
# Build the package
npm run build

# Create a tarball package
npm pack

# Install in a target repository (change the version according to the file name)
# For npm projects:
npm install ../playwright-utils/seontechnologies-playwright-utils-1.0.1.tgz

# For pnpm projects:
pnpm add file:/path/to/playwright-utils-1.0.1.tgz
```

## Release and Publishing

This package is published to the GitHub Packages registry under the `@seontechnologies` scope.

### Publishing via GitHub UI (Recommended)

You can trigger a release directly from GitHub's web interface:

1. Go to the repository → Actions → "Publish Package" workflow
2. Click "Run workflow" button (dropdown on the right)
3. Select options in the form:
   - **Branch**: main
   - **Version type**: patch/minor/major/custom
   - **Custom version**: Only needed if you selected "custom" type
4. Click "Run workflow"

**Important**: You must review and merge the PR to complete the process

### Publishing Locally

You can also publish the package locally using the provided script:

```bash
# 1. If not already set, set your GitHub token as an environment variable
export GITHUB_TOKEN=your_personal_access_token

# 2. Run the publish script
npm run publish:local
```
