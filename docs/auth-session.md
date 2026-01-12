---
title: Auth Session
description: Persistent authentication management with token caching for Playwright tests
---

# Playwright Auth Session Library

Playwright is unopinionated by design, providing developers with powerful tools and flexible patterns while leaving the implementation details and developer experience up to you.

This library builds on Playwright's authentication capabilities to create a more structured, efficient developer experience. It implements a session-based storage pattern for authentication that works seamlessly with both API and UI testing, allowing you to fetch an authentication token once per environment/user and reuse it while valid across tests and test runs.

## Table of Contents

- [Playwright Auth Session Library](#playwright-auth-session-library)
  - [Table of Contents](#table-of-contents)
  - [What is this and why does it exist?](#what-is-this-and-why-does-it-exist)
    - [Playwright's Built-in Authentication](#playwrights-built-in-authentication)
      - [Approach 1: Setup Project with Dependencies](#approach-1-setup-project-with-dependencies)
      - [Approach 2: Global Setup Function](#approach-2-global-setup-function)
      - [Approach 3: Per-Worker Authentication (workerStorageState)](#approach-3-per-worker-authentication-workerstoragestate)
      - [Write tests that use the authenticated state](#write-tests-that-use-the-authenticated-state)
    - [Limitations of Playwright’s Approach vs. What This Library Adds](#limitations-of-playwrights-approach-vs-what-this-library-adds)
  - [Quick Start Guide](#quick-start-guide)
    - [Configure Global Setup](#configure-global-setup)
    - [Create Auth Fixture](#create-auth-fixture)
    - [Implement Custom Auth Provider](#implement-custom-auth-provider)
      - [BaseURL Resolution](#baseurl-resolution)
    - [Create Token Acquisition Logic](#create-token-acquisition-logic)
    - [Update Your Playwright Config](#update-your-playwright-config)
    - [Configure Authentication Options](#configure-authentication-options)
    - [Use the Auth Session in Your Tests](#use-the-auth-session-in-your-tests)
      - [Cookie-Based Authentication](#cookie-based-authentication)
    - [Using Multiple User Identifiers in Tests](#using-multiple-user-identifiers-in-tests)
      - [Simple User Override with authOptions](#simple-user-override-with-authoptions)
      - [Parallel Test Execution with Multiple User Identifiers](#parallel-test-execution-with-multiple-user-identifiers)
      - [User-Specific Test Fixtures](#user-specific-test-fixtures)
    - [Direct Use of Storage State (Vanilla Playwright Approach)](#direct-use-of-storage-state-vanilla-playwright-approach)
      - [Testing Interactions Between Multiple Users in a Single Test](#testing-interactions-between-multiple-users-in-a-single-test)
    - [Ephemeral User Authentication](#ephemeral-user-authentication)
      - [How Ephemeral Authentication Works](#how-ephemeral-authentication-works)
    - [UI Testing with Browser Context](#ui-testing-with-browser-context)
      - [Custom Authentication Provider](#custom-authentication-provider)
      - [Understanding the Options Flow for Auth Provider Methods](#understanding-the-options-flow-for-auth-provider-methods)
      - [OAuth2 Example](#oauth2-example)
      - [Token Pre-fetching](#token-pre-fetching)
    - [Parallel Testing with Worker-Specific Accounts](#parallel-testing-with-worker-specific-accounts)
    - [Testing Unauthenticated States](#testing-unauthenticated-states)
      - [Playwright's Built-in Approach](#playwrights-built-in-approach)
      - [Our Enhanced Approach](#our-enhanced-approach)
  - [Reference](#reference)
    - [Storage Options for the auth session](#storage-options-for-the-auth-session)
    - [Storage State Format](#storage-state-format)
    - [Token Expiration Handling](#token-expiration-handling)
      - [Standard JWT Tokens](#standard-jwt-tokens)
      - [Custom Token Formats](#custom-token-formats)
    - [Troubleshooting](#troubleshooting)
      - ["Cannot extract token, considering expired"](#cannot-extract-token-considering-expired)
      - [Tokens not being reused between test runs](#tokens-not-being-reused-between-test-runs)
      - [Browser context not authenticated](#browser-context-not-authenticated)
      - [Different users getting same token](#different-users-getting-same-token)
    - [Quick Reference](#quick-reference)
    - [Token Utility Modules (Reference Implementation)](#token-utility-modules-reference-implementation)
    - [Session Storage Support (Extension Recipe)](#session-storage-support-extension-recipe)

## What is this and why does it exist?

### Playwright's Built-in Authentication

Playwright provides a mechanism for saving and reusing authentication state through the [`storageState`](https://playwright.dev/docs/auth) feature. The official documentation outlines two alternative approaches:

#### Approach 1: Setup Project with Dependencies

This approach uses a dedicated setup project that runs before your test projects:

<details><summary><strong>Expand for details:</strong></summary>

1. Create an authentication setup file:

```typescript
// tests/auth.setup.ts - Authentication setup file
import { test as setup } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Navigate to login page and authenticate via UI
  await page.goto('https://example.com/login')
  await page.getByLabel('Username').fill('user')
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Wait until the page receives the cookies
  await page.waitForURL('https://example.com/dashboard')

  // Save storage state to a file
  await page.context().storageState({ path: authFile })
})
```

2. Configure your tests to use this authentication state:

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  projects: [
    // Setup project that runs first
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // Test projects that use the authenticated state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use prepared auth state
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup'] // This project depends on setup project
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup']
    }
  ]
})
```

</details>

#### Approach 2: Global Setup Function

Alternatively, you can use a global setup function that runs once before all tests:

<details><summary><strong>Expand for details:</strong></summary>

1. Create a global setup file:

```typescript
// global-setup.ts
import { chromium, FullConfig } from '@playwright/test'
import path from 'path'

async function globalSetup(config: FullConfig) {
  // Create browser, context, and page
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Navigate to login page and authenticate
  await page.goto('https://example.com/login')
  await page.getByLabel('Username').fill('user')
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Wait for login to complete
  await page.waitForURL('https://example.com/dashboard')

  // Save storage state to a file for reuse
  await page.context().storageState({
    path: path.join(process.cwd(), 'playwright/.auth/user.json')
  })

  await browser.close()
}

export default globalSetup
```

2. Reference the global setup in your configuration:

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // Reference the global setup file
  globalSetup: './global-setup.ts',

  use: {
    // Use the saved state for all tests
    storageState: 'playwright/.auth/user.json'
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } }
  ]
})
```

</details>

#### Approach 3: Per-Worker Authentication (workerStorageState)

For parallel tests that modify server-side state, Playwright recommends one account per worker:

<details><summary><strong>Expand for details:</strong></summary>

```typescript
// playwright/fixtures.ts
import { test as baseTest } from '@playwright/test'
import fs from 'fs'
import path from 'path'

export const test = baseTest.extend<{}, { workerStorageState: string }>({
  // Use the worker-specific storage state for all tests
  storageState: ({ workerStorageState }, use) => use(workerStorageState),

  // Worker-scoped fixture that authenticates once per worker
  workerStorageState: [
    async ({ browser }, use) => {
      // Each worker gets a unique ID (0, 1, 2, etc.)
      const id = test.info().parallelIndex
      const fileName = path.resolve(
        test.info().project.outputDir,
        `.auth/${id}.json`
      )

      // Reuse existing authentication if available
      if (fs.existsSync(fileName)) {
        await use(fileName)
        return
      }

      // Authenticate with worker-specific account
      const page = await browser.newPage({ storageState: undefined })
      const account = await acquireAccount(id) // Your account pool logic

      await page.goto('https://example.com/login')
      await page.getByLabel('Username').fill(account.username)
      await page.getByLabel('Password').fill(account.password)
      await page.getByRole('button', { name: 'Sign in' }).click()
      await page.waitForURL('https://example.com/dashboard')

      // Save and reuse for this worker's tests
      await page.context().storageState({ path: fileName })
      await page.close()
      await use(fileName)
    },
    { scope: 'worker' }
  ]
})
```

This approach requires:

- A pool of test accounts (one per potential parallel worker)
- Custom fixture code with worker-scoped storage
- Manual file management for storage state

</details>

#### Write tests that use the authenticated state

<details><summary><strong>Expand for details:</strong></summary>

```typescript
// From playwright/tests/auth-session/auth-session-sanity.spec.ts (actual working test)
import { log } from '../../../src/log'
import { test, expect } from '../../support/merged-fixtures'

/**
 * Create a preview of a token that's safe for logging
 */
const createTokenPreview = (token: string): string =>
  token.substring(0, 10) + '...' + token.substring(token.length - 5)

// Configure tests to run in serial mode for proper token reuse testing
test.describe.configure({ mode: 'serial' })
test.describe('Auth Session Example', () => {
  test('should have auth token available', async ({ authToken }) => {
    // Token is already obtained via the fixture
    expect(authToken).toBeDefined()
    expect(typeof authToken).toBe('string')
    expect(authToken.length).toBeGreaterThan(0)

    // Log token for debugging (shortened for security)
    const tokenPreview = createTokenPreview(authToken)
    await log.info(`Token available without explicit fetching: ${tokenPreview}`)
  })

  test('should reuse the same auth token', async ({
    authToken,
    apiRequest
  }) => {
    // The token is already available without making a new request
    expect(authToken).toBeDefined()

    // We can use the token for API requests
    const { status } = await apiRequest({
      method: 'GET',
      path: '/movies',
      headers: {
        Authorization: authToken // Use the token directly
      }
    })

    expect(status).toBe(200)
  })
})
```

</details>

### Limitations of Playwright’s Approach vs. What This Library Adds

| **No.** | **Limitation of Playwright’s Approach**                                                                                                                                                                          | **What This Library Adds**                                                                                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | **Complex setup** – Requires configuration across multiple files and understanding of projects/dependencies.                                                                                                     | **Simplified setup** – Single configuration approach with provider-based expiration checks and on-demand refresh during token acquisition.                                          |
| 2       | **Manual token management** – No built-in handling of token expiration or refreshing.                                                                                                                            | **Structured token storage** – Organized acquisition and persistence of tokens.                                                                                                     |
| 3       | **No multi-environment support** – No straightforward way to handle different environments (dev/staging/prod).                                                                                                   | **Multi-environment support** – First-class support for different environments (dev/staging/prod).                                                                                  |
| 4       | **No multi-user support** – No built-in system for managing different user identifiers (admin/user/guest).                                                                                                       | **User-based testing** – Built-in system for managing different user identifiers (admin/user/guest).                                                                                |
| 5       | **Limited programmatic control** – No simple API for clearing or refreshing tokens during test execution.                                                                                                        | **Programmatic control** – Clear and re-fetch tokens via `clearAuthToken` and `getAuthToken`.                                                                                       |
| 6       | **Separate implementations** – Different approaches needed for API vs UI authentication.                                                                                                                         | **Unified implementation** – Same approach works for both API and browser testing.                                                                                                  |
| 7       | **Performance bottleneck** – Relies solely on file storage, requiring disk I/O and JSON parsing for every test run, causing slowdowns.                                                                           | **Performance optimization** – Optional in-memory caching (via `AuthSessionManager`/`globalTokenCache`) reduces repeated file reads in flows that use it.                           |
| 8       | **UI Mode limitations** – UI mode doesn’t run setup projects by default, requiring manual intervention to re-authenticate when tokens expire (enabling filters, running auth.setup.ts, disabling filters again). | **Seamless UI Mode integration** – Works with Playwright UI Mode without manual intervention; no need to enable filters, run setup projects, or re-authenticate when tokens expire. |
| 9       | **Between-run API calls** – Authentication request is made at the start of each test run session, even when a previously acquired token is still valid.                                                          | **Reduced API calls** – Valid tokens are reused from storage/cache; new auth happens only when missing or expired.                                                                  |
| 10      | **Manual parallel worker setup** – Requires custom fixtures and significant boilerplate code to implement worker-specific authentication for parallel testing.                                                   | **Parallel worker support** – Works with worker-specific user identifiers (e.g., `parallelIndex`) and isolated storage once you map worker → user in your provider.                 |
| 11      | **No session storage support** – Playwright explicitly does not provide APIs to persist session storage, requiring custom scripts for apps that use this storage method.                                         | **Storage state support** – Handles Playwright `storageState` (cookies, localStorage, and IndexedDB). SessionStorage requires custom handling (see extension recipe).               |

**Additional Benefits**:

1. **Provider architecture** - Extensible design for custom authentication flows
2. **Single source of truth** - Auth provider centralizes environment and user identifier configuration
3. **Isolated storage** - Tokens are stored by environment and user identifier, preventing cross-contamination

<details><summary><strong>More on UI mode integration:</strong></summary>

> ### More on UI mode integration:
>
> **Assumes:** you are using the auth fixtures from `createAuthFixtures` (or merged fixtures) and have set a provider with `setAuthProvider`.
>
> In Playwright's authentication approach, they use separate "setup projects" that run before your tests to handle authentication. The problem is that UI Mode intentionally skips these setup projects for speed. This forces you to manually authenticate by:
>
> 1. Finding and enabling the setup filter
> 2. Clicking a button to manually run the auth setup
> 3. Disabling the filter again
> 4. Repeating whenever tokens expire
>
> #### How Our Approach Is Different
>
> Our solution bakes authentication directly into the normal test flow instead of using separate setup projects:
>
> 1. **Smarter Token Management**: We store tokens in a central location that works for both normal tests and UI Mode tests.
> 2. **On-Demand Authentication**: Instead of requiring a separate setup step, fixtures call your provider's `manageAuthToken` on demand:
>    - If a valid token exists, it uses it (fast path)
>    - If no token exists or it's expired, it fetches a new one (transparent to you)
> 3. **Integrated with Test Fixtures**: Authentication is provided through fixtures that UI Mode automatically uses, so there's no separate step to enable or disable.
> 4. **Unified Storage State**: We properly configure Playwright's `storageState` so UI Mode tests automatically get the authentication state without any manual steps.
>
> Essentially, our solution treats authentication as a seamless part of the test execution instead of a separate setup step. Since it's integrated with the normal test fixtures and flow, UI Mode "just works" without any special handling.

</details>

<details><summary><strong>More on parallel worker authentication:</strong></summary>

> ### Playwright's Parallel Worker Authentication
>
> When tests run in parallel, Playwright recommends using **one unique account per worker** if your tests modify server-side data. This prevents tests from interfering with each other.
>
> #### What It Does In Simple Terms
>
> 1. **One Login Per Worker**: Instead of logging in for every test, each worker (parallel process) logs in once
> 2. **Worker-Specific Storage**: Each worker gets its own storage file to save cookies/tokens
> 3. **Unique Accounts**: Each worker uses a different account (like user1@example.com, user2@example.com, etc.)
> 4. **Persistent Worker State**: All tests running in the same worker share the same logged-in session
>
> **However, implementing this approach manually requires:**
>
> 1. **Custom fixture code**: Creating and maintaining specialized test fixtures
> 2. **File management**: Setting up the storage state directory structure
> 3. **Storage persistence**: Manually handling the storage state files
> 4. **Code duplication**: Reimplementing this pattern across projects
>
> **Our authentication library supports this worker-specific pattern when you map worker → user in your provider:**
>
> 1. Storage is isolated under `.auth/<environment>/<userIdentifier>`
> 2. The same fixtures work for both browser tests and API tests
> 3. Optional in-memory caching is available via `AuthSessionManager`/`globalTokenCache`
>
> This is a key advantage of our approach - **getting the same benefits with significantly less code and complexity**.

</details>

<details><summary><strong>More on performance and simplicity benefits:</strong></summary>

> ### More on performance and simplicity benefits:
>
> - **Fewer auth calls**: reuse stored state while valid; refresh only on miss/expiry.
> - **Optional caching**: `AuthSessionManager`/`globalTokenCache` can reduce disk I/O in compatible flows.
> - **Persistent storage**: tokens survive between runs for faster local/CI loops.
> - **Simple API**: fixture-based access works for both API and UI tests.
>
> The system stays compatible with Playwright's storageState flow while reducing boilerplate.

</details>

## Quick Start Guide

⚠️ **IMPORTANT**: The authentication system requires a configured auth provider before use. Set up `setAuthProvider` in global setup, and use `configureAuthSession` to establish global defaults and storage metadata.

### Configure Global Setup

Create `playwright/support/global-setup.ts` and add it to your Playwright config:

```typescript
// playwright/support/global-setup.ts
import type { FullConfig } from '@playwright/test'
import {
  authStorageInit,
  setAuthProvider,
  configureAuthSession,
  authGlobalInit
} from '@seontechnologies/playwright-utils/auth-session'

import myCustomProvider from './auth/custom-auth-provider'

async function globalSetup(_config: FullConfig): Promise<void> {
  // Initialize storage, config and provider in the correct order
  authStorageInit()

  configureAuthSession({
    // Auth sessions stored in .auth at repo root (.gitignore this)
    debug: true
  })

  setAuthProvider(myCustomProvider)

  // Optional: pre-fetch all tokens for better test startup performance
  await authGlobalInit()
}

export default globalSetup
```

The function call order matters: first storage initialization, then configuration, then provider setup, and optionally token pre-fetching.

### Create Auth Fixture

Add `playwright/support/auth/auth-fixture.ts` to your merged fixtures:

```typescript
// playwright/support/auth/auth-fixture.ts (from actual codebase)
import { test as base } from '@playwright/test'
import {
  createAuthFixtures,
  type AuthOptions,
  type AuthFixtures,
  setAuthProvider
} from '@seontechnologies/playwright-utils/auth-session'

// Import our custom auth provider
import myCustomProvider from './custom-auth-provider'
import { BASE_URL } from '@playwright/config/local.config'
import { getEnvironment } from './get-environment'
import { getUserIdentifier } from './get-user-identifier'

// Register the custom auth provider
setAuthProvider(myCustomProvider)

// Default auth options using the current environment
const defaultAuthOptions: AuthOptions = {
  environment: getEnvironment(),
  userIdentifier: getUserIdentifier(),
  baseUrl: BASE_URL // Pass baseUrl explicitly to auth session
}

// Get the fixtures from the factory function
const fixtures = createAuthFixtures()

// Export the test object with auth fixtures
export const test = base.extend<AuthFixtures>({
  // For authOptions, we need to define it directly using the Playwright array format
  authOptions: [defaultAuthOptions, { option: true }],

  // Auth session toggle - enables/disables auth functionality completely
  authSessionEnabled: [true, { option: true }],

  // Use the other fixtures directly
  authToken: fixtures.authToken,
  context: fixtures.context,
  page: fixtures.page
})
```

> **Note**: Register the auth provider in both global setup AND your fixture for reliability when tests run in UI mode or without global setup.

### Implement Custom Auth Provider

Create a custom auth provider to handle token acquisition and management. Your auth provider can also provide custom baseURL resolution logic for multi-user testing scenarios.

The `AuthProvider` interface includes an optional `getBaseUrl` method that allows you to implement custom logic for resolving the baseURL when using multiple user identifiers. This is particularly useful for tests that require different baseURLs for different users or environments.

#### BaseURL Resolution

When creating a browser context, the baseURL is resolved in the following priority order:

1. `authOptions.baseUrl` - Explicitly provided in test configuration
2. `authProvider.getBaseUrl(authOptions)` - Custom provider logic if implemented
3. `browserContextOptions.baseURL` - From Playwright config
4. `process.env.BASE_URL` - Environment variable

By implementing the `getBaseUrl` method in your custom provider, you can insert project-specific logic for determining the baseURL based on the current environment and user identifier.

```typescript
// Example implementation of getBaseUrl in a custom auth provider
getBaseUrl() {
  const env = getEnvironment()

  // Example: Different URLs for different environments or users
  if (env === 'local') {
    return 'http://localhost:3000'
  }

  if (env === 'staging') {
    return 'https://staging.example.com'
  }

  // Return undefined to fall back to browserContextOptions.baseURL or env vars
  return undefined
}

```

Here's a complete example of a custom auth provider implementation:

```typescript
// playwright/support/auth/custom-auth-provider.ts
import type { APIRequestContext } from '@playwright/test'
import {
  type AuthOptions,
  type AuthProvider,
  AuthSessionManager,
  authStorageInit,
  getStorageDir,
  getTokenFilePath,
  saveStorageState
} from '../../../src/auth-session'
import { log } from '../../../src/log'
import { acquireToken } from './token/acquire'
import { checkTokenValidity } from './token/check-validity'
import { isTokenExpired } from './token/is-expired'
import { extractToken, extractCookies } from './token/extract'
import { getEnvironment } from './get-environment'
import { getUserIdentifier } from './get-user-identifier'
import { getBaseUrl } from './get-base-url'

const myCustomProvider: AuthProvider = {
  // Get the current base URL to use
  getBaseUrl,

  // Get the current environment to use
  getEnvironment,

  // Get the current user identifier to use
  getUserIdentifier,

  // Extract token from storage state
  extractToken,

  // Extract cookies from token data
  extractCookies,

  // Check if token is expired
  isTokenExpired,

  // Main token management method
  async manageAuthToken(
    request: APIRequestContext,
    options: AuthOptions = {}
  ): Promise<Record<string, unknown>> {
    const environment = this.getEnvironment(options)
    const userIdentifier = this.getUserIdentifier(options)

    // Get the path for storing the token
    const tokenPath = getTokenFilePath({
      environment,
      userIdentifier,
      tokenFileName: 'storage-state.json'
    })

    // Check if we already have a valid token
    const validToken = await checkTokenValidity(tokenPath)
    if (validToken) {
      return validToken
    }

    // No valid token found, initialize storage and get a new one
    authStorageInit({ environment, userIdentifier })
    const storageState = await acquireToken(
      request,
      environment,
      userIdentifier,
      options
    )

    // Save the token for future use
    saveStorageState(tokenPath, storageState)
    return storageState
  },

  // Clear token when needed
  clearToken(options: AuthOptions = {}) {
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

> **Note**: See the [complete auth provider example](https://github.com/seontechnologies/playwright-utils/tree/main/examples/auth-provider) for detailed implementation including environment handling and browser context setup.

### Create Token Acquisition Logic

Implement your application-specific token acquisition logic that handles credentials and API calls. Here's the actual implementation used in the codebase:

```typescript
// playwright/support/auth/token/acquire.ts
import type { APIRequestContext } from '@playwright/test'
import { request } from '@playwright/test'
import { log } from '../../../../src/log'

/**
 * Application-specific auth URL construction based on environment
 */
const getAuthBaseUrl = (environment: string, customUrl?: string) => {
  // Override with custom URL if provided (useful for testing)
  if (customUrl) return customUrl

  // Support for environment variables
  if (process.env.AUTH_BASE_URL) return process.env.AUTH_BASE_URL

  // Environment-specific URL mapping (customize as needed for your application)
  const urlMap: Record<string, string> = {
    local: 'http://localhost:3001',
    dev: 'https://dev.example.com/api',
    staging: 'https://staging.example.com/api',
    qa: 'https://qa.example.com/api',
    production: 'https://api.example.com'
  }

  // Return mapped URL or fallback to local if environment not recognized
  return urlMap[environment] || urlMap.local
}

/**
 * Acquire a token and return a complete Playwright storage state object
 */
export const acquireToken = async (
  _request: APIRequestContext, // We won't use the passed request, we'll create a fresh one
  environment: string,
  userIdentifier: string,
  options: Record<string, string | undefined> = {}
): Promise<Record<string, unknown>> => {
  // Use the application-specific URL construction logic
  const authBaseUrl = getAuthBaseUrl(
    environment.toLowerCase(),
    options.authBaseUrl
  )

  // Get the endpoint (could also be environment-specific if needed)
  const endpoint = process.env.AUTH_TOKEN_ENDPOINT || '/auth/fake-token'
  const authUrl = `${authBaseUrl}${endpoint}`

  // Create a fresh request context that will capture cookies
  const context = await request.newContext()

  try {
    // Make the authentication request
    const response = await context.post(authUrl, {
      data: {
        username: process.env.USER_USERNAME || 'test-user',
        password: process.env.USER_PASSWORD || 'password123',
        userIdentifier,
        ...options.credentials // Allow overriding credentials via options
      },
      headers: {
        'Content-Type': 'application/json',
        ...options.headers // Allow custom headers
      }
    })

    if (!response.ok()) {
      const error = await response.text()
      throw new Error(`Auth failed: ${response.status()} - ${error}`)
    }

    // Get the storage state which includes cookies, localStorage, and IndexedDB
    const storageState = await context.storageState()

    // Add any additional metadata you want to store with the token
    return {
      ...storageState,
      metadata: {
        environment,
        userIdentifier,
        acquiredAt: new Date().toISOString()
      }
    }
  } finally {
    // Always close the context to free up resources
    await context.dispose()
  }
}
```

> **Note**: For more complex token acquisition with user-based auth, refresh tokens, or OAuth flows, see the [authentication recipes](https://github.com/seontechnologies/playwright-utils/tree/main/examples/auth-recipes) directory.

### Update Your Playwright Config

Make sure your config points to your global setup and sets the baseUrl in your auth options:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

export default defineConfig({
  // Other config options...

  // Point to your global setup file
  globalSetup: './playwright/support/global-setup.ts',

  use: {
    baseURL: BASE_URL
  }

  // Other config options...
})
```

### Configure Authentication Options

When setting up your auth fixtures, it's recommended to include the baseUrl in your auth options:

```typescript
// playwright/support/auth/auth-fixture.ts
import { test as base } from '@playwright/test'
import {
  createAuthFixtures,
  type AuthOptions
} from '@seontechnologies/playwright-utils/auth-session'

// Get BASE_URL from your configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Default auth options with explicit baseUrl
const defaultAuthOptions: AuthOptions = {
  environment: process.env.TEST_ENV || 'local',
  userIdentifier: 'default',
  baseUrl: BASE_URL // Explicitly pass baseUrl to the auth session
}

// Create fixtures as usual
const fixtures = createAuthFixtures()

export const test = base.extend({
  authOptions: [defaultAuthOptions, { option: true }]
  // ... other fixtures
})
```

See [Storage Options for the auth session](#storage-options-for-the-auth-session) for the full list of available configuration fields.

### Use the Auth Session in Your Tests

#### Cookie-Based Authentication

This library supports cookie-based authentication, which is more secure and aligns with standard web practices. When using the auth session with a server that validates cookies:

```typescript
// Example test using auth fixtures with cookie-based authentication
import { test } from '../support/auth/auth-fixture'

test('authenticated API request', async ({ authToken, request }) => {
  // Use the token as a cookie for API requests
  const response = await request.get('/api/protected', {
    headers: { Cookie: `seon-jwt=${authToken}` }
  })
  expect(response.status()).toBe(200)
})
```

The `authToken` fixture returns the token value extracted from the cookie set by the authentication endpoint. This approach is automatically handled by the auth provider's `extractToken` method, which extracts the token value from the Playwright storage state.

```typescript
test('authenticated UI test', async ({ page }) => {
  // The page is already authenticated!
  await page.goto('/protected-area')
  await expect(page.locator('h1')).toHaveText('Protected Content')
})
```

Advanced usage (inside your auth provider's `manageAuthToken`):

```typescript
// Build a Playwright-compatible storage state from the auth response,
// so both API and UI tests can reuse the same authenticated state.
const data = await response.json()

// Create a storage state object (supports both API and browser testing)
const storageState: Record<string, unknown> = {
  // For UI testing, include cookies, localStorage, and/or IndexedDB
  cookies: [
    {
      name: 'auth-token',
      value: data.access_token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax'
    }
  ],
  origins: []
}

// Save via AuthSessionManager for caching and persistence
const authManager = AuthSessionManager.getInstance({
  debug: true,
  storageDir: path.dirname(tokenPath)
})
await authManager.saveToken(storageState)

return storageState
```

### Using Multiple User Identifiers in Tests

#### Simple User Override with authOptions

The simplest way to specify a user identifier for your tests is to override the `authOptions` fixture:

```typescript
// From playwright/tests/sample-app/frontend/user-login-multi-user-identifiers.spec.ts (actual test)
import { test, expect } from '../../../support/merged-fixtures'

const userIdentifiers = ['admin', 'freeUser', 'premiumUser']

// REQUIRED PATTERN: Wrap each test.use() in a test.describe() block for parallel isolation
userIdentifiers.forEach((userIdentifier) => {
  test.describe(`User: ${userIdentifier}`, () => {
    test.use({
      authOptions: {
        userIdentifier
      }
    })

    test(`should login with ${userIdentifier}`, async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('h1')).toContainText('Movie Database')
      await expect(page.locator('#login-status')).toContainText(
        `Current user: ${userIdentifier}`
      )
    })
  })
})
```

> **Note about baseURL:** When overriding `authOptions` for different user identifiers, you don't need to explicitly include the `baseUrl` property. The system automatically uses the baseURL from your Playwright configuration, ensuring that relative URL navigation like `page.goto('/')` works correctly even with non-default user identifiers.

#### Parallel Test Execution with Multiple User Identifiers

**IMPORTANT:** When running parallel tests with multiple user identifiers, you **must** use a specific pattern to ensure proper test isolation. Failure to do so can cause token contamination between tests.

For a single user identifier, this simple pattern works fine:

```typescript
// Simple single-user override works fine
test.use({
  authOptions: {
    userIdentifier: 'freeUser'
  }
})

test('should login with non-default user', async ({ page }) => {
  // Test code here
})
```

However, for multiple user identifiers in parallel tests, you **must** wrap each `test.use()` in its own `test.describe()` block:

```typescript
// REQUIRED PATTERN: Wrap each test.use() in a test.describe() block
userIdentifiers.forEach((userIdentifier) => {
  test.describe(`User: ${userIdentifier}`, () => {
    test.use({
      authOptions: {
        userIdentifier
      }
    })

    test(`should login with ${userIdentifier}`, async ({ page }) => {
      // Test code here
    })
  })
})
```

This pattern ensures proper isolation of auth tokens and browser contexts between parallel test runs. Without it, you may experience race conditions where user tokens get mixed up between tests.

#### User-Specific Test Fixtures

For frequently used user identifiers, create dedicated fixtures:

```typescript
// Role-specific test fixtures
import { test as baseTest } from '../support/base-fixtures'
import { createAuthFixtures } from '@seontechnologies/playwright-utils/auth-session'

// Create user-specific fixtures
export const userTest = baseTest.extend({
  ...createAuthFixtures({ userIdentifier: 'user' })
})

// Create admin-specific fixtures
export const adminTest = baseTest.extend({
  ...createAuthFixtures({ userIdentifier: 'admin' })
})

// Use in your tests
userTest('Regular users have limited access', async ({ page }) => {
  // Page already authenticated as regular user
  await page.goto('/dashboard')
})

adminTest('Admins can access advanced features', async ({ page }) => {
  // Page already authenticated as admin
  await page.goto('/admin-dashboard')
})
```

### Direct Use of Storage State (Vanilla Playwright Approach)

If you prefer to use Playwright's native storage state approach directly, our library supports this seamlessly:

```typescript
// Get storage state path for a specific user
import { getStorageStatePath } from '@seontechnologies/playwright-utils/auth-session'

const fraudAnalystStorageState = getStorageStatePath({
  userIdentifier: 'fraudAnalyst',
  environment: process.env.TEST_ENV || 'local'
})

// Use Playwright's native storage state approach
test.describe('Fraud Analyst Tests', () => {
  // Apply to all tests in this describe block
  test.use({ storageState: fraudAnalystStorageState })

  test('can view fraud queue', async ({ page }) => {
    await page.goto('/fraud-queue')
    // Test already authenticated as fraud analyst
  })
})
```

#### Testing Interactions Between Multiple Users in a Single Test

Sometimes you need to test how different user identifiers interact with each other. Our authentication library makes this easy by allowing you to explicitly request storage states for different user identifiers within the same test:

```typescript
// Example: testing multiple users in a single test
import { test, expect } from '../support/fixtures'
import { chromium } from '@playwright/test'
import {
  applyUserCookiesToBrowserContext,
  getAuthProvider,
  getAuthToken
} from '@seontechnologies/playwright-utils/auth-session'

test('admin and regular user interaction', async ({ request }) => {
  // Get storage states for different users
  // NOTE: getAuthToken returns a Playwright storage state object (cookies + origins),
  // NOT a raw token string. Use extractToken() to get the actual token value.
  const adminStorageState =
    await test.step('Get admin storage state', async () => {
      return getAuthToken(request, { userIdentifier: 'admin' })
    })

  const userStorageState =
    await test.step('Get user storage state', async () => {
      return getAuthToken(request, { userIdentifier: 'user' })
    })

  // Extract the actual token strings from storage states for API requests
  const authProvider = getAuthProvider()
  const adminToken = authProvider.extractToken(adminStorageState) || ''
  const userToken = authProvider.extractToken(userStorageState) || ''

  // Use extracted tokens for API requests
  const adminResponse = await request.get('/api/admin-only-resource', {
    headers: { Cookie: `seon-jwt=${adminToken}` }
  })
  expect(adminResponse.ok()).toBeTruthy()

  const userResponse = await request.get('/api/user-resource', {
    headers: { Cookie: `seon-jwt=${userToken}` }
  })
  expect(userResponse.ok()).toBeTruthy()

  // For browser testing, create multiple contexts with different storage states
  const browser = await chromium.launch()

  // Admin browser context - use storage state directly (not the extracted token)
  const adminContext = await browser.newContext()
  await applyUserCookiesToBrowserContext(adminContext, adminStorageState)
  const adminPage = await adminContext.newPage()

  // User browser context
  const userContext = await browser.newContext()
  await applyUserCookiesToBrowserContext(userContext, userStorageState)
  const userPage = await userContext.newPage()

  // Now you can interact with both contexts
  await adminPage.goto('/admin-dashboard')
  await userPage.goto('/user-profile')

  // Test interactions between the two users
  // ...

  // Clean up
  await adminContext.close()
  await userContext.close()
  await browser.close()
})
```

This approach is much simpler than Playwright's approach because:

1. **No manual storage state files** - Our library manages token storage automatically
2. **Consistent API** - Same approach works for both API and UI testing
3. **Type safety** - All functions have proper TypeScript types
4. **Explicit user identifier naming** - Uses semantic user identifier names instead of file paths

You can easily extend this pattern to create Page Object Models with user-specific authentication already applied.

### Ephemeral User Authentication

In some testing scenarios, particularly when testing with temporary test users or in parallel test environments, you may want to apply authentication without persisting tokens to disk. The auth-session library provides a dedicated utility for this purpose:

```typescript
import { applyUserCookiesToBrowserContext } from '@seontechnologies/playwright-utils/auth-session'
import { createTestUser } from '../support/user-factory'

test.describe('ephemeral user tests', () => {
  let adminUser
  let readUser

  test.beforeAll(async () => {
    // Create temporary test users
    adminUser = await createTestUser({ userIdentifier: 'admin' })
    readUser = await createTestUser({ userIdentifier: 'read' })
  })

  test.beforeEach(async ({ context }) => {
    // Apply admin user authentication to browser context
    await applyUserCookiesToBrowserContext(context, adminUser)
  })

  test('admin can access restricted features', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('button', { name: 'Add Item' })).toBeVisible()
  })

  test('read user has limited access', async ({ context, page }) => {
    // Override with read-only user for this specific test
    await applyUserCookiesToBrowserContext(context, readUser)

    await page.goto('/dashboard')
    await expect(
      page.getByRole('button', { name: 'Add Item' })
    ).not.toBeVisible()
  })
})
```

#### How Ephemeral Authentication Works

1. The `applyUserCookiesToBrowserContext` utility extracts authentication cookies from the user data
2. It applies these cookies directly to the Playwright browser context
3. No tokens or cookies are written to the filesystem
4. Each test can use different user credentials without persisting state

This approach is particularly useful for:

- Testing with temporary users created just for tests
- Parallel testing where each worker needs independent authentication
- Tests that require switching between different user identifiers

### UI Testing with Browser Context

This functionality is already built in and requires no additional code:

```typescript
// No special setup needed - auth is automatically applied
test('authenticated UI test', async ({ page }) => {
  // The page is already authenticated!
  await page.goto('/dashboard')

  // Verify authenticated content is visible
  await expect(page.locator('h1')).toContainText('Welcome Back')
})
```

#### Custom Authentication Provider

For specialized authentication needs, the custom provider becomes the source of truth for environment and user identifier information.

#### Understanding the Options Flow for Auth Provider Methods

The `AuthProvider` interface methods (like `getEnvironment` and `getUserIdentifier`) accept options parameters that might seem confusing at first. Here's how these options are passed:

1. **In Test Files**: When you set `authOptions` via `test.use()` or user-specific fixtures:

   ```typescript
   test.use({
     authOptions: { environment: 'staging', userIdentifier: 'admin' }
   })

   test('example', async ({ authToken }) => {
     // authOptions are passed to the provider internally
     expect(authToken).toBeTruthy()
   })
   ```

2. **Direct API Calls**: When directly calling API functions with options:

   ```typescript
   // Passes options to both getEnvironment() and getUserIdentifier()
   const token = await getAuthToken(request, {
     environment: 'staging',
     userIdentifier: 'admin'
   })
   ```

3. **Default Values**: When no options are explicitly passed, the auth provider should fall back to sensible defaults:
   ```typescript
   // Priority order in getEnvironment():
   // 1. Options passed from test via authOptions or direct API call
   // 2. Environment variables (process.env.TEST_ENV)
   // 3. Default value ('local')
   return options.environment || process.env.TEST_ENV || 'local'
   ```

Understanding this flow helps you implement a robust custom auth provider that works consistently across different usage patterns.

#### OAuth2 Example

<details><summary><strong>OAuth2 Implementation Example:</strong></summary>

Here's how to implement OAuth2 authentication in your custom auth provider:

```typescript
// Inside your custom-auth-provider.ts
import type { APIRequestContext } from '@playwright/test'
import type { AuthProvider } from '@seontechnologies/playwright-utils/auth-session'
import {
  getTokenFilePath,
  loadStorageState,
  saveStorageState
} from '@seontechnologies/playwright-utils/auth-session'

const myCustomProvider: AuthProvider = {
  getEnvironment(options = {}) {
    return options.environment || process.env.TEST_ENV || 'local'
  },
  getUserIdentifier(options = {}) {
    return options.userIdentifier || 'default'
  },

  extractToken(tokenData) {
    if (tokenData && typeof tokenData === 'object' && 'cookies' in tokenData) {
      const cookies =
        (tokenData as { cookies?: Array<{ name: string; value: string }> })
          .cookies || []
      return (
        cookies.find((cookie) => cookie.name === 'auth-token')?.value || null
      )
    }
    return null
  },
  extractCookies(tokenData) {
    if (tokenData && typeof tokenData === 'object' && 'cookies' in tokenData) {
      return (
        (tokenData as { cookies?: Array<Record<string, unknown>> }).cookies ||
        []
      )
    }
    return []
  },

  async manageAuthToken(
    request: APIRequestContext,
    options = {}
  ): Promise<Record<string, unknown>> {
    const environment = this.getEnvironment(options)
    const userIdentifier = this.getUserIdentifier(options)
    const tokenPath = getTokenFilePath({ environment, userIdentifier })

    const existingState = loadStorageState(tokenPath)
    if (existingState) {
      const token = this.extractToken(existingState)
      if (token && (!this.isTokenExpired || !this.isTokenExpired(token))) {
        return existingState
      }
    }

    const oauthConfig = {
      clientId: process.env.OAUTH_CLIENT_ID || 'client-id',
      clientSecret: process.env.OAUTH_CLIENT_SECRET || 'client-secret',
      tokenUrl:
        process.env.OAUTH_TOKEN_URL || 'http://localhost:3000/oauth/token',
      scope: process.env.OAUTH_SCOPE || 'read write'
    }

    const response = await request.post(oauthConfig.tokenUrl, {
      form: {
        grant_type: 'client_credentials',
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
        scope: oauthConfig.scope
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    const data = await response.json()
    const token = data.access_token

    const baseUrl =
      this.getBaseUrl?.(options) ||
      process.env.BASE_URL ||
      'http://localhost:3000'
    const storageState = {
      cookies: [
        {
          name: 'auth-token',
          value: token,
          domain: new URL(baseUrl).hostname,
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'Lax'
        }
      ],
      origins: []
    }

    saveStorageState(tokenPath, storageState)
    return storageState
  },

  clearToken() {
    // Implement as needed (e.g., delete the storage state file)
  }
}
```

</details>

#### Token Pre-fetching

For improved test performance, pre-fetch tokens during global setup:

```typescript
// global-setup.ts
import {
  authStorageInit,
  configureAuthSession,
  setAuthProvider,
  authGlobalInit
} from './auth'
import myCustomProvider from './custom-auth-provider'

async function globalSetup() {
  // Initialize storage
  authStorageInit()

  // Configure basic settings
  configureAuthSession({
    environment: process.env.TEST_ENV || 'local',
    userIdentifier: 'default',
    debug: true
  })

  // Set the auth provider
  setAuthProvider(myCustomProvider)

  // Pre-fetch tokens for configured users in the selected environment
  // This happens once before all tests run
  await authGlobalInit()
}

export default globalSetup
```

### Parallel Testing with Worker-Specific Accounts

Playwright recommends using one account per parallel worker for tests that modify server-side state. Our authentication system naturally supports this pattern through its environment and user identifier isolation.

<details><summary><strong>Worker-specific auth implementation:</strong></summary>

```typescript
// pw/support/custom-auth-provider.ts with worker-specific accounts
import { test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import type {
  AuthOptions,
  AuthProvider
} from '@seontechnologies/playwright-utils/auth-session'
import {
  getTokenFilePath,
  saveStorageState
} from '@seontechnologies/playwright-utils/auth-session'

const myCustomProvider: AuthProvider = {
  getEnvironment(options = {}) {
    return options.environment || process.env.TEST_ENV || 'local'
  },

  // Use parallelIndex to determine the user identifier
  getUserIdentifier(options = {}) {
    // If a specific user identifier is requested, use it; otherwise, use the worker index
    if (options.userIdentifier) {
      return options.userIdentifier
    }

    // Get the worker's parallel index (or default to 0 if not available)
    const workerIndex = test.info().parallelIndex ?? 0
    return `worker-${workerIndex}`
  },

  extractToken(tokenData) {
    if (tokenData && typeof tokenData === 'object' && 'cookies' in tokenData) {
      const cookies =
        (tokenData as { cookies?: Array<{ name: string; value: string }> })
          .cookies || []
      return (
        cookies.find((cookie) => cookie.name === 'auth-token')?.value || null
      )
    }
    return null
  },
  extractCookies(tokenData) {
    if (tokenData && typeof tokenData === 'object' && 'cookies' in tokenData) {
      return (
        (tokenData as { cookies?: Array<Record<string, unknown>> }).cookies ||
        []
      )
    }
    return []
  },

  // Get token based on the worker-specific user
  async manageAuthToken(
    request: APIRequestContext,
    options: AuthOptions = {}
  ): Promise<Record<string, unknown>> {
    const environment = this.getEnvironment(options)
    const userIdentifier = this.getUserIdentifier(options)

    // Each worker uses a separate storage file based on userIdentifier
    const tokenPath = getTokenFilePath({ environment, userIdentifier })

    // When fetching a token, you can use different credentials per worker:
    const accounts = [
      { username: 'worker0@example.com', password: 'pass0' },
      { username: 'worker1@example.com', password: 'pass1' }
      // Add more accounts as needed for your parallel workers
    ]

    // Extract the worker number from the user identifier
    const workerNumber = parseInt(userIdentifier.replace('worker-', '')) || 0
    const account = accounts[workerNumber % accounts.length]

    // Use the worker-specific account for authentication
    const response = await request.post('/auth/token', {
      data: {
        username: account.username,
        password: account.password
      }
    })

    const data = await response.json()
    const token = data.access_token

    const storageState = {
      cookies: [
        {
          name: 'auth-token',
          value: token,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'Lax'
        }
      ],
      origins: []
    }

    saveStorageState(tokenPath, storageState)
    return storageState
  }
}
```

With this approach:

1. Each worker gets its own storage file because `userIdentifier` includes the worker index
2. Tests in the same worker reuse the authentication state
3. Different workers use different accounts

This implementation is more elegant than Playwright's approach because:

- No need to create separate per-worker fixtures
- No manual management of storage state files
- The provider architecture handles all the complexity
- The same approach works in both UI Mode and normal test mode

</details>

### Testing Unauthenticated States

There are several approaches to test unauthenticated scenarios:

#### Playwright's Built-in Approach

Playwright's documentation shows this approach for testing without authentication:

```typescript
// Playwright's approach - Reset storage state for specific tests

// Method 1: Use empty storage state for a specific test
test('not signed in test', async ({ browser }) => {
  // Create a new context with no storage state (i.e., no authentication)
  const context = await browser.newContext()
  const page = await context.newPage()
  // Test runs without any authentication state
  await context.close()
})

// Method 2: Use empty storage state for a group of tests
test.describe('unauthenticated tests', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('not signed in test', async ({ page }) => {
    // Test runs without any authentication state
  })
})
```

#### Our Enhanced Approach

Our library offers more flexibility and control over authentication states:

```typescript
// Our approach - Option 1: Clear specific token
test('test with cleared token', async ({ request }) => {
  // Clear just the token for the current environment/user
  clearAuthToken()

  // OR clear for specific environment/user
  clearAuthToken({ environment: 'staging', userIdentifier: 'admin' })

  // Now make unauthenticated requests
  const response = await request.get('/api/public-resource')
})

// Our approach - Option 2: For browser tests, disable auth session entirely
test.describe('unauthenticated browser tests', () => {
  // Disable the auth session fixture for this group
  test.use({ authSessionEnabled: false })

  test('unauthenticated test', async ({ page }) => {
    // Page will load without authentication
  })
})

// Our approach - Option 3: Use empty storage state (Playwright-native approach)
test.describe('unauthenticated with empty state', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('unauthenticated test', async ({ page }) => {
    // Page will load without any stored cookies
  })
})
```

**Advantages over Playwright's approach**

1. **Granular control** - Clear specific tokens instead of all storage state
2. **Environment/user awareness** - Target specific test configurations
3. **API + UI flexibility** - Works for both API and browser tests
4. **Runtime control** - Clear tokens during test execution, not just at setup
5. **Multiple modes** - Test both authenticated and unauthenticated states in the same file

This makes it much easier to test complex authentication scenarios like authenticated session timeouts, partial authentication, or mixed authenticated/unauthenticated user journeys.

## Reference

### Storage Options for the auth session

```typescript
export type AuthSessionOptions = AuthIdentifiers & {
  /** Root directory for auth session storage (default: process.cwd()/.auth/<environment>/<userIdentifier>)
   * Note: if storageDir is provided, it is used as-is (no auto-append). */
  storageDir?: string

  /** Token filename (default: storage-state.json) */
  tokenFileName?: string

  /** Cookie name to use for authentication (default: auth-token) */
  cookieName?: string

  /** Custom token data formatter to control how tokens are saved */
  tokenDataFormatter?: TokenDataFormatter

  /** Debug mode (default: false) */
  debug?: boolean

  /** Retry configuration for error recovery (default: { maxRetries: 3, initialDelayMs: 100 }) */
  retryConfig?: RetryConfig
}

/**
 * Full auth configuration that extends the base identifiers
 * Includes URLs and additional configuration beyond just identifiers
 */
export type AuthOptions = AuthIdentifiers & {
  /** Base URL to use for the browser context (the application URL)
   * Recommended to ensure page.goto('/') works correctly with authenticated pages.
   * If not provided, the system attempts to resolve it in this order:
   * 1. Explicitly passed authOptions.baseUrl
   * 2. Auth provider getBaseUrl() (if implemented)
   * 3. Playwright context baseURL
   * 4. Environment variable process.env.BASE_URL
   *
   * @default process.env.BASE_URL || environment-specific URL */
  baseUrl?: string

  /** Base URL to use for authentication requests (the auth service URL)
   * This is often different from the application baseUrl
   * @default process.env.AUTH_BASE_URL || environment-specific auth URL */
  authBaseUrl?: string
}
```

By default, tokens are stored in the Playwright-compatible `storage-state.json` format, which can contain cookies, localStorage, and IndexedDB data. This consistent format works seamlessly with both API and UI testing.

By default, when using `userIdentifier` in your authentication options, the library stores tokens under `.auth/<environment>/<userIdentifier>/` so each user/environment pair stays isolated.

### Storage State Format

The auth-session library stores tokens in Playwright's standard storage state format:

```json
{
  "cookies": [
    {
      "name": "auth-token",
      "value": "your-token-value",
      "domain": "localhost",
      "path": "/",
      "expires": 1767283405,
      "httpOnly": true,
      "secure": false,
      "sameSite": "Lax"
    }
  ],
  "origins": []
}
```

**Key fields:**

- `cookies[]` - Array of cookies to apply to browser context
- `origins[]` - localStorage and IndexedDB items per origin (rarely used for auth)

Playwright's `storageState()` also captures **IndexedDB** data automatically. This format is directly compatible with Playwright's `context.storageState()` and `browser.newContext({ storageState })` APIs.

### Token Expiration Handling

The auth provider's `isTokenExpired` method determines whether to reuse or refresh tokens. The library supports multiple token formats:

#### Standard JWT Tokens

For JWT tokens with the standard `header.payload.signature` format:

```typescript
isTokenExpired(token: string): boolean {
  // Decode the base64 payload and extract the 'exp' claim
  const [, payload] = token.split('.')
  const decoded = JSON.parse(Buffer.from(payload, 'base64').toString())
  return decoded.exp < Math.floor(Date.now() / 1000)
}
```

#### Custom Token Formats

For custom token formats (like `Bearer <timestamp>:{identity}`), implement custom parsing:

```typescript
// Example: Sample app token format "Bearer 2026-01-01T15:58:25.986Z:{identity}"
isTokenExpired(token: string): boolean {
  const decodedToken = decodeURIComponent(token)
  const tokenContent = decodedToken.replace(/^bearer /i, '')
  const colonIndex = tokenContent.indexOf(':{')
  const timestampStr = tokenContent.substring(0, colonIndex)
  const creationTime = new Date(timestampStr).getTime() / 1000
  const expirationTime = creationTime + TOKEN_LIFETIME_SECONDS
  return expirationTime < Math.floor(Date.now() / 1000)
}
```

**Best practices:**

- Log when tokens are reused vs refreshed for debugging
- Consider adding a small buffer (e.g., 30 seconds) before expiration to avoid edge cases
- Return `true` (expired) when token format is unrecognized to force re-authentication

### Troubleshooting

#### "Cannot extract token, considering expired"

**Cause:** `extractToken` failed to read the raw token from your stored data.

**Solution:** Update your auth provider's `extractToken` method to match your storage format. See [Token Expiration Handling](#token-expiration-handling) for token format examples.

#### Tokens not being reused between test runs

**Causes:**

1. Storage state file not being saved correctly
2. `isTokenExpired` always returning `true`
3. Storage directory path mismatch

**Solution:** Enable debug mode and check logs:

```typescript
configureAuthSession({ debug: true })
```

Look for messages like:

- "Cannot extract token, considering expired" - extractToken failed or token format not handled
- "Token expired according to provider check" - provider logic expired the token
- "Token expired or not found in advanced cache" - cache miss/expiration

#### Browser context not authenticated

**Cause:** Storage state not being applied to browser context.

**Solution:** Ensure you're using the auth fixtures (`authToken`, `page`, `context`) from `createAuthFixtures()`, not the base Playwright fixtures.

#### Different users getting same token

**Cause:** User identifiers not properly isolated.

**Solution:** Ensure your auth provider's `getUserIdentifier` method returns unique values for each user, and that you're wrapping `test.use()` in `test.describe()` blocks for parallel tests.

### Quick Reference

| Task                     | Code                                                                     |
| ------------------------ | ------------------------------------------------------------------------ |
| Get auth token           | `test('...', async ({ authToken }) => { /* use authToken */ })`          |
| Get storage state        | `const state = await getAuthToken(request, { userIdentifier: 'admin' })` |
| Extract token from state | `authProvider.extractToken(storageState)`                                |
| Clear token              | `clearAuthToken({ userIdentifier: 'admin' })`                            |
| Disable auth for test    | `test.use({ authSessionEnabled: false })`                                |
| Override user            | `test.use({ authOptions: { userIdentifier: 'admin' } })`                 |
| Ephemeral auth           | `await applyUserCookiesToBrowserContext(context, userData)`              |

### Token Utility Modules (Reference Implementation)

<details><summary><strong>Token utility modules reference:</strong></summary>

The `playwright/support/auth/token/` directory contains reference implementations for token management. These can be used as-is or as inspiration for your own implementations:

| Module              | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `acquire.ts`        | Token acquisition via API call                   |
| `extract.ts`        | Extract token/cookies from storage state         |
| `is-expired.ts`     | Check if token is expired (JWT + custom formats) |
| `check-validity.ts` | Load and validate existing token                 |
| `renew.ts`          | Refresh expired tokens                           |

Example usage in your auth provider:

```typescript
import { acquireToken } from './token/acquire'
import { checkTokenValidity } from './token/check-validity'
import { isTokenExpired } from './token/is-expired'
import { extractToken, extractCookies } from './token/extract'

const myCustomProvider: AuthProvider = {
  extractToken,
  extractCookies,
  isTokenExpired,

  async manageAuthToken(request, options = {}) {
    const tokenPath = getTokenFilePath({ environment, userIdentifier })

    // Check for existing valid token
    const validToken = await checkTokenValidity(tokenPath)
    if (validToken) return validToken

    // Acquire new token
    return acquireToken(request, environment, userIdentifier, options)
  }
}
```

</details>

### Session Storage Support (Extension Recipe)

<details><summary><strong>Session storage extension recipe:</strong></summary>

> **Note**: This is an extension recipe showing how you could add session storage support to the auth system. The core library doesn't currently implement this functionality.

Playwright explicitly does not provide APIs to persist session storage, requiring custom scripts for applications that use this storage method. From the Playwright documentation:

> "Session storage is specific to a particular domain and is not persisted across page loads. Playwright does not provide API to persist session storage. However, you can use an init script to implement a custom mechanism to persist session storage."

You can extend our authentication library to handle session storage by adding these capabilities to your custom auth provider:

```typescript
// And in your getToken method, add session storage capture after authentication
// This assumes you're using a page to authenticate rather than an API request
async captureSessionStorage(page, options = {}) {
  const environment = this.getEnvironment(options)
  const userIdentifier = this.getUserIdentifier(options)

  // Extract session storage data
  const sessionStorage = await page.evaluate(() => {
    const data: Record<string, string | null> = {}
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i)
      if (!key) continue
      data[key] = window.sessionStorage.getItem(key)
    }
    return data
  })

  // Save it alongside the token
  const sessionStoragePath = getTokenFilePath({
    environment,
    userIdentifier,
    tokenFileName: 'session-storage.json'
  })

  fs.writeFileSync(
    sessionStoragePath,
    JSON.stringify(sessionStorage),
    'utf-8'
  )
}
```

</details>
