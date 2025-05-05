# Playwright Auth Session Library

Playwright is unopinionated by design, providing developers with powerful tools and flexible patterns while leaving the implementation details and developer experience up to you.

This library builds on Playwright's authentication capabilities to create a more structured, efficient developer experience. It implements a session-based storage pattern for authentication that works seamlessly with both API and UI testing, allowing you to fetch an authentication token once and reuse it across multiple tests and test runs.

## Table of Contents

- [Playwright Auth Session Library](#playwright-auth-session-library)
  - [Table of Contents](#table-of-contents)
  - [What is this and why does it exist?](#what-is-this-and-why-does-it-exist)
    - [Playwright's Built-in Authentication](#playwrights-built-in-authentication)
      - [Approach 1: Setup Project with Dependencies (Recommended by Playwright)](#approach-1-setup-project-with-dependencies-recommended-by-playwright)
      - [Approach 2: Global Setup Function](#approach-2-global-setup-function)
      - [3. Write tests that use the authenticated state](#3-write-tests-that-use-the-authenticated-state)
    - [Limitations of Playwright’s Approach vs. What This Library Adds](#limitations-of-playwrights-approach-vs-what-this-library-adds)
  - [Quick Start Guide](#quick-start-guide)
    - [1. Configure Global Setup](#1-configure-global-setup)
    - [2. Create Auth Fixture](#2-create-auth-fixture)
    - [3. Implement Custom Auth Provider](#3-implement-custom-auth-provider)
    - [4. Create Token Acquisition Logic](#4-create-token-acquisition-logic)
    - [5. Update Your Playwright Config](#5-update-your-playwright-config)
    - [6. Use the Auth Session in Your Tests](#6-use-the-auth-session-in-your-tests)
  - [API Overview](#api-overview)
    - [Core Token Management](#core-token-management)
    - [Global Setup Utilities](#global-setup-utilities)
    - [Auth Provider Management](#auth-provider-management)
    - [Test Fixtures](#test-fixtures)
    - [Utility Functions](#utility-functions)
  - [Basic Usage](#basic-usage)
    - [Using Authentication in API Tests](#using-authentication-in-api-tests)
    - [Using Authentication in UI Tests](#using-authentication-in-ui-tests)
    - [Token Management and Authentication State](#token-management-and-authentication-state)
      - [Clearing Tokens When Needed](#clearing-tokens-when-needed)
  - [Advanced Usage](#advanced-usage)
    - [Testing Against Different Deployment Environments](#testing-against-different-deployment-environments)
    - [Separate Auth and Application URLs](#separate-auth-and-application-urls)
      - [Configuring URL Settings in Your Fixtures](#configuring-url-settings-in-your-fixtures)
    - [Multi-Role Support](#multi-role-support)
      - [1. Using Multiple User Roles in Tests](#1-using-multiple-user-roles-in-tests)
      - [2. Alternative Approach with multi-role support: Role-Specific Fixtures](#2-alternative-approach-with-multi-role-support-role-specific-fixtures)
      - [3. Testing Interactions Between Multiple Roles in a Single Test](#3-testing-interactions-between-multiple-roles-in-a-single-test)
    - [UI Testing with Browser Context](#ui-testing-with-browser-context)
      - [OAuth2 Example](#oauth2-example)
      - [Token Pre-fetching](#token-pre-fetching)
    - [Parallel Testing with Worker-Specific Accounts](#parallel-testing-with-worker-specific-accounts)
    - [Testing Unauthenticated States](#testing-unauthenticated-states)
      - [Playwright's Built-in Approach](#playwrights-built-in-approach)
      - [Our Enhanced Approach](#our-enhanced-approach)
    - [Session Storage Support (Extension Recipe)](#session-storage-support-extension-recipe)
  - [Implementation Details](#implementation-details)
    - [Storage Structure](#storage-structure)

## What is this and why does it exist?

### Playwright's Built-in Authentication

Playwright provides a mechanism for saving and reusing authentication state through the [`storageState`](https://playwright.dev/docs/auth) feature. The official documentation outlines two alternative approaches:

#### Approach 1: Setup Project with Dependencies (Recommended by Playwright)

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

#### 3. Write tests that use the authenticated state

<details><summary><strong>Expand for details:</strong></summary>

```typescript
// tests/dashboard.spec.**ts**
import { test, expect } from '@playwright/test'

// This test automatically uses the authenticated state
test('access dashboard page', async ({ page }) => {
  // Navigate directly to a protected page without login
  await page.goto('/dashboard')

  // The page should be accessible because we're authenticated
  await expect(page.locator('h1')).toHaveText('Dashboard')
})
```

</details>

### Limitations of Playwright’s Approach vs. What This Library Adds

| **No.** | **Limitation of Playwright’s Approach**                                                                                                                                                                          | **What This Library Adds**                                                                                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | **Complex setup** – Requires configuration across multiple files and understanding of projects/dependencies.                                                                                                     | **Simplified setup** – Single configuration approach with built-in token expiration checking and programmatic refresh capabilities.                                                 |
| 2       | **Manual token management** – No built-in handling of token expiration or refreshing.                                                                                                                            | **Structured token storage** – Organized acquisition and persistence of tokens with optional validation.                                                                            |
| 3       | **No multi-environment support** – No straightforward way to handle different environments (dev/staging/prod).                                                                                                   | **Multi-environment support** – First-class support for different environments (dev/staging/prod).                                                                                  |
| 4       | **No multi-role support** – No built-in system for managing different user roles (admin/user/guest).                                                                                                             | **Role-based testing** – Built-in system for managing different user roles (admin/user/guest).                                                                                      |
| 5       | **Limited programmatic control** – No simple API for clearing or refreshing tokens during test execution.                                                                                                        | **Rich programmatic control** – Clear APIs for managing tokens during test execution.                                                                                               |
| 6       | **Separate implementations** – Different approaches needed for API vs UI authentication.                                                                                                                         | **Unified implementation** – Same approach works for both API and browser testing.                                                                                                  |
| 7       | **Performance bottleneck** – Relies solely on file storage, requiring disk I/O and JSON parsing for every test run, causing slowdowns.                                                                           | **Performance optimization** – In-memory caching eliminates repeated file reads and JSON parsing operations that slow down Playwright’s approach.                                   |
| 8       | **UI Mode limitations** – UI mode doesn’t run setup projects by default, requiring manual intervention to re-authenticate when tokens expire (enabling filters, running auth.setup.ts, disabling filters again). | **Seamless UI Mode integration** – Works with Playwright UI Mode without manual intervention; no need to enable filters, run setup projects, or re-authenticate when tokens expire. |
| 9       | **Between-run API calls** – Authentication request is made at the start of each test run session, even when a previously acquired token is still valid.                                                          | **Reduced API calls** – Token is fetched only once and reused across all tests, significantly reducing authentication overhead.                                                     |
| 10      | **Manual parallel worker setup** – Requires custom fixtures and significant boilerplate code to implement worker-specific authentication for parallel testing.                                                   | **Automatic parallel worker support** – Handles worker-specific authentication without custom fixtures or boilerplate, automatically managing unique accounts per worker.           |
| 11      | **No session storage support** – Playwright explicitly does not provide APIs to persist session storage, requiring custom scripts for apps that use this storage method.                                         | **Complete storage support** – Automatically handles all storage types including cookies, localStorage, IndexedDB, and sessionStorage without manual scripts.                       |

**Additional Benefits**:

1. **Provider architecture** - Extensible design for custom authentication flows
2. **Single source of truth** - Auth provider centralizes environment and role configuration
3. **Isolated storage** - Tokens are stored by environment and user role, preventing cross-contamination

<details><summary><strong>More on UI mode integration:</strong></summary>

> ### More on UI mode integration:
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
> 2. **On-Demand Authentication**: Instead of requiring a separate setup step, each test automatically checks if it needs a token:
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
> **Our authentication library provides this worker-specific functionality automatically:**
>
> 1. We use a fixed path at the repo root (.auth-sessions) to store authentication data
> 2. We handle the token storage and retrieval without custom fixtures
> 3. Our solution works for both browser tests and API tests with the same code
> 4. We add in-memory caching for better performance
>
> This is a key advantage of our approach - **getting the same benefits with significantly less code and complexity**.

</details>

<details><summary><strong>More on performance and simplicity benefits:</strong></summary>

> ### More on performance and simplicity benefits:
>
> Our authentication system provides significant advantages in several areas:
>
> 1. **Reduced API Calls**: Token is fetched only once and persists between separate test runs. This means:
>    - No authentication API calls when starting a new test session if token is still valid
>    - Less load on your authentication servers across development cycles
>    - Faster test execution overall, especially for multiple test runs
>    - No rate limiting issues from your auth provider
> 2. **Speed Optimization**: Tests run substantially faster by:
>    - Avoiding repeated authentication requests
>    - Utilizing in-memory caching to eliminate disk I/O
>    - Removing JSON parsing overhead for each test
> 3. **Persistence**: Token persists between test runs, enabling:
>    - Faster CI/CD pipelines
>    - Quicker local development cycles
>    - Reduced authentication server load, and emails
> 4. **Simplicity**: The API design allows tests to focus on business logic:
>    - Clean test code without authentication boilerplate
>    - Simple fixture-based access to tokens
>    - Consistent patterns across your test suite
>    - Same code works for both API and UI authentication (no separate implementations)
>    - No need for different setup approaches based on authentication method
>
> The system is designed to be compatible with Playwright's recommended patterns for authentication in both API testing and UI testing contexts while solving the performance and usability limitations of the built-in approach.

</details>

---

## Quick Start Guide

⚠️ **IMPORTANT**: The authentication system requires explicit configuration before use. You MUST set up authentication in your global setup file with **both** `configureAuthSession` AND `setAuthProvider`.

### 1. Configure Global Setup

Create `playwright/support/global-setup.ts` and add it to your Playwright config:

```typescript
// playwright/support/global-setup.ts
import {
  authStorageInit,
  setAuthProvider,
  configureAuthSession,
  authGlobalInit
} from '@seontechnologies/playwright-utils/auth-session'

import myCustomProvider from './auth/custom-auth-provider'

async function globalSetup() {
  console.log('Running global setup')

  // Ensure storage directories exist
  authStorageInit()

  // STEP 1: Configure minimal auth settings
  configureAuthSession({
    // Auth sessions are stored in a fixed location (.auth-sessions) at the repo root
    // Make sure to add this directory to your .gitignore file
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

### 2. Create Auth Fixture

Add `playwright/support/auth/auth-fixture.ts` to your merged fixtures:

```typescript
// playwright/support/auth/auth-fixture.ts
import { test as base } from '@playwright/test'
import {
  createAuthFixtures,
  type AuthOptions,
  type AuthFixtures
} from '@seontechnologies/playwright-utils/auth-session'

// Default auth options using the current environment
const defaultAuthOptions: AuthOptions = {
  environment: process.env.TEST_ENV || 'local',
  userRole: 'default'
}

// Get the fixtures from the factory function
const fixtures = createAuthFixtures()

// Export the test object with auth fixtures
export const test = base.extend<AuthFixtures>({
  // For authOptions, we need to define it directly using the Playwright array format
  authOptions: [defaultAuthOptions, { option: true }],

  // Use the other fixtures directly
  authToken: fixtures.authToken,
  context: fixtures.context,
  page: fixtures.page
})
```

### 3. Implement Custom Auth Provider

Create `playwright/support/auth/custom-auth-provider.ts` with your application-specific authentication logic:

```typescript
// playwright/support/auth/custom-auth-provider.ts
import {
  type AuthProvider,
  loadTokenFromStorage,
  saveTokenToStorage,
  getTokenFilePath,
  authStorageInit
} from '@seontechnologies/playwright-utils/auth-session'
import { acquireToken } from './acquire-token' // Your app-specific token acquisition

const myCustomProvider: AuthProvider = {
  /**
   * Get the current environment to use
   */
  getEnvironment(options = {}) {
    // Environment priority:
    // 1. Options passed directly to this method
    // 2. Environment variables
    // 3. Default environment
    return options.environment || process.env.TEST_ENV || 'local'
  },

  /**
   * Get the current user role to use
   */
  getUserRole(options = {}) {
    // Role priority:
    // 1. Options passed directly to this method
    // 2. Environment-specific defaults
    const environment = this.getEnvironment(options)

    // You could implement environment-specific default roles
    let defaultRole = 'regular'
    if (environment === 'staging') defaultRole = 'tester'
    if (environment === 'production') defaultRole = 'readonly'

    return options.userRole || process.env.TEST_USER_ROLE || defaultRole
  },

  /**
   * Manage the complete authentication token lifecycle
   * This method handles the entire token management process:
   * STEP 1: Check for existing token in storage first (avoid unnecessary auth)
   * STEP 2: Initialize storage directories if needed
   * STEP 3: Acquire a new token only if no valid token exists
   * STEP 4: Save the token with metadata for future reuse
   */
  async manageAuthToken(request, options = {}) {
    // Get environment and role consistently
    const environment = this.getEnvironment(options)
    const userRole = this.getUserRole(options)
    const tokenPath = getTokenFilePath({
      environment,
      userRole,
      tokenFileName: 'custom-auth-token.json'
    })

    // STEP 1: Check if we already have a valid token using the core utility
    console.log(`[Custom Auth] Checking for existing token at ${tokenPath}`)
    const existingToken = loadTokenFromStorage(tokenPath, true)
    if (existingToken) {
      console.log(`[Custom Auth] Using existing token from ${tokenPath}`)
      return existingToken
    }

    // STEP 2: Initialize storage directories
    authStorageInit({ environment, userRole })

    // STEP 3: Acquire a new token using our custom auth flow
    console.log(
      `[Custom Auth] Fetching new token for ${environment}/${userRole}`
    )
    const token = await acquireToken(request, environment, userRole, options)

    // STEP 4: Save the token with metadata for future reuse
    console.log(`[Custom Auth] Saving token to ${tokenPath}`)
    saveTokenToStorage(
      tokenPath,
      token,
      {
        environment,
        userRole,
        source: 'custom-provider'
      },
      true // Enable debug logging
    )
    return token
  },

  /**
   * Apply token to browser context for UI testing
   */
  async applyToBrowserContext(context, token, options = {}) {
    // Get environment for domain configuration
    const environment = this.getEnvironment(options)

    // Set domain based on environment
    const domain =
      environment === 'local' ? 'localhost' : `${environment}.example.com`

    // Add auth token as cookie
    await context.addCookies([
      {
        name: 'auth_token',
        value: token,
        domain,
        path: '/',
        httpOnly: true,
        secure: environment !== 'local',
        sameSite: 'Lax'
      }
    ])

    // Optional: Set localStorage as an alternative authentication method
    await context.addInitScript(/* your init script */)
  },

  /**
   * Clear token when needed
   */
  clearToken(options = {}) {
    // Get consistent environment and role
    const environment = this.getEnvironment(options)
    const userRole = this.getUserRole(options)

    // Use the utility function to get the token path
    const tokenPath = getTokenFilePath({
      environment,
      userRole,
      tokenFileName: 'custom-auth-token.json'
    })

    // Remove the token file if it exists
    if (require('fs').existsSync(tokenPath)) {
      console.log(`[Custom Auth] Clearing token at ${tokenPath}`)
      require('fs').unlinkSync(tokenPath)
    }
  }
}

export default myCustomProvider
```

### 4. Create Token Acquisition Logic

Create `playwright/support/auth/acquire-token.ts` with your application-specific token acquisition logic:

```typescript
// playwright/support/auth/acquire-token.ts
import type { APIRequestContext } from '@playwright/test'

/**
 * Application-specific auth URL construction based on environment
 */
// Configure your authentication URL based on the environment
const getAuthUrl = (environment: string, customUrl?: string): string => {
  // Override with custom URL if provided
  if (customUrl) return customUrl

  // Support for environment variables from Playwright config
  if (process.env.AUTH_BASE_URL) return process.env.AUTH_BASE_URL

  // Environment-specific URL mapping (customize for your application)
  const urlMap: Record<string, string> = {
    local: 'http://localhost:3000/api',
    dev: 'https://dev.example.com/api',
    staging: 'https://staging.example.com/api',
    production: 'https://api.example.com'
  }

  return urlMap[environment] || urlMap.local
}

/**
 * Get credentials for a specific user role
 */
const getCredentialsForRole = (
  role: string
): { username: string; password: string } => {
  const credentialMap = {
    admin: {
      username: process.env.ADMIN_USERNAME || 'admin@example.com',
      password: process.env.ADMIN_PASSWORD || 'admin123'
    },
    regular: {
      username: process.env.USER_USERNAME || 'user@example.com',
      password: process.env.USER_PASSWORD || 'user123'
    }
    // Add other roles as needed
  }

  return credentialMap[role] || credentialMap.regular
}

/**
 * Token acquisition helper function
 */
export const acquireToken = async (
  request: APIRequestContext,
  environment: string,
  userRole: string,
  options: Record<string, string | undefined> = {}
): Promise<string> => {
  // Get auth URL based on environment
  const authBaseUrl = getAuthUrl(
    environment.toLowerCase(),
    options.authBaseUrl
  )

  // Get endpoint path
  const endpoint = process.env.AUTH_TOKEN_ENDPOINT || '/token'
  const authUrl = `${authBaseUrl}${endpoint}`

  // Get credentials for the specified role
  const credentials = getCredentialsForRole(userRole)

  // Make authentication request
  const response = await request.post(authUrl, {
    data: credentials,
    headers: { 'Content-Type': 'application/json' }
  })

  // Extract and return token
  const data = await response.json()
  return data.access_token || data.token || data.accessToken
}
```

### 5. Update Your Playwright Config

Make sure your config points to your global setup:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  // Other config options...

  // Point to your global setup file
  globalSetup: './playwright/support/global-setup.ts'

  // Other config options...
})
```

### 6. Use the Auth Session in Your Tests

```typescript
// Example test using auth fixtures
import { test } from '../support/auth/auth-fixture'

test('authenticated API request', async ({ authToken, request }) => {
  // Use the token for API requests
  const response = await request.get('/api/protected', {
    headers: { Authorization: `Bearer ${authToken}` }
  })
  expect(response.status()).toBe(200)
})

test('authenticated UI test', async ({ page }) => {
  // The page is already authenticated!
  await page.goto('/protected-area')
  await expect(page.locator('h1')).toHaveText('Protected Content')
})
```

---

## API Overview

The authentication library exposes the following functions:

### Core Token Management

- `getAuthToken`: Retrieves an authentication token using the configured provider for the specified environment and role.
- `clearAuthToken`: Clears the cached authentication token for the specified environment and role.
- `applyAuthToBrowserContext`: Applies authentication to a browser context for UI testing.
- `configureAuthSession`: Configures global authentication settings like environment and debug mode.
- `defaultTokenFormatter`: Default function for formatting token data for storage.
- `loadTokenFromStorage`: Loads a token from storage with validation and expiration checking.
- `saveTokenToStorage`: Saves a token to storage with metadata and creates required directories.
- `getTokenFilePath`: Returns a standardized path for token storage based on environment and role.

### Global Setup Utilities

- `authStorageInit`: Initializes the authentication storage directories.
- `authGlobalInit`: Pre-fetches tokens during global setup for improved performance.
- `initializeAuthForGlobalSetup`: Simplified helper for common global setup needs.

### Auth Provider Management

- `setAuthProvider`: Sets the global authentication provider implementation.
- `getAuthProvider`: Gets the current authentication provider instance.

### Test Fixtures

- `createAuthFixtures`: Creates Playwright test fixtures with authentication support.
- `createRoleSpecificTest`: Creates role-specific test fixtures for specialized testing.
- `authSessionEnabled`: A boolean fixture to enable/disable authentication entirely for specific tests.

### Utility Functions

- `getStorageStatePath`: Gets the path for storing browser storage state.
- `safeWriteJsonFile`: Atomically writes a JSON file with proper locking to prevent corruption.
- `safeReadJsonFile`: Safely reads a JSON file with retries and proper error handling.

---

## Basic Usage

### Using Authentication in API Tests

Once you've configured the auth session and created the fixture, using the token in your tests is straightforward:

```typescript
test('fetch protected data', async ({ authToken, request }) => {
  // Use the token in an API request
  const response = await request.get('/api/protected-data', {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  })

  expect(response.status()).toBe(200)
})
```

The `authToken` is automatically retrieved from storage or fetched from your API if needed.

### Using Authentication in UI Tests

The library seamlessly handles browser-based authentication too, applying your token to the browser context:

```typescript
// This example uses our actual implementation from pw/support/auth/test-fixtures.ts
test('access protected page', async ({ page }) => {
  // The page fixture is already coming from an authenticated context
  // Behind the scenes in our implementation:
  // 1. Gets a token using the auth provider
  // 2. Creates a new browser context
  // 3. Calls authProvider.applyToBrowserContext(context, token, {
  //    navigationUrl: '/some-path' // Can be set to null to skip navigation entirely
  // })
  // 4. Creates a page from that authenticated context

  // Simply navigate to your protected page - you're already authenticated!
  await page.goto('/dashboard')

  // Verify we can see authenticated content
  await expect(page.locator('h1')).toContainText('Welcome Back')
  await expect(page.locator('#user-profile')).toBeVisible()
})
```

This works because our authentication system automatically handles separate URLs for:

1. **Application URL** - Where your app is hosted (used for browser tests)
2. **Auth Service URL** - Where authentication happens (used for token requests)

### Token Management and Authentication State

#### Clearing Tokens When Needed

In some scenarios, you may want to force a new token to be fetched:

```typescript
import { clearAuthToken } from '../support/auth'

test('after clearing token', async ({ request }) => {
  // Clear the token to force a new fetch
  clearAuthToken()

  // Next request will fetch a new token
  // ...
})

// Clear token for a specific environment/role
test('specific environment token clearing', async ({ request }) => {
  // Clear token for a specific configuration
  clearAuthToken({ environment: 'staging', userRole: 'admin' })

  // The next request for this environment/role will fetch a new token
  // ...
})
```

## Advanced Usage

### Testing Against Different Deployment Environments

The auth library supports testing against different deployment environments through the enhanced `AuthOptions` interface. You can specify the environment directly in your test configuration:

```typescript
// Create a test for a specific environment
const stagingTest = test.extend({
  authOptions: [{ environment: 'staging' }, { option: true }]
})

// This test will run against staging environment
stagingTest('should work in staging', async ({ page }) => {
  // Will use [https://staging.example.com](https://staging.example.com) as the base URL
  await page.goto('/dashboard')
  // ...
})
```

### Disabling Authentication for Specific Tests

In some scenarios, you may want to completely disable authentication for specific tests. This is particularly useful for:

- Tests that are explicitly testing token acquisition
- Tests that don't need authentication at all
- Tests that use external sites where auth navigation would cause errors

You can easily disable the auth session with the `authSessionEnabled` fixture:

```typescript
// Disable auth session for these tests
test.use({
  authSessionEnabled: false
})

test.describe('example tests without auth', () => {
  test('testing token acquisition', async ({ apiRequest }) => {
    // Auth session is disabled, so no tokens will be automatically fetched
    // or applied to the browser context
    const response = await apiRequest({ path: '/auth/token' })
    
    // Now you can test the token acquisition process directly
    expect(response.status).toBe(200)
    expect(response.body.token).toBeDefined()
  })
})
```

When `authSessionEnabled` is set to `false`:

- No auth tokens will be fetched automatically
- Tokens won't be applied to browser contexts
- Navigation for cookie setup will be skipped
- The `authToken` fixture will return an empty string

This toggle provides a clean way to opt out of authentication when it's not needed, avoiding unnecessary API calls and potential navigation errors.

### Robust File Storage with Locking

To prevent file corruption during concurrent access (particularly in parallel test execution), the auth session library implements a robust file locking mechanism:

- **Atomic File Operations**: Files are written to a temporary location first, then atomically moved into place once fully written
- **File Locking**: The `proper-lockfile` package is used to coordinate access between processes
- **Error Recovery**: If a file is corrupted, the system can recover gracefully
- **Retry Logic**: File operations include automatic retry logic for transient errors

This implementation ensures that even when multiple worker processes attempt to read or write to the same storage files simultaneously, data integrity is maintained.

You can also explicitly override the base URL for specific deployments:

```typescript
// For a custom deployment or PR environment
const prTest = test.extend({
  authOptions: [
    {
      environment: 'dev',
      baseUrl: 'https://pr-123.example.com'
    },
    { option: true }
  ]
})

// This test will run against the PR deployment
prTest('should work in PR environment', async ({ page }) => {
  await page.goto('/dashboard')
  // ...
})
```

### Separate Auth and Application URLs

Many applications use different URLs for:

1. **Application URL** - Where your app is hosted (used for browser tests)
2. **Auth Service URL** - Where authentication happens (used for token requests)

#### Configuring URL Settings in Your Fixtures

To support different URLs, you need to modify your auth-fixture.ts file:

```typescript
// In your pw/support/fixtures/auth-fixture.ts
import { test as base } from '@playwright/test'
import {
  createAuthFixtures,
  type AuthOptions,
  type AuthFixtures
} from '@seontechnologies/playwright-utils/authh'

// Configure URLs for different environments
const defaultAuthOptions: AuthOptions = {
  // Basic environment and role settings
  environment: process.env.TEST_ENV || 'local',
  userRole: 'default',

  // URL configuration - can be environment-specific
  baseUrl: process.env.APP_URL || 'http://localhost:3000', // Your application URL
  authBaseUrl: process.env.AUTH_URL || 'http://localhost:3001', // Your auth service URL

  // Optional debugging
  debug: process.env.AUTH_DEBUG === 'true'
}

// Get the fixtures from the factory function
const fixtures = createAuthFixtures()

// Export the test object with auth fixtures
export const test = base.extend<AuthFixtures>({
  // Register auth options using the Playwright array format
  authOptions: [defaultAuthOptions, { option: true }],

  // Use the other fixtures directly
  authToken: fixtures.authToken,
  context: fixtures.context,
  page: fixtures.page
})
```

### Multi-Role Support

Supporting different user roles is simple with our architecture by implementing the right auth provider:

```typescript
// custom-auth-provider.ts

import { type AuthProvider } from './auth'
import * as fs from 'fs'
import {
	getTokenFilePath,
	authStorageInit
} from './auth/internal/auth-storage-utils'
import { loadTokenFromStorage, saveTokenToStorage } from './auth/core'
// Define your own auth URL helper based on your application needs
const getAuthUrl = (env: string, customUrl?: string) => customUrl || process.env.AUTH_BASE_URL || `https://auth-${env}.example.com`

/**
 * Utility function to get credentials for a specific user role using a functional approach
 * This is placed outside the auth provider object to maintain proper encapsulation
 * and follow functional programming principles
 */
// eslint-disable-next-line complexity
const getCredentialsForRole = (
	role: string
): { username: string; password: string } => {
	// Using a map pattern for role-based credentials instead of imperative conditionals
	const credentialMap: Record<string, { username: string; password: string }> =
		{
			admin: {
				username: process.env.ADMIN_USERNAME || 'admin@example.com',
				password: process.env.ADMIN_PASSWORD || 'admin123'
			},
			regular: {
				username: process.env.USER_USERNAME || 'user@example.com',
				password: process.env.USER_PASSWORD || 'user123'
			},
			guest: {
				username: process.env.GUEST_USERNAME || 'guest@example.com',
				password: process.env.GUEST_PASSWORD || 'guest123'
			},
			tester: {
				username: process.env.TESTER_USERNAME || 'tester@example.com',
				password: process.env.TESTER_PASSWORD || 'tester123'
			},
			readonly: {
				username: process.env.READONLY_USERNAME || 'readonly@example.com',
				password: process.env.READONLY_PASSWORD || 'readonly123'
			},
			default: {
				username: process.env.DEFAULT_USERNAME || 'default@example.com',
				password: process.env.DEFAULT_PASSWORD || 'default123'
			}
		}
	// Ensure we always return a valid credential object with functional fallback pattern
	return (
		credentialMap[role] ||
		credentialMap.default || {
			username: process.env.DEFAULT_USERNAME || 'default@example.com',
			password: process.env.DEFAULT_PASSWORD || 'default123'
		}
	)
}


// Create a fully custom provider implementation
const myCustomProvider: AuthProvider = {

	getEnvironment(options = {}) { .. },

	getUserRole(options = {}) { .. },

	async getToken(request, options = {}) {
		// Use our own methods to ensure consistency
		const environment = this.getEnvironment(options)
		const userRole = this.getUserRole(options)
		// Use the utility functions to get standardized paths
		const tokenPath = getTokenFilePath({
			environment,
			userRole,
			tokenFileName: 'custom-auth-token.json'
		})
		// Check if we already have a valid token using the core utility
		// Add custom logging for this provider implementation
		console.log(`[Custom Auth] Checking for existing token at ${tokenPath}`)
		const existingToken = loadTokenFromStorage(tokenPath, true)
		if (existingToken) {
			console.log(`[Custom Auth] Using existing token from ${tokenPath}`)
			return existingToken
		}
		// Initialize storage directories (in case you're not using authGlobalInit() in global-setup)
		authStorageInit({ environment, userRole })
		// Get a new token using our custom auth flow
		console.log(
			`[Custom Auth] Fetching new token for ${environment}/${userRole}`
		)
		// Use the authBaseUrl utility to get the environment-appropriate auth URL
		const authBaseUrl = getAuthUrl(environment, options?.authBaseUrl)
		// Get the endpoint (could also be environment-specific if needed)
		const endpoint = process.env.AUTH_TOKEN_ENDPOINT || '/token'
		const authUrl = `${authBaseUrl}${endpoint}`
		console.log(`[Custom Auth] Requesting token from ${authUrl}`)

		// Get immutable credentials object for the current role using our functional helper
		const credentials = getCredentialsForRole(userRole)

		// Make the authentication request with the appropriate credentials
		const response = await request.post(authUrl, {
			data: credentials,
			headers: {
				'Content-Type': 'application/json'
			}
		})
		// Extract token from response - customize based on your API response format
		const data = await response.json()
		const token = data.access_token || data.token || data.accessToken
		// Use the core utility to save the token with metadata
		// We turn on debug mode to get logging
		console.log(`[Custom Auth] Saving token to ${tokenPath}`)
		saveTokenToStorage({
			tokenPath,
			token,
			metadata: {
				environment,
				userRole,
				source: 'custom-provider'
			}
		})
		return token
	},

	async applyToBrowserContext(context, token, options = {}) { .. },

	clearToken(options = {}) { .. }
}
```

#### 1. Using Multiple User Roles in Tests

The real power of this approach comes when testing with different user roles:

```typescript
// in your test file
import { test } from '@playwright/test'
import { createAuthFixtures } from './auth/test-fixtures'

// Create role-specific test fixtures
const regularTest = test.extend({
  // Regular user fixture
  ...createAuthFixtures({
    userRole: 'regular'
  })
})

const adminTest = test.extend({
  // Admin user fixture
  ...createAuthFixtures({
    userRole: 'admin'
  })
})

// Test as regular user
regularTest('Regular user cannot access admin page', async ({ page }) => {
  await page.goto('/dashboard')
  // Regular user specific assertions
  await expect(page.locator('#admin-panel')).not.toBeVisible()
})

// Test as admin user
adminTest('Admin user can access admin page', async ({ page }) => {
  await page.goto('/dashboard')
  // Admin user specific assertions
  await expect(page.locator('#admin-panel')).toBeVisible()
})

// Mix roles in a single test for complex scenarios
test('Admin can impersonate a regular user', async ({
  browser,
  request,
  authOptions
}) => {
  // Get admin user context first
  const adminOptions = { ...authOptions, userRole: 'admin' }
  const adminToken = await getToken(request, adminOptions)
  const adminContext = await browser.newContext({
    storageState: getStorageStatePath(adminOptions)
  })
  const adminPage = await adminContext.newPage()

  // Admin logs in and accesses impersonation feature
  await adminPage.goto('/admin/users')
  await adminPage.click('text=Impersonate User')

  // Now get a regular user context for comparison
  const regularOptions = { ...authOptions, userRole: 'regular' }
  const regularContext = await browser.newContext({
    storageState: getStorageStatePath(regularOptions)
  })
  const regularPage = await regularContext.newPage()

  // Compare experiences
  // ...

  // Clean up
  await adminContext.close()
  await regularContext.close()
})
```

#### 2. Alternative Approach with multi-role support: Role-Specific Fixtures

While the custom auth provider handles roles within a single implementation, you can alternatively create separate fixtures for each role. This approach may be simpler for teams that always test each role in isolation and never need to switch roles within a test.

**Note**: This approach violates DRY principles and makes role management more complex. The custom auth provider pattern above is generally recommended.

Create role-specific test fixtures:

```typescript
// fixtures/role-fixtures.ts
import { test as base } from '@playwright/test'
import { getAuthToken } from '../auth'

// Admin fixture
export const adminTest = base.extend({
  authToken: async ({ request }, use) => {
    const token = await getAuthToken(request, { userRole: 'admin' })
    await use(token)
  }
})

// Regular user fixture
export const userTest = base.extend({
  authToken: async ({ request }, use) => {
    const token = await getAuthToken(request, { userRole: 'user' })
    await use(token)
  }
})

// Guest fixture
export const guestTest = base.extend({
  authToken: async ({ request }, use) => {
    const token = await getAuthToken(request, { userRole: 'guest' })
    await use(token)
  }
})
```

Usage in tests:

```typescript
// Use admin fixture for admin-only tests
import { adminTest } from '../fixtures/role-fixtures'

adminTest('admin can access settings', async ({ authToken, request }) => {
  // This uses the admin token
  const response = await request.get('/api/admin/settings', {
    headers: { Authorization: `Bearer ${authToken}` }
  })

  expect(response.ok()).toBeTruthy()
})

// Use user fixture for user-only tests
import { userTest } from '../fixtures/role-fixtures'

userTest('regular user profile access', async ({ authToken, request }) => {
  // This uses the user token
  const response = await request.get('/api/profile', {
    headers: { Authorization: `Bearer ${authToken}` }
  })

  expect(response.ok()).toBeTruthy()
})
```

#### 3. Testing Interactions Between Multiple Roles in a Single Test

Sometimes you need to test how different user roles interact with each other. Our authentication library makes this easy by allowing you to explicitly request tokens for different roles within the same test:

```typescript
// example of testing multiple roles in a single test
import { test, expect } from '../support/fixtures'
import { chromium } from '@playwright/test'

test('admin and regular user interaction', async ({ page, request }) => {
  // Get tokens for different roles
  const adminToken = await test.step('Get admin token', async () => {
    return getAuthToken(request, { userRole: 'admin' })
  })

  const userToken = await test.step('Get user token', async () => {
    return getAuthToken(request, { userRole: 'user' })
  })

  // Use tokens for API requests
  const adminResponse = await request.get('/api/admin-only-resource', {
    headers: { Authorization: `Bearer ${adminToken}` }
  })
  expect(adminResponse.ok()).toBeTruthy()

  const userResponse = await request.get('/api/user-resource', {
    headers: { Authorization: `Bearer ${userToken}` }
  })
  expect(userResponse.ok()).toBeTruthy()

  // For browser testing, you can create multiple contexts
  const browser = await chromium.launch()

  // Admin browser context
  const adminContext = await browser.newContext()
  await applyAuthToContext(adminContext, { userRole: 'admin' })
  const adminPage = await adminContext.newPage()

  // User browser context
  const userContext = await browser.newContext()
  await applyAuthToContext(userContext, { userRole: 'user' })
  const userPage = await userContext.newPage()

  // Now you can interact with both contexts
  await adminPage.goto('/admin-dashboard')
  await userPage.goto('/user-profile')

  // Test interactions between the two roles
  // ...

  // Clean up
  await adminContext.close()
  await userContext.close()
  await browser.close()
})
```

This approach is much simpler than Playwright's built-in solution because:

1. **No manual storage state files** - Our library manages token storage automatically
2. **Consistent API** - Same approach works for both API and UI testing
3. **Type safety** - All functions have proper TypeScript types
4. **Explicit role naming** - Uses semantic role names instead of file paths

You can easily extend this pattern to create Page Object Models with role-specific authentication already applied.

### UI Testing with Browser Context

This functionality is already built in and requires no additional code:

````typescript
// No special setup needed - auth is automatically applied
test('authenticated UI test', async ({ page }) => {
  // The page is already authenticated!
  await page.goto('/dashboard')

  // Verify authenticated content is visible
  await expect(page.locator('h1')).toContainText('Welcome Back')
})

#### Custom Authentication Provider

For specialized authentication needs, the custom provider becomes the source of truth for environment and role information.

#### Understanding the Options Flow for Auth Provider Methods

The `AuthProvider` interface methods (like `getEnvironment` and `getUserRole`) accept options parameters that might seem confusing at first. Here's how these options are passed:

1. **In Test Files**: When you call methods on the auth fixture:
   ```typescript
   test('example', async ({ auth }) => {
     // This passes options to getEnvironment() internally
     await auth.useEnvironment('staging');

     // This passes options to getUserRole() internally
     await auth.useRole('admin');
   });
````

2. **Direct API Calls**: When directly calling API functions with options:

   ```typescript
   // Passes options to both getEnvironment() and getUserRole()
   const token = await getAuthToken(request, {
     environment: 'staging',
     userRole: 'admin'
   })
   ```

3. **Default Values**: When no options are explicitly passed, the auth provider should fall back to sensible defaults:
   ```typescript
   // Priority order in getEnvironment():
   // 1. Options passed from test/API (auth.useEnvironment() or direct API call)
   // 2. Environment variables (process.env.TEST_ENV)
   // 3. Default value ('local')
   return options.environment || process.env.TEST_ENV || 'local'
   ```

Understanding this flow helps you implement a robust custom auth provider that works consistently across different usage patterns.

#### OAuth2 Example

Here's how to implement OAuth2 authentication in your custom auth provider:

```typescript
// Inside your custom-auth-provider.ts
const myCustomProvider: AuthProvider = {
	// Standard methods for environment and role
	getEnvironment(options = {}) { ... },
	getUserRole(options = {}) { ... },

	// OAuth2-specific token retrieval
	async getToken(request, options = {}) {
		const environment = this.getEnvironment(options)
		const userRole = this.getUserRole(options)

		// Get token path using utility function
		const tokenPath = getTokenFilePath({
			environment,
			userRole,
			tokenFileName: 'oauth-token.json'
		})

		// Check for existing valid token
		const existingToken = loadTokenFromStorage(tokenPath)
		if (existingToken && !isTokenExpired(existingToken)) {
			return existingToken
		}

		// Initialize storage if needed
		authStorageInit({ environment, userRole })

		// Get OAuth config from environment or defaults
		const oauthConfig = {
			clientId: process.env.OAUTH_CLIENT_ID || 'client-id',
			clientSecret: process.env.OAUTH_CLIENT_SECRET || 'client-secret',
			tokenUrl: process.env.OAUTH_TOKEN_URL || 'http://localhost:3000/oauth/token',
			scope: process.env.OAUTH_SCOPE || 'read write'
		}

		// Request a new token using client credentials flow
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

		// Save token with metadata using core utility
		saveTokenToStorage(
			tokenPath,
			token,
			{
				environment,
				userRole,
				expiresAt: Date.now() + (data.expires_in * 1000 || 3600000),
				scope: data.scope
			},
			true // Debug mode
		)

		return token
	},

	// Rest of the methods...
}
```

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
    userRole: 'default',
    debug: true
  })

  // Set the auth provider
  setAuthProvider(myCustomProvider)

  // Pre-fetch tokens for all configured environments and roles
  // This happens once before all tests run
  await authGlobalInit()
}

export default globalSetup
```

### Parallel Testing with Worker-Specific Accounts

Playwright recommends using one account per parallel worker for tests that modify server-side state. Our authentication system naturally supports this pattern through its environment and role isolation:

```typescript
// pw/support/custom-auth-provider.ts with worker-specific accounts
import { test } from '@playwright/test'

const myCustomProvider = {
  // Use parallelIndex to determine the user role
  getUserRole(options = {}) {
    // If a specific role is requested, use it; otherwise, use the worker index
    if (options.userRole) {
      return options.userRole
    }

    // Get the worker's parallel index (or default to 0 if not available)
    const workerIndex = test.info().parallelIndex ?? 0
    return `worker-${workerIndex}`
  },

  // Get token based on the worker-specific role
  async getToken(request, options = {}) {
    const userRole = this.getUserRole(options)

    // This will automatically use a separate token file for each worker
    // The rest of the implementation remains the same

    // When fetching a token, you can use different credentials per worker:
    const accounts = [
      { username: 'worker0@example.com', password: 'pass0' },
      { username: 'worker1@example.com', password: 'pass1' }
      // Add more accounts as needed for your parallel workers
    ]

    // Extract the worker number from the role
    const workerNumber = parseInt(userRole.replace('worker-', '')) || 0
    const account = accounts[workerNumber % accounts.length]

    // Use the worker-specific account for authentication
    const response = await request.post('/auth/token', {
      data: {
        username: account.username,
        password: account.password
      }
    })

    // Process and return the token...
  }
}
```

With this approach:

1. Each worker automatically gets its own storage file based on the worker index
2. No special fixtures or config changes are needed - it's handled by our provider architecture
3. Tests in the same worker reuse the authentication state
4. Different workers use different accounts

This implementation is more elegant than Playwright's approach because:

- No need to create separate per-worker fixtures
- No manual management of storage state files
- The provider architecture handles all the complexity
- The same approach works in both UI Mode and normal test mode

### Testing Unauthenticated States

There are several approaches to test unauthenticated scenarios:

##### Playwright's Built-in Approach

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

##### Our Enhanced Approach

Our library offers more flexibility and control over authentication states:

```typescript
// Our approach - Option 1: Clear specific token
test('test with cleared token', async ({ request }) => {
  // Clear just the token for the current environment/role
  clearAuthToken()

  // OR clear for specific environment/role
  clearAuthToken({ environment: 'staging', userRole: 'admin' })

  // Now make unauthenticated requests
  const response = await request.get('/api/public-resource')
})

// Our approach - Option 2: For browser tests, test-level config
test.describe('unauthenticated browser tests', () => {
  // Skip the auth fixture for this group
  test.useOptions({ auth: false })

  test('unauthenticated test', async ({ page }) => {
    // Page will load without authentication
  })
})
```

**Advantages over Playwright's approach**

1. **Granular control** - Clear specific tokens instead of all storage state
2. **Environment/role awareness** - Target specific test configurations
3. **API + UI flexibility** - Works for both API and browser tests
4. **Runtime control** - Clear tokens during test execution, not just at setup
5. **Multiple modes** - Test both authenticated and unauthenticated states in the same file

This makes it much easier to test complex authentication scenarios like authenticated session timeouts, partial authentication, or mixed authenticated/unauthenticated user journeys.

### Session Storage Support (Extension Recipe)

> **Note**: This is an extension recipe showing how you could add session storage support to the auth system. The core library doesn't currently implement this functionality.

Playwright explicitly does not provide APIs to persist session storage, requiring custom scripts for applications that use this storage method. From the Playwright documentation:

> "Session storage is specific to a particular domain and is not persisted across page loads. Playwright does not provide API to persist session storage. However, you can use an init script to implement a custom mechanism to persist session storage."

You can extend our authentication library to handle session storage by adding these capabilities to your custom auth provider:

```typescript
// Example extension to custom-auth-provider.ts - NOT CURRENTLY IMPLEMENTED in this repo
// Add this to your provider to support session storage if needed


// In your custom auth provider
async applyToBrowserContext(context, token, options = {}) {
	// First apply the token using your preferred method (cookies, localStorage, etc.)
	await context.addCookies([
		{
			name: 'auth-token',
			value: token,
			domain: 'localhost',
			path: '/'
		}
	]);

	// Then, apply session storage if available
	const environment = this.getEnvironment(options);
	const userRole = this.getUserRole(options);
	const sessionStoragePath = getTokenFilePath({
		environment,
		userRole,
		tokenFileName: 'session-storage.json'
	});

	if (fs.existsSync(sessionStoragePath)) {
		try {
			const sessionStorage = JSON.parse(fs.readFileSync(sessionStoragePath, 'utf-8'));

			// Add initialization script to set session storage
			await context.addInitScript(storage => {
				for (const [key, value] of Object.entries(storage)) {
					window.sessionStorage.setItem(key, value);
				}
			}, sessionStorage);

		} catch (error) {
			console.error('[Custom Auth] Error applying session storage:', error);
		}
	}
}

// And in your getToken method, add session storage capture after authentication
// This assumes you're using a page to authenticate rather than an API request
async captureSessionStorage(page, options = {}) {
	const environment = this.getEnvironment(options);
	const userRole = this.getUserRole(options);

	// Extract session storage data
	const sessionStorage = await page.evaluate(() => {
		const data = {};
		for (let i = 0; i < window.sessionStorage.length; i++) {
			const key = window.sessionStorage.key(i);
			data[key] = window.sessionStorage.getItem(key);
		}
		return data;
	});

	// Save it alongside the token
	const sessionStoragePath = getTokenFilePath({
		environment,
		userRole,
		tokenFileName: 'session-storage.json'
	});

	fs.writeFileSync(
		sessionStoragePath,
		JSON.stringify(sessionStorage),
		'utf-8'
	);
}
```

## Implementation Details

The authentication system uses a modular design pattern consisting of several key components:

1. **Storage Management**: Tokens are stored in JSON files in the `.auth-sessions` directory, organized by environment and user role.

2. **Auth Provider Interface**: Defines a contract for authentication providers with methods for token acquisition, browser context application, and token clearing.

3. **Session Management**: Implements token storage, retrieval, and application to API requests and browser contexts.

4. **Configuration**: Manages global authentication settings.

### Storage Structure

Tokens are stored in a structured hierarchy:

```
pw/.auth-sessions/               # Base storage directory (gitignored)
├── local/                       # Environment name
│   ├── default/                 # User role
│   │   ├── auth-token.json     # Token data file
│   │   └── storage-state.json  # Browser storage state
│   ├── admin/                  # Another role
│   │   ├── auth-token.json
│   │   └── storage-state.json
│   └── user/                   # Another role
│       ├── auth-token.json
│       └── storage-state.json
└── staging/                    # Another environment
		└── ...
```

This structure enables isolated storage for different environments and user roles.
